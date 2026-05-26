import type { PC, APC } from './types';
import { node } from './reactive/node';
import { component, Fragment } from './reactive/component';
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
export function createRoot(node: ParentNode) {
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
        mount(content: any) {
            children = content;
            clearEffects = childrenEffects({
                root, children
            });
            // after mount
            mount(children);
        },
        /**
         * Destroy JSX
         */
        destroy() {
            clearEffects?.();
            // before destroy
            destroy(children);
            root.replaceChildren();
        }
    };
};
