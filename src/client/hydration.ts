// common types
import type { HydrationState, RootScope } from '../types';

export const setHydratedData = (state: HydrationState, data?: Record<string, unknown>): void => {
    state.data = data;
};

export const getHydratedData = (state: HydrationState | undefined): Record<string, unknown> | undefined =>
    state?.data;

/**
 * Take the element from the hydration queue
 * (if it matches tag and namespace)
 */
export const takeHydrateNode = (
    state: HydrationState | undefined,
    expected: { tag: string; ns?: string }
): Element | undefined => {
    if (!state?.queue) return undefined;
    const element = state.queue[state.index];
    if (!element || element.tagName.toLowerCase() !== expected.tag || expected.ns && element.namespaceURI !== expected.ns) return undefined;
    state.index++;
    return element;
};

/**
 * Run `fn` while a positional hydration queue is active on `scope`, restoring the
 * previous queue afterwards. When no queue is provided the session is left untouched.
 */
export const withHydrateScope = <T>(scope: RootScope, queue: Element[] | undefined, fn: () => T): T => {
    if (!queue) return fn();
    let h = scope.hydration;
    if (!h) h = scope.hydration = { index: 0 };
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