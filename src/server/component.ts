// common types
import type { PC, SuspenseBoundary, RootScope } from '../types';
// common deps
import {
    computed as preactComputed, signal as preactSignal,
    Signal, SignalOptions, ReadonlySignal
} from '../state';
import { createComponent, createFor } from '../utils/component';
import { materialize } from '../vnode';
// server deps
import { createSuspenseNode } from './node';
import { resource } from './resource';

const createPortal = (): PC<{
    root: HTMLElement;
    children?: any | any[];
}> => () => null;

/**
 * `<Suspense>` component factory
 */
const createSuspense = (scope: RootScope): PC<{
    callback: () => any;
    fallback?: any;
}> => ({ callback, fallback }) => {
    const boundary: SuspenseBoundary = {
        keys: [],
        pending: preactSignal<Array<ReadonlySignal<boolean>>>([])
    };
    const childScope: RootScope = {...scope, boundary};
    const content = materialize(callback(), childScope);
    return createSuspenseNode(content, fallback, boundary.keys);
};

const signal = <T>(arg: T, options?: SignalOptions<T>): Signal<T> => preactSignal(arg, options);
const computed = <T>(fn: () => T, options?: SignalOptions<T>) => {
    return preactComputed(() => {
        try { return fn(); } catch (e) { return e as T; }
    }, options);
};
const effect = (fn: () => any) => {
    fn();
    return () => {};
};

const render = ({ type, props, utils, scope }: {
    type: Function;
    props: any;
    utils: any;
    scope: RootScope;
}) => materialize(type({...props}, utils), scope);

export const component = createComponent({
    createPortal,
    createSuspense,
    createFor,
    resource,
    signal,
    computed,
    effect,
    render
});
