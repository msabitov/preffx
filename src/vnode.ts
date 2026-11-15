// common types
import type { HydrateCursor, RootScope } from './types';
// common deps
import { LIBRARY } from './utils/constants';

/**
 * Marker key distinguishing a VNode from a ready DOM/SSR node
 */
export const VNODE = Symbol(LIBRARY + '.vnode');

/**
 * Pure description of an element or a component
 */
export type VNode = {
    [VNODE]: true;
    type: string | Function;
    props: Record<string, any>;
};

/**
 * True if the value is a VNode
 */
export const isVNode = (val: any): val is VNode =>
    !!val && typeof val === 'object' && val[VNODE] === true;

/**
 * Copy props and normalize `children` to an array
 */
const normalizeProps = (rawProps?: Record<string, any>): Record<string, any> => {
    const props = rawProps ? {...rawProps} : {};
    if (Object.hasOwn(props, 'children') && !Array.isArray(props.children)) {
        props.children = [props.children];
    }
    return props;
};

/**
 * Create a VNode.
 * Pure: does not read ambient state and does not create nodes.
 */
export function h(type: string | Function, rawProps?: Record<string, any>): VNode {
    return { [VNODE]: true, type, props: normalizeProps(rawProps) };
}

/**
 * Materialize a value into a CSR/SSR node
 */
export function materialize(value: any, scope: RootScope, cursor?: HydrateCursor): any {
    if (isVNode(value)) {
        const env = scope.env;
        if (!env) throw new Error('materialize() requires a scope with env');
        return typeof value.type === 'function'
            ? env.component({ type: value.type, props: value.props }, scope, cursor)
            : env.node({ type: value.type, props: value.props }, scope, cursor);
    }
    if (Array.isArray(value)) {
        return value.map((item) => materialize(item, scope, cursor)).flat();
    }
    return value;
}
