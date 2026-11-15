// common types
import type { PC, SuspenseBoundary, SignalWithPrev, RootScope, HydrateCursor } from '../types';
// common deps
import {
    signal as preactSignal,
    computed as preactComputed,
    effect as preactEffect,
    createModel,
    Signal,
    SignalOptions,
    ReadonlySignal,
} from '../state';
import {
    destroy, mount, onMountCallback, onDestroyCallback, isPromise
} from '../utils/core';
import { createComponent, createFor } from '../utils/component';
import { materialize } from '../vnode';
// client deps
import { childrenEffects } from './children';
import { resource } from './resource';


/**
 * `Portal` component factory
 */
const createPortal = (scope: RootScope): PC<{
    root: HTMLElement;
    children?: any | any[];
}> => ({root, children}, {
    onDestroy
}) => {
    if (root) {
        // children are VNodes: materialize them in the component scope.
        // A portal target is not part of the server markup, so no cursor.
        const childrenState = childrenEffects({ root, children, scope });
        const materialized = childrenState.children;
        mount(materialized);

        onDestroy(() => {
            childrenState.dispose();
            destroy(materialized);
            root.replaceChildren();
        });
    }
    return null;
};

/**
 * `<Suspense>` component factory
 */
const createSuspense = (scope: RootScope, cursor?: HydrateCursor): PC<{
    callback: () => any;
    fallback?: any;
}> => ({ callback, fallback }, { computed }) => {
    const boundary: SuspenseBoundary = {
        keys: [],
        pending: preactSignal<Array<ReadonlySignal<boolean>>>([])
    };
    const childScope: RootScope = {...scope, boundary};
    const content = materialize(callback(), childScope, cursor);
    const pending = computed(() => boundary.pending.value.some((s) => s.value));
    return computed(() => (pending.value ? fallback : content));
};

const signal = <T>(arg: T, options?: SignalOptions<T>): Signal<T> => {
    const rawSignal = preactSignal(arg, options) as SignalWithPrev;

    preactEffect(() => {
        const value = rawSignal.value;
        return () => {
            rawSignal.prev = value;
            destroy(rawSignal.prev);
        }
    });

    return rawSignal;
};

const computed = <T>(fn: () => T, options?: SignalOptions<T>) => {
    const rawSignal = preactComputed(() => {
        try {
            return fn();
        } catch (e) {
            return e as T;
        }
    }, options) as SignalWithPrev;

    preactEffect(() => {
        const value = rawSignal.value;
        return () => {
            rawSignal.prev = value;
            destroy(rawSignal.prev);
        }
    });
    return rawSignal;
};

const effect = (fn: () => any) => preactEffect(fn);

const ComponentModel = createModel<any, any>(({
    type, props, utils, scope, cursor
}: {
    type: Function;
    props: any;
    utils: any;
    scope: RootScope;
    cursor?: HydrateCursor;
}) => {
    const controller = new AbortController();
    const abortSignal = controller.signal;

    let result;
    try {
        result = materialize(type({...props}, utils), scope, cursor);
    } catch (e) {
        result = e;
    }

    preactEffect(() => {
        return () => {
            controller.abort();
        };
    });

    const signalResult = preactSignal<any>(result) as SignalWithPrev & {
        then?: (onFulfilled: any, onRejected: any) => Promise<any>;
    };

    if (isPromise(result)) {
        const settled = result.then((r: any) => {
            if (abortSignal.aborted) return;
            signalResult.prev = signalResult.value;
            signalResult.value = materialize(r, scope);
            return signalResult.value;
        }).catch((e: Error) => {
            if (abortSignal.aborted) return;
            signalResult.prev = signalResult.value;
            signalResult.value = e;
            return e;
        });

        signalResult.then = (onFulfilled: any, onRejected: any) => {
            const resolve = (value: any) => {
                if (abortSignal.aborted) {
                    onRejected?.(new Error('Component was destroyed'));
                    return;
                }
                onFulfilled?.(value);
            };
            const reject = (error: any) => {
                if (abortSignal.aborted) {
                    onRejected?.(new Error('Component was destroyed'));
                    return;
                }
                onRejected?.(error);
            };
            const current = signalResult.value;
            // already settled
            if (!isPromise(current)) {
                if (current instanceof Error) reject(current);
                else resolve(current);
                return Promise.resolve();
            }
            // wait for the model's own handler
            return settled.then((value: any) => {
                if (value instanceof Error) reject(value);
                else resolve(value);
            });
        }
    }

    return Object.defineProperty({}, 'root', {value: signalResult});
});

const render = ({ type, props, utils, scope, callbacks, cursor }: {
    type: Function;
    props: any;
    utils: any;
    scope: RootScope;
    callbacks: { mount: Set<Function>; destroy: Set<Function> };
    cursor?: HydrateCursor;
}) => {
    const componentModel = new ComponentModel({ type, props, utils, scope, cursor });
    const componentRoot = componentModel.root;
    onMountCallback(componentRoot, () => {
        callbacks.mount.forEach((fn) => fn());
    });
    onDestroyCallback(componentRoot, () => {
        callbacks.destroy.forEach((fn) => fn());
        componentModel[Symbol.dispose]();
    });
    return componentRoot;
};

export const component = createComponent({
    createPortal,
    createSuspense,
    createFor,
    resource,
    signal,
    computed,
    effect,
    render
});
