// common types
import type { PC, SuspenseBoundary, SignalWithPrev } from '../types';
// common deps
import {
    signal as preactSignal,
    computed as preactComputed,
    effect as preactEffect,
    createModel,
    Signal,
    SignalOptions,
} from '../state';
import {
    destroy, mount, onMountCallback, onDestroyCallback, isPromise
} from '../utils/core';
import { Renderer } from '../utils/render';
import { createComponent } from '../utils/component';
// client deps
import { childrenEffects } from './children';
import { resource } from './resource';


const Portal: PC<{
    root: HTMLElement;
    children?: any | any[];
}> = ({root, children}, {
    onDestroy
}) => {
    if (root) {
        const clear = childrenEffects({ root, children });
        mount(children);

        onDestroy(() => {
            clear();
            destroy(children);
            root.replaceChildren();
        });
    }
    return null;
};

/**
 * `<Suspense>` boundary — a data boundary around resources
 */
const Suspense: PC<{
    callback: () => any;
    fallback?: any;
}> = ({ callback, fallback }, { computed }) => {
    const boundary: SuspenseBoundary = { keys: [], pending: [] };
    const content = Renderer.inBoundary(boundary, callback);
    const pending = computed(() => boundary.pending.some((s) => s.value));
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
    const scope = Renderer.getScope();
    const rawSignal = preactComputed(() => {
        return Renderer.withScope({
            scope,
            callback: () => {
                let result;
                try {
                    result = fn();
                } catch (e) {
                    result = e;
                }
                return result as T;
            }
        });
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

const effect = (fn: () => any) => {
    const scope = Renderer.getScope();
    return preactEffect(() => Renderer.withScope({
        scope,
        callback: fn
    }));
};

const ComponentModel = createModel<any, any>(({
    type, props, utils
}) => {
    const controller = new AbortController();
    const abortSignal = controller.signal;

    let result;
    try {
        result = type({...props}, utils);
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
        result.then((r: any) => {
            if (abortSignal.aborted) return;
            signalResult.prev = signalResult.value;
            signalResult.value = r;
        }).catch((e: Error) => {
            if (abortSignal.aborted) return;
            signalResult.prev = signalResult.value;
            signalResult.value = e;
        });

        signalResult.then = async (onFulfilled, _) => {
            let awaitedValue;
            if (isPromise(signalResult.value)) {
                try {
                    awaitedValue = await signalResult.value;
                } catch (error) {
                    awaitedValue = error;
                } finally {
                    signalResult.prev = signalResult.value;
                    signalResult.value = awaitedValue;
                    delete signalResult.then;
                    onFulfilled(signalResult);
                }
            }
        }
    }

    return Object.defineProperty({}, 'root', {value: signalResult});
});

const render = ({ type, props, utils, callbacks }: {
    type: Function;
    props: any;
    utils: any;
    callbacks: { mount: Set<Function>; destroy: Set<Function> };
}) => {
    const componentModel = new ComponentModel({ type, props, utils });
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
    Portal,
    Suspense,
    resource,
    signal,
    computed,
    effect,
    render
});
