import type {
    SignalOptions, ReadonlySignal
} from '@preact/signals-core';
import {
    signal, computed, effect, batch, untracked, action, createModel, Signal, Effect, Computed
} from '@preact/signals-core';
export {
    signal, computed, effect, batch, untracked, action, createModel, Signal, Effect, Computed
};
export type {
    SignalOptions, ReadonlySignal
};

/**
 * Narrow signal factory signature
 */
type SignalFactory = <T>(value: T) => Signal<T>;
/**
 * Narrow computed factory signature
 */
type ComputedFactory = <T>(fn: () => T) => ReadonlySignal<T>;

/**
 * useState emulation
 * @param initial - initial value
 * @param primitives - injectable signal/computed factories (defaults to raw signals-core)
 * @returns [signal, set] – state signal and setState function
 */
export const state = <T>(
    initial: T | (() => T),
    primitives: { signal: SignalFactory; computed: ComputedFactory } = { signal, computed }
): [ReadonlySignal<T>, (value: T | ((prev: T) => T)) => void] => {
    const s = primitives.signal<T>(typeof initial === 'function' ? (initial as () => T)() : initial);
    const c = primitives.computed(() => s.value);

    const set = (value: T | ((prev: T) => T)) => {
        s.value = typeof value === 'function' ? (value as (prev: T) => T)(s.value as T) : value;
    };

    return [c, set];
};

/**
 * useReducer emulation
 * @param fn - reducer function
 * @param init - initial state or factory function
 * @param primitives - injectable signal/computed factories (defaults to raw signals-core)
 * @returns [state, dispatch] – state signal and dispatch function
 */
export const reducer = <S, A>(
    fn: (state: S, action: A) => S,
    init: S | (() => S),
    primitives: { signal: SignalFactory; computed: ComputedFactory } = { signal, computed }
): [ReadonlySignal<S>, (action: A) => void] => {
    const s = primitives.signal<S>(typeof init === 'function' ? (init as () => S)() : init);
    const c = primitives.computed(() => s.value);
    const dispatch = (action: A) => {
        batch(() => {
            s.value = fn(s.value, action);
        });
    };

    return [c, dispatch];
};