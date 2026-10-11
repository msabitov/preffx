import { isSignal, isPromise, isArray } from '../utils/core';

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
 * Deeply resolve a value
 */
export const resolveDeepValue = (arg: any): any => {
    if (isArray(arg)) return arg.map(resolveDeepValue).flat();
    else if (isSignal(arg)) return resolveDeepValue(arg.value);
    else if (isNode(arg)) return arg;
    else if (isPromise(arg) || arg === null || arg === undefined || typeof arg === 'boolean') return createTextNode('');
    else return createTextNode(arg);
};
