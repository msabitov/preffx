import type {
    RootUtils,
    RootScope,
    ResourceEntry,
    SuspenseBoundary,
    HydrateQueue
} from '../types';
import { batch, signal as preactSignal, computed as preactComputed } from '../state';

export const pathSymbol = Symbol('preffx-path');
export const routeParamsSymbol = Symbol('preffx-route-params');

/**
 * Structural SSR node from `node()`; `isSSRNode` uses instanceof
 */
export class SSRNode {
    type: string;
    props: any;
    constructor(type: string, props: any) {
        this.type = type;
        this.props = props;
    }
}

/**
 * Build a structural node for the SSR pass
 */
export const ssrNode = ({type, props}: {type: string; props: any;}): SSRNode => new SSRNode(type, props);

/**
 * Narrow type guard for SSR structural nodes
 */
export const isSSRNode = (val: any): boolean =>
    val instanceof SSRNode;

/**
 * SSR token from `Suspense` carrying children/fallback and resource keys
 */
export class SuspenseNode {
    children: any;
    fallback?: any;
    /** Resource keys belonging to this nearest boundary */
    keys: string[];
    constructor(children: any, fallback: any, keys: string[]) {
        this.children = children;
        this.fallback = fallback;
        this.keys = keys;
    }
}

export const isSuspenseNode = (val: any): boolean =>
    val instanceof SuspenseNode;

/**
 * Server subset of client root options, keeping SSR/hydration consistent.
 */
