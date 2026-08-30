import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
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

const AppWithId: PC<{id: string;}> = ({}, { signal, id }) => {
    const count = signal(99);
    return h('div', {
       id: id(),
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
        callback: (i: {
            id: number;
            name: string;
        }) => h('div', {
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
        deferredValue.then((resolved: string) => value.value = resolved);
    }

    return h(Defer, {
        initial: initialValue,
        value
    });
};

const RouterComponent: PC = (_, {
    computed,
    url,
    navigate
}) => {
    const routeContent = computed(() => {
        switch(url.value.pathname) {
        case '/home':
            return h('div', {children: ['Home page content']});
        case '/contacts':
            return h('div', {children: ['Contacts page content']});
        default:
            return h('div', {children: ['Other page content']});
        }
    })
    return h('div', {
        id: 'router-component',
        children: [
            h('a', {
                href: '/home',
                children: ['Home']
            }),
            h('a', {
                href: '/contacts',
                children: ['Contacts']
            }),
            h('button', {
                onClick: () => navigate(new URL('/contacts', window.location.origin)),
                children: ['Go to contacts']
            }),
            routeContent
    ]});
};

const AppWithRoutes: PC = (_, { routes }) => {
    return h('div',{
        children: [
            h('a', {
                href: '/',
                children: 'Home'
            }),
            h('a', {
                href: '/about',
                children: 'About'
            }),
            h('a', {
                href: '/unknown',
                children: 'Unknown'
            }),
            routes({
                '/': () => h('span', { children: ['Home page'] }),
                'about': () => h('span', { children: ['About me'] }),
                '*': () => h('span', { children: ['Not found'] }),
            })
        ]
    });
};

const AppWithRoutesParams: PC = (_, { routes }) => {
    return h('div',{
        children: [
            h('a', {
                href: '/user/42',
                children: 'Open user page'
            }),
            routes({
                '/user/:id': (_, {routeParams}) =>
                    h('span', { id: 'r', children: [`User ${routeParams.id}`] })
            })
        ]
    });
};

const AppWithNestedRoutes: PC = (_, { routes }) => {
    return h('div',{
        children: [
            h('a', {
                href: '/chat/user/42',
                children: 'Open user page'
            }),
            h('a', {
                href: '/chat/settings?query=privacy',
                children: 'Open chat settings'
            }),
            routes({
                '/chat': (_, {routes: nestedRoutes}) => nestedRoutes({
                    'user/:id': (_, {routeParams}) => h('span', { children: [`User ${routeParams.id}`] }),
                    'settings': (_, {url}) => h('span', { children: [`Settings (${url.value.searchParams.get('query')})`] }),
                }),
                '*': () => h('span', { children: [`Fallback route`] })
            })
        ]
    });
};

describe('PreffX root', () => {
    let rootElement: HTMLDivElement;
    let anotherRootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'app';
        globalThis.document.body.appendChild(rootElement);

        anotherRootElement = globalThis.document.createElement('div');
        anotherRootElement.id = 'another-app';
        globalThis.document.body.appendChild(anotherRootElement);

        return () => {
            rootElement.remove();
            anotherRootElement.remove();
        };
    });

    test('create root', () => {
        const root = createRoot();
        expect(typeof root.mount).toBe('function');
        expect(typeof root.destroy).toBe('function');
    });

    test('mount/destroy root', () => {
        const root = createRoot();
        const id = 'div-id';
        root.mount(App,
            {
                node: rootElement,
                props: { id }
            }
        );
        expect(rootElement.firstElementChild?.id).toBe(id);

        root.destroy();
        expect(rootElement.firstElementChild).toBe(null);
    });

    test('several roots', () => {
        const root = createRoot();
        root.mount(
            AppWithId,
            { node: rootElement }
        );
        const rootId = rootElement.firstElementChild?.id as string;
        expect(rootId).toMatch(/^fx\d+_1-0$/); // prefix fixed at root creation

        const anotherRoot = createRoot();
        anotherRoot.mount(
            AppWithId,
            { node: anotherRootElement }
        );
        const anotherId = anotherRootElement.firstElementChild?.id as string;
        expect(anotherId).toMatch(/^fx\d+_1-0$/);
        // different roots → different prefixes
        expect(anotherId).not.toBe(rootId);

        // prefix survives destroy → mount (component counters reset, prefix does not)
        root.destroy();
        expect(rootElement.firstElementChild).toBe(null);
        root.mount(AppWithId, { node: rootElement });
        expect(rootElement.firstElementChild?.id).toBe(rootId);

        root.destroy();
        expect(rootElement.firstElementChild).toBe(null);

        anotherRoot.destroy();
        expect(anotherRootElement.firstElementChild).toBe(null);
    });

    test('several roots with custom prefix', () => {
        const root = createRoot({prefix: 'pre'});
        root.mount(
            AppWithId,
            { node: rootElement }
        );
        expect(rootElement.firstElementChild?.id).toBe('pre1-0');

        const anotherRoot = createRoot({prefix: 'prefix'});
        anotherRoot.mount(
            AppWithId,
            { node: anotherRootElement }
        );
        expect(anotherRootElement.firstElementChild?.id).toBe('prefix1-0');

        root.destroy();
        expect(rootElement.firstElementChild).toBe(null);

        anotherRoot.destroy();
        expect(anotherRootElement.firstElementChild).toBe(null);
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
        const root = createRoot();
        const initialValue = 2;
        root.mount(
            ReactiveComponent, { node: rootElement, props: { value: initialValue } }
        );
        await tick();

        const btn = rootElement.querySelector('#signal-trigger') as HTMLButtonElement;
        btn.click();
        await tick();

        const valueEl = rootElement.querySelector('#signal-value');
        expect(valueEl?.textContent).toBe(initialValue + 1 + '');
        root.destroy();
    });

    test('computed', async () => {
        const root = createRoot();
        const initialValue = 1;
        root.mount(
            ReactiveComponent, { node: rootElement, props: { value: initialValue } }
        );
        await tick();

        const btn = rootElement.querySelector('#signal-trigger') as HTMLButtonElement;
        btn.click();
        await tick();

        const valueEl = rootElement.querySelector('#computed-value');
        expect(valueEl?.textContent).toBe(2 * (initialValue + 1) + '');
        root.destroy();
    });

    test('effect', async () => {
        const root = createRoot();
        const initialValue = 9;
        let valueFromCallback = 0;
        const callback = (value: number) => {
            valueFromCallback = value;
        };
        root.mount(
            ReactiveComponent, { node: rootElement, props: { value: initialValue, callback } }
        );
        await tick();

        const btn = rootElement.querySelector('#signal-trigger') as HTMLButtonElement;
        btn.click();
        await tick();

        expect(valueFromCallback).toBe(initialValue + 1);
        root.destroy();
    });

    test('url', async () => {
        const root = createRoot();
        root.mount(
            RouterComponent, { node: rootElement }
        );
        await tick();

        expect(rootElement.innerHTML).toContain('<div>Other page content</div>');
        
        (rootElement.querySelector('a[href="/home"]') as HTMLAnchorElement).click();
        expect(rootElement.innerHTML).toContain('<div>Home page content</div>');

        (rootElement.querySelector('a[href="/contacts"]') as HTMLAnchorElement).click();
        expect(rootElement.innerHTML).toContain('<div>Contacts page content</div>');
    });

    test('defaultURL sets the initial route without Navigation API', async () => {
        const root = createRoot({ defaultURL: new URL('/home', window.location.origin) });
        root.mount(RouterComponent, { node: rootElement });
        await tick();

        // detached routing
        expect(rootElement.innerHTML).toContain('<div>Home page content</div>');

        // detached navigate() updates the signal directly
        (rootElement.querySelector('button') as HTMLButtonElement).click();
        await tick();
        expect(rootElement.innerHTML).toContain('<div>Contacts page content</div>');
    });

    describe('routes', () => {
        beforeEach(() => {
            window.location.pathname = '';
        });

        test('path changes', async () => {
            const root = createRoot();
            root.mount(AppWithRoutes, { node: rootElement });

            await tick();
            expect(rootElement.innerHTML).toContain('<span>Home page</span>');

            (rootElement.querySelector('a[href="/about"]') as HTMLAnchorElement).click();
            await tick();
            expect(rootElement.innerHTML).toContain('<span>About me</span>');

            (rootElement.querySelector('a[href="/unknown"]') as HTMLAnchorElement).click();
            await tick();
            expect(rootElement.innerHTML).toContain('<span>Not found</span>');
            root.destroy();
            await tick();
        });

        test('handlers receive params', async () => {
            const root = createRoot();
            root.mount(AppWithRoutesParams, { node: rootElement });
            await tick();
            (rootElement.querySelector('a[href="/user/42"]') as HTMLAnchorElement).click();
            expect(rootElement.textContent).toContain('User 42');
            root.destroy();
            await tick();
        });

        test('nested routes', async () => {
            const root = createRoot();
            root.mount(AppWithNestedRoutes, { node: rootElement });

            await tick();
            expect(rootElement.innerHTML).toContain('<span>Fallback route</span>');

            (rootElement.querySelector('a[href="/chat/user/42"]') as HTMLAnchorElement).click();
            await tick();
            expect(rootElement.innerHTML).toContain('<span>User 42</span>');

            (rootElement.querySelector('a[href="/chat/settings?query=privacy"]') as HTMLAnchorElement).click();
            await tick();
            expect(rootElement.innerHTML).toContain('<span>Settings (privacy)</span>');
            root.destroy();
            await tick();
        });
    });
});

describe('Special components', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'app';
        globalThis.document.body.appendChild(rootElement);
        return () => { rootElement.remove(); };
    });

    describe('Fragment', () => {
        test('With children', async () => {
            const root = createRoot();
            root.mount(
                Fragment, { node: rootElement, props: {
                    children: [
                        h('p', {
                            children: 'The first paragraph'
                        }),
                        h('p', {
                            children: 'The second paragraph'
                        })
                    ]
                } }
            );
            await tick();

            expect(rootElement.innerHTML).toBe('<p>The first paragraph</p><p>The second paragraph</p>');
            root.destroy();
        });

        test('Empty', async () => {
            const root = createRoot();
            root.mount(
                Fragment, { node: rootElement, props: { children: [] } }
            );
            await tick();

            expect(rootElement.innerHTML).toBe('');
            root.destroy();
        });
    });

    describe('For', () => {
        test('Signal items', async () => {
            const root = createRoot();
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
            root.mount(
                ForComponent, { node: rootElement, props: { initialItems, useProps: false } }
            );
            await tick();

            expect(rootElement.innerHTML).toBe(initialItems.reduce(
                (acc, item) => acc += `<div class="${item.id}">${item.name}</div>`, '')
            );
            root.destroy();
        });

        test('Array items', async () => {
            const root = createRoot();
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
            root.mount(
                ForComponent, { node: rootElement, props: { initialItems, useProps: true } }
            );
            await tick();
    
            expect(rootElement.innerHTML).toBe(initialItems.reduce(
                (acc, item) => acc += `<div class="${item.id}">${item.name}</div>`, '')
            );
            root.destroy();
        });

        test('Fallback', async () => {
            const root = createRoot();
            const initialItems: string[] = [];
            const fallback = 'No items';
            root.mount(
                ForComponent, { node: rootElement, props: { initialItems, fallback } }
            );
            await tick();
    
            expect(rootElement.innerHTML).toBe(fallback);
            root.destroy();
        });
    });

    describe('Catch', () => {
        test('No errors — children pass through', async () => {
            const root = createRoot();
            root.mount(CatchComponent, { node: rootElement, props: { hasError: false } });
            await tick();
    
            expect(rootElement.innerHTML).toBe('<div>Normal content</div>');
            root.destroy();
        });
    
        test('Static fallback on error', async () => {
            const root = createRoot();
            const fallback = 'Error occurred';
            root.mount(CatchComponent, { node: rootElement, props: { hasError: true, fallback } });
            await tick();
    
            expect(rootElement.innerHTML).toBe(fallback);
            root.destroy();
        });
    
        test('Function fallback on error', async () => {
            const root = createRoot();
            root.mount(CatchComponent, { node: rootElement, props: { hasError: true, useFunctionFallback: true } });
            await tick();
    
            expect(rootElement.innerHTML).toBe('<div class="error-fallback">Errors: 1</div>');
            root.destroy();
        });
    });
    
    describe('Portal', () => {
        test('Renders children into portal root', async () => {
            const root = createRoot();
            const portalTarget = document.createElement('div');
            portalTarget.id = 'portal-target';
            document.body.appendChild(portalTarget);
        
            root.mount(PortalComponent, { node: rootElement, props: {
                portalRoot: portalTarget,
                children: h('span', { id: 'portal-child', children: ['Hello Portal'] })
            } });
            await tick();
        
            // Portal content is in the portal target, not the main root
            expect(portalTarget.innerHTML).toBe('<span id="portal-child">Hello Portal</span>');
            // Main root is empty (Portal returns null)
            expect(rootElement.innerHTML).toBe('');
        
            root.destroy();
            portalTarget.remove();
        });

        test('Cleans up portal root on destroy', async () => {
            const root = createRoot();
            const portalTarget = document.createElement('div');
            portalTarget.id = 'portal-target';
            document.body.appendChild(portalTarget);
        
            root.mount(PortalComponent, { node: rootElement, props: {
                portalRoot: portalTarget,
                children: h('span', { children: ['Temporary'] })
            } });
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
            const root = createRoot();
            const portalTarget = document.createElement('div');
            portalTarget.id = 'portal-target';
            document.body.appendChild(portalTarget);
        
            root.mount(ReactivePortalComponent, { node: rootElement, props: {
                portalRoot: portalTarget,
                initialValue: 10
            } });
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
            const root = createRoot();
        
            root.mount(PortalComponent, { node: rootElement, props: {
                root: null,
                children: h('span', { children: ['Should not appear'] })
            } });
            await tick();
        
            expect(rootElement.innerHTML).toBe('');
            root.destroy();
        });        
    });

    describe('Defer', () => {
        test('Renders initial when value is a Promise', async () => {
            const root = createRoot();
            const deferredValue = new Promise<string>((resolve) => {
                setTimeout(() => resolve('Loaded'), 50);
            });
    
            root.mount(DeferComponent, { node: rootElement, props: {
                initialValue: 'Waiting...',
                deferredValue,
                isSignal: true,
                isPromise: true
            } });
            await tick();
    
            // Initially shows the initial/fallback value
            expect(rootElement.innerHTML).toBe('Waiting...');
    
            await tick(100); // wait for promise to resolve

            // After promise resolves, shows the resolved value
            expect(rootElement.innerHTML).toBe('Loaded');
            root.destroy();
        });
    
        test('Renders non-promise value immediately', async () => {
            const root = createRoot();
    
            root.mount(DeferComponent, { node: rootElement, props: {
                initialValue: 'Fallback',
                deferredValue: 'Real content',
                isSignal: true
            } });
            await tick();
    
            // Plain value is rendered immediately, no initial shown
            expect(rootElement.innerHTML).toBe('Real content');
            root.destroy();
        });
    
        test('Switches from promise to plain value reactively', async () => {
            const root = createRoot();
    
            root.mount(DeferComponent, { node: rootElement, props: {
                initialValue: 'Loading...',
                deferredValue: new Promise<string>(() => {}), // never resolves
                isSignal: true
            } });
            await tick();
    
            expect(rootElement.innerHTML).toBe('Loading...');
    
            // Simulate value change by destroying and recreating with plain value
            root.destroy();
    
            const root2 = createRoot();
            root2.mount(DeferComponent, { node: rootElement, props: {
                initialValue: 'Loading...',
                deferredValue: 'Now loaded',
                isSignal: true
            } });
            await tick();
    
            expect(rootElement.innerHTML).toBe('Now loaded');
            root2.destroy();
        });
    
        test('Reactivity — updates when signal value changes', async () => {
            const root = createRoot();
    
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
    
            root.mount(DynamicDefer, { node: rootElement, props: {
                initialValue: 'Pending...',
                finalValue: 'Resolved!',
                delay: 20
            } });
            await tick();
    
            expect(rootElement.innerHTML).toBe('Pending...');
    
            await new Promise(r => setTimeout(r, 30));
            await tick();
    
            expect(rootElement.innerHTML).toBe('Resolved!');
            root.destroy();
        });
    
        test('Array children via Defer', async () => {
            const root = createRoot();
    
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
    
            root.mount(ArrayDefer, { node: rootElement });
            await tick();
    
            expect(rootElement.innerHTML).toBe(
                '<span id="a">Alpha</span><span id="b">Beta</span>'
            );
            root.destroy();
        });
    
        test('Cleanup on destroy', async () => {
            const root = createRoot();
    
            root.mount(DeferComponent, { node: rootElement, props: {
                initialValue: 'Temp',
                deferredValue: new Promise<string>(() => {}),
                isSignal: true
            } });
            await tick();
    
            expect(rootElement.innerHTML).toBe('Temp');

            root.destroy();
            await tick();

            expect(rootElement.innerHTML).toBe('');
        });
    });
});

