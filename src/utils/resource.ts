// common types
import type { ResourceState, RootScope } from '../types';
// common deps
import { batch, Signal, SignalOptions } from '../state';
import { Renderer } from '../utils/render';

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

export type MutableState<T> = {
    state: Signal<T | null>;
    error: Signal<Error | null>;
    pending: Signal<boolean>;
};

export const resourceKey = (scope: RootScope, componentPrefix: string) =>
    componentPrefix + Renderer.toRadixString(scope.resourceIndex++) + '-r';

export const makeState = <T>(signal: ResourceContext['signal'], initial?: T): MutableState<T> => ({
    state: signal<T | null>(initial ?? null),
    error: signal<Error | null>(null),
    pending: signal<boolean>(true)
});

export const registerBoundary = (key: string, pending: ResourceState['pending']) => {
    const boundary = Renderer.currentBoundary();
    if (boundary) {
        boundary.keys.push(key);
        boundary.pending.push(pending);
    }
};

export const parseArg = <T>(arg: ResourceArg<T>) =>
    typeof arg === 'function'
        ? { fetcher: arg, timeout: undefined, initial: undefined }
        : { fetcher: arg.fetcher, timeout: arg.timeout, initial: arg.initial };