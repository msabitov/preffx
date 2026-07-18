import {
    batch,
    computed as preactComputed,
    createModel,
    effect as preactEffect,
    signal as preactSignal,
    untracked,
    Signal,
    action,
    SignalOptions
} from '@preact/signals-core';
import {
    mount, destroy, onMountCallback, onDestroyCallback,
    isPromise, resolveDeepValue, resolveDeepRawValue, resolveValue, TPreffXItem,
} from '../utils';
import { childrenEffects } from './children';
import { PC, PreffXRootParams, SignalWithPrev } from '../types';

type StateWithComponentIndex = PreffXRootParams & {index: number;};

const defaultRootState: StateWithComponentIndex = {
    // component context
    context: {},
    // component index
    index: 0
};

// global state
const state: {
    /**
     * Count of roots
     */
    count: number;
    /**
     * Root state
     */
    root: StateWithComponentIndex;
} = {
    count: 0,
    root: {index: 0}
};

const RADIX = 36;
let URL_WATCHERS = 0;
let LANG_WATCHERS = 0;

// url
const urlSignal = preactSignal(new URL(globalThis.location.href), {
    watched: () => {
        URL_WATCHERS++;
    },
    unwatched: () => {
        URL_WATCHERS--;
    }
});
const readonlyUrl = preactComputed(() => urlSignal.value);
const globalNavigation = globalThis.navigation;
globalNavigation?.addEventListener('navigate', (event) => {
    const nextUrl = new URL(event.destination.url);
    const currentUrl = readonlyUrl.peek();
    // if the navigation is cross-origin
    const isCrossDomain = nextUrl.origin !== currentUrl.origin;
    if (isCrossDomain) return;
    else if (URL_WATCHERS) {
        // custom handling
        event.preventDefault();
        urlSignal.value = nextUrl;
    }
});

const navigate: Navigation['navigate'] = (url, options) => {
    return globalNavigation?.navigate(url, options);
};

// lang
const htmlElement = globalThis.document?.documentElement;
const langSignal = preactSignal(htmlElement?.getAttribute('lang') || '', {
    watched: () => {
        LANG_WATCHERS++;
    },
    unwatched: () => {
        LANG_WATCHERS--;
    }
});

const readonlyLang = preactComputed(() => langSignal.value);
const setLang = (value: string) => {
    htmlElement?.setAttribute('lang', value);
};
if (htmlElement) {
    const observer = new MutationObserver((mutations) => {
        if (!LANG_WATCHERS) return;
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
                const nextLang = htmlElement.getAttribute('lang') || '';
                langSignal.value = nextLang;
            }
        });
    });

    observer.observe(htmlElement, { attributes: true, attributeFilter: ['lang'] });
}

export const setRootState = (rootState: PreffXRootParams = {}) => {
    state.root = {
        ...defaultRootState,
        ...rootState,
        index: 0
    };
    state.count++;
    if (!state.root.prefix) state.root.prefix = 'fx' + state.count + '_';
}

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

const Defer: PC<{
    initial: any;
    value: Signal<any>;
}> = ({ value, initial }, { signal, effect }) => {
    const defered = signal(initial);

    effect(() => {
        const resolved = resolveDeepRawValue(value);
        if (!isPromise(resolved)) defered.value = resolved;
    });

    return defered;
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
                const value = resolveDeepRawValue(item);
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
    const parentState = state.root;
    const parentCtx = parentState.context;
    const context = {...parentCtx};
    parentState.context = context;
    // counters
    let componentPrefix = parentState.prefix + (++parentState.index).toString(RADIX) + '-';
    const counters = {
        id: 0
    };
    const id = () => componentPrefix + (counters.id++).toString(RADIX);

    // prepare lifecycle callbacks

    const callbacks: { 
        mount: Set<Function>; 
        destroy: Set<Function>;
    } = {
        mount: new Set(), 
        destroy: new Set(),
    };
    const onMount = (fn: () => void | Promise<void>) => callbacks.mount.add(fn);
    const onDestroy = (fn: () => void | Promise<void>) => callbacks.destroy.add(fn);

    const signal = <T>(arg: T, options?: SignalOptions<T>): Signal<T> => {
        const rawSignal = preactSignal(arg, options) as SignalWithPrev;

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
    const computed = <T>(fn: () => T, options?: SignalOptions<T>) => {
        const rawSignal = preactComputed(() => {
            const prevCtx = {...parentState.context};
            parentState.context = context;
            let result;
            try {
                result = fn();
            } catch (e) {
                result = e;
            }
            parentState.context = prevCtx;
            return result as T;
        }, options)  as SignalWithPrev;

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

    /**
     * useState emulation
     * @param initial - initial value
     * @returns [signal, set] – state signal and setState function
     */
    const useState = <T>(
        initial: T | (() => T)
    ): [Signal<T>, (value: T | ((prev: T) => T)) => void] => {
        const s = signal(initial)
        const c = computed(() => s.value);

        const set = (value: T | ((prev: T) => T)) => {
            s.value = typeof value === 'function' ? (value as (prev: T) => T)(s.value as T) : value;
        };

        return [c, set];
    };

    /**
     * useReducer emulation
     * @param fn - reducer function
     * @returns [state, dispatch] – state signal and dispatch function
     */
    const useReducer = <S, A>(
        fn: (state: S, action: A) => S,
        init: S | (() => S)
    ): [Signal<S>, (action: A) => void] => {
        const s = signal<S>(typeof init === 'function' ? (init as () => S)() : init);
        const c = computed(() => s.value);
        const dispatch = (action: A) => {
            batch(() => {
                s.value = fn(s.value, action);
            });
        };

        return [c, dispatch];
    };

    const utils = {
        signal, computed, effect: preactEffect,
        untracked, batch, createModel, action,
        // emulations
        state: useState, reducer: useReducer,
        // context
        context,
        // unique identifiers
        id,
        // routing
        url: readonlyUrl, navigate,
        // intl
        lang: readonlyLang, setLang,
        // lifecycle
        onMount, onDestroy,
        // special components
        Portal, Catch, For, Defer
    };
    const componentModel = new ComponentModel({
        type, props, utils
    }) as unknown as (TPreffXItem & {root: any;});
    const componentRoot = componentModel.root;
    onMountCallback(componentRoot, () => {
        callbacks.mount.forEach((fn) => fn());
    });
    onDestroyCallback(componentRoot, () => {
        callbacks.destroy.forEach((fn) => fn());
        componentModel[Symbol.dispose]();
    });

    return componentRoot;
}
