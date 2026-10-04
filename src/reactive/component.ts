import {
    batch,
    computed as preactComputed,
    createModel,
    effect as preactEffect,
    signal as preactSignal,
    untracked,
    Signal,
    action,
    SignalOptions,
    ReadonlySignal,
    state, reducer
} from '../state';
import {
    mount, destroy, onMountCallback, onDestroyCallback,
    isPromise, resolveDeepRawValue, resolveValue, TPreffXItem,
} from '../utils/core';
import { matchPath } from '../utils/routing';
import { childrenEffects } from './children';
import { PC, APC, SignalWithPrev, DictProxy, RootScope, SuspenseBoundary } from '../types';
import { pathSymbol, Renderer, routeParamsSymbol, SuspenseNode } from '../utils/render';
import { createResource } from './resource';

type RoutesPaths = Record<string, PC<any> | APC<any>>;

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
            const cachePeek = cache.peek();
            const val = cachePeek.get(item);
            if (val) destroy(val);
            cachePeek.delete(item);
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
}> = Renderer.isServerSide() ? ({children}) => null : ({root, children}, {
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
}> = Renderer.isServerSide() ? ({ callback, fallback }) => {
        const boundary: SuspenseBoundary = { keys: [], pending: [] };
        const content = Renderer.inBoundary(boundary, callback);
        return new SuspenseNode(content, fallback, boundary.keys);
} : ({ callback, fallback }, { computed }) => {
    const boundary: SuspenseBoundary = { keys: [], pending: [] };
    const content = Renderer.inBoundary(boundary, callback);
    const pending = computed(() => boundary.pending.some((s) => s.value));
    return computed(() => (pending.value ? fallback : content));
};

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
    const parentScope = Renderer.getScope();
    if (!parentScope) throw new Error('component() must be called within a root scope (inside createRoot().mount)');

    // prepare ctx — inherit parent context, extend with routing props
    const parentCtx = parentScope.context;
    const context: Record<string | symbol, any> = {...parentCtx};
    if (props[pathSymbol]) context[pathSymbol] = props[pathSymbol];
    const basePath = context[pathSymbol];
    if (props[routeParamsSymbol]) context[routeParamsSymbol] = props[routeParamsSymbol];
    const routeParams = context[routeParamsSymbol];
    // child scope: own id counter, but shared component counter/prefix/utils with root
    const scope: RootScope = {
        ...parentScope,
        context,
        idCounter: 0
    };
    // each component gets a unique component prefix within the root mount
    const componentPrefix = scope.prefix + Renderer.toRadixString(++scope.shared.index) + '-';
    const id = () => componentPrefix + Renderer.toRadixString(scope.idCounter++);

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
        }, options)  as SignalWithPrev;

        preactEffect(() => {
            const value = rawSignal.value;
            return () => {
                rawSignal.prev = value;
                destroy(rawSignal.prev);
            }
        });
        return rawSignal;
    };
    const effect = (fn: () => any) => preactEffect(() => Renderer.withScope({
        scope,
        callback: fn
    }));

    const resource = createResource({ scope, componentPrefix, signal, effect, onDestroy: onDestroyCallback, batch });

    /**
     * useState emulation
     * @param initial - initial value
     * @returns [signal, set] – state signal and setState function
     */
    const useState = <T>(
        initial: T | (() => T)
    ): [ReadonlySignal<T>, (value: T | ((prev: T) => T)) => void] => {
        return state<T>(initial, { signal, computed });
    };

    /**
     * useReducer emulation
     * @param fn - reducer function
     * @returns [state, dispatch] – state signal and dispatch function
     */
    const useReducer = <S, A>(
        fn: (state: S, action: A) => S,
        init: S | (() => S)
    ): [ReadonlySignal<S>, (action: A) => void] => {
        return reducer<S, A>(fn, init, { signal, computed });
    };
    const routes = (paths: RoutesPaths) => {
        const matchResult = computed(() => {
            const fullPathname = readonlyUrl.value.pathname;

            for (const pattern of Object.keys(paths)) {
                const effectivePattern = pattern.startsWith('/')
                    ? pattern
                    : `${basePath}/${pattern}`.replace(/\/+/g, '/');

                const result = matchPath(effectivePattern, fullPathname);
                if (result) return {result, pattern, effectivePattern};
            }
            return null;
        });

        return computed(() => {
            const paramsValue = matchResult.value;
            if (paramsValue) {
                const {result, pattern, effectivePattern} = paramsValue;
                return component({
                    type: paths[pattern],
                    props: {
                        [pathSymbol]: effectivePattern,
                        [routeParamsSymbol]: result.params
                    }
                });
            }
            return null;
        });
    };

    // Extract per-root lang signal from scope utils
    const readonlyLang = scope.utils.lang;
    const setLang = scope.utils.setLang;
    const readonlyUrl = scope.utils.url;
    const navigate = scope.utils.navigate;

    const dict = <T extends object>(
        resolvers: Record<string, () => (T | Promise<T>)>,
        initial?: T
    ): DictProxy<T> => {
        const dictSignal = preactSignal(initial ?? ({} as T));
        preactEffect(() => {
            const langValue = readonlyLang.value;
            const resolver = resolvers[langValue] || resolvers['*'];
            if (!resolver) {
                dictSignal.value = {} as T;
                return;
            }
            const result = resolver();
            if (!isPromise(result)) {
                dictSignal.value = result as T;
                return;
            }
            let cancelled = false;
            (result as Promise<T>).then(dict => {
                if (!cancelled) dictSignal.value = dict;
            }).catch(() => {
                if (!cancelled) dictSignal.value = {} as T;
            });
            return () => { cancelled = true; };
        });

        // Per-field computed cache (for non-function access)
        const fieldCache = new Map<string, ReadonlySignal<any>>();
        return new Proxy({} as DictProxy<T>, {
            get(_, key) {
                if (typeof key !== 'string') return Reflect.get(_, key);
                const field = () => (dictSignal.value as any)[key];
                // functional field
                if (typeof (dictSignal.peek() as any)[key] === 'function') {
                    return (...args: any[]) => preactComputed(() => field()(...args));
                }
                // scalar field
                if (!fieldCache.has(key)) {
                    fieldCache.set(key, preactComputed(field));
                }
                return fieldCache.get(key)!;
            },
        });
    };

    const ssr = Renderer.isServerSide();
    // swap reactive primitives for static equivalents
    const sig = <T>(arg: T, options?: SignalOptions<T>): Signal<T> =>
        ssr ? preactSignal(arg, options) as SignalWithPrev
            : signal(arg, options);
    const comp = <T>(fn: () => T, options?: SignalOptions<T>) =>
        ssr ? preactComputed(() => Renderer.withScope({
            scope,
            callback: () => {
                try { return fn(); } catch (e) { return e as T; }
            }})) as SignalWithPrev<T>
            : computed(fn, options);
    const eff = (fn: () => any) => {
        if (ssr) { Renderer.withScope({
            scope, callback: fn
        }); return () => {}; }
        return effect(fn);
    };

    const utils = {
        signal: sig, computed: comp, effect: eff,
        untracked, batch, createModel, action,
        // emulations
        state: useState, reducer: useReducer,
        // context
        context,
        // unique identifiers
        id,
        // routing
        url: readonlyUrl, navigate, routes, routeParams,
        // intl
        lang: readonlyLang, setLang, dict,
        // lifecycle
        onMount, onDestroy,
        // special components
        Portal, Catch, For, Defer, Suspense,
        // resources
        resource
    };

    if (ssr) {
        return Renderer.withScope({
            scope,
            callback: () => type({...props}, utils)
        });
    }
    const componentModel = Renderer.withScope({
        scope,
        callback: () => new ComponentModel({
            type, props, utils
        })
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