describe('Component lifecycle — mount / unmount', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'lifecycle-app';
        globalThis.document.body.appendChild(rootElement);

        return () => {
            rootElement.remove();
        };
    });

    // ---- onMount callbacks ----

    test('onMount fires after component is rendered in DOM', async () => {
        let mountFired = false;
        const MountTracker: PC = (_, { onMount }) => {
            onMount(() => { mountFired = true; });
            return h('div', { children: ['mounted'] });
        };

        const root = createRoot();
        root.mount(MountTracker, { node: rootElement });
        await tick();

        expect(mountFired).toBe(true);
        expect(rootElement.innerHTML).toBe('<div>mounted</div>');
        root.destroy();
    });

    test('onMount fires once per mount', async () => {
        let mountCount = 0;
        const MountCounter: PC = (_, { onMount }) => {
            onMount(() => { mountCount++; });
            return h('div', { children: ['x'] });
        };

        const root = createRoot();
        root.mount(MountCounter, { node: rootElement });
        await tick();
        expect(mountCount).toBe(1);

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');
        expect(mountCount).toBe(1);
    });

    test('onMount fires after children are in the DOM', async () => {
        let childInDom = false;
        const ChildChecker: PC = (_, { onMount }) => {
            onMount(() => {
                childInDom = !!rootElement.querySelector('#child-el');
            });
            return h('div', {
                children: [h('span', { id: 'child-el', children: ['nested'] })]
            });
        };

        const root = createRoot();
        root.mount(ChildChecker, { node: rootElement });
        await tick();

        expect(childInDom).toBe(true);
        root.destroy();
    });

    test('onMount fires for deeply nested components', async () => {
        let innerMounted = false;
        let outerMounted = false;

        const Inner: PC = (_, { onMount }) => {
            onMount(() => { innerMounted = true; });
            return h('span', { children: ['inner'] });
        };
        const Outer: PC = (_, { onMount }) => {
            onMount(() => { outerMounted = true; });
            return h('div', {
                children: [h(Inner, {})]
            });
        };

        const root = createRoot();
        root.mount(Outer, { node: rootElement });
        await tick();

        expect(innerMounted).toBe(true);
        expect(outerMounted).toBe(true);
        root.destroy();
    });

    test('onMount fires for Fragment children', async () => {
        let aMounted = false;
        let bMounted = false;

        const A: PC = (_, { onMount }) => {
            onMount(() => { aMounted = true; });
            return h('p', { children: ['A'] });
        };
        const B: PC = (_, { onMount }) => {
            onMount(() => { bMounted = true; });
            return h('p', { children: ['B'] });
        };
        const RootWithFragment: PC = (_, { onMount }) => {
            onMount(() => { /* root mount */ });
            return h(Fragment, {
                children: [h(A, {}), h(B, {})]
            });
        };

        const root = createRoot();
        root.mount(RootWithFragment, { node: rootElement });
        await tick();

        expect(aMounted).toBe(true);
        expect(bMounted).toBe(true);
        root.destroy();
    });

    test('onMount order is bottom-up (child before parent)', async () => {
        const order: string[] = [];

        const InnerOrder: PC = (_, { onMount }) => {
            onMount(() => { order.push('child'); });
            return h('span', { children: ['inner'] });
        };
        const OuterOrder: PC = (_, { onMount }) => {
            onMount(() => { order.push('parent'); });
            return h('div', {
                children: [h(InnerOrder, {})]
            });
        };

        const root = createRoot();
        root.mount(OuterOrder, { node: rootElement });
        await tick();

        expect(order).toEqual(['child', 'parent']);
        root.destroy();
    });

    // ---- onDestroy callbacks ----

    test('onDestroy fires when component is destroyed', async () => {
        let destroyed = false;
        const DestroyTracker: PC = (_, { onDestroy }) => {
            onDestroy(() => { destroyed = true; });
            return h('div', { children: ['temp'] });
        };

        const root = createRoot();
        root.mount(DestroyTracker, { node: rootElement });
        await tick();
        expect(destroyed).toBe(false);

        root.destroy();
        await tick();
        expect(destroyed).toBe(true);
    });

    test('onDestroy fires once per destroy', async () => {
        let destroyCount = 0;
        const DestroyCounter: PC = (_, { onDestroy }) => {
            onDestroy(() => { destroyCount++; });
            return h('div', { children: ['x'] });
        };

        const root = createRoot();
        root.mount(DestroyCounter, { node: rootElement });
        await tick();

        root.destroy();
        await tick();
        expect(destroyCount).toBe(1);
    });

    test('onDestroy fires for deeply nested components', async () => {
        let innerDestroyed = false;
        let outerDestroyed = false;

        const InnerDestroy: PC = (_, { onDestroy }) => {
            onDestroy(() => { innerDestroyed = true; });
            return h('span', { children: ['inner'] });
        };
        const OuterDestroy: PC = (_, { onDestroy }) => {
            onDestroy(() => { outerDestroyed = true; });
            return h('div', {
                children: [h(InnerDestroy, {})]
            });
        };

        const root = createRoot();
        root.mount(OuterDestroy, { node: rootElement });
        await tick();

        root.destroy();
        await tick();

        expect(innerDestroyed).toBe(true);
        expect(outerDestroyed).toBe(true);
    });

    test('onDestroy order is bottom-up (child before parent)', async () => {
        const order: string[] = [];

        const InnerDestroyOrder: PC = (_, { onDestroy }) => {
            onDestroy(() => { order.push('child'); });
            return h('span', { children: ['inner'] });
        };
        const OuterDestroyOrder: PC = (_, { onDestroy }) => {
            onDestroy(() => { order.push('parent'); });
            return h('div', {
                children: [h(InnerDestroyOrder, {})]
            });
        };

        const root = createRoot();
        root.mount(OuterDestroyOrder, { node: rootElement });
        await tick();

        root.destroy();
        await tick();

        // child is destroyed before parent
        expect(order).toEqual(['child', 'parent']);
    });

    test('onDestroy fires for Fragment children', async () => {
        let aDestroyed = false;
        let bDestroyed = false;

        const ADestroy: PC = (_, { onDestroy }) => {
            onDestroy(() => { aDestroyed = true; });
            return h('p', { children: ['A'] });
        };
        const BDestroy: PC = (_, { onDestroy }) => {
            onDestroy(() => { bDestroyed = true; });
            return h('p', { children: ['B'] });
        };
        const RootWithFragmentDestroy: PC = () => {
            return h(Fragment, {
                children: [h(ADestroy, {}), h(BDestroy, {})]
            });
        };

        const root = createRoot();
        root.mount(RootWithFragmentDestroy, { node: rootElement });
        await tick();

        root.destroy();
        await tick();

        expect(aDestroyed).toBe(true);
        expect(bDestroyed).toBe(true);
    });

    test('DOM nodes are removed after destroy', async () => {
        const root = createRoot();
        root.mount(App, { node: rootElement, props: { id: 'test-id' } });
        await tick();

        expect(rootElement.firstElementChild).toBeTruthy();
        expect((rootElement.firstElementChild as HTMLElement).id).toBe('test-id');

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');
    });

    test('multiple mount/destroy cycles', async () => {
        const mountCalls: number[] = [];
        const destroyCalls: number[] = [];
        let instanceId = 0;

        const CycleComponent: PC<{ n: number }> = (props, { onMount, onDestroy }) => {
            const id = ++instanceId;
            onMount(() => { mountCalls.push(id); });
            onDestroy(() => { destroyCalls.push(id); });
            return h('span', { children: [props.n] });
        };

        const root = createRoot();

        root.mount(CycleComponent, { node: rootElement, props: { n: 1 } });
        await tick();
        expect(rootElement.innerHTML).toBe('<span>1</span>');

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');

        root.mount(CycleComponent, { node: rootElement, props: { n: 2 } });
        await tick();
        expect(rootElement.innerHTML).toBe('<span>2</span>');

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');

        root.mount(CycleComponent, { node: rootElement, props: { n: 3 } });
        await tick();
        expect(rootElement.innerHTML).toBe('<span>3</span>');

        root.destroy();
        await tick();
        expect(rootElement.innerHTML).toBe('');

        expect(mountCalls.length).toBe(3);
        expect(destroyCalls.length).toBe(3);
        // The third component is a new instance (3rd creation)
        expect(mountCalls).toEqual([1, 2, 3]);
        expect(destroyCalls).toEqual([1, 2, 3]);
    });

    test('nested component lifecycle order in For', async () => {
        const mountOrder: number[] = [];
        const destroyOrder: number[] = [];

        const ItemComponent: PC<{ idx: number }> = ({ idx }, { onMount, onDestroy }) => {
            onMount(() => mountOrder.push(idx));
            onDestroy(() => destroyOrder.push(idx));
            return h('span', { children: [idx] });
        };

        const ForList: PC = (_, { signal, For }) => {
            const items = signal([
                { id: 1, name: 'one' },
                { id: 2, name: 'two' },
                { id: 3, name: 'three' },
            ]);
            return h(For, {
                items,
                callback: (item: { id: number }) => h(ItemComponent, { idx: item.id }),
            });
        };

        const root = createRoot();
        root.mount(ForList, { node: rootElement });
        await tick();

        expect(mountOrder).toEqual([1, 2, 3]);

        root.destroy();
        await tick();

        expect(destroyOrder).toEqual([1, 2, 3]);
    });
});

