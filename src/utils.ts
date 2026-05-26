import { Signal } from '@preact/signals-core';

// types
export type TPreffXItem = {
    [key in (typeof mountSymbol | typeof destroySymbol | typeof Symbol.dispose)]: Function;
};
// symbols
const mountSymbol = Symbol('PreffX.mount');
const destroySymbol = Symbol('PreffX.destroy');
// base utils
export const isArray = (val: any) => Array.isArray(val);
export const isSignal = (val: any) => val instanceof Signal;
export const isNode = (val: any) => val instanceof Node;
export const isPromise = (fn: any) => fn && fn.then && typeof fn.then === 'function' && fn.catch && typeof fn.catch === 'function';
export const resolveValue = (arg: any): any => isSignal(arg) ? arg.value : arg;
export const resolveDeepValue = (arg: any): any => {
    if (Array.isArray(arg)) return arg.map(resolveDeepValue).flat();
    else if (isSignal(arg)) return resolveDeepValue(arg.value);
    else if (isNode(arg)) return arg;
    else if (isPromise(arg) || arg === null || arg === undefined || typeof arg === 'boolean') return document.createTextNode('');
    else return document.createTextNode(arg + '');
};

export const resolveDeepRawValue = (arg: any): any => {
    if (Array.isArray(arg)) return arg.map(resolveDeepRawValue).flat();
    else if (isSignal(arg)) return resolveDeepRawValue(arg.value);
    else return arg;
};

// lifecycle
export const onMountCallback = (val: any, callback: Function) => val && (val[mountSymbol] = callback);
export const onDestroyCallback = (val: any, callback: Function) => val && (val[destroySymbol] = callback);
export const mount = (arg: any) => {
    if (isSignal(arg)) {
        const val = arg.value;
        if (isPromise(val)) return;
        else mount(val);
    } else if (isArray(arg)) arg.forEach(mount);
    arg && arg[mountSymbol] && arg[mountSymbol]();
}
export const destroy = (arg: any) => {
    arg && arg[destroySymbol] && arg[destroySymbol]();
    if (isSignal(arg)) destroy(arg.value);
    else if (isArray(arg)) arg.forEach(destroy);
};
