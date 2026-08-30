import { describe, expect, test } from 'vitest';
import { h, Fragment, PC } from '../../src/index';
import { createRoot } from '../../src/server';

// One server root reused across tests (public API). Its prefix/context/utils are
// built from the same options as a client createRoot, keeping SSR + hydration in
// sync. Each render resets the internal counters + resources map.
const server = createRoot();

const UserCard: PC<{ name: string }> = ({ name }, { resource, computed }) => {
    const [user, refetch] = resource(async () => {
        return { id: 1, name, email: name + '@preffx.dev' };
    });
    // New SSR contract: put a *signal* (computed) in the tree, not a baked
    // `state.value`. The server walker resolves it at render time, after
    // `preload()` seeds `state`. One tree build, no second h() pass.
    const display = computed(() => user.state.value?.name ?? 'loading');
    return h('article', {
        class: 'user',
        children: [
            h('h1', { children: [display] }),
            h('button', { onClick: () => refetch(), children: 'reload' })
        ]
    });
};

describe('renderToString', () => {
    test('preload drives resources, render produces markup + data script', async () => {
        const app = () => h(Fragment as any, {
            children: [
                h(UserCard as any, { name: 'Effnd' })
            ]
        });

        const { preload, serialize } = server.renderToString(app);
        await preload();

        const html = serialize();
        expect(html).toContain('<article class="user">');
        expect(html).toContain('<h1>Effnd</h1>');
        expect(html).toContain('data-preffx-preload=');
        expect(html).toContain('Effnd@preffx.dev');
    });

    test('without preload, resource value is absent (loading fallback)', async () => {
        const app = () => h(Fragment as any, {
            children: [h(UserCard as any, { name: 'Bob' })]
        });
        const { serialize } = server.renderToString(app);
        // no preload => state null => 'loading'
        const html = serialize();
        expect(html).toContain('<h1>loading</h1>');
        expect(html).not.toContain('>Bob@preffx.dev<');
    });

    test('Suspense callback registers resources on server', async () => {
        // `callback` is resolved under the active scope, so the `resource()`
        // inside the lazily-built subtree lands in the shared `resources` pool
        // without a separate register pass.
        const AsyncBlock: PC = (_p, { Suspense }) => h(Suspense as any, {
            callback: () => h(Fragment as any, {
                children: [h(UserCard as any, { name: 'Carol' })]
            }),
            fallback: h('p', { children: 'loading...' })
        });

        const { preload, serialize } = server.renderToString(AsyncBlock);
        await preload();
        const html = serialize();
        expect(html).toContain('<h1>Carol</h1>');
        expect(html).toContain('Carol@preffx.dev');
    });
});

describe('SSR utils components', () => {
    // For: maps items via callback; fallback when empty.
    const ForList: PC<{ items: any[]; empty?: boolean }> = ({ items, empty }, { For }) => {
        const arr = empty ? [] : items;
        return h(For, {
            items: arr,
            callback: (i: any) => h('li', { children: [String(i.name)] }),
            fallback: h('p', { children: ['empty'] })
        });
    };

    test('For renders each item', async () => {
        const app = () => h(Fragment as any, {
            children: [h('ul', { children: [h(ForList as any, { items: [{ name: 'a' }, { name: 'b' }] })] })]
        });
        const { serialize } = server.renderToString(app);
        const html = serialize();
        expect(html).toContain('<ul><li>a</li><li>b</li></ul>');
    });

    test('For falls back when empty', async () => {
        const app = () => h(Fragment as any, {
            children: [h(ForList as any, { items: [], empty: true })]
        });
        const { serialize } = server.renderToString(app);
        expect(serialize()).toContain('<p>empty</p>');
    });

    // Catch: children with errors -> fallback, else passthrough.
    test('Catch renders fallback when children have errors', async () => {
        const App: PC = (_, { Catch }) => h(Catch, {
            children: [h('div', { children: ['ok'] }), new Error('boom')],
            fallback: h('div', { children: ['oops'] })
        });
        const { serialize } = server.renderToString(App as any, {});
        expect(serialize()).toContain('oops');
        expect(serialize()).not.toContain('ok');
    });

    test('Catch passes children through when no errors', async () => {
        const App: PC = (_, { Catch }) => h(Catch, {
            children: [h('div', { children: ['hello'] })],
            fallback: h('div', { children: ['oops'] })
        });
        const { serialize } = server.renderToString(App as any, {});
        expect(serialize()).toContain('hello');
        expect(serialize()).not.toContain('oops');
    });

    // Defer: non-promise value -> rendered value; promise -> initial placeholder.
    test('Defer renders resolved value', async () => {
        const App: PC = (_, { Defer }) => h(Defer, {
            initial: 'loading',
            value: 'ready'
        });
        const { serialize } = server.renderToString(App as any, {});
        expect(serialize()).toContain('ready');
    });

    test('Defer falls back to initial for unresolved promise', async () => {
        const App: PC = (_, { Defer }) => h(Defer, {
            initial: 'loading',
            value: new Promise<string>(() => {})
        });
        const { serialize } = server.renderToString(App as any, {});
        expect(serialize()).toContain('loading');
    });

    // Portal has no target DOM on the server, so it renders nothing.
    test('Portal renders nothing on server', async () => {
        const App: PC = (_, { Portal }) => h(Portal, {
            root: null as any,
            children: h('span', { children: ['inline'] })
        });
        const { serialize } = server.renderToString(App as any, {});
        expect(serialize()).not.toContain('<span>inline</span>');
    });
});

describe('server createRoot parity', () => {
    // Key invariant fixed by the server `createRoot`: the root options
    // (prefix/context/defaultLang/defaultURL) MUST reach both SSR methods, just
    // like they reach the client mount — no more stubbed lang/url on the server.
    const parityRoot = createRoot({
        prefix: 'p',
        context: { tenant: 'acme' },
        defaultLang: 'ru',
        defaultURL: new URL('https://app.example/docs')
    });

    // Reads every root-built util/context that a real hydration needs to stay in
    // sync with the client, and emits them into the markup so we can assert.
    const RootProbe: PC = (_p, { lang, url, context, id }) => h('article', {
        'data-lang': String(lang.value),
        'data-path': url.value.pathname,
        'data-tenant': (context as any).tenant,
        children: [h('span', { children: [id()] })]
    });

    test('renderToString carries root options (prefix/lang/url/context)', () => {
        const { serialize } = parityRoot.renderToString(RootProbe as any, {});
        const html = serialize();
        expect(html).toContain('data-lang="ru"');
        expect(html).toContain('data-path="/docs"');
        expect(html).toContain('data-tenant="acme"');
        // prefix flows into component ids (`p` prefix)
        expect(html).toMatch(/p\d+-\d+/);
    });
});