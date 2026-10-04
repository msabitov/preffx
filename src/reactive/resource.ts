import { batch, Signal, SignalOptions } from '../state';
import { Renderer } from '../utils/render';
import type { Resource, ResourceState, RootScope } from '../types';

export type ResourceArg<T = any> =
    | ((signal?: AbortSignal) => Promise<T>)
    | { fetcher: (signal?: AbortSignal) => Promise<T>; initial?: T; timeout?: number };

export type ResourceContext = {
    scope: RootScope;
    componentPrefix: string;
    signal: <T>(v: T, options?: SignalOptions<T>) => Signal<T>;
    effect: (fn: () => any) => any;
    onDestroy: (target: any, fn: () => void) => void;
    batch: typeof batch;
};

type MutableState<T> = {
    state: Signal<T | null>;
    error: Signal<Error | null>;
    pending: Signal<boolean>;
};

const resourceKey = (scope: RootScope, componentPrefix: string) =>
    componentPrefix + Renderer.toRadixString(scope.resourceIndex++) + '-r';

const makeState = <T>(signal: ResourceContext['signal'], initial?: T): MutableState<T> => ({
    state: signal<T | null>(initial ?? null),
    error: signal<Error | null>(null),
    pending: signal<boolean>(true)
});

const registerBoundary = (key: string, pending: ResourceState['pending']) => {
    const boundary = Renderer.currentBoundary();
    if (boundary) {
        boundary.keys.push(key);
        boundary.pending.push(pending);
    }
};

const parseArg = <T>(arg: ResourceArg<T>) =>
    typeof arg === 'function'
        ? { fetcher: arg, timeout: undefined, initial: undefined }
        : { fetcher: arg.fetcher, timeout: arg.timeout, initial: arg.initial };

const createServerResource = ({ scope, componentPrefix, signal, effect, batch: b }: ResourceContext) =>
    <T = any>(arg: ResourceArg<T>): Resource<T> => {
        const { fetcher, timeout, initial } = parseArg(arg);
        const key = resourceKey(scope, componentPrefix);
        const res = makeState<T>(signal, initial);
        registerBoundary(key, res.pending as ResourceState['pending']);
        const entry = Renderer.register(scope, key, fetcher, timeout);
        effect(() => {
            const value = entry.state.value;
            b(() => {
                res.state.value = value === undefined ? null : (value as T);
                res.pending.value = value === undefined;
            });
        });
        return [res, () => {}];
    };

const createBrowserResource = ({ scope, componentPrefix, signal, effect, onDestroy, batch: b }: ResourceContext) =>
    <T = any>(arg: ResourceArg<T>): Resource<T> => {
        const { fetcher, initial } = parseArg(arg);
        const key = resourceKey(scope, componentPrefix);
        const res = makeState<T>(signal, initial);
        registerBoundary(key, res.pending as ResourceState['pending']);
        const refetchCounter = signal(0);
        const refetch = () => { refetchCounter.value++; };

        const hydratedValue = Renderer.getHydratedData()?.[key];
        const hydrated = hydratedValue !== undefined;
        if (hydrated) {
            b(() => {
                res.state.value = hydratedValue as T;
                res.pending.value = false;
            });
        }
        if (!hydrated) {
            const unsubscribe = Renderer.whenHydrated([key], () => {
                const value = Renderer.getHydratedData()?.[key];
                if (value !== undefined) {
                    b(() => {
                        res.state.value = value as T;
                        res.pending.value = false;
                    });
                }
            });
            onDestroy(res.state, unsubscribe);
        }

        let abortController: AbortController | null = null;
        effect(() => {
            const count = refetchCounter.value;
            if (hydrated && count === 0) return;
            if (count === 0 && res.pending.value === false) return;
            b(() => {
                res.state.value = null;
                res.error.value = null;
                res.pending.value = true;
            });
            abortController?.abort();
            const ac = abortController = new AbortController();
            fetcher(ac.signal).then((state) => {
                if (!ac.signal.aborted) {
                    b(() => {
                        res.state.value = state;
                        res.error.value = null;
                    });
                }
            }).catch((error) => {
                if (!ac.signal.aborted) {
                    b(() => {
                        res.state.value = null;
                        res.error.value = error;
                    });
                }
            }).finally(() => {
                if (!ac.signal.aborted) res.pending.value = false;
            });
            return () => ac.abort();
        });
        return [res, refetch];
    };

export const createResource = Renderer.isServerSide() ? createServerResource : createBrowserResource;
