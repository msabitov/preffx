import type { PC, APC, PreffXRootParams } from './types';
import { node } from './reactive/node';
import { component, setRootState, Fragment } from './reactive/component';
import { childrenEffects } from './reactive/children';
import { destroy, isArray, mount } from './utils';

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
export function createRoot(node: ParentNode, params?: PreffXRootParams) {
    let root: ParentNode;
    if (node == document) {
        root = document.documentElement;
    } else root = node || document.body;

    let clearEffects: Function;
    let children: any;

    return {
        /**
         * Mount JSX
         * @param content - JSX to render
         */
        mount<T extends object>(type: PC<T> | APC<T>, props: object = {}) {
            setRootState(params);
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
            root.replaceChildren();
        }
    };
};
