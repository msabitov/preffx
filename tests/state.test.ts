import { describe, expect, test } from 'vitest';
import { state, reducer, computed } from '../src/state';

describe('state', () => {
    test('creates a signal with the initial value', () => {
        const [s] = state(0);
        expect(s.value).toBe(0);
    });

    test('creates a signal from a factory function', () => {
        const [s] = state(() => 42);
        expect(s.value).toBe(42);
    });

    test('set updates the value directly', () => {
        const [s, set] = state(1);
        set(5);
        expect(s.value).toBe(5);
    });

    test('set accepts an updater function receiving the previous value', () => {
        const [s, set] = state(1);
        set((prev) => prev + 10);
        expect(s.value).toBe(11);
    });

    test('is reactive — a computed derived from it reflects changes', () => {
        const [s, set] = state(2);
        const double = computed(() => s.value * 2);
        expect(double.value).toBe(4);
        set(3);
        expect(double.value).toBe(6);
    });
});

describe('reducer', () => {
    test('creates state from an initial value', () => {
        const [s] = reducer((state: number, action: number) => state + action, 0);
        expect(s.value).toBe(0);
    });

    test('creates state from a factory function', () => {
        const [s] = reducer((state: number, action: number) => state + action, () => 10);
        expect(s.value).toBe(10);
    });

    test('dispatch applies the reducer action', () => {
        const [s, dispatch] = reducer(
            (state: number, action: 'inc' | 'dec') =>
                action === 'inc' ? state + 1 : state - 1,
            0
        );
        dispatch('inc');
        dispatch('inc');
        expect(s.value).toBe(2);
        dispatch('dec');
        expect(s.value).toBe(1);
    });

    test('dispatch batches multiple updates into one commit', () => {
        const [s, dispatch] = reducer((state: number, action: number) => state + action, 0);
        dispatch(1);
        dispatch(2);
        dispatch(3);
        expect(s.value).toBe(6);
    });

    test('is reactive — a computed derived from it reflects changes', () => {
        const [s, dispatch] = reducer((state: number, action: number) => state * action, 1);
        const doubled = computed(() => s.value * 2);
        expect(doubled.value).toBe(2);
        dispatch(3);
        expect(s.value).toBe(3);
        expect(doubled.value).toBe(6);
    });
});