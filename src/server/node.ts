// common types
import type { HydrateCursor, RootScope } from '../types';
// common deps
import { materialize } from '../vnode';
// server deps
import { NODE, SUSPENSE } from './utils';

/**
 * Structural SSR node produced by the server `node()`
 */
export type SSRNode = {
    kind: typeof NODE;
    type: string;
    props: any;
};

/**
 * SSR token from `Suspense` carrying children/fallback and resource keys
 */
export type SuspenseNode = {
    kind: typeof SUSPENSE;
    children: any;
    fallback?: any;
    /**
     * Resource keys belonging to this nearest boundary
     */
    keys: string[];
};

export type SSRValue = SSRNode | SuspenseNode;

/**
 * Materialize the direct VNode children of an element
 */
function materializeChildren(children: any, scope: RootScope, cursor?: HydrateCursor): any {
    if (children === undefined) return children;
    const list = Array.isArray(children) ? children : [children];
    const next = list.map((child) => materialize(child, scope, cursor));
    return Array.isArray(children) ? next : next[0];
}

/**
 * Build a structural element node for the SSR pass
 */
export const node = ({ type, props }: { type: string; props: any }, scope: RootScope): SSRNode => ({
    kind: NODE,
    type,
    props: {
        ...props,
        children: materializeChildren(props?.children, scope)
    }
});

/**
 * Build a suspense token for the SSR pass
 */
export const createSuspenseNode = (
    children: any,
    fallback: any,
    keys: string[]
): SuspenseNode => ({
    kind: SUSPENSE,
    children,
    fallback,
    keys
});
