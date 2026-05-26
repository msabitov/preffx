import {
    batch,
    computed as preactComputed,
    createModel,
    effect as preactEffect,
    signal as preactSignal,
    untracked, 
    Signal} from '@preact/signals-core';
import {
    mount, destroy, onMountCallback, onDestroyCallback,
    isPromise, resolveDeepValue, resolveDeepRawValue, resolveValue, TPreffXItem, 
} from '../utils';
import { childrenEffects } from './children';
import { PC, SignalWithPrev } from '../types';

// global state
const state = {
    // prefix
    prefix: 'fx',
    // component context
    ctx: {},
    // components count
    counter: 0,
    // component constructors
    constructors: new Map()
};

// utils
const isError = (val: any) => val instanceof Error;

// special components

/**
 * Fragment component
 * @param params - component params
 */
export const Fragment = (params: any) => {
	return params.children;
};

const Catch: PC<{
    fallback: any;
    children: any[];
}> = ({children, fallback, ...props}, {computed}) => {
    return computed(() => {
        const errors = children.flat(Infinity).map(resolveDeepRawValue).filter((child) => isError(child));
        if (errors.length) {
            if (typeof fallback === 'function') {
                try {
                    return component({
                        type: fallback,
                        props: {
                            ...props,
                            errors
                        }
                    })
                } catch (e) {
                    return e;
                }
            }
            return fallback;
        } else {
            return children;
        }
    })
};

const For: PC<{
    items: Signal<any[]>;
    callback: (item: any) => any;
    fallback: any;
}> = ({items, callback, fallback}, {
    signal,
    computed,
    effect,
    onMount, onDestroy
}) => {
    const cache = signal(new Map<any, Node[] | null>());
    const prev = signal<any[]>([]);
    const getNextCache = (item: any, val: any) => {
        const nextMap = new Map(cache.peek().entries());
        return nextMap.set(item, val);
    };

    // recalc if children changed
    effect(() => {
        const arr = resolveValue(items) as any[];

        const currentItemsSet = new Set(arr);
        const prevItemsSet = new Set(prev.peek());

        untracked(() => batch(() => arr.forEach((item) => {
            // recalculates with effect if item is Signal
            effect(() => {
                const value = resolveDeepValue(item);
                // no cached value
                if (!cache.peek().has(item)) {
                    cache.value = getNextCache(item, callback(value));
                }
                return () => {
                    // value changed - cached is invalid
                    cache.peek().delete(item);
                };
            });
        })));

        const removedItemsSet = prevItemsSet.difference(currentItemsSet);

        removedItemsSet.values().forEach((item) => {
            cache.peek().delete(item);
        });

        // items changed
        prev.value = arr;
    });

    onMount(() => {
        // some mount actions
    });

    onDestroy(() => {
        const cacheMap = cache.value;
        cacheMap.clear();
        prev.value = [];
    });

    return computed(() => {
        const arr = resolveValue(items);
        const cacheMap = cache.value;
        const children = arr.reduce((acc: any[], item: any) => {
            const value = cacheMap.get(item);
            if (value) acc.push(value);
            return acc;
        }, [] as any[]);
        return children.length ? children : fallback;
    });
};

const Portal: PC<{
    root: HTMLElement;
    children?: any | any[];
}> = ({root, children}, {
    onMount, onDestroy
}) => {
    if (root) {
        const clear = childrenEffects({ root, children });
        onMount(() => {
            mount(children);
        });

        onDestroy(() => {
            clear();
            destroy(children);
            root.replaceChildren();
        });
    }
    return null;
}

// reactive component
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
})

export function component({
    type,
    props
}: {
    type: Function;
    props: any;
}) {
    // prepare ctx
    const parentCtx = {...state.ctx};
    const context = {...parentCtx};
    state.ctx = context;
    // counters
    let componentPrefix = state.prefix + (
        state.constructors.get(type) || state.constructors.set(
            type, (++state.counter).toString(16)).get(type)
        );
    const counters = {
        id: 0
    };
    const id = () => componentPrefix + '-' + (counters.id++).toString(16);

    // prepare lifecycle callbacks
    const callbacks: {
        mount?: () => void;
        destroy?: () => void;
    } = {
        mount: undefined,
        destroy: undefined
    };
    const onMount = (fn: () => void) => callbacks.mount = fn;
    const onDestroy = (fn: () => void) => callbacks.destroy = fn;

    const signal = (arg: any) => {
        const rawSignal = preactSignal(arg) as SignalWithPrev;

        const dispose = preactEffect(() => {
            const value = rawSignal.value;
            return () => {
                rawSignal.prev = value;
            }
        });

        onDestroyCallback(rawSignal, () => {
            dispose();
        });

        return rawSignal;
    };
    const computed = (fn: () => any) => {
        const rawSignal = preactComputed(() => {
            const prevCtx = {...state.ctx};
            state.ctx = context;
            let result;
            try {
                result = fn();
            } catch (e) {
                result = e;
            }
            state.ctx = prevCtx;
            return result;
        })  as SignalWithPrev;;

        const dispose = preactEffect(() => {
            const value = rawSignal.value;
            return () => {
                rawSignal.prev = value;
            }
        });

        onDestroyCallback(rawSignal, () => {
            dispose();
        });
        return rawSignal;
    };

    const utils = {
        signal,
        computed,
        context,
        id,
        effect: preactEffect,
        untracked, batch,
        // lifecycle
        onMount, onDestroy,
        // special components
        Portal, Catch, For
    };
    const componentModel = new ComponentModel({
        type, props, utils
    }) as unknown as (TPreffXItem & {root: any;});
    const componentRoot = componentModel.root;
    onDestroyCallback(componentRoot, () => {
        callbacks.destroy?.();
        componentModel[Symbol.dispose]();
    });
    onMountCallback(componentRoot, () => {
        callbacks.mount?.();
    });

    return componentRoot;
}
