import { beforeAll, describe, expect, test } from 'vitest';
import { h, Fragment, createRoot, PC } from '../src/index';

function tick(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
}

const App: PC<{id: string;}> = ({id}, { signal }) => {
    const count = signal(42);
    return h('div', {
       id,
       children: [count] 
    });
};

export const ReactiveComponent: PC<{
    value: number;
    callback: (value: number) => void;
}> = (
    props,
    { signal, effect, computed },
  ) => {
    const count = signal(props.value);

    const double = computed(() => 2 * count.value);

    effect(() => {
        props.callback?.(count.value);
    });
    
    return h('div', {
        children: [
            h('span', {
                id: 'signal-value',
                children: [count]
            }),
            h('span', {
                id: 'computed-value',
                children: [double]
            }),
            h('button', {
                id: 'signal-trigger',
                onClick: () => {
                    count.value += 1;
                },
                children: ['+']
            })
        ] 
    });
};

export const ForComponent: PC<{
    initialItems: ({
        id: number;
        name: string;
    })[];
    useProps?: boolean;
    fallback?: any;
}> = (
    { initialItems, useProps, fallback },
    { signal, For },
) => {
    const items = useProps ? initialItems : signal(initialItems);

    return h(For, {
        items,
        callback: (i) => h('div', {
            class: i.id,
            children: [i.name]
        }),
        fallback
    });
};

describe('PreffX root', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'app';
        globalThis.document.body.appendChild(rootElement);

        return () => {
            rootElement.remove();
        };
    });

    test('create root', () => {
        const root = createRoot(rootElement);
        expect(typeof root.mount).toBe('function');
        expect(typeof root.destroy).toBe('function');
    });

    test('mount/destroy root', () => {
        const root = createRoot(rootElement);
        const id = 'div-id';
        root.mount(h(
            App,
            {
                id
            }
        ));
        expect(rootElement.firstElementChild?.id).toBe(id);

        root.destroy();
        expect(rootElement.firstElementChild).toBe(null);
    });
});

describe('Reactivity', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'app';
        globalThis.document.body.appendChild(rootElement);

        return () => {
            rootElement.remove();
        };
    });

    test('signal', async () => {
        const root = createRoot(rootElement);
        const initialValue = 2;
        root.mount(h(
            ReactiveComponent, {
                value: initialValue
            }
        ));
        await tick();

        const btn = rootElement.querySelector('#signal-trigger') as HTMLButtonElement;
        btn.click();
        await tick();

        const valueEl = rootElement.querySelector('#signal-value');
        expect(valueEl?.textContent).toBe(initialValue + 1 + '');
        root.destroy();
    });

    test('computed', async () => {
        const root = createRoot(rootElement);
        const initialValue = 1;
        root.mount(h(
            ReactiveComponent, {
                value: initialValue
            }
        ));
        await tick();

        const btn = rootElement.querySelector('#signal-trigger') as HTMLButtonElement;
        btn.click();
        await tick();

        const valueEl = rootElement.querySelector('#computed-value');
        expect(valueEl?.textContent).toBe(2 * (initialValue + 1) + '');
        root.destroy();
    });

    test('effect', async () => {
        const root = createRoot(rootElement);
        const initialValue = 9;
        let valueFromCallback = 0;
        const callback = (value: number) => {
            valueFromCallback = value;
        };
        root.mount(h(
            ReactiveComponent, {
                value: initialValue,
                callback
            }
        ));
        await tick();

        const btn = rootElement.querySelector('#signal-trigger') as HTMLButtonElement;
        btn.click();
        await tick();

        expect(valueFromCallback).toBe(initialValue + 1);
        root.destroy();
    });
});

describe('Special components', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'app';
        globalThis.document.body.appendChild(rootElement);
    });

    describe('Fragment', () => {
        test('With children', async () => {
            const root = createRoot(rootElement);
            root.mount(h(
                Fragment, {
                    children: [
                        h('p', {
                            children: 'The first paragraph'
                        }),
                        h('p', {
                            children: 'The second paragraph'
                        })
                    ]
                }
            ));
            await tick();

            expect(rootElement.innerHTML).toBe('<p>The first paragraph</p><p>The second paragraph</p>');
            root.destroy();
        });

        test('Empty', async () => {
            const root = createRoot(rootElement);
            root.mount(h(
                Fragment, {
                    children: []
                }
            ));
            await tick();

            expect(rootElement.innerHTML).toBe('');
            root.destroy();
        });
    });

    describe('For', () => {
        test('Signal items', async () => {
            const root = createRoot(rootElement);
            const initialItems = [
                {
                    id: 0,
                    name: 'Bar'
                },
                {
                    id: 1,
                    name: 'Foo'
                }, {
                    id: 2,
                    name: 'Baz'
                }
            ];
            root.mount(h(
                ForComponent, {
                    initialItems,
                    useProps: false
                }
            ));
            await tick();

            expect(rootElement.innerHTML).toBe(initialItems.reduce(
                (acc, item) => acc += `<div class="${item.id}">${item.name}</div>`, '')
            );
            root.destroy();
        });

        test('Array items', async () => {
            const root = createRoot(rootElement);
            const initialItems = [
                {
                    id: 0,
                    name: 'Bar'
                },
                {
                    id: 1,
                    name: 'Foo'
                }, {
                    id: 2,
                    name: 'Baz'
                }
            ];
            root.mount(h(
                ForComponent, {
                    initialItems,
                    useProps: true
                }
            ));
            await tick();
    
            expect(rootElement.innerHTML).toBe(initialItems.reduce(
                (acc, item) => acc += `<div class="${item.id}">${item.name}</div>`, '')
            );
            root.destroy();
        });

        test('Fallback', async () => {
            const root = createRoot(rootElement);
            const initialItems = [];
            const fallback = 'No items';
            root.mount(h(
                ForComponent, {
                    initialItems,
                    fallback
                }
            ));
            await tick();
    
            expect(rootElement.innerHTML).toBe(fallback);
            root.destroy();
        });
    });
});
