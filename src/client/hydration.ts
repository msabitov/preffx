// common types
import type { HydrationState, RootScope } from '../types';
// common deps
import { batch } from '../state';

const notifyHydrated = (state: HydrationState, key: string): void => {
    const set = state.subs.get(key);
    if (!set) return;
    state.subs.delete(key);
    const notified = new Set(set);
    if (notified.size) {
        batch(() => notified.forEach((fn) => fn()));
    }
};

export const setHydratedData = (state: HydrationState, data?: Record<string, unknown>): void => {
    state.data = data;
    if (data) Object.keys(data).forEach((key) => notifyHydrated(state, key));
};

export const getHydratedData = (state: HydrationState | undefined): Record<string, unknown> | undefined =>
    state?.data;

export const takeHydrateNode = (state: HydrationState | undefined): Element | undefined => {
    if (!state?.queue) return undefined;
    return state.queue[state.index++];
};

/**
 * Subscribe for a callback to run once any of `keys` arrives hydrated
 */
export const whenHydrated = (state: HydrationState, keys: string[], fn: () => void): (() => void) => {
    // Already present → run now, no subscription needed.
    if (keys.some((k) => state.data && Object.hasOwn(state.data, k))) {
        fn();
        return () => {};
    }
    // Register against every still-missing key; callback fires once
    for (const key of keys) {
        if (state.data && Object.hasOwn(state.data, key)) continue;
        let set = state.subs.get(key);
        if (!set) state.subs.set(key, set = new Set());
        set.add(fn);
    }
    return () => {
        for (const key of keys) {
            const set = state.subs.get(key);
            set?.delete(fn);
            if (set && set.size === 0) state.subs.delete(key);
        }
    };
};

/**
 * Run `fn` while a positional hydration queue is active on `scope`, restoring the
 * previous queue afterwards. When no queue is provided the session is left untouched.
 */
export const withHydrateScope = <T>(scope: RootScope, queue: Element[] | undefined, fn: () => T): T => {
    if (!queue) return fn();
    let h = scope.hydration;
    if (!h) h = scope.hydration = { index: 0, subs: new Map() };
    h.queue = queue.length ? queue : undefined;
    h.index = 0;
    try {
        return fn();
    } finally {
        h.queue = undefined;
        h.index = 0;
        h.data = undefined;
    }
};