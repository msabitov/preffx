import { beforeAll, describe, expect, test } from 'vitest';
import { h, createRoot, PC } from '../src/index';

function tick(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

type CounterAction =
    | { type: 'increment' }
    | { type: 'decrement' }
    | { type: 'add'; payload: number };

describe('Component utils', () => {
    describe('id', () => {
        let rootElement: HTMLDivElement;
        let anotherRootElement: HTMLDivElement;

        beforeAll(() => {
            rootElement = globalThis.document.createElement('div');
            rootElement.id = 'id-app';
            globalThis.document.body.appendChild(rootElement);

            anotherRootElement = globalThis.document.createElement('div');
            anotherRootElement.id = 'another-id-app';
            globalThis.document.body.appendChild(anotherRootElement);

            return () => {
                rootElement.remove();
                anotherRootElement.remove();
            };
        });

        const Component: PC<{id: string;}> = ({}, { signal, id }) => {
            return h('div', {
                id: id(),
                children: [h('span', {id: id()})] 
            });
        };

        test('each call returns new ID', async () => {
            const root = createRoot();
            root.mount(Component, { node: rootElement });
            await tick();

            expect(rootElement.innerHTML).toBe('<div id="fx1_1-0"><span id="fx1_1-1"></span></div>');

            root.destroy();
        });

        test('each root has its own IDs', async () => {
            const root = createRoot();
            root.mount(Component, { node: rootElement });

            const anotherRoot = createRoot();
            anotherRoot.mount(Component, { node: anotherRootElement });
            await tick();

            expect(rootElement.outerHTML).not.toBe(anotherRootElement.outerHTML);

            root.destroy();
        });
    });

    describe('state', () => {
        let rootElement: HTMLDivElement;

        beforeAll(() => {
            rootElement = globalThis.document.createElement('div');
            rootElement.id = 'state-app';
            globalThis.document.body.appendChild(rootElement);

            return () => {
                rootElement.remove();
            };
        });

        const StateComponent: PC<{ initialValue: number }> = (
            { initialValue },
            { state },
        ) => {
            const [count, setCount] = state(initialValue);
            return h('div', {
                children: [
                    h('span', { id: 'state-value', children: [count] }),
                    h('button', {
                        id: 'state-set',
                        onClick: () => setCount(42),
                        children: ['Set 42'],
                    }),
                    h('button', {
                        id: 'state-increment',
                        onClick: () => setCount((prev: number) => prev + 1),
                        children: ['+'],
                    }),
                ],
            });
        };

        test('renders initial value', async () => {
            const root = createRoot();
            root.mount(StateComponent, { node: rootElement, props: { initialValue: 10 } });
            await tick();

            const el = rootElement.querySelector('#state-value');
            expect(el?.textContent).toBe('10');

            root.destroy();
        });

        test('setter updates the value directly', async () => {
            const root = createRoot();
            root.mount(StateComponent, { node: rootElement, props: { initialValue: 0 } });
            await tick();

            const btn = rootElement.querySelector('#state-set') as HTMLButtonElement;
            btn.click();
            await tick();

            const el = rootElement.querySelector('#state-value');
            expect(el?.textContent).toBe('42');

            root.destroy();
        });

        test('functional setter (prev => next)', async () => {
            const root = createRoot();
            root.mount(StateComponent, { node: rootElement, props: { initialValue: 5 } });
            await tick();

            const btn = rootElement.querySelector(
                '#state-increment',
            ) as HTMLButtonElement;
            btn.click();
            await tick();

            const el = rootElement.querySelector('#state-value');
            expect(el?.textContent).toBe('6');

            root.destroy();
        });

        test('reactivity — DOM updates on multiple set calls', async () => {
            const StepComponent: PC = (_, { state }) => {
                const [count, setCount] = state(0);
                return h('div', {
                    children: [
                        h('span', { id: 'step-value', children: [count] }),
                        h('button', {
                            id: 'step-inc',
                            onClick: () => setCount((prev: number) => prev + 10),
                            children: ['+10'],
                        }),
                    ],
                });
            };

            const root = createRoot();
            root.mount(StepComponent, { node: rootElement });
            await tick();

            const btn = rootElement.querySelector('#step-inc') as HTMLButtonElement;

            btn.click();
            await tick();
            expect(rootElement.querySelector('#step-value')?.textContent).toBe(
                '10',
            );

            btn.click();
            await tick();
            expect(rootElement.querySelector('#step-value')?.textContent).toBe(
                '20',
            );

            btn.click();
            await tick();
            expect(rootElement.querySelector('#step-value')?.textContent).toBe(
                '30',
            );

            root.destroy();
        });

        test('multiple independent state hooks', async () => {
            const MultiStateComponent: PC = (_, { state }) => {
                const [a] = state('Alpha');
                const [b] = state('Beta');
                return h('div', {
                    children: [
                        h('span', { id: 'multi-a', children: [a] }),
                        h('span', { id: 'multi-b', children: [b] }),
                    ],
                });
            };

            const root = createRoot();
            root.mount(MultiStateComponent, { node: rootElement });
            await tick();

            expect(rootElement.querySelector('#multi-a')?.textContent).toBe(
                'Alpha',
            );
            expect(rootElement.querySelector('#multi-b')?.textContent).toBe('Beta');

            root.destroy();
        });
    });

    describe('reducer', () => {
        let rootElement: HTMLDivElement;

        beforeAll(() => {
            rootElement = globalThis.document.createElement('div');
            rootElement.id = 'reducer-app';
            globalThis.document.body.appendChild(rootElement);

            return () => {
                rootElement.remove();
            };
        });

        const counterReducer = (state: number, action: CounterAction): number => {
            switch (action.type) {
                case 'increment':
                    return state + 1;
                case 'decrement':
                    return state - 1;
                case 'add':
                    return state + action.payload;
                default:
                    return state;
            }
        };

        const ReducerComponent: PC<{ initial?: number }> = (
            { initial },
            { reducer },
        ) => {
            const [count, dispatch] = reducer(counterReducer, initial ?? 0);
            return h('div', {
                children: [
                    h('span', { id: 'reducer-value', children: [count] }),
                    h('button', {
                        id: 'reducer-inc',
                        onClick: () => dispatch({ type: 'increment' }),
                        children: ['+'],
                    }),
                    h('button', {
                        id: 'reducer-dec',
                        onClick: () => dispatch({ type: 'decrement' }),
                        children: ['-'],
                    }),
                    h('button', {
                        id: 'reducer-add',
                        onClick: () => dispatch({ type: 'add', payload: 5 }),
                        children: ['+5'],
                    }),
                ],
            });
        };

        test('renders initial value', async () => {
            const root = createRoot();
            root.mount(ReducerComponent, { node: rootElement, props: { initial: 100 } });
            await tick();

            const el = rootElement.querySelector('#reducer-value');
            expect(el?.textContent).toBe('100');

            root.destroy();
        });

        test('dispatch — increment action', async () => {
            const root = createRoot();
            root.mount(ReducerComponent, { node: rootElement, props: { initial: 0 } });
            await tick();

            (rootElement.querySelector('#reducer-inc') as HTMLButtonElement).click();
            await tick();

            const el = rootElement.querySelector('#reducer-value');
            expect(el?.textContent).toBe('1');

            root.destroy();
        });

        test('multiple dispatches accumulate state', async () => {
            const root = createRoot();
            root.mount(ReducerComponent, { node: rootElement, props: { initial: 10 } });
            await tick();

            (rootElement.querySelector('#reducer-inc') as HTMLButtonElement).click();
            await tick();

            (rootElement.querySelector('#reducer-inc') as HTMLButtonElement).click();
            await tick();

            (rootElement.querySelector('#reducer-dec') as HTMLButtonElement).click();
            await tick();

            const el = rootElement.querySelector('#reducer-value');
            // 10 + 1 + 1 - 1 = 11
            expect(el?.textContent).toBe('11');

            root.destroy();
        });

        test('dispatch with payload action', async () => {
            const root = createRoot();
            root.mount(ReducerComponent, { node: rootElement, props: { initial: 0 } });
            await tick();

            (rootElement.querySelector('#reducer-add') as HTMLButtonElement).click();
            await tick();

            const el = rootElement.querySelector('#reducer-value');
            expect(el?.textContent).toBe('5');

            root.destroy();
        });

        test('lazy initializer', async () => {
            const LazyReducerComponent: PC<{ multiplier: number }> = (
                { multiplier },
                { reducer },
            ) => {
                const [count] = reducer(counterReducer, () => 10 * multiplier);
                return h('span', { id: 'lazy-reducer', children: [count] });
            };

            const root = createRoot();
            root.mount(LazyReducerComponent, { node: rootElement, props: { multiplier: 7 } });
            await tick();

            const el = rootElement.querySelector('#lazy-reducer');
            expect(el?.textContent).toBe('70');

            root.destroy();
        });
    });
});
