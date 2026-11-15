import { Fragment } from './utils/component';
import { h as createVNode, VNode } from './vnode';

/**
 * Create a PreffX virtual node
 */
export function h(
    type: string | Function,
    rawProps?: Record<string, any>
): VNode {
    return createVNode(type, rawProps);
}

export { Fragment };
