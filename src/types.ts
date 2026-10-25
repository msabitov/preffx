import {
    Signal, signal, computed,
    effect, batch, untracked,
    action, createModel,
    ReadonlySignal, SignalOptions
} from './state';

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
     * The scope of the payload is the root prefix
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
export type ResourceState<T = any, E = Error> = {
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
    error: ReadonlySignal<E | null>;
};

/**
 * Resource control API — methods to interact with the resource
 */
export type ResourceHandlers<T = any> = {
    /**
     * Re-run the fetcher
     */
    refetch: () => void;
    /**
     * Optimistically set the resolved value without re-fetching
     */
    mutate: (value: T | null) => void;
    /**
     * Abort the in-flight request and reset `pending`. Does not touch the cache.
     */
    cancel: () => void;
    /**
     * Invalidate the cached entry for this resource's `key`, so the next
     * consumer with the same `key` re-fetches instead of reusing stale data.
     * No-op for positional keys (no cache entry).
     */
    invalidate: () => void;
};

/**
 * `resource(fn)` return value
 */
export type Resource<T = any, E = Error> = [
    result: ResourceState<T, E>,
    hadlers: ResourceHandlers<T>
];

/**
 * Options accepted by `resource()`.
 */
export type ResourceOptions<T = any> = {
    /**
     * Initial state
     */
    initial?: T;
    /**
     * Timeout for resolver
     */
    timeout?: number;
    /**
     * Unique identifier for caching and reusing
     */
    key?: string;
    /**
     * Keep the previous `state` while a refetch / dependency-driven re-run is in flight
     */
    keepPreviousState?: boolean;
};

/**
 * Argument object form of `resource()` — fetcher + options.
 */
export type ResourceArg<T = any> = {
    fetcher: (signal: AbortSignal) => Promise<T>;
    options?: ResourceOptions<T>;
};

/**
 * Runtime context handed to the resource implementation (server & client).
 */
export type ResourceContext = {
    scope: RootScope;
    componentPrefix: string;
    signal: <T>(v: T, options?: SignalOptions<T>) => Signal<T>;
    computed: <T>(fn: () => T, options?: SignalOptions<T>) => ReadonlySignal<T>;
    effect: (fn: () => any) => any;
    onDestroy: (target: any, fn: () => void) => void;
    batch: typeof batch;
};

/**
 * Mutable (writable) resource state used internally by the server/client impls.
 */
export type MutableState<T = any, E = Error> = {
    state: Signal<T | null>;
    error: Signal<E | null>;
    pending: Signal<boolean>;
};

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
     * @param fetcher — async function; receives an AbortSignal for race-guarding
     */
    resource: <T, E = Error>(fetcher: (signal: AbortSignal) => Promise<T>, options?: {
        initial?: T;
        timeout?: number;
        key?: string;
        keepPreviousState?: boolean;
    }) => Resource<T, E>;

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
 * PreffX root environment
 */
export type Env = {
    /**
     * Create a text node
     */
    text: (value: any) => any;
    /**
     * Create a JSX node
     */
    node: (args: { type: string; props: any }) => any;
    /**
     * Create a component instance
     */
    component: (args: { type: Function; props: any }) => any;
};

/**
 * Per-root execution scope. Created once per root in `createRoot`,
 * then passed down the tree via `withScope`.
 */
export type RootScope = {
    /**
     * Environment for current root to create node/component from JSX
     */
    env?: Env;
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
    /**
     * Per-root cache of resolved resource data keyed by explicit `key`.
     * Identical keys reuse the same data.
     * Only populated for resources with an explicit `key`.
     */
    resourceCache?: Map<string, ResourceCacheEntry>;
    /**
     * Client-side hydration state, created lazily by the client `createRoot`
     * and shared down the tree by reference. Absent on the server.
     */
    hydration?: HydrationState;
};

/**
 * Per-root client-side hydration bookkeeping (positional DOM matching + preload data).
 */
export type HydrationState = {
    /**
     * Server-sent hydration data map (per-root preload payload)
     */
    data?: Record<string, unknown>;
    /**
     * Active hydration session: existing elements in walk order
     */
    queue?: Element[];
    /**
     * Read cursor into the current hydrate queue
     */
    index: number;
    /**
     * Per-key hydration subscribers; a map avoids a linear scan
     */
    subs: Map<string, Set<() => void>>;
};

/**
 * A single cached resource data entry (shared by explicit `key`).
 * Holds only the resolved data + error; loading/pending stays per-component
 */
export type ResourceCacheEntry = {
    /**
     * State signal
     */
    state: Signal<unknown>;
    /**
     * Error signal
     */
    error: Signal<Error | null>;
};

/**
 * A single SSR resource entry
 */
export type ResourceEntry = {
    /**
     * Data fetcher, shared between SSR and client
     */
    fetcher: (signal: AbortSignal) => Promise<unknown>;
    /**
     * Max wait (ms) for this resource during the server preload
     */
    timeout?: number;
    /**
     * Reactive resolved value
     */
    state: Signal<unknown>;
    /**
     * Serialized error (message/name) if the preload fetcher rejected
     */
    error?: Signal<{ message: string; name: string } | null>;
    /**
     * Whether the resource has finished loading (preload resolved)
     */
    pending: Signal<boolean>;
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
