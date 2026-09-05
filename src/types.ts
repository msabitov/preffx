import {
    Signal, signal, computed,
    effect, batch, untracked,
    action, createModel,
    ReadonlySignal
} from "@preact/signals-core";

/**
 * Root specific utils for i18n
 */
export type IntlRootUtils = {
    lang: ReadonlySignal<string>;
    setLang: (value: string | null) => void;
};

/**
 * Navigate to specified URL
 */
export type Navigate = (
    url: string | URL,
    options?: {
        state?: unknown;
        info?: unknown;
        history?: 'auto' | 'push' | 'replace';
        intercept?: boolean;
    }
) => void;

/**
 * Root specific utils for routing
 */
export type RoutingRootUtils = {
    url: ReadonlySignal<URL>;
    navigate: Navigate;
};

export type PreffXRootParams = {
    /**
     * Prefix for unique ids
     */
    prefix?: string;
    /**
     * Root component context
     */
    context?: Record<string, any>;
    /**
     * Default language for i18n (e.g. 'en', 'ru')
     * If not provided, falls back to <html lang> attribute or ''
     */
    defaultLang?: string;
    /**
     * Default URL for root
     */
    defaultURL?: URL;
    /**
     * Root specific utils
     */
    utils: IntlRootUtils & RoutingRootUtils;
};

/**
 * Mount configuration for `root.mount(type, config)`
 */
export type PreffXMountConfig = {
    /**
     * Optional container to mount into (defaults to `document.body`).
     * `document` itself is normalized to its `documentElement`.
     */
    node?: ParentNode;
    /**
     * Props for the root component
     */
    props?: object;
    /**
     * Parse the server-sent per-root preload data during hydration.
     * The scope of the payload is the root prefix (`data-preffx-preload`).
     * @default JSON.parse
     */
    parser?: (s: string) => unknown;
};

export type SignalWithPrev<T = any> = Signal<T> & {prev: T | undefined};

/**
 * DictProxy — proxy over a resolved dictionary object.
 * Each key becomes a callable property that returns a ReadonlySignal.
 * - For scalar fields: `proxy.title` → `ReadonlySignal<string>` (computed)
 * - For function fields: `proxy.greet('John')` → `ReadonlySignal<string>` (also computed)
 */
export type DictProxy<T extends object> = {
    [K in keyof T]: T[K] extends (...args: infer P) => infer R
        ? (...args: P) => ReadonlySignal<R>
        : ReadonlySignal<T[K]>;
};

type PreffXContext = Record<string | symbol, any>;

/**
 * Read-only snapshot of a resource's lifecycle
 */
export type ResourceState<T = any> = {
    /**
     * Resolved data (or `null` while loading / after error).
     */
    state: ReadonlySignal<T | null>;
    /**
     * Resource is processing 
     */
    pending: ReadonlySignal<boolean>;
    /**
     * Resource processing error
     */
    error: ReadonlySignal<Error | null>;
};

/**
 * `resource(fn)` return value
 */
export type Resource<T = any> = [
    result: ResourceState<T>,
    refetch: () => void
];

