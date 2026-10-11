import { Renderer } from './utils/render';
import { Fragment } from './utils/component';
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
    const env = Renderer.getEnv();
    if (!env) throw new Error('h() must be called within root methods (mount / renderToString)');
    if (typeof type === 'function') {
        return env.component({ type, props });
    }
    return env.node({ type, props });
}

export { Fragment };