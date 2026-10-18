import { describe, expect, test, vi } from 'vitest';
import { h, Fragment, PC } from '../../src/index';
import { createRoot } from '../../src/server';

/**
 * A component that renders a resource's resolved value (or a fallback while
 * pending) and exposes a button to trigger `refetch`.
 */
const ResourceView: PC<{
    fetcher: (signal: AbortSignal) => Promise<string>;
    initial?: string;
    fallback?: string;
}> = ({ fetcher, initial, fallback = 'loading' }, { resource, computed }) => {
    const [res, { refetch }] = resource(fetcher, { initial });
    const display = computed(() => res.state.value ?? fallback);
    return h('div', {
        children: [
            h('span', { id: 'value', children: [display] }),
            h('button', { onClick: () => refetch(), children: ['reload'] })
        ]
    });
};

describe('server resource', () => {
    const server = createRoot();

    test('preload drives resources and serialize emits markup + data script', async () => {
        const app = () => h(Fragment as any, {
            children: [h(ResourceView as any, { fetcher: vi.fn().mockResolvedValue('hello') })]
        });
        const { preload, serialize } = server.renderToString(app);
        await preload();
        const html = serialize();

        expect(html).toContain('<span id="value">hello</span>');
        expect(html).toContain('data-preffx-preload=');
    });

    test('without preload, resource value is absent (fallback)', async () => {
        const app = () => h(Fragment as any, {
            children: [h(ResourceView as any, { fetcher: vi.fn().mockResolvedValue('hello') })]
        });
        const { serialize } = server.renderToString(app);
        const html = serialize();

        expect(html).toContain('<span id="value">loading</span>');
        expect(html).not.toContain('>hello<');
    });

    test('renders the initial value before preload resolves', async () => {
        const app = () => h(Fragment as any, {
            children: [h(ResourceView as any, {
                fetcher: () => new Promise(() => {}),
                initial: 'cached'
            })]
        });
        const { serialize } = server.renderToString(app);
        expect(serialize()).toContain('<span id="value">cached</span>');
    });

    test('falls back when the fetcher rejects', async () => {
        const app = () => h(Fragment as any, {
            children: [h(ResourceView as any, { fetcher: vi.fn().mockRejectedValue(new Error('boom')) })]
        });
        const { preload, serialize } = server.renderToString(app);
        await preload();
        expect(serialize()).toContain('<span id="value">loading</span>');
    });

    test('Suspense callback registers resources on the server', async () => {
        const AsyncBlock: PC = (_p, { Suspense }) => h(Suspense as any, {
            callback: () => h(Fragment as any, {
                children: [h(ResourceView as any, { fetcher: vi.fn().mockResolvedValue('Carol') })]
            }),
            fallback: h('p', { children: ['loading...'] })
        });
        const { preload, serialize } = server.renderToString(AsyncBlock);
        await preload();
        const html = serialize();

        expect(html).toContain('<span id="value">Carol</span>');
        expect(html).toContain('Carol');
    });

    test('a slow fetcher times out and still renders the fallback', async () => {
        const app = () => h(Fragment as any, {
            children: [h(ResourceView as any, {
                fetcher: () => new Promise((resolve) => setTimeout(() => resolve('late'), 100)),
                fallback: 'pending'
            })]
        });
        const { preload, serialize } = server.renderToString(app);
        // Global timeout of 10ms — the fetcher (100ms) will not resolve in time.
        await preload(10);
        expect(serialize()).toContain('<span id="value">pending</span>');
    });
});