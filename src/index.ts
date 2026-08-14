import type { PC, APC, PreffXRootParams } from './types';
import { node } from './reactive/node';
import { component, Fragment } from './reactive/component';
import { childrenEffects } from './reactive/children';
import { destroy, isArray, mount } from './utils/core';
import { signal as preactSignal, computed as preactComputed } from '@preact/signals-core';
import { withScope, pathSymbol, routeParamsSymbol, createRootScope, RootScope } from './utils/render';

export type { PC, APC };

/**
 * Fragment component
 */
export { Fragment };

/**
 * Create PreffX reactive nodes/components
 */
export function h(
    /**
     * The node name or Component constructor
     */
    type: string | Function,
    /**
     * The properties of the virtual node
     */
    rawProps: Record<string, any>
) {
    const props = rawProps ? {...rawProps} : {};
    // children should be array
    if (Object.hasOwn(props, 'children') && !isArray(props.children)) props.children = [props.children];
    // create component
    if (typeof type === 'function') {
        // returns component signal
        return component({
            type,
            props
        });
    }
    // returns node
    return node({
        type,
        props
    });
};

let ROOT_COUNT = 0;

/**
 * Create PreffX root
 */
export function createRoot(node: ParentNode, params?: Omit<PreffXRootParams, 'utils'>) {
    let root: ParentNode;
    if (node == document) {
        root = document.documentElement;
    } else root = node || document.body;

    let clearEffects: Function;
    let children: any;

    // root language signal
    const rawLang = params?.defaultLang !== undefined
        ? params.defaultLang
        : globalThis.document?.documentElement?.getAttribute('lang') || '';
    const langSignal = preactSignal(rawLang);
    const readonlyLang = preactComputed(() => langSignal.value || params?.defaultLang || '');

    const setLang = (value: string | null) => {
        globalThis.document?.documentElement?.setAttribute('lang', value || params?.defaultLang || '')
    };

    // observe <html lang> attribute changes and sync
    const htmlElement = globalThis.document?.documentElement;
    let langObserver: MutationObserver | null = null;
    if (htmlElement) {
        langObserver = new MutationObserver(() => langSignal.value = htmlElement.getAttribute('lang') || '');
        langObserver.observe(htmlElement, { attributes: true, attributeFilter: ['lang'] });
    }

    // root URL signal
    // Detached routing (signal-managed navigation) is implied when a custom `defaultURL` is provided
    // or when the browser Navigation API is unavailable (SSR / headless environment)
    const useDetachedRouting = !!params?.defaultURL || !globalThis.navigation;
    const rawUrl = params?.defaultURL || globalThis.location.href;
    let URL_WATCHERS = 0;
    const urlSignal = preactSignal(new URL(rawUrl), {
        watched: () => { URL_WATCHERS++; },
        unwatched: () => { URL_WATCHERS--; }
    });
    const readonlyUrl = preactComputed(() => urlSignal.value);

    // navigation listener
    const globalNavigation = useDetachedRouting ? undefined : globalThis.navigation;
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

    const resolveUrl = (url: string | URL) => {
        // resolve relative paths against the current URL so the signal always holds a URL
        return url instanceof URL
            ? url
            : new URL(url, urlSignal.peek().href);
    };

    const navigate = (url: string | URL, options?: any) => {
        if (useDetachedRouting) {
            urlSignal.value = resolveUrl(url);
            return;
        }
        return globalNavigation?.navigate(url, options);
    };

    const rootUtils = {
        lang: readonlyLang, setLang,
        url: readonlyUrl, navigate: navigate as unknown as Navigation['navigate']
    };

    // the root prefix is fixed at root creation time (even before mount),
    const prefix = params?.prefix || 'fx' + (++ROOT_COUNT) + '_';

    // root-specific utils (lang, url, navigate) and user-provided context,
    // shared across every mount of this root
    const utils = rootUtils;
    const baseContext: Record<string | symbol, any> = {
        ...(params?.context || {}),
        [pathSymbol]: preactSignal('/'),
        [routeParamsSymbol]: {}
    };

    // shared per-root context object that gets copied per mount (so a fresh
    // context is used each mount, while the routing symbols stay consistent)
    const rootContext: Record<string | symbol, any> = {...baseContext};

    return {
        /**
         * Mount JSX
         * @param content - JSX to render
         */
        mount<T extends object>(type: PC<T> | APC<T>, props: object = {}) {
            // fresh scope per mount: counters reset, but the root prefix stays
            const scope: RootScope = createRootScope(prefix, utils, {...rootContext});
            withScope(scope, () => {
                children = h(type, props);
                clearEffects = childrenEffects({
                    root, children
                });
                mount(children);
            });
        },
        /**
         * Destroy JSX
         */
        destroy() {
            destroy(children);
            clearEffects?.();
            langObserver?.disconnect();
            root.replaceChildren();
        }
    };
};
