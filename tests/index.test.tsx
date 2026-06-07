import { beforeAll, describe, expect, test } from 'vitest';
import { h, Fragment, createRoot, PC } from '../src/index';

const App: PC<{id: string;}> = ({id}, { signal }) => {
    const count = signal(42);
    return <div id={id}>{count}</div>;
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
        root.mount(<App id={id}/>);
        expect(rootElement.firstElementChild?.id).toBe(id);

        root.destroy();
        expect(rootElement.firstElementChild).toBe(null);
    });
});
