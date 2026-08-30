import type { PC, APC, PreffXRootParams, RootScope, SSRConfig, RenderToStringResult } from '../types';
export type { SSRConfig, RenderToStringResult } from '../types';
import { Renderer } from '../utils/render';
import { renderToString } from './string';


/**
 * Server root factory mirroring the client `createRoot`, exposing `renderToString`
 */
export function createRoot(
    config: Omit<PreffXRootParams, 'utils'> = {}
) {
    // Single reusable scope; `resetSSRScope` per render keeps prefix/context stable while refreshing counters
    const scope: RootScope = Renderer.createAppScope({
        prefix: config.prefix,
        context: config.context,
        defaultLang: config.defaultLang,
        defaultURL: config.defaultURL
    });

    const reset = () => {
        const base = Renderer.createContext(config.context);
        const context: Record<string | symbol, any> = { ...base };
        return Renderer.resetSSRScope(scope, context);
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
            const s = reset();
            return renderToString(component, config, s);
        }
    };
}

export default createRoot;