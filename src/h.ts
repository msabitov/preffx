import { node } from './reactive/node';
import { component, Fragment } from './reactive/component';
import { isArray } from './utils/core';

/**
 * Create PreffX reactive nodes/components
 */
export function h(
    type: string | Function,
    rawProps: Record<string, any>
) {
    const props = rawProps ? {...rawProps} : {};
    if (Object.hasOwn(props, 'children') && !isArray(props.children)) props.children = [props.children];
    if (typeof type === 'function') {
        return component({ type, props });
    }
    return node({ type, props });
}

export { Fragment };