describe('Hydrate existing DOM', () => {
    let hydRoot: HTMLDivElement;

    beforeEach(() => {
        hydRoot = globalThis.document.createElement('div');
        hydRoot.id = 'hyd2-app';
        globalThis.document.body.appendChild(hydRoot);
    });

    afterEach(() => {
        hydRoot.remove();
    });

    test('mount reuses the server element in-place (positional, no markers)', async () => {
        // Server markup rendered by `renderToString` carries no markers — the
        // client reuses the existing elements purely by position in the walk.
        hydRoot.innerHTML =
            '<div id="card">' +
                '<span id="lbl">server-text</span>' +
            '</div>' +
            // Per-root preload script scoped by the root prefix enables hydration.
            '<script data-preffx-preload="app" type="application/json">{}</script>';

        // Keep references to the server-created nodes BEFORE mounting.
        const cardEl = hydRoot.querySelector('#card')!;
        const spanEl = hydRoot.querySelector('#lbl')!;

        // A client component that builds the same tree in the same order.
        const HydApp: PC = () => h('div', {
            id: 'card',
            children: [
                h('span', {
                    id: 'lbl',
                    children: ['server-text']
                })
            ]
        });

        const root = createRoot({ prefix: 'app' });
        root.mount(HydApp, { node: hydRoot });
        await tick(0);

        // The exact same DOM nodes are reused — nothing was recreated.
        expect(hydRoot.querySelector('#card')).toBe(cardEl);
        expect(hydRoot.querySelector('#lbl')).toBe(spanEl);
        // Reactivity attaches to the reused nodes; text stays correct.
        expect(spanEl.textContent).toBe('server-text');

        root.destroy();
    });

    test('reactivity binds to the hydrated node in-place (node count stable)', async () => {
        hydRoot.innerHTML =
            '<button id="btn">0</button>' +
            // Per-root preload script scoped by the root prefix enables hydration.
            '<script data-preffx-preload="app" type="application/json">{}</script>';

        const btn = hydRoot.querySelector('#btn')!;
        let clicked = 0;

        // Uses a signal for the label: reactively increments on click.
        const CounterApp: PC = (_, { signal }) => {
            const count = signal(0);
            return h('button', {
                id: 'btn',
                onClick: () => { clicked++; count.value += 1; },
                children: [count]
            });
        };

        const root = createRoot({ prefix: 'app' });
        root.mount(CounterApp, { node: hydRoot });
        await tick(0);

        // Same button element was hydrated (existing node reused).
        expect(hydRoot.querySelector('#btn')).toBe(btn);
        // Signal rendered initial value 0 into the existing text node.
        expect(btn.textContent).toBe('0');
        // There's exactly one text node — hydration didn't stack duplicates.
        expect(btn.childNodes.length).toBe(1);

        // Interact: the hydrated node is reactive in-place.
        btn.dispatchEvent(new MouseEvent('click'));
        await tick(0);
        expect(btn.textContent).toBe('1');
        expect(clicked).toBe(1);

        root.destroy();
    });
});

