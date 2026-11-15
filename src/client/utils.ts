import type { HydrateCursor, RootScope } from '../types';
import { isSignal, isPromise, isArray } from '../utils/core';
import { isVNode, materialize } from '../vnode';
import { hydrateText } from './hydration';

/**
 * Global document
 */
const globalDoc: Document = globalThis.document;

/**
 * True if the value is a DOM Node
 */
export const isNode = (val: any): boolean => val instanceof Node;

/**
 * Create a text node via the client document
 */
export const createTextNode = (value: any): Node => {
    return globalDoc.createTextNode(
        value === null || value === undefined || typeof value === 'boolean' ?
            '' :
            '' + value
        );
};

/**
 * Create an element in the correct namespace (SVG/MathML aware)
 */
export const createNode = (ns: string, name: string, options?: object) => {
    return globalDoc.createElementNS(ns, name, options);
};

/**
 * Unwrap and flatten signals that hold VNodes
 */
export const unwrapDeep = (arg: any): any => {
    if (isArray(arg)) return arg.map(unwrapDeep).flat();
    if (isSignal(arg)) {
        const inner = arg.value;
        if (isVNode(inner) || isArray(inner)) return unwrapDeep(inner);
        return arg;
    }
    return arg;
};

/**
 * Deeply resolve a nodes
 */
export const resolveToNodes = (arg: any, scope: RootScope): any => {
    if (isArray(arg)) return arg.map((item) => resolveToNodes(item, scope)).flat();
    else if (isSignal(arg)) return resolveToNodes(arg.value, scope);
    else if (isVNode(arg)) return resolveToNodes(materialize(arg, scope), scope);
    else if (isNode(arg)) return arg;
    else if (isPromise(arg) || arg === null || arg === undefined || typeof arg === 'boolean') return createTextNode('');
    else return createTextNode(arg);
};

/**
 * Single-pass materialization
 */
export const materializeValue = (value: any, scope: RootScope, cursor?: HydrateCursor): any => {
    if (isArray(value)) return value.map((item) => materializeValue(item, scope, cursor)).flat();
    // signals stay reactive
    else if (isSignal(value)) return value;
    else if (isVNode(value)) return materialize(value, scope, cursor);
    else if (isNode(value)) return value;
    // empty values render nothing on the server,
    // so they must not consume a hydration position
    else if (isPromise(value) || value === null || value === undefined || typeof value === 'boolean' || value === '') return createTextNode('');
    else return hydrateText(cursor, value) || createTextNode(value);
};
