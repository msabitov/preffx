import type { PC, APC, PreffXRootParams, RootScope, PreffXMountConfig } from './types';
import { h, Fragment } from './h';
import { childrenEffects } from './reactive/children';
import { destroy, mount, PREFFX_PRELOAD_ATTR } from './utils/core';
import { signal as preactSignal, computed as preactComputed } from '@preact/signals-core';
import { Renderer } from './utils/render';

export type { PC, APC };

/**
 * Fragment component
 */
export { Fragment };

export { h };

/**
 * Collect every element under `root` in post-order
 * (children before their parent).
 */
const collectPostOrder = (root: ParentNode, acc: Element[] = []): Element[] => [...root.children].reduce((acc, child) => {
    collectPostOrder(child, acc);
    if (child.hasAttribute?.(PREFFX_PRELOAD_ATTR)) return acc;
    acc.push(child);
    return acc;
}, acc);

/**
 * Create PreffX root
 */
export function createRoot(params?: Omit<PreffXRootParams, 'utils'>) {
    let root!: ParentNode;
    const resolveRoot = (n?: ParentNode): ParentNode => {
        if (n) return n == document ? document.documentElement : n;
        return globalThis.document?.body;
    };

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

    // root-specific utils (lang, url, navigate) and user-provided context,
    // shared across every mount of this root
    const utils = rootUtils;
    const baseContext: Record<string | symbol, any> = Renderer.createContext(params?.context);
    const rootContext: Record<string | symbol, any> = {...baseContext};
    const rootScope: RootScope = Renderer.createRootScope(params?.prefix, utils, rootContext);

    return {
        /**
         * Mount JSX.
         * @param type - root component function
         * @param config - mount configuration:
         *   - `node`   — optional container to mount into (defaults to`document.body`)
         *   - `props`  — props for the root component
         *   - `parser` — parser for the root's per-prefix preload script
         */
        mount<T extends object>(
            type: PC<T> | APC<T>,
            config: PreffXMountConfig = {}
        ): void {
            const {
                node,
                props = {},
                parser = JSON.parse
            } = config;
            root = resolveRoot(node);
            const deserialize = (raw: string): Record<string, unknown> | undefined => {
                try {
                    const parsed = parser(raw);
                    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined;
                } catch {
                    return undefined;
                }
            };
            let hydrated: Record<string, unknown> | undefined;
            let queue: Element[] | undefined;
            if (globalThis.document) {
                // Per-root preload script scoped by the root prefix
                let preloadedDataContainer: Element | null = null;
                for (const el of root.querySelectorAll(`script[${PREFFX_PRELOAD_ATTR}]`)) {
                    if (el.getAttribute(PREFFX_PRELOAD_ATTR) === rootScope.prefix) {
                        preloadedDataContainer = el;
                        break;
                    }
                }
                if (preloadedDataContainer) {
                    const data = deserialize(preloadedDataContainer.textContent || '');
                    if (data) {
                        hydrated = data;
                        // Positional queue of every existing element in build-order (post-order)
                        queue = collectPostOrder(root);
                    }
                    preloadedDataContainer.remove();
                }
            }
            if (hydrated) Renderer.setHydratedData(hydrated);
            const scope: RootScope = Renderer.resetScope(rootScope, {...rootContext});
            Renderer.withRootScope({
                scope,
                callback: () => {
                    children = h(type, props);
                    clearEffects = childrenEffects({
                        root, children
                    });
                    mount(children);
                },
                queue
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
