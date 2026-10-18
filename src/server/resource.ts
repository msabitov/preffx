// common types
import type { Resource, ResourceState, ResourceArg, ResourceContext, ResourceOptions } from '../types';
// common deps
import { Renderer } from '../utils/render';
import {
    resourceKey, registerBoundary, parseArg
} from '../utils/resource';

// on the server side handlers do nothing
const mockHandler = () => {};

export const resource = ({ scope, componentPrefix, computed }: ResourceContext) => <T = any, E = Error>(
    fetcher: ResourceArg<T>['fetcher'], options?: ResourceOptions<T>
): Resource<T, E> => {
    const { fetcher: fn, timeout, initial, key: customKey } = parseArg(fetcher, options);
    const key = customKey ?? resourceKey(scope, componentPrefix);
    const entry = Renderer.register(scope, key, fn, timeout);
    // `pending` is the single source of truth for resource status
    const res = {
        state: computed<T | null>(() =>
            entry.pending.value ? (initial ?? null) : (entry.state.value as T | null)),
        error: computed<E | null>(() => {
            const e = entry.error?.value;
            if (!e) return null;
            const err = new Error(e.message);
            err.name = e.name;
            return err as E;
        }),
        pending: computed<boolean>(() => entry.pending.value)
    };
    registerBoundary(key, res.pending as ResourceState['pending']);
    return [res, { refetch: mockHandler, mutate: mockHandler, cancel: mockHandler, invalidate: mockHandler }];
};
