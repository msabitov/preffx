import { afterEach, describe, expect, test, vi } from 'vitest';
import { h, Fragment, createRoot, PC } from '../src/index';
import { signal } from '../src/state';
import { createRoot as createServerRoot } from '../src/server';

function tick(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let rootElement: HTMLDivElement;

const setupRoot = () => {
    rootElement = globalThis.document.createElement('div');
    rootElement.id = 'resource-app';
    globalThis.document.body.appendChild(rootElement);
    return rootElement;
};

afterEach(() => {
    rootElement?.remove();
});

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
    const display = computed(() => res.error.value
        ? `error:${res.error.value.message}`
        : res.state.value ?? fallback);
    return h('div', {
        children: [
            h('span', { id: 'value', children: [display] }),
            h('button', { id: 'refetch', onClick: () => refetch(), children: ['reload'] })
        ]
    });
};

describe('client resource', () => {
    test('renders fallback while pending, then the resolved value', async () => {
        const root = createRoot();
        root.mount(ResourceView, {
            node: setupRoot(),
            props: { fetcher: vi.fn().mockResolvedValue('hello') }
        });
        await tick();

        expect(rootElement.querySelector('#value')?.textContent).toBe('hello');
        root.destroy();
    });

    test('renders fallback when the resource is still pending', async () => {
        const root = createRoot();
        root.mount(ResourceView, {
            node: setupRoot(),
            props: { fetcher: () => new Promise(() => {}), fallback: 'waiting' }
        });
        await tick();

        expect(rootElement.querySelector('#value')?.textContent).toBe('waiting');
        root.destroy();
    });

    test('renders the error message when the fetcher rejects', async () => {
        const root = createRoot();
        root.mount(ResourceView, {
            node: setupRoot(),
            props: { fetcher: vi.fn().mockRejectedValue(new Error('boom')) }
        });
        await tick();

        expect(rootElement.querySelector('#value')?.textContent).toBe('error:boom');
        root.destroy();
    });

    test('keeps the initial value visible while the first load is pending', async () => {
        const root = createRoot();
        root.mount(ResourceView, {
            node: setupRoot(),
            props: { fetcher: () => new Promise(() => {}), initial: 'cached' }
        });
        await tick();

        expect(rootElement.querySelector('#value')?.textContent).toBe('cached');
        root.destroy();
    });

    test('refetch re-runs the fetcher and updates the DOM', async () => {
        const root = createRoot();
        const fetcher = vi.fn()
            .mockResolvedValueOnce('first')
            .mockResolvedValueOnce('second');
        root.mount(ResourceView, { node: setupRoot(), props: { fetcher } });
        await tick();
        expect(rootElement.querySelector('#value')?.textContent).toBe('first');

        (rootElement.querySelector('#refetch') as HTMLButtonElement).click();
        await tick();
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(rootElement.querySelector('#value')?.textContent).toBe('second');
        root.destroy();
    });

    test('aborts the previous request on refetch', async () => {
        const root = createRoot();
        const signals: AbortSignal[] = [];
        const fetcher = vi.fn().mockImplementation((sig: AbortSignal) => {
            signals.push(sig!);
            return new Promise((resolve) => setTimeout(() => resolve('v'), 50));
        });
        root.mount(ResourceView, { node: setupRoot(), props: { fetcher } });
        await tick();

        (rootElement.querySelector('#refetch') as HTMLButtonElement).click();
        await tick();

        expect(signals.length).toBe(2);
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
        root.destroy();
    });

    test('ignores a stale (aborted) result after refetch', async () => {
        const root = createRoot();
        const fetcher = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve('stale'), 30)))
            .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve('fresh'), 5)));
        root.mount(ResourceView, { node: setupRoot(), props: { fetcher } });
        await tick();

        (rootElement.querySelector('#refetch') as HTMLButtonElement).click();
        await tick(50);

        // The stale first result must not overwrite the fresh one.
        expect(rootElement.querySelector('#value')?.textContent).toBe('fresh');
        root.destroy();
    });

    test('hydrates from the server preload data without refetching', async () => {
        // 1. Render on the server to obtain the preload payload + markup.
        const server = createServerRoot({ prefix: 'app' });
        const UserCard: PC<{ name: string }> = ({ name }, { resource, computed }) => {
            const [user] = resource(async () => ({ name, email: name + '@preffx.dev' }));
            const display = computed(() => user.state.value?.name ?? 'loading');
            return h('article', { class: 'user', children: [h('h1', { children: [display] })] });
        };
        const app = () => h(Fragment as any, { children: [h(UserCard as any, { name: 'Effnd' })] });
        const { preload, serialize } = server.renderToString(app);
        await preload();
        const html = serialize();

        // 2. Put the server markup into the DOM (including the preload script).
        const hydRoot = setupRoot();
        hydRoot.innerHTML = html;

        // 3. Mount the client root with the same prefix — resource must hydrate,
        //    not refetch. The client tree must mirror the server tree (app →
        //    Fragment → card) so component prefixes / resource keys line up.
        const client = createRoot({ prefix: 'app' });
        const fetcher: (signal: AbortSignal) => Promise<{ name: string; email: string }> =
            vi.fn().mockResolvedValue({ name: 'client', email: 'client@preffx.dev' });
        const ClientCard: PC = (_p, { resource, computed }) => {
            const [user] = resource(fetcher);
            const display = computed(() => user.state.value?.name ?? 'loading');
            return h('article', { class: 'user', children: [h('h1', { children: [display] })] });
        };
        const ClientApp: PC = () => h(Fragment as any, { children: [h(ClientCard as any, {})] });
        client.mount(ClientApp, { node: hydRoot });
        await tick();

        expect(hydRoot.querySelector('h1')?.textContent).toBe('Effnd');
        expect(fetcher).not.toHaveBeenCalled();
        client.destroy();
    });

    test('auto-refetches when a signal dependency read inside the fetcher changes', async () => {
        const root = createRoot();
        const userId = signal(1);
        const fetcher = vi.fn().mockImplementation(async (id: number) => `user-${id}`);
        const DepView: PC = (_p, { resource, computed }) => {
            const [res] = resource(async () => fetcher(userId.value));
            const display = computed(() => res.state.value ?? 'loading');
            return h('span', { id: 'dep-value', children: [display] });
        };
        root.mount(DepView, { node: setupRoot() });
        await tick();
        expect(rootElement.querySelector('#dep-value')?.textContent).toBe('user-1');
        expect(fetcher).toHaveBeenCalledTimes(1);

        // Change the dependency — the source-tracking effect must re-run the fetcher.
        userId.value = 2;
        await tick();
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(rootElement.querySelector('#dep-value')?.textContent).toBe('user-2');
        root.destroy();
    });

    test('times out on the client when the fetcher hangs', async () => {
        const root = createRoot();
        const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
        const TimeoutView: PC = (_p, { resource, computed }) => {
            const [res] = resource(fetcher, { timeout: 20 });
            const display = computed(() => res.error.value
                ? `error:${res.error.value.message}`
                : res.state.value ?? 'loading');
            return h('span', { id: 'timeout-value', children: [display] });
        };
        root.mount(TimeoutView, { node: setupRoot() });
        await tick(50);

        expect(rootElement.querySelector('#timeout-value')?.textContent).toBe('error:Resource timed out');
        root.destroy();
    });

    test('keeps the previous state visible during refetch with keepPreviousState', async () => {
        const root = createRoot();
        let resolveSecond: ((v: string) => void) | undefined;
        const fetcher = vi.fn()
            .mockResolvedValueOnce('first')
            .mockImplementationOnce(() => new Promise<string>((r) => { resolveSecond = r; }));
        const KeepView: PC = (_p, { resource, computed }) => {
            const [res, { refetch }] = resource(fetcher, { keepPreviousState: true });
            const display = computed(() => res.pending.value
                ? `pending:${res.state.value ?? 'none'}`
                : res.state.value ?? 'none');
            return h('span', {
                id: 'keep-value',
                children: [display, h('button', { id: 'refetch-btn', onClick: refetch })]
            });
        };
        root.mount(KeepView, { node: setupRoot() });
        await tick();
        expect(rootElement.querySelector('#keep-value')?.textContent).toBe('first');

        // Trigger refetch; the second fetch is still pending.
        (rootElement.querySelector('#refetch-btn') as HTMLElement).click();
        await tick();
        // Old state stays visible while pending (stale-while-revalidate).
        expect(rootElement.querySelector('#keep-value')?.textContent).toBe('pending:first');

        resolveSecond?.('second');
        await tick();
        expect(rootElement.querySelector('#keep-value')?.textContent).toBe('second');
        root.destroy();
    });

    test('keeps the last successful state when a later fetch fails', async () => {
        const root = createRoot();
        const fetcher = vi.fn()
            .mockResolvedValueOnce('first')
            .mockRejectedValueOnce(new Error('boom'));
        const ErrorView: PC = (_p, { resource, computed }) => {
            const [res, { refetch }] = resource(fetcher, { keepPreviousState: true });
            const display = computed(() => res.error.value
                ? `error:${res.error.value.message}:${res.state.value ?? 'none'}`
                : res.state.value ?? 'none');
            return h('span', {
                id: 'error-state',
                children: [display, h('button', { id: 'refetch-btn', onClick: refetch })]
            });
        };
        root.mount(ErrorView, { node: setupRoot() });
        await tick();
        expect(rootElement.querySelector('#error-state')?.textContent).toBe('first');

        // Refetch fails — the previous state must be preserved.
        (rootElement.querySelector('#refetch-btn') as HTMLElement).click();
        await tick();
        expect(rootElement.querySelector('#error-state')?.textContent).toBe('error:boom:first');
        root.destroy();
    });

    test('types the error with a custom E generic', async () => {
        const root = createRoot();
        type ApiError = { message: string; code: number };
        const fetcher = vi.fn().mockRejectedValue({ message: 'unauthorized', code: 401 } satisfies ApiError);
        const TypedView: PC = (_p, { resource, computed }) => {
            // E is inferred as ApiError, so res.error.value is ApiError | null.
            const [res] = resource<string, ApiError>(fetcher);
            const display = computed(() => {
                const err = res.error.value;
                return err ? `error:${err.code}:${err.message}` : res.state.value ?? 'none';
            });
            return h('span', { id: 'typed-error', children: [display] });
        };
        root.mount(TypedView, { node: setupRoot() });
        await tick();
        expect(rootElement.querySelector('#typed-error')?.textContent).toBe('error:401:unauthorized');
        root.destroy();
    });

    test('cancel aborts the in-flight request and resets pending', async () => {
        const root = createRoot();
        let capturedSignal: AbortSignal | undefined;
        const fetcher = vi.fn().mockImplementation((sig: AbortSignal) => {
            capturedSignal = sig;
            return new Promise<string>(() => {});
        });
        const CancelView: PC = (_p, { resource, computed }) => {
            const [res, { cancel }] = resource(fetcher);
            const display = computed(() => res.pending.value ? 'pending' : 'idle');
            return h('span', {
                id: 'cancel-value',
                children: [display, h('button', { id: 'cancel-btn', onClick: cancel })]
            });
        };
        root.mount(CancelView, { node: setupRoot() });
        await tick();
        expect(rootElement.querySelector('#cancel-value')?.textContent).toBe('pending');

        (rootElement.querySelector('#cancel-btn') as HTMLElement).click();
        await tick();
        expect(capturedSignal?.aborted).toBe(true);
        expect(rootElement.querySelector('#cancel-value')?.textContent).toBe('idle');
        root.destroy();
    });

    test('invalidate clears the cached entry so the next mount re-fetches', async () => {
        const root = createRoot();
        const fetcher = vi.fn().mockResolvedValue('data');
        const CacheView: PC = (_p, { resource, computed }) => {
            const [res, { invalidate }] = resource(fetcher, { key: 'shared-key' });
            const display = computed(() => res.state.value ?? 'none');
            return h('span', {
                id: 'cache-value',
                children: [display, h('button', { id: 'invalidate-btn', onClick: invalidate })]
            });
        };
        root.mount(CacheView, { node: setupRoot() });
        await tick();
        expect(rootElement.querySelector('#cache-value')?.textContent).toBe('data');
        expect(fetcher).toHaveBeenCalledTimes(1);

        // Invalidate the cache entry, then re-mount: the fetcher must run again.
        (rootElement.querySelector('#invalidate-btn') as HTMLElement).click();
        root.destroy();
        root.mount(CacheView, { node: setupRoot() });
        await tick();
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(rootElement.querySelector('#cache-value')?.textContent).toBe('data');
        root.destroy();
    });

    test('starts not-pending when an initial value is provided', async () => {
        const root = createRoot();
        const fetcher = vi.fn().mockImplementation(() => new Promise<string>(() => {}));
        const InitialView: PC = (_p, { resource, computed }) => {
            const [res] = resource(fetcher, { initial: 'cached' });
            const display = computed(() => res.pending.value
                ? `pending:${res.state.value ?? 'none'}`
                : res.state.value ?? 'none');
            return h('span', { id: 'initial-pending', children: [display] });
        };
        root.mount(InitialView, { node: setupRoot() });
        await tick();
        // With `initial`, data is already available, so pending starts false
        // and Suspense does not show a fallback.
        expect(rootElement.querySelector('#initial-pending')?.textContent).toBe('cached');
        root.destroy();
    });
});