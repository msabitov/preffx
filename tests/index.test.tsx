import { beforeAll, describe, expect, test } from 'vitest';
import { h, Fragment, createRoot, PC } from '../src/index';

function tick(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

export const CatchComponent: PC<{
    hasError?: boolean;
    fallback?: any;
    useFunctionFallback?: boolean;
    extraProp?: string;
}> = (
    { hasError, fallback, useFunctionFallback, extraProp },
    { Catch },
) => {
    const children = hasError
        ? [h('div', { children: 'Normal content' }), new Error('Test error')]
        : [h('div', { children: 'Normal content' })];

    return h(Catch, {
        children,
        fallback: useFunctionFallback
            ? (fbProps: any) => h('div', {
                class: 'error-fallback',
                children: [`Errors: ${fbProps.errors.length}`]
              })
            : fallback,
        extraProp
    });
};

export const PortalComponent: PC<{
    portalRoot: HTMLElement;
    children?: any;
}> = (
    { portalRoot, children },
    { Portal },
) => {
    return h(Portal, {
        root: portalRoot,
        children
    });
};

const DeferComponent: PC<{
    initialValue: any;
    deferredValue: any;
    isSignal?: boolean;
    isPromise?: boolean;
}> = (
    { initialValue, isPromise, deferredValue, isSignal },
    { signal, Defer },
) => {
    const value = isSignal ? signal(deferredValue) : deferredValue;
    
    if (isSignal && isPromise) {
        deferredValue.then((resolved) => value.value = resolved);
    }

    return h(Defer, {
        initial: initialValue,
        value
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

    describe('Catch', () => {
        test('No errors — children pass through', async () => {
            const root = createRoot(rootElement);
            root.mount(h(CatchComponent, { hasError: false }));
            await tick();
    
            expect(rootElement.innerHTML).toBe('<div>Normal content</div>');
            root.destroy();
        });
    
        test('Static fallback on error', async () => {
            const root = createRoot(rootElement);
            const fallback = 'Error occurred';
            root.mount(h(CatchComponent, { hasError: true, fallback }));
            await tick();
    
            expect(rootElement.innerHTML).toBe(fallback);
            root.destroy();
        });
    
        test('Function fallback on error', async () => {
            const root = createRoot(rootElement);
            root.mount(h(CatchComponent, {
                hasError: true,
                useFunctionFallback: true
            }));
            await tick();
    
            expect(rootElement.innerHTML).toBe('<div class="error-fallback">Errors: 1</div>');
            root.destroy();
        });
    });
    
    describe('Portal', () => {
        test('Renders children into portal root', async () => {
            const root = createRoot(rootElement);
            const portalTarget = document.createElement('div');
            portalTarget.id = 'portal-target';
            document.body.appendChild(portalTarget);
        
            root.mount(h(PortalComponent, {
                portalRoot: portalTarget,
                children: h('span', { id: 'portal-child', children: ['Hello Portal'] })
            }));
            await tick();
        
            // Portal content is in the portal target, not the main root
            expect(portalTarget.innerHTML).toBe('<span id="portal-child">Hello Portal</span>');
            // Main root is empty (Portal returns null)
            expect(rootElement.innerHTML).toBe('');
        
            root.destroy();
            portalTarget.remove();
        });

        test('Cleans up portal root on destroy', async () => {
            const root = createRoot(rootElement);
            const portalTarget = document.createElement('div');
            portalTarget.id = 'portal-target';
            document.body.appendChild(portalTarget);
        
            root.mount(h(PortalComponent, {
                portalRoot: portalTarget,
                children: h('span', { children: ['Temporary'] })
            }));
            await tick();
            expect(portalTarget.innerHTML).toBe('<span>Temporary</span>');
        
            root.destroy();
            await tick();
        
            // Portal root is cleared
            expect(portalTarget.innerHTML).toBe('');
            portalTarget.remove();
        });

        const ReactivePortalComponent: PC<{
            portalRoot: HTMLElement;
            initialValue: number;
        }> = (
            { portalRoot, initialValue },
            { signal, Portal },
        ) => {
            const count = signal(initialValue);
            return [
                h(Portal, {
                    root: portalRoot,
                    children: h('span', { id: 'portal-value', children: [count] })
                }),
                h('button', {
                    id: 'portal-trigger',
                    onClick: () => { count.value += 1; },
                    children: ['+']
                })
            ];
        };
        
        test('Reactive children update inside portal', async () => {
            const root = createRoot(rootElement);
            const portalTarget = document.createElement('div');
            portalTarget.id = 'portal-target';
            document.body.appendChild(portalTarget);
        
            root.mount(h(ReactivePortalComponent, {
                portalRoot: portalTarget,
                initialValue: 10
            }));
            await tick();
        
            expect(portalTarget.innerHTML).toBe('<span id="portal-value">10</span>');
        
            const btn = rootElement.querySelector('#portal-trigger') as HTMLButtonElement;
            btn.click();
            await tick();
        
            expect(portalTarget.innerHTML).toBe('<span id="portal-value">11</span>');
        
            root.destroy();
            portalTarget.remove();
        });

        test('No root — renders nothing', async () => {
            const root = createRoot(rootElement);
        
            root.mount(h(PortalComponent, {
                root: null,
                children: h('span', { children: ['Should not appear'] })
            }));
            await tick();
        
            expect(rootElement.innerHTML).toBe('');
            root.destroy();
        });        
    });

    describe('Defer', () => {
        test('Renders initial when value is a Promise', async () => {
            const root = createRoot(rootElement);
            const deferredValue = new Promise<string>((resolve) => {
                setTimeout(() => resolve('Loaded'), 50);
            });
    
            root.mount(h(DeferComponent, {
                initialValue: 'Waiting...',
                deferredValue,
                isSignal: true,
                isPromise: true
            }));
            await tick();
    
            // Initially shows the initial/fallback value
            expect(rootElement.innerHTML).toBe('Waiting...');
    
            await tick(100); // wait for promise to resolve

            // After promise resolves, shows the resolved value
            expect(rootElement.innerHTML).toBe('Loaded');
            root.destroy();
        });
    
        test('Renders non-promise value immediately', async () => {
            const root = createRoot(rootElement);
    
            root.mount(h(DeferComponent, {
                initialValue: 'Fallback',
                deferredValue: 'Real content',
                isSignal: true
            }));
            await tick();
    
            // Plain value is rendered immediately, no initial shown
            expect(rootElement.innerHTML).toBe('Real content');
            root.destroy();
        });
    
        test('Switches from promise to plain value reactively', async () => {
            const root = createRoot(rootElement);
    
            root.mount(h(DeferComponent, {
                initialValue: 'Loading...',
                deferredValue: new Promise<string>(() => {}), // never resolves
                isSignal: true
            }));
            await tick();
    
            expect(rootElement.innerHTML).toBe('Loading...');
    
            // Simulate value change by destroying and recreating with plain value
            root.destroy();
    
            const root2 = createRoot(rootElement);
            root2.mount(h(DeferComponent, {
                initialValue: 'Loading...',
                deferredValue: 'Now loaded',
                isSignal: true
            }));
            await tick();
    
            expect(rootElement.innerHTML).toBe('Now loaded');
            root2.destroy();
        });
    
        test('Reactivity — updates when signal value changes', async () => {
            const root = createRoot(rootElement);
    
            // Use a custom component that can change the signal
            const DynamicDefer: PC<{
                initialValue: any;
                finalValue: any;
                delay: number;
            }> = (
                { initialValue, finalValue, delay },
                { signal, effect, Defer, onMount },
            ) => {
                const value = signal(new Promise(() => {})); // pending promise
    
                onMount(() => {
                    setTimeout(() => {
                        value.value = finalValue;
                    }, delay);
                });
    
                return h(Defer, {
                    initial: initialValue,
                    value
                });
            };
    
            root.mount(h(DynamicDefer, {
                initialValue: 'Pending...',
                finalValue: 'Resolved!',
                delay: 20
            }));
            await tick();
    
            expect(rootElement.innerHTML).toBe('Pending...');
    
            await new Promise(r => setTimeout(r, 30));
            await tick();
    
            expect(rootElement.innerHTML).toBe('Resolved!');
            root.destroy();
        });
    
        test('Array children via Defer', async () => {
            const root = createRoot(rootElement);
    
            const ArrayDefer: PC = (_, { signal, Defer }) => {
                const items = signal([
                    h('span', { id: 'a', children: ['Alpha'] }),
                    h('span', { id: 'b', children: ['Beta'] })
                ]);
    
                return h(Defer, {
                    initial: [h('div', { children: ['Loading...'] })],
                    value: items
                });
            };
    
            root.mount(h(ArrayDefer, {}));
            await tick();
    
            expect(rootElement.innerHTML).toBe(
                '<span id="a">Alpha</span><span id="b">Beta</span>'
            );
            root.destroy();
        });
    
        test('Cleanup on destroy', async () => {
            const root = createRoot(rootElement);
    
            root.mount(h(DeferComponent, {
                initialValue: 'Temp',
                deferredValue: new Promise<string>(() => {}),
                isSignal: true
            }));
            await tick();
    
            expect(rootElement.innerHTML).toBe('Temp');
    
            root.destroy();
            await tick();
    
            expect(rootElement.innerHTML).toBe('');
        });
    });
});
