// common types
import type { Resource, ResourceState, ResourceArg, ResourceContext, ResourceOptions } from '../types';
// common deps
import type { Signal } from '../state';
import {
    resourceKey, registerBoundary, parseArg, useCacheEntry,
    resetLoading, setResolved, setFailed, setErrorOnly, setDataOnly
} from '../utils/resource';
// client deps
import { getHydratedData, whenHydrated } from './hydration';

export const resource = ({
    scope, componentPrefix, signal, effect, onDestroy, batch
}: ResourceContext) => <T = any, E = Error>(fetcher: ResourceArg<T>['fetcher'], options?: ResourceOptions<T>): Resource<T, E> => {
    const { fetcher: fn, initial, key: customKey, timeout, keepPreviousState } = parseArg(fetcher, options);
    const key = customKey ?? resourceKey(scope, componentPrefix);
    // Explicit keys share a per-root cache entry (state/error); pending stays per-component
    const cacheEntry = customKey ? useCacheEntry(scope, key, signal) : undefined;
    // With `initial`, data is already available,
    // so we avoid showing a Suspense fallback
    const pending = signal<boolean>(initial === undefined);
    const res = {
        state: cacheEntry?.state as Signal<T | null> ?? signal<T | null>(initial ?? null),
        error: cacheEntry?.error as Signal<E | null> ?? signal<E | null>(null),
        pending
    };
    registerBoundary(key, res.pending as ResourceState['pending']);
    const refetchCounter = signal(0);
    const refetch = () => { refetchCounter.value++; };
    const mutate = (value: T | null) => {
        if (value === null) batch(() => {
            res.state.value = null;
            res.error.value = null;
            res.pending.value = false;
        });
        else setResolved(res, value, batch);
    };

    const hydration = scope.hydration;
    const hydratedData = getHydratedData(hydration) as
        | { errors?: Record<string, { message: string; name: string }>; data?: Record<string, unknown> }
        | undefined;
    const hydratedError = hydratedData?.errors?.[key];
    const hydratedValue = hydratedError === undefined ? hydratedData?.data?.[key] : undefined;
    const hydrated = hydratedError !== undefined || hydratedValue !== undefined;
    if (!!hydratedError) {
        const err = new Error(hydratedError.message);
        err.name = hydratedError.name;
        setErrorOnly(res, err as E, batch);
    } else if (hydratedValue !== undefined) {
        setDataOnly(res, hydratedValue as T, batch);
    }
    if (!hydrated && hydration) {
        const unsubscribe = whenHydrated(hydration, [key], () => {
            const data = getHydratedData(hydration) as
                | { errors?: Record<string, { message: string; name: string }>; data?: Record<string, unknown> }
                | undefined;
            const err = data?.errors?.[key];
            const value = err ? data?.data?.[key] : undefined;
            if (!!err) {
                const e = new Error(err.message);
                e.name = err.name;
                setErrorOnly(res, e as E, batch);
            } else if (value !== undefined) {
                setDataOnly(res, value as T, batch);
            }
        });
        onDestroy(res.state, unsubscribe);
    }

    let abortController: AbortController | null = null;
    // Tracks whether the effect has run at least once, so dependency-driven
    // re-runs (source-tracking) reset state even when refetchCounter is still 0
    let firstRun = true;
    effect(() => {
        const count = refetchCounter.value;
        if (hydrated && count === 0) return;
        // First run with an initial value: keep it visible while loading and
        // leave `pending` false (data is already available), so Suspense does
        // not show a fallback. Any subsequent run (refetch or dependency
        // change) resets state, unless keepPreviousState is set — then the old
        // state stays visible (stale-while-revalidate) and only error/pending
        // are updated
        if (firstRun && !!initial) res.error.value = null;
        else if (keepPreviousState) {
            res.error.value = null;
            res.pending.value = true;
        } else resetLoading(res, batch);
        firstRun = false;
        abortController?.abort();
        const ac = abortController = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        if (timeout !== undefined) {
            timeoutId = setTimeout(() => {
                ac.abort();
                setFailed(res, new Error('Resource timed out') as E, batch);
            }, timeout);
        }
        fn(ac.signal).
            then((state) => !ac.signal.aborted && setResolved(res, state, batch)).
            catch((error) => !ac.signal.aborted && setFailed(res, error, batch)).
            finally(() => {
                if (timeoutId !== undefined) clearTimeout(timeoutId);
                if (!ac.signal.aborted) res.pending.value = false;
            });
        return () => {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            ac.abort();
        };
    });
    const cancel = () => {
        abortController?.abort();
        res.pending.value = false;
    };
    const invalidate = () => {
        scope.resourceCache?.delete(key);
    };
    return [res, { refetch, mutate, cancel, invalidate }];
};
