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
 * Build a structural element node for the SSR pass
 */
export const node = ({ type, props }: { type: string; props: any }): SSRNode => ({
    kind: NODE,
    type,
    props
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
