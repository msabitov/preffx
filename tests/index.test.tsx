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

describe('PreffX root', () => {
    let rootElement: HTMLDivElement;

    beforeAll(() => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'app';
        globalThis.document.body.appendChild(rootElement);
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
