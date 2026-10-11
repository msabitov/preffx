// common types
import type { Resource, ResourceState } from '../types';
// common deps
import {
    ResourceArg, ResourceContext,
    resourceKey, makeState, registerBoundary, parseArg
} from '../utils/resource';
// client deps
import { getHydratedData, whenHydrated } from './hydration';

export const resource = ({
    scope, componentPrefix, signal, effect, onDestroy, batch
}: ResourceContext) => <T = any>(arg: ResourceArg<T>): Resource<T> => {
    const { fetcher, initial } = parseArg(arg);
    const key = resourceKey(scope, componentPrefix);
    const res = makeState<T>(signal, initial);
    registerBoundary(key, res.pending as ResourceState['pending']);
    const refetchCounter = signal(0);
    const refetch = () => { refetchCounter.value++; };

    const hydration = scope.hydration;
    const hydratedValue = getHydratedData(hydration)?.[key];
    const hydrated = hydratedValue !== undefined;
    if (hydrated) {
        batch(() => {
            res.state.value = hydratedValue as T;
            res.pending.value = false;
        });
    }
    if (!hydrated && hydration) {
        const unsubscribe = whenHydrated(hydration, [key], () => {
            const value = getHydratedData(hydration)?.[key];
            if (value !== undefined) {
                batch(() => {
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
        // first run with an initial value: keep it visible while loading
        if (count === 0 && initial !== undefined) {
            res.error.value = null;
            res.pending.value = true;
        } else {
            batch(() => {
                res.state.value = null;
                res.error.value = null;
                res.pending.value = true;
            });
        }
        abortController?.abort();
        const ac = abortController = new AbortController();
        fetcher(ac.signal).then((state) => {
            if (!ac.signal.aborted) {
                batch(() => {
                    res.state.value = state;
                    res.error.value = null;
                });
            }
        }).catch((error) => {
            if (!ac.signal.aborted) {
                batch(() => {
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