export type PreffXUtils<C extends PreffXContext = PreffXContext> = {
    // signal utils

    /**
     * Create a new signal
     * @param value — initial value
     */
    signal: typeof signal;
    /**
     * Create a computed signal
     * @param fn - computation callback.
     * @returns A new read-only signal.
     */
    computed: typeof computed;
    /**
     * Create signal effect
     * @param fn - effect callback.
     */
    effect: typeof effect;
    /**
     * Combine multiple value updates into one
     * @param fn - callback function
     */
    batch: typeof batch;
    /**
     * Run a callback without subscribing to the signals
     * @param fn - callback function
     */
    untracked: typeof untracked;
    action: typeof action;
    createModel: typeof createModel;
    // component utils

    /**
     * Context object
     */
    context: C;
    /**
     * Get unique id
     */
    id: () => string;
    /**
     * Page URL
     */
    url: ReadonlySignal<URL>;
    /**
     * Navigate to a specific URL
     */
    navigate: Navigate;
    /**
     * Route params
     */
    routeParams: Record<string, string>;
    /**
     * Routing utility - first-match-wins
     */
    routes: (paths: Record<string, PC | APC>) => ReadonlySignal<any>;
    /**
     * Language signal — tracks <html lang="..."> attribute
     */
    lang: ReadonlySignal<string>;
    /**
     * Set language — updates <html lang="..."> attribute and lang signal
     * @param value - language code (e.g. 'en', 'ru')
     */
    setLang: (value: string) => void;
    /**
     * Dictionary — returns a DictProxy where each field is a callable signal
     * @param resolvers
     * @param initial
     */
    dict: <T extends object>(resolvers: Record<string, () => (T | Promise<T>)>, initial?: T) => DictProxy<T>;
    /**
     * useState-like hook
     * @param initial — initial value or factory function
     */
    state: <T>(initial: T | (() => T)) => [ReadonlySignal<T>, (value: T | ((prev: T) => T)) => void];
    /**
     * useReducer-like hook
     * @param fn — reducer function
     * @param init — initial state or factory function
     */
    reducer: <S, A>(fn: (state: S, action: A) => S, init: S | (() => S)) => [ReadonlySignal<S>, (action: A) => void];
    /**
     * Async resource
     * on the server it registers its fetcher for `preload()` instead of running an effect;
     * on the client it runs a source-tracking effect and returns a tuple `[res, refetch]`
     * @param fetcher — async function; optional AbortSignal for race-guarding
     */
    resource: {
        <T>(fetcher: (signal?: AbortSignal) => Promise<T>): Resource<T>;
        <T>(params: {
            fetcher: (signal?: AbortSignal) => Promise<T>,
            initial?: T;
            timeout?: number;
        }): Resource<T>;
   };

    // lifecycle

    /**
     * Run callback after component mounted
     * @param fn - callback function
     */
    onMount: (fn: () => void) => void;
    /**
     * Run callback before component destroyed
     * @param fn - callback function
     */
    onDestroy: (fn: () => void) => void;

    // basic components

    /**
     * Render the list
     */
    For: PC<{
        /**
         * List items
         */
        items: Signal<any[]>;
        /**
         * Function that returns JSX for each item
         * @param item - list item
         */
        callback: (item: any) => any;
        /**
         * JSX content for empty list
         */
        fallback: any;
    }>;
    /**
     * Catch errors
     */
    Catch: PC<{
        /**
         * JSX of function that should be used when errors are catched
         */
        fallback: any;
        /**
         * JSX content inside
         */
        children?: any | any[];
    }>;
    /**
     * Render JSX outside the root
     */
    Portal: PC<{
        /**
         * Portal root
         */
        root: HTMLElement;
        /*
         * JSX content
         */
        children?: any | any[];
    }>;
    /**
     * Defer value render
     */
    Defer: PC<{
        /**
         * Initial value
         */
        initial?: any;
        /**
         * Deferred value
         */
        value: Signal<any>;
    }>;
    /**
     * Suspense boundary around resources
     */
    Suspense: PC<{
        /**
         * JSX content resolver
         */
        callback: () => any;
        /**
         * JSX fallback content resolver
         */
        fallback?: any;
    }>;
}

/**
 * PreffX component
 */
export type PC<T extends object = object, C extends PreffXContext = PreffXContext> = (props: T, utils: PreffXUtils<C>) => any;
/**
 * Async PreffX component
 */
export type APC<T extends object = object, C extends PreffXContext = PreffXContext> = (props: T, utils: PreffXUtils<C>) => Promise<any>;

/**
 * Root utils type (lang/url/navigate), same shape as preact for component utils
 */
export type RootUtils = PreffXRootParams['utils'];

/**
 * Per-root execution scope. Created once per root in `createRoot`,
 * then passed down the tree via `withScope`.
 */
export type RootScope = {
    /**
     * Component id prefix, unique per root (e.g. 'fx1')
     */
    prefix: string;
    /**
     * Root component context (user-visible)
     */
    context: Record<string | symbol, any>;
    /**
     * Shared component counter across the whole root.
     * Reset on each mount
     */
    shared: { index: number };
    /**
     * Root-specific utils
     */
    utils: RootUtils;
    /**
     * Per-component id counter
     */
    idCounter: number;
    /**
     * Shared resource counter across the whole root
     */
    resourceIndex: number;
    /**
     * SSR resource map (only during server rendering)
     */
    resources?: Resources;
};

/**
 * A single SSR resource entry
 */
export type ResourceEntry = {
    /**
     * Data fetcher, shared between SSR and client
     */
    fetcher: (signal?: AbortSignal) => Promise<unknown>;
    /**
     * Max wait (ms) for this resource during the server preload
     */
    timeout?: number;
    /**
     * Reactive resolved value
     */
    state: Signal<unknown>;
};

/**
 * SSR resource map. Absent on the client.
 */
export type Resources = Map<string, ResourceEntry>;

/**
 * An active Suspense boundary while its `callback` is being resolved.
 */
export type SuspenseBoundary = {
    /** Resource keys created inside this boundary (nearest-wins, deduped). */
    keys: string[];
    /** Client-side `pending` signals to aggregate for the fallback decision. */
    pending: Array<ReadonlySignal<boolean>>;
};

/** Active hydration session: existing DOM elements in walk order (positional matching) */
export type HydrateQueue = Element[] | undefined;

/**
 * Options accepted by `renderToString`.
 */
export type SSRConfig = {
    /** Props for the root component. */
    props?: object;
    /** Resource serializer. */
    serializer?: (v: unknown) => string;
};

export type RenderToStringResult = {
    /** Resolve every SSR resource, optionally with a per-resource timeout. */
    preload(timeout?: number): Promise<void>;
    /** Emit the HTML string (markup + per-root preload script) from the preloaded data. */
    serialize(): string;
};
