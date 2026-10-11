// common types
import type { PC, SuspenseBoundary } from '../types';
// common deps
import { computed as preactComputed, signal as preactSignal, Signal, SignalOptions } from '../state';
import { Renderer } from '../utils/render';
import { createComponent } from '../utils/component';
// server deps
import { createSuspenseNode } from './node';
import { resource } from './resource';

const Portal: PC<{
    root: HTMLElement;
    children?: any | any[];
}> = () => null;

/**
 * `<Suspense>` boundary — a data boundary around resources
 */
const Suspense: PC<{
    callback: () => any;
    fallback?: any;
}> = ({ callback, fallback }) => {
    const boundary: SuspenseBoundary = { keys: [], pending: [] };
    const content = Renderer.inBoundary(boundary, callback);
    return createSuspenseNode(content, fallback, boundary.keys);
};

const signal = <T>(arg: T, options?: SignalOptions<T>): Signal<T> => preactSignal(arg, options);
const computed = <T>(fn: () => T, options?: SignalOptions<T>) => {
    const scope = Renderer.getScope();
    return preactComputed(() => Renderer.withScope({
        scope,
        callback: () => {
            try { return fn(); } catch (e) { return e as T; }
        }
    }), options);
};
const effect = (fn: () => any) => {
    const scope = Renderer.getScope();
    Renderer.withScope({ scope, callback: fn });
    return () => {};
};

const render = ({ type, props, utils }: {
    type: Function;
    props: any;
    utils: any;
}) => type({...props}, utils);

export const component = createComponent({
    Portal,
    Suspense,
    resource,
    signal,
    computed,
    effect,
    render
});
