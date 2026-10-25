import { afterEach, describe, expect, test } from 'vitest';
import { createRoot } from '../src/index';
import { jsx, jsxs, jsxDEV, Fragment } from '../src/jsx-dev-runtime';

describe('jsx-dev-runtime', () => {
    let rootElement: HTMLDivElement;

    const setupRoot = () => {
        rootElement = globalThis.document.createElement('div');
        rootElement.id = 'jsx-dev-runtime-app';
        globalThis.document.body.appendChild(rootElement);
        return rootElement;
    };

    afterEach(() => {
        rootElement?.remove();
    });

    test('jsx renders an element with children', () => {
        const root = createRoot();
        root.mount(() => jsx('div', { id: 'a', children: ['hello'] }), {
            node: setupRoot()
        });

        expect(rootElement.querySelector('#a')?.textContent).toBe('hello');
        root.destroy();
    });

    test('jsxs renders multiple children', () => {
        const root = createRoot();
        root.mount(() => jsxs('ul', {
            children: [
                jsx('li', { children: ['one'] }),
                jsx('li', { children: ['two'] })
            ]
        }), { node: setupRoot() });

        expect(rootElement.querySelectorAll('li').length).toBe(2);
        expect(rootElement.querySelectorAll('li')[1]?.textContent).toBe('two');
        root.destroy();
    });

    test('jsxDEV renders the same as jsx', () => {
        const root = createRoot();
        root.mount(() => jsxDEV('p', { id: 'b', children: ['dev'] }), {
            node: setupRoot()
        });

        expect(rootElement.querySelector('#b')?.textContent).toBe('dev');
        root.destroy();
    });

    test('jsx renders a Fragment', () => {
        const root = createRoot();
        root.mount(() => jsx(Fragment as any, {
            children: [
                jsx('span', { id: 'c1', children: ['x'] }),
                jsx('span', { id: 'c2', children: ['y'] })
            ]
        }), { node: setupRoot() });

        expect(rootElement.querySelector('#c1')?.textContent).toBe('x');
        expect(rootElement.querySelector('#c2')?.textContent).toBe('y');
        root.destroy();
    });
});