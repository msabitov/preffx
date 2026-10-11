// common types
import type { Resource, ResourceState, RootScope } from '../types';
// common deps
import { effect as preactEffect } from '../state';
import { Renderer } from '../utils/render';
import {
    ResourceArg, ResourceContext,
    resourceKey, makeState, registerBoundary, parseArg
} from '../utils/resource';

export const resource = ({ scope, componentPrefix, signal, batch: b }: ResourceContext) =>
    <T = any>(arg: ResourceArg<T>): Resource<T> => {
        const { fetcher, timeout, initial } = parseArg(arg);
        const key = resourceKey(scope, componentPrefix);
        const res = makeState<T>(signal, initial);
        registerBoundary(key, res.pending as ResourceState['pending']);
        const entry = Renderer.register(scope, key, fetcher, timeout);
        preactEffect(() => {
            const value = entry.state.value;
            b(() => {
                res.state.value = value === undefined ? null : (value as T);
                res.pending.value = value === undefined;
            });
        });
        return [res, () => {}];
    };
