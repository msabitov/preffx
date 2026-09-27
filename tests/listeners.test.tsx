import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { h, createRoot, PC } from '../src/index';

function tick(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Event listeners on DOM elements', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'listeners-app';
        globalThis.document.body.appendChild(rootElement);
        return () => { rootElement.remove(); };
    });

    afterEach(() => {
        rootElement.innerHTML = '';
    });

    // ---- static listeners ----

    test('static function listener is removed exactly once when the DOM element is removed', async () => {
        let called = 0;
        const C: PC = () => h('button', {
            id: 'btn',
            onClick: () => { called++; },
            children: ['x'],
        });

        const root = createRoot();
        root.mount(C, { node: rootElement });
        await tick();

        const btn = rootElement.querySelector('#btn') as HTMLButtonElement;
        const removeSpy = vi.spyOn(btn, 'removeEventListener');

        // listener is active while mounted
        btn.click();
        expect(called).toBe(1);

        root.destroy();
        await tick();

        // static listener unsubscribed exactly once on element removal
        expect(removeSpy).toHaveBeenCalledTimes(1);
        expect(rootElement.innerHTML).toBe('');

        // behaviorally: the detached element no longer fires the handler
        btn.dispatchEvent(new MouseEvent('click'));
        expect(called).toBe(1);
    });

    test('static object-config listener (prevent) is removed exactly once on destroy', async () => {
        let called = 0;
        let prevented = false;
        const C: PC = () => h('button', {
            id: 'btn',
            onClick: {
                handler: (e: Event) => { called++; prevented = e.defaultPrevented; },
                prevent: true,
            },
            children: ['x'],
        });

        const root = createRoot();
        root.mount(C, { node: rootElement });
        await tick();

        const btn = rootElement.querySelector('#btn') as HTMLButtonElement;
        const removeSpy = vi.spyOn(btn, 'removeEventListener');

        btn.dispatchEvent(new Event('click', { cancelable: true }));
        expect(called).toBe(1);
        expect(prevented).toBe(true);

        root.destroy();
        await tick();

        expect(removeSpy).toHaveBeenCalledTimes(1);
        expect(rootElement.innerHTML).toBe('');

        btn.dispatchEvent(new Event('click', { cancelable: true }));
        expect(called).toBe(1);
    });

    // ---- dynamic (signal) listeners ----

    test('dynamic signal listener is removed exactly once after the signal changes', async () => {
        let handlerA = 0;
        let handlerB = 0;
        let clickSignal: any;

        const C: PC = (_, { signal }) => {
            clickSignal = signal(() => { handlerA++; });
            return h('button', {
                id: 'btn',
                onClick: clickSignal,
                children: ['x'],
            });
        };

        const root = createRoot();
        root.mount(C, { node: rootElement });
        await tick();

        const btn = rootElement.querySelector('#btn') as HTMLButtonElement;
        const removeSpy = vi.spyOn(btn, 'removeEventListener');

        btn.click();
        expect(handlerA).toBe(1);

        // swap the handler through the signal -> old listener unsubscribed once
        clickSignal.value = () => { handlerB++; };
        await tick();

        expect(removeSpy).toHaveBeenCalledTimes(1);

        // the new handler is wired up and the old one is gone
        btn.click();
        expect(handlerA).toBe(1);
        expect(handlerB).toBe(1);

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');
    });

    test('dynamic signal listener is removed exactly once on destroy (cleanup)', async () => {
        let called = 0;
        let clickSignal: any;

        const C: PC = (_, { signal }) => {
            clickSignal = signal(() => { called++; });
            return h('button', {
                id: 'btn',
                onClick: clickSignal,
                children: ['x'],
            });
        };

        const root = createRoot();
        root.mount(C, { node: rootElement });
        await tick();

        const btn = rootElement.querySelector('#btn') as HTMLButtonElement;
        const removeSpy = vi.spyOn(btn, 'removeEventListener');

        btn.click();
        expect(called).toBe(1);

        root.destroy();
        await tick();

        // the currently active dynamic listener is unsubscribed exactly once
        expect(removeSpy).toHaveBeenCalledTimes(1);
        expect(rootElement.innerHTML).toBe('');

        btn.dispatchEvent(new MouseEvent('click'));
        expect(called).toBe(1);
    });

    test('dynamic object-config listener is removed exactly once after the signal changes', async () => {
        let handlerA = 0;
        let handlerB = 0;
        let clickSignal: any;

        const C: PC = (_, { signal }) => {
            clickSignal = signal({
                handler: () => { handlerA++; },
                stop: true,
            });
            return h('button', {
                id: 'btn',
                onClick: clickSignal,
                children: ['x'],
            });
        };

        const root = createRoot();
        root.mount(C, { node: rootElement });
        await tick();

        const btn = rootElement.querySelector('#btn') as HTMLButtonElement;
        const removeSpy = vi.spyOn(btn, 'removeEventListener');

        btn.click();
        expect(handlerA).toBe(1);

        clickSignal.value = {
            handler: () => { handlerB++; },
            stop: true,
        };
        await tick();

        expect(removeSpy).toHaveBeenCalledTimes(1);

        btn.click();
        expect(handlerA).toBe(1);
        expect(handlerB).toBe(1);

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');
    });

    test('dynamic listener re-subscribes with the new handler after each signal change', async () => {
        const calls: string[] = [];
        let clickSignal: any;

        const C: PC = (_, { signal }) => {
            clickSignal = signal(() => { calls.push('first'); });
            return h('button', {
                id: 'btn',
                onClick: clickSignal,
                children: ['x'],
            });
        };

        const root = createRoot();
        root.mount(C, { node: rootElement });
        await tick();

        const btn = rootElement.querySelector('#btn') as HTMLButtonElement;
        const removeSpy = vi.spyOn(btn, 'removeEventListener');

        clickSignal.value = () => { calls.push('second'); };
        await tick();
        clickSignal.value = () => { calls.push('third'); };
        await tick();

        // each swap unsubscribes the previous listener exactly once
        expect(removeSpy).toHaveBeenCalledTimes(2);

        btn.click();
        expect(calls).toEqual(['third']);

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');
    });
});
