// common types
import type { HydrateCursor, HydrationState } from '../types';

export const setHydratedData = (state: HydrationState, data?: Record<string, unknown>): void => {
    state.data = data;
};

export const getHydratedData = (state: HydrationState | undefined): Record<string, unknown> | undefined =>
    state?.data;

/**
 * Create a cursor over the children of `parent`
 */
export const createCursor = (parent: Node): HydrateCursor => ({
    parent,
    index: 0,
    mismatch: false
});

/**
 * Skip server-side text separators (`<!--|-->`) and any other comment nodes
 */
const skipComments = (cursor: HydrateCursor): void => {
    const nodes = cursor.parent.childNodes;
    while (nodes[cursor.index] && nodes[cursor.index].nodeType === 8) cursor.index++;
};

/**
 * Take the element at the cursor position if it matches tag and namespace
 */
export const hydrateNode = (
    cursor: HydrateCursor | undefined,
    expected: { tag: string; ns?: string }
): Element | undefined => {
    if (!cursor || cursor.mismatch) return undefined;
    skipComments(cursor);
    const node = cursor.parent.childNodes[cursor.index];
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
        cursor.mismatch = true;
        return undefined;
    }
    const element = node as Element;
    if (
        element.tagName.toLowerCase() !== expected.tag.toLowerCase() ||
        (expected.ns && element.namespaceURI !== expected.ns)
    ) {
        cursor.mismatch = true;
        return undefined;
    }
    cursor.index++;
    return element;
};

/**
 * Take the text node at the cursor position and update its data
 */
export const hydrateText = (
    cursor: HydrateCursor | undefined,
    value: any
): Text | undefined => {
    if (!cursor || cursor.mismatch) return undefined;
    skipComments(cursor);
    const node = cursor.parent.childNodes[cursor.index];
    if (!node || node.nodeType !== Node.TEXT_NODE) {
        cursor.mismatch = true;
        return undefined;
    }
    cursor.index++;
    const text = node as Text;
    text.data = '' + value;
    return text;
};
