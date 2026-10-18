// common types
import type {
    RootUtils,
    RootScope,
    ResourceEntry,
    SuspenseBoundary,
    Env
} from '../types';
// common deps
import { signal as preactSignal } from '../state';

export const pathSymbol = Symbol('preffx-path');
export const routeParamsSymbol = Symbol('preffx-route-params');

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

    /**
     * The scope currently being rendered
     */
    static currentScope: RootScope | undefined;

    /**
     * Stack of open `Suspense` boundaries; `resource()` binds nearest
     */
    static boundaryStack: SuspenseBoundary[] = [];

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
        callback: () => T
    }): T => Renderer.withScope(config);

    /**
     * Get the active rendering scope, or `undefined` outside rendering
     */
    static getScope = (): RootScope | undefined => Renderer.currentScope;

    /**
     * The active node/component environment (client or server),
     *  or `undefined` outside rendering
     */
    static getEnv = (): Env | undefined => Renderer.currentScope?.env;

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
        fetcher: (signal: AbortSignal) => Promise<unknown>,
        timeout?: number
    ): ResourceEntry => {
        const resources = scope.resources ?? (scope.resources = new Map<string, ResourceEntry>());
        const existing = resources.get(key);
        if (existing) return existing;
        const entry: ResourceEntry = {
            fetcher,
            timeout,
            state: preactSignal<unknown>(undefined),
            error: preactSignal<{ message: string; name: string } | null>(null),
            pending: preactSignal<boolean>(true)
        };
        resources.set(key, entry);
        return entry;
    };

    static toRadixString(value: number) {
        return value.toString(Renderer.radix)
    }
}
