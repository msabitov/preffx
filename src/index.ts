import type { PC, APC, PreffXRootParams } from './types';
import { node } from './reactive/node';
import { component, setRootState, Fragment } from './reactive/component';
import { childrenEffects } from './reactive/children';
import { destroy, isArray, mount } from './utils/core';
import { signal as preactSignal, computed as preactComputed } from '@preact/signals-core';

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

    return {
        /**
         * Mount JSX
         * @param content - JSX to render
         */
        mount<T extends object>(type: PC<T> | APC<T>, props: object = {}) {
            setRootState({
                ...(params || {}),
                utils: {
                    lang: readonlyLang, setLang
                }
            });
            children = h(type, props);
            clearEffects = childrenEffects({
                root, children
            });
            mount(children);
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
