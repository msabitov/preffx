// common types
import type {
    PC, APC, PreffXRootParams, RootScope, RootUtils, 
    SSRConfig, RenderToStringResult, ResourceEntry
} from '../types';
// common deps
import { signal as preactSignal, computed as preactComputed } from '../state';
import { Renderer } from '../utils/render';
// server deps
import { node as serverNode } from './node';
import { component as serverComponent } from './component';
import { renderToString } from './string';

/**
 * Server root factory mirroring the client `createRoot`, exposing `renderToString`
 */
export function createRoot(
    config: Omit<PreffXRootParams, 'utils'> = {}
) {
    const { defaultLang, defaultURL } = config;

    // Server subset of root utils, keeping SSR/hydration consistent
    const lang = preactSignal(defaultLang ?? '');
    const url = preactComputed(() => new URL(
        defaultURL ? '' + defaultURL : 'http://localhost'
    ));
    const utils = {
        lang: preactComputed(() => lang.value || defaultLang || ''),
        setLang: () => {},
        url,
        navigate: () => {},
    } as unknown as RootUtils;
    const context: Record<string | symbol, any> =
        Renderer.createContext(config.context);

    // Single reusable scope; `resetScope` per render keeps prefix/context stable while refreshing counters
    const scope: RootScope = Renderer.createRootScope(config.prefix, utils, context);

    const reset = () => {
        const base = Renderer.createContext(config.context);
        const ctx: Record<string | symbol, any> = { ...base };
        scope.resources = new Map<string, ResourceEntry>();
        return Renderer.resetScope(scope, ctx);
    };

    return {
        /**
         * Render the component to an HTML string
         * @param component - root component
         * @param config - per-render `SSRConfig` (props/serializer/hydration)
         */
        renderToString<C extends object>(
            component: PC<C> | APC<C>,
            config: SSRConfig = {}
        ): RenderToStringResult {
            const rootScope = reset();
            rootScope.env = { node: serverNode, component: serverComponent, text: (arg) => '' + arg };
            return renderToString(component, config, rootScope);
        }
    };
}

export default createRoot;