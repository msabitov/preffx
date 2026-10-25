import { Signal } from '../state';
import { LIBRARY, LIBRARY_LOWER } from './constants';

// types
export type TPreffXItem = {
    [key in (typeof mountSymbol | typeof destroySymbol | typeof Symbol.dispose)]: Function;
};
// symbols
const mountSymbol = Symbol(LIBRARY + '.mount');
const destroySymbol = Symbol(LIBRARY + '.destroy');
const destroyedSymbol = Symbol(LIBRARY + '.destroyed');
// per-root preload script attribute which value is root prefix
export const PREFFX_PRELOAD_ATTR = `data-${LIBRARY_LOWER}-preload`;
// base utils
export const isArray = (val: any) => Array.isArray(val);
export const isSignal = (val: any) => val instanceof Signal;
export const isPromise = (fn: any) => fn && fn.then && typeof fn.then === 'function' && fn.catch && typeof fn.catch === 'function';
export const resolveValue = (arg: any): any => isSignal(arg) ? arg.value : arg;
export const kebabCase = (str: string): string => str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());
export const escapeHtml = (s: string): string => s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');

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
    if (isSignal(arg)) destroy(arg.value);
    else if (isArray(arg)) arg.forEach(destroy);
    if (!arg || arg[destroyedSymbol]) return;
    if (arg[destroySymbol]) {
        arg[destroyedSymbol] = true;
        arg[destroySymbol]();
    }
};
