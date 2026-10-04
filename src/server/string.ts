import type { PC, APC, RootScope, SSRConfig, RenderToStringResult } from '../types';
import { computed as preactComputed } from '../state';
import { h } from '../h';
import { Renderer } from '../utils/render';
import { jsxToStatic, serializeData } from './utils';


/**
 * Server-render a component tree to an HTML string
 */
export const renderToString = (
    component: PC<any> | APC<any>,
    config: SSRConfig = {},
    scope: RootScope
): RenderToStringResult => {
    const {
        serializer = JSON.stringify,
        props = {}
    } = config;
    const resources = scope.resources!;

    const root = Renderer.withRootScope({
        scope,
        callback: () => h(component as any, props)
    });
    const promises = new Map<string, Promise<unknown>>();

    const preload = async (timeout?: number): Promise<void> => {
        await Promise.allSettled([...resources.entries()].map(async ([key, entry]) => {
            // Per-resource timeout overrides the global one; on timeout the page still renders and the client refetches.
            const limit = entry.timeout ?? timeout;
            let resolve = promises.get(key);
            if (!resolve) {
                resolve = (async () => {
                    try {
                        entry.state.value = await entry.fetcher();
                    } catch {
                        entry.state.value = undefined;
                    }
                    return entry.state.value;
                })();
                promises.set(key, resolve);
            }
            if (limit !== undefined) await Promise.race([resolve, new Promise<void>((res) => setTimeout(res, limit))]);
            else await resolve;
        }));
    };

    const html = preactComputed(() => {
        const body = jsxToStatic(root, resources);
        const data = serializeData(resources, serializer, scope.prefix);
        return `${body}${data}`;
    });

    return { preload, serialize: () => html.value };
};
