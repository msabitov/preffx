// common types
import type {
    ResourceCacheEntry, ResourceState, RootScope,
    ResourceContext, MutableState, ResourceArg, ResourceOptions
} from '../types';
// common deps
import { batch } from '../state';
import { Renderer } from '../utils/render';

export const resourceKey = (scope: RootScope, componentPrefix: string) =>
    componentPrefix + Renderer.toRadixString(scope.resourceIndex++) + '-r';

export const makeState = <T, E = Error>(signal: ResourceContext['signal'], initial?: T): MutableState<T, E> => ({
    state: signal<T | null>(initial ?? null),
    error: signal<E | null>(null),
    pending: signal<boolean>(true)
});

/**
 * Reset to the loading state (clear data/error, mark pending)
 */
export const resetLoading = <T, E = Error>(res: MutableState<T, E>, batch: ResourceContext['batch']): void =>
    batch(() => {
        res.state.value = null;
        res.error.value = null;
        res.pending.value = true;
    });

/**
 * Mark resolved with data (clear error, stop pending)
 */
export const setResolved = <T, E = Error>(res: MutableState<T, E>, value: T, batch: ResourceContext['batch']): void =>
    batch(() => {
        res.state.value = value;
        res.error.value = null;
        res.pending.value = false;
    });

/**
 * Mark failed with an error (stop pending).
 * The previous `state` is kept so the last successful value stays visible
 */
export const setFailed = <T, E = Error>(res: MutableState<T, E>, error: E, batch: ResourceContext['batch']): void =>
    batch(() => {
        res.error.value = error;
        res.pending.value = false;
    });


/**
 * Set only the error (keep data, stop pending)
 */
export const setErrorOnly = <T, E = Error>(res: MutableState<T, E>, error: E, batch: ResourceContext['batch']): void =>
    batch(() => {
        res.error.value = error;
        res.pending.value = false;
    });

/**
 * Set only the data (clear error, stop pending)
 */
export const setDataOnly = <T, E = Error>(res: MutableState<T, E>, value: T, batch: ResourceContext['batch']): void =>
    batch(() => {
        res.state.value = value;
        res.error.value = null;
        res.pending.value = false;
    });

/**
 * Get (or lazily create) the shared cache entry for an explicit `key`.
 * Only explicit keys participate in caching; positional keys pass through.
 */
export const useCacheEntry = (
    scope: RootScope,
    key: string,
    signal: ResourceContext['signal']
): ResourceCacheEntry | undefined => {
    const cache = scope.resourceCache ?? (scope.resourceCache = new Map<string, ResourceCacheEntry>());
    const existing = cache.get(key);
    if (existing) return existing;
    const entry: ResourceCacheEntry = {
        state: signal<unknown>(undefined),
        error: signal<Error | null>(null)
    };
    cache.set(key, entry);
    return entry;
};

export const registerBoundary = (key: string, pending: ResourceState['pending']) => {
    const boundary = Renderer.currentBoundary();
    if (boundary) {
        boundary.keys.push(key);
        boundary.pending.push(pending);
    }
};

export const parseArg = <T>(fetcher: ResourceArg<T>['fetcher'], options?: ResourceOptions<T>) => ({
    fetcher,
    timeout: options?.timeout,
    initial: options?.initial,
    key: options?.key,
    keepPreviousState: options?.keepPreviousState
});