export type SSRScopeOptions = {
    prefix?: string;
    context?: Record<string, any>;
    defaultLang?: string;
    defaultURL?: URL | string;
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

/**
 * Boundary utilities, exposed as static members
 */
export class Renderer {
    static radix: number = 36;

    /**
     * Auto-generated root prefixes (`fx<N>_`) share a single counter
     */
    static rootCount = 0;

    /**
     * Compute a root prefix: explicit or auto-generated `fx<N>_`
     */
    static nextPrefix = (prefix?: string): string =>
        prefix || 'fx' + (++Renderer.rootCount) + '_';

    static document: Document = globalThis.document;

    /**
     * True when no `window` exists (server/SSR pass)
     */
    static ssrMode: boolean = typeof window === 'undefined';

    /**
     * The scope currently being rendered
     */
    static currentScope: RootScope | undefined;

    /**
     * Stack of open `Suspense` boundaries; `resource()` binds nearest
     */
    static boundaryStack: SuspenseBoundary[] = [];

    /**
     * Server-sent hydration data map (per-root preload payload)
     */
    static hydratedData: Record<string, unknown> | undefined;

    /**
     * Active hydration session: existing elements in walk order
     */
    static hydrateStack: HydrateQueue[] = [];
    static hydrateQueue: HydrateQueue;
    /**
     * Read cursor into the current hydrate queue
     */
    static hydrateIndex = 0;

    /**
     * Per-key hydration subscribers; a map avoids a linear scan
     */
    static hydrationSubs = new Map<string, Set<() => void>>();

    /**
     * Fire every subscriber waiting on `key`, clearing its queue
     */
    static notifyHydrated = (key: string): void => {
        const set = Renderer.hydrationSubs.get(key);
        if (!set) return;
        Renderer.hydrationSubs.delete(key);
        const notified = new Set(set);
        if (notified.size) {
            batch(() => notified.forEach((fn) => fn()));
        }
    };

    /**
     * True when running on the server (SSR pass)
     */
    static isServerSide = (): boolean => Renderer.ssrMode;

    static createContext = (context?: object): Record<string | symbol, any> => {
        return {
            ...(context || {}),
            [pathSymbol]: preactSignal('/'),
            [routeParamsSymbol]: {}
        };
    }

    /**
     * Run `fn` while `scope` is active, restoring the previous scope
     */
    static withScope = <T>(config: {
        scope: RootScope | undefined,
        callback: () => T
    }): T => {
        const { callback, scope } = config;
        const prev = Renderer.currentScope;
        Renderer.currentScope = scope;
        try {
            return callback();
        } finally {
            Renderer.currentScope = prev;
        }
    };

    /**
     * Run `fn` while root `scope` is active
     */
    static withRootScope = <T>(config: {
        scope: RootScope | undefined,
        callback: () => T,
        queue?: Element[]
    }): T => {
        const { callback, scope, queue } = config;
        // Positional hydration only when server produced per-root preload data.
        if (queue) {
            Renderer.hydrateStack.push(Renderer.hydrateQueue);
            Renderer.hydrateQueue = queue.length ? queue : undefined;
            Renderer.hydrateIndex = 0;
        }
        const result = Renderer.withScope({ scope, callback });
        if (queue) {
            Renderer.hydrateQueue = Renderer.hydrateStack.pop();
            Renderer.setHydratedData(undefined);
        }
        return result;
    };

    /**
     * Get the active rendering scope, or `undefined` outside rendering
     */
    static getScope = (): RootScope | undefined => Renderer.currentScope;

    /**
     * Create a fresh root scope for a mount
     */
    static createRootScope = (
        customPrefix: string | undefined,
        utils: RootUtils,
        context: Record<string | symbol, any> = {}
    ): RootScope => {
        const prefix = Renderer.nextPrefix(customPrefix);
        return {
            prefix,
            context,
            shared: { index: 0 },
            utils,
            idCounter: 0,
            resourceIndex: 0
        };
    };

    /**
     * Reset a reused root scope for a fresh mount
     */
    static resetScope = (
        scope: RootScope,
        context: Record<string | symbol, any>
    ): RootScope => {
        scope.context = context;
        scope.idCounter = 0;
        scope.resourceIndex = 0;
        scope.shared = { index: 0 };
        return scope;
    };

    /**
     * App-scope engine shared by client and server `createRoot`
     */
    static createAppScope = (
        options: SSRScopeOptions = {}
    ): RootScope => {
        const prefix = Renderer.nextPrefix(options?.prefix);
        const lang = preactSignal(options?.defaultLang ?? '');
        const url = preactComputed(() => new URL(
            options?.defaultURL ? String(options.defaultURL) : 'http://localhost'
        ));
        const utils = {
            lang: preactComputed(() => lang.value || options?.defaultLang || ''),
            setLang: () => {},
            url,
            navigate: () => {}
        } as unknown as RootUtils;
        const context: Record<string | symbol, any> =
            Renderer.createContext(options?.context);
        return Renderer.createRootScope(prefix, utils, context);
    };

    /**
     * Reset a reused SSR scope per render: fresh counters, context, resources
     */
    static resetSSRScope = (
        scope: RootScope,
        context: Record<string | symbol, any>
    ): RootScope => {
        scope.context = context;
        scope.idCounter = 0;
        scope.resourceIndex = 0;
        scope.shared = { index: 0 };
        scope.resources = new Map<string, ResourceEntry>();
        return scope;
    };

    /**
     * Enter the nearest-enclosing boundary context for the duration of `fn`
     */
    static inBoundary = <T>(b: SuspenseBoundary, fn: () => T): T => {
        Renderer.boundaryStack.push(b);
        try {
            return fn();
        } finally {
            Renderer.boundaryStack.pop();
        }
    };

    /**
     * The innermost currently-open boundary, or `undefined` outside Suspense
     */
    static currentBoundary = (): SuspenseBoundary | undefined =>
        Renderer.boundaryStack[Renderer.boundaryStack.length - 1];

    /**
     * Register a resource fetcher into the root's `resources` map under `key`,
     * deduplicating so concurrent preloads share one entry
     */
    static register = (
        scope: RootScope,
        key: string,
        fetcher: (signal?: AbortSignal) => Promise<unknown>,
        timeout?: number
    ): ResourceEntry => {
        const resources = scope.resources ?? (scope.resources = new Map<string, ResourceEntry>());
        const existing = resources.get(key);
        if (existing) return existing;
        const entry: ResourceEntry = {
            fetcher,
            timeout,
            state: preactSignal<unknown>(undefined)
        };
        resources.set(key, entry);
        return entry;
    };

    static toRadixString(value: number) {
        return value.toString(Renderer.radix)
    }

    static createElement = (ns: keyof typeof NS, name: string, options?: object) => {
        return Renderer.document.createElementNS(NS[ns || TAG_NS[name] || 'html'], name, options);
    };

    /**
     * Create a text node via the renderer's abstracted document
     */
    static createTextNode = (value: any): Node => {
        if (value === null || value === undefined || typeof value === 'boolean') {
            return Renderer.document.createTextNode('');
        }
        return Renderer.document.createTextNode(String(value));
    };

    /**
     * Subscribe for a callback to run once any of `keys` arrives hydrated
     */
    static whenHydrated = (keys: string[], fn: () => void): (() => void) => {
        // Already present → run now, no subscription needed.
        if (keys.some((k) => Renderer.hydratedData && Object.hasOwn(Renderer.hydratedData, k))) {
            fn();
            return () => {};
        }
        // Register against every still-missing key; callback fires once
        for (const key of keys) {
            if (Renderer.hydratedData && Object.hasOwn(Renderer.hydratedData, key)) continue;
            let set = Renderer.hydrationSubs.get(key);
            if (!set) Renderer.hydrationSubs.set(key, set = new Set());
            set.add(fn);
        }
        return () => {
            for (const key of keys) {
                const set = Renderer.hydrationSubs.get(key);
                set?.delete(fn);
                if (set && set.size === 0) Renderer.hydrationSubs.delete(key);
            }
        };
    };

    /**
     * Point the hydration map at fresh data; every present key counts hydrated
     */
    static setHydratedData = (data?: Record<string, unknown>): void => {
        Renderer.hydratedData = data;
        if (data) Object.keys(data).forEach(Renderer.notifyHydrated);
    };
    static getHydratedData = () => Renderer.hydratedData;

    /**
     * True while a hydration session is active
     */
    static isHydrateActive = (): boolean => !!Renderer.hydrateQueue;

    /**
     * Pop the next existing element for the current `node()` call.
     */
    static takeHydrateNode = (): Element | undefined => {
        const q = Renderer.hydrateQueue;
        if (!q) return undefined;
        return q[Renderer.hydrateIndex++];
    };
}
