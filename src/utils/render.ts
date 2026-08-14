import { PreffXRootParams } from '../types';
import { signal as preactSignal } from '@preact/signals-core';

type PreffXDocument = {
    createElementNS(ns: string, name: string, options?: object): any;
}

/**
 * Path pattern symbol
 */
export const pathSymbol = Symbol('preffx-path');
export const routeParamsSymbol = Symbol('preffx-route-params');

/**
 * Root utils type (lang/url/navigate), same shape as preact for component utils.
 */
export type RootUtils = PreffXRootParams['utils'];

/**
 * Per-root execution scope. Created once per root in `createRoot`,
 * then passed down the tree via `withScope`.
 *
 * Internal data (prefix, shared component counter, root utils, id counter)
 * are stored on the scope object itself under symbol keys, so arbitrary
 * string-based code can't reach them.
 */
export type RootScope = {
    /**
     * Component id prefix, unique per root (e.g. 'fx1_')
     */
    prefix: string;
    /**
     * Root component context (user-visible). Extended with symbol keys
     * for internal routing data (path/route params).
     */
    context: Record<string | symbol, any>;
    /**
     * Shared component counter across the whole root. It's an object so
     * child scopes within the same mount share the same counter.
     * Reset on each mount.
     */
    shared: { index: number };
    /**
     * Root-specific utils (lang, url, navigate, ...).
     */
    utils: RootUtils;
    /**
     * Per-component id counter.
     */
    idCounter: number;
};

const HTML = 'html';
const SVG = 'svg';
const MATHML = 'mathml';

const NS = {
    [HTML]: 'http://www.w3.org/1999/xhtml',
    [SVG]: 'http://www.w3.org/2000/svg',
    [MATHML]: 'http://www.w3.org/1998/Math/MathML'
} as const;

// mapping between tagname and namespace
const TAG_NS: Record<string, keyof typeof NS> = {
    // a - html/svg,
    // image - html/svg,
    // style, script - html/svg
    animate: SVG,
    animateMotion: SVG,
    animateTransform: SVG,
    circle: SVG,
    clipPath: SVG,
    defs: SVG,
    desc: SVG,
    ellipse: SVG,
    feBlend: SVG,
    feColorMatrix: SVG,
    feComponentTransfer: SVG,
    feComposite: SVG,
    feConvolveMatrix: SVG,
    feDiffuseLighting: SVG,
    feDisplacementMap: SVG,
    feDistantLight: SVG,
    feDropShadow: SVG,
    feFlood: SVG,
    feFuncA: SVG,
    feFuncB: SVG,
    feFuncG: SVG,
    feFuncR: SVG,
    feGaussianBlur: SVG,
    feImage: SVG,
    feMerge: SVG,
    feMergeNode: SVG,
    feMorphology: SVG,
    feOffset: SVG,
    fePointLight: SVG,
    feSpecularLighting: SVG,
    feSpotLight: SVG,
    feTile: SVG,
    feTurbulence: SVG,
    filter: SVG,
    foreignObject: SVG,
    g: SVG,
    line: SVG,
    linearGradient: SVG,
    marker: SVG,
    mask: SVG,
    metadata: SVG,
    mpath: SVG,
    path: SVG,
    pattern: SVG,
    polygon: SVG,
    polyline: SVG,
    radialGradient: SVG,
    rect: SVG,
    set: SVG,
    stop: SVG,
    svg: SVG,
    switch: SVG,
    symbol: SVG,
    text: SVG,
    textPath: SVG,
    title: SVG,
    tspan: SVG,
    use: SVG,
    view: SVG,
    // mathml
    math: MATHML,
    annotation: MATHML,
    'annotation-xml': MATHML,
    merror: MATHML,
    mfrac: MATHML,
    mi: MATHML,
    mmultiscripts: MATHML,
    mn: MATHML,
    mo: MATHML,
    mover: MATHML,
    mpadded: MATHML,
    mphantom: MATHML,
    mprescripts: MATHML,
    mroot: MATHML,
    mrow: MATHML,
    ms: MATHML,
    semantics: MATHML,
    mspace: MATHML,
    msqrt: MATHML,
    mstyle: MATHML,
    msub: MATHML,
    msup: MATHML,
    msubsup: MATHML,
    mtable: MATHML,
    mtd: MATHML,
    mtext: MATHML,
    mtr: MATHML,
    munder: MATHML,
    munderover: MATHML
};

const getServerDocument = (): PreffXDocument => {
    const attrs: Record<string, string> = {};
    return {
        createElementNS(ns: string, name: string, options?: object) {
            return {
                addEventListener() {},
                removeEventListener() {},
                setAttribute(name: string, value: any) {
                    attrs[name] = ('' + value);
                },
                removeAttribute(name: string) {
                    delete attrs[name];
                }
            }
        }
    };
}

/**
 * The scope currently being rendered. Set via `withScope`
 * Used to pass the root/child scope down the tree
 */
let currentScope: RootScope | undefined;

/**
 * Run `fn` while `scope` is the active rendering scope, restoring the previous
 * scope afterwards. Stacked, so interleaved roots don't clobber each other
 */
export const withScope = <T>(scope: RootScope | undefined, fn: () => T): T => {
    const prev = currentScope;
    currentScope = scope;
    try {
        return fn();
    } finally {
        currentScope = prev;
    }
};

/**
 * Get the active rendering scope, or `undefined` outside rendering.
 */
export const getScope = (): RootScope | undefined => currentScope;

/**
 * Create a fresh root scope for a mount: counters reset, but the root's
 * fixed prefix (and utils) are preserved across mounts of the same root.
 */
export const createRootScope = (
    prefix: string,
    utils: RootUtils,
    context: Record<string | symbol, any> = {}
): RootScope => {
    return {
        prefix,
        context,
        shared: { index: 0 },
        utils,
        idCounter: 0
    };
};

export class Renderer {
    static radix: number = 36;

    static document: PreffXDocument = globalThis.document || getServerDocument();

    static toRadixString(value: number) {
        return value.toString(Renderer.radix)
    }

    static createElement = (ns: keyof typeof NS, name: string, options?: object) => {
        return Renderer.document.createElementNS(NS[ns || TAG_NS[name] || 'html'], name, options);
    };
}
