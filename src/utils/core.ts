import { Signal, untracked } from '../state';
import { LIBRARY, LIBRARY_LOWER } from './constants';

// types
export type TPreffXItem = {
    [key in (typeof mountSymbol | typeof destroySymbol | typeof Symbol.dispose)]: Function;
};
// symbols
const mountSymbol = Symbol(LIBRARY + '.mount');
const destroySymbol = Symbol(LIBRARY + '.destroy');
const runOnce = (arg: any, key: any) => {
    const callback = arg && arg[key]
    if (callback) {
        delete arg[key];
        callback();
    }
};
// per-root preload script attribute which value is root prefix
export const PREFFX_PRELOAD_ATTR = `data-${LIBRARY_LOWER}-preload`;
// base utils
export const isArray = (val: any) => Array.isArray(val);
export const isSignal = (val: any) => val instanceof Signal;
export const isPromise = (fn: any) => fn && fn.then && typeof fn.then === 'function' && fn.catch && typeof fn.catch === 'function';
export const resolveValue = (arg: any): any => isSignal(arg) ? arg.value : arg;
export const kebabCase = (str: string): string => str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());
export const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const resolveDeepRawValue = (arg: any): any => {
    if (Array.isArray(arg)) return arg.map(resolveDeepRawValue).flat();
    else if (isSignal(arg)) return resolveDeepRawValue(arg.value);
    else return arg;
};

// lifecycle
export const onMountCallback = (val: any, callback: Function) => val && (val[mountSymbol] = callback);
export const onDestroyCallback = (val: any, callback: Function) => val && (val[destroySymbol] = callback);
// lifecycle hooks are untracked
export const mount = (arg: any) => untracked(() => {
    if (isSignal(arg)) {
        const val = arg.value;
        if (isPromise(val)) return;
        else mount(val);
    } else if (isArray(arg)) arg.forEach(mount);
    runOnce(arg, mountSymbol);
});
export const destroy = (arg: any) => untracked(() => {
    if (isSignal(arg)) destroy(arg.value);
    else if (isArray(arg)) arg.forEach(destroy);
    runOnce(arg, destroySymbol);
});
