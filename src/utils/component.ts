// common types
import {
    PC, APC, DictProxy, RootScope, HydrateCursor,
    Resource, ResourceArg, ResourceContext, ResourceOptions
} from '../types';
// common deps
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
    destroy, isPromise, isSignal, resolveDeepRawValue, resolveValue, onDestroyCallback,
} from '../utils/core';
import { matchPath } from '../utils/routing';
import { pathSymbol, Renderer, routeParamsSymbol } from '../utils/render';
import { h, materialize } from '../vnode';

type RoutesPaths = Record<string, PC<any> | APC<any>>;

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
                    return h(fallback, {
                        ...props,
                        errors
                    });
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

/**
 * `For` component factory
 */
export const createFor = (scope: RootScope, cursor?: HydrateCursor): PC<{
    items: Signal<any[]>;
    callback: (item: any) => any;
    fallback: any;
}> => ({items, callback, fallback}, {
    signal,
    computed,
    effect,
    onMount, onDestroy
}) => {
    const cache = signal(new Map<any, any>());
    const prev = signal<any[]>([]);
    const getNextCache = (item: any, val: any) => {
        const nextMap = new Map(cache.peek().entries());
        return nextMap.set(item, val);
    };

    // to use hydration positions only for the first pass
    let hydrating = !!cursor;

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
                    cache.value = getNextCache(item, materialize(
                        callback(value), scope, hydrating ? cursor : undefined
                    ));
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
        // to avoid hydrations for the next calls
        hydrating = false;
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

export type ComponentEnv = {
    /**
     * `Portal` component factory
     */
    createPortal: (scope: RootScope) => PC<any>;
    /**
     * `For` component factory
     */
    createFor: (scope: RootScope, cursor?: HydrateCursor) => PC<any>;
    /**
     * `Suspense` component factory
     */
    createSuspense: (scope: RootScope, cursor?: HydrateCursor) => PC<any>;
    resource: (ctx: ResourceContext) => <T, E = Error>(fetcher: ResourceArg<T>['fetcher'], options?: ResourceOptions<T>) => Resource<T, E>;
    signal: <T>(v: T, options?: SignalOptions<T>) => Signal<T>;
    computed: <T>(fn: () => T, options?: SignalOptions<T>) => ReadonlySignal<T>;
    effect: (fn: () => any) => any;
    /**
     * Create a component instance from the resolved props/utils.
     * Client: wraps in a reactive `ComponentModel`; Server: calls `type` directly.
     */
    render: (args: {
        type: Function;
        props: any;
        utils: any;
        scope: RootScope;
        callbacks: { mount: Set<Function>; destroy: Set<Function> };
        cursor?: HydrateCursor;
    }) => any;
};

export const createComponent = (env: ComponentEnv) => {
    const { signal, computed, effect, resource, createPortal, createSuspense, createFor, render } = env;

    const component = ({
        type,
        props
    }: {
        type: Function;
        props: any;
    }, parentScope: RootScope, cursor?: HydrateCursor) => {
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

        // create special components with correct scope
        const Portal = createPortal(scope);
        const Suspense = createSuspense(scope, cursor);
        const For = createFor(scope, cursor);

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

        const resolve = (type: Function, props?: any): any => {
            const node = materialize(h(type, props), scope);
            onDestroy(() => destroy(node));
            if (isSignal(node)) {
                const value = node.peek();
                // for async component `then` shim awaits the result
                if (isPromise(value)) return node;
                // error should be thrown
                if (value instanceof Error) throw value;
                // a component may return its own signal
                if (isSignal(value)) return value;
                return value;
            }
            return node;
        };

        // resource bound to this component scope
        const resourceFn = resource({ scope, componentPrefix, signal, computed, effect, onDestroy: onDestroyCallback, batch });

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
                    }, scope);
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
                const langValueParts = langValue.split('-');
                // lang can be "en-US" for example
                const resolver = resolvers[langValue] || langValueParts[0] !== langValue && resolvers[langValueParts[0]] || resolvers['*'];
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

        const utils = {
            signal, computed, effect,
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
            // async jsx
            resolve,
            // special components
            Portal, Catch, For, Defer, Suspense,
            // resources
            resource: resourceFn
        };

        return render({ type, props, utils, scope, callbacks, cursor });
    };
    return component;
};
