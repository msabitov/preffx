import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { h, createRoot, PC } from '../src/index';

function tick(ms: number = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Intl', () => {
    describe('lang / setLang', () => {
        let rootElement: HTMLDivElement;
        let originalLang: string | null;

        beforeAll(() => {
            // Save original lang attribute so we can restore it
            const html = globalThis.document.documentElement;
            originalLang = html.getAttribute('lang');

            rootElement = globalThis.document.createElement('div');
            rootElement.id = 'lang-app';
            globalThis.document.body.appendChild(rootElement);

            return () => {
                rootElement.remove();
                // Restore original lang
                if (originalLang) {
                    html.setAttribute('lang', originalLang);
                } else {
                    html.removeAttribute('lang');
                }
            };
        });

        const LangDisplayComponent: PC = (_, { lang }) => {
            return h('span', { id: 'lang-value', children: [lang] });
        };

        const LangControlComponent: PC = (_, { lang, setLang }) => {
            return h('div', {
                children: [
                    h('span', { id: 'lang-display', children: [lang] }),
                    h('button', {
                        id: 'set-lang-ru',
                        onClick: () => setLang('ru'),
                        children: ['RU'],
                    }),
                    h('button', {
                        id: 'set-lang-en',
                        onClick: () => setLang('en'),
                        children: ['EN'],
                    }),
                ],
            });
        };

        test('lang signal reads initial html lang attribute', async () => {
            const html = globalThis.document.documentElement;
            html.setAttribute('lang', 'en');

            const root = createRoot();
            root.mount(LangDisplayComponent, { node: rootElement });
            await tick();

            const el = rootElement.querySelector('#lang-value');
            expect(el?.textContent).toBe('en');

            root.destroy();
        });

        test('lang signal is empty string when html has no lang attribute', async () => {
            const html = globalThis.document.documentElement;
            html.removeAttribute('lang');

            const root = createRoot();
            root.mount(LangDisplayComponent, { node: rootElement });
            await tick();

            const el = rootElement.querySelector('#lang-value');
            expect(el?.textContent).toBe('');

            root.destroy();
        });

        test('setLang updates lang signal value', async () => {
            const root = createRoot();
            root.mount(LangControlComponent, { node: rootElement });
            await tick();

            (rootElement.querySelector('#set-lang-ru') as HTMLButtonElement).click();
            await tick();

            const el = rootElement.querySelector('#lang-display');
            expect(el?.textContent).toBe('ru');

            root.destroy();
        });

        test('setLang updates the DOM <html lang> attribute', async () => {
            const html = globalThis.document.documentElement;
            html.setAttribute('lang', 'de');

            const root = createRoot();
            root.mount(LangControlComponent, { node: rootElement });
            await tick();

            (rootElement.querySelector('#set-lang-en') as HTMLButtonElement).click();
            await tick();

            expect(html.getAttribute('lang')).toBe('en');

            root.destroy();
        });

        test('reactivity — component re-renders when lang changes via setLang', async () => {
            // Set a known starting lang
            const html = globalThis.document.documentElement;
            html.setAttribute('lang', 'fr');

            const root = createRoot();
            root.mount(LangControlComponent, { node: rootElement });
            await tick();

            // Initially shows 'fr'
            expect(
                rootElement.querySelector('#lang-display')?.textContent,
            ).toBe('fr');

            // Switch to 'ru' via button
            (rootElement.querySelector('#set-lang-ru') as HTMLButtonElement).click();
            await tick();

            // Signal + DOM must both be updated
            expect(
                rootElement.querySelector('#lang-display')?.textContent,
            ).toBe('ru');
            expect(html.getAttribute('lang')).toBe('ru');

            root.destroy();
        });
    });

    describe('dict', () => {
        let rootElement: HTMLDivElement;

        const enDict = { title: 'Hello', greeting(name: string) { return 'My name is ' + name;} };
        const ruDict = { title: 'Привет', greeting(name: string) { return 'Меня зовут ' + name;} };
        const frDict = { title: 'Bonjour', greeting(name: string) { return `Je m'appelle ` + name;} };
        const DictComponent: PC = (_, { dict }) => {
            const t = dict({
                en: () => enDict,
                ru: () => ruDict,
                '*': () => frDict,
            }, { title: '', greeting() {
                return '';
            } });

            // Direct field access — returns ReadonlySignal
            return h('div', {
                children: [
                    h('span', { id: 'dict-title', children: [t.title] }),
                    h('span', { id: 'dict-desc', children: [t.greeting('PreffX')] }),
                ],
            });
        };
        const AsyncDictComponent: PC = (_, { dict }) => {
            const t = dict({
                ru: () => Promise.resolve(ruDict),
                en: () => Promise.resolve(enDict),
            }, { title: '', greeting() {
                return '';
            } });

            return h('div', {
                children: [
                    h('span', { id: 'async-title', children: [t.title] }),
                    h('span', { id: 'async-desc', children: [t.greeting('PreffX')] }),
                ],
            });
        };
        const SwitchDictComponent: PC = (_, { dict, setLang }) => {
            const t = dict({
                en: () => enDict,
                ru: () => ruDict,
            }, { title: '', greeting() {
                return '';
            } });

            return h('div', {
                children: [
                    h('span', { id: 'switch-title', children: [t.title] }),
                    h('span', { id: 'switch-greeting', children: [t.greeting('PreffX')] }),
                    h('button', {
                        id: 'switch-to-ru',
                        onClick: () => setLang('ru'),
                        children: ['RU'],
                    }),
                ],
            });
        };
        const WildcardDictComponent: PC = (_, { dict }) => {
            const t = dict({
                en: () => enDict,
                ru: () => ruDict,
                '*': () => frDict,
            }, { title: '', greeting() {
                return '';
            } });

            return h('div', {
                children: [
                    h('span', { id: 'wildcard-title', children: [t.title] }),
                ],
            });
        };
        const UnresolvedDictComponent: PC = (_, { dict }) => {
            const t = dict({
                en: () => enDict,
                ru: () => ruDict,
            }, { title: 'fallback', greeting() {
                return '';
            } });

            return h('div', {
                children: [
                    h('span', { id: 'nores-title', children: [t.title] }),
                ],
            });
        };

        beforeAll(() => {
            rootElement = globalThis.document.createElement('div');
            rootElement.id = 'dicts-app';
            globalThis.document.body.appendChild(rootElement);

            return () => {
                rootElement.remove();
            };
        });

        test('sync resolver returns correct dict with current lang', async () => {
            const root = createRoot({ defaultLang: 'en' });
            root.mount(DictComponent, { node: rootElement });
            await tick(50);

            expect(rootElement.querySelector('#dict-title')?.textContent).toBe('Hello');
            expect(rootElement.querySelector('#dict-desc')?.textContent).toBe('My name is PreffX');

            root.destroy();
        });

        test('async resolver loads and returns dict', async () => {
            const root = createRoot({ defaultLang: 'ru' });

            root.mount(AsyncDictComponent, { node: rootElement });
            await tick(50);

            expect(rootElement.querySelector('#async-title')?.textContent).toBe('Привет');

            root.destroy();
        });

        test('language change switches to correct dict', async () => {
            const root = createRoot({ defaultLang: 'en' });
            root.mount(SwitchDictComponent, { node: rootElement });
            await tick(50);

            expect(rootElement.querySelector('#switch-title')?.textContent).toBe('Hello');
            expect(rootElement.querySelector('#switch-greeting')?.textContent).toBe('My name is PreffX');

            (rootElement.querySelector('#switch-to-ru') as HTMLButtonElement).click();
            await tick(50);

            expect(rootElement.querySelector('#switch-title')?.textContent).toBe('Привет');
            expect(rootElement.querySelector('#switch-greeting')?.textContent).toBe('Меня зовут PreffX');

            root.destroy();
        });

        test('fallback to wildcard (*) resolver when language has no specific dict', async () => {
            const root = createRoot({ defaultLang: 'de' });
            root.mount(WildcardDictComponent, { node: rootElement });
            await tick(50);

            // 'de' is not in resolvers, so '*' fallback should be used → frDict
            expect(rootElement.querySelector('#wildcard-title')?.textContent).toBe('Bonjour');

            root.destroy();
        });

        test('returns initial value before resolver completes', async () => {
            const initial = { title: 'Loading...', greeting() {
                return 'Please wait';
            }};
            const InitialComponent: PC = (_, { dict }) => {
                const t = dict({
                    en: () => new Promise<typeof enDict>(resolve => {
                        setTimeout(() => resolve(enDict), 100);
                    }),
                }, initial);
                return h('div', {
                    children: [
                        h('span', { id: 'initial-title', children: [t.title] }),
                    ],
                });
            };

            const root = createRoot({ defaultLang: 'en' });
            root.mount(InitialComponent, { node: rootElement });
            // Check immediately — should show initial before async completes
            await tick(10);
            expect(rootElement.querySelector('#initial-title')?.textContent).toBe('Loading...');

            // Wait for async resolver to finish
            await tick(200);
            expect(rootElement.querySelector('#initial-title')?.textContent).toBe('Hello');

            root.destroy();
        });

        test('resolver error falls back to empty dict', async () => {
            const ErrorComponent: PC = (_, { dict }) => {
                const t = dict({
                    en: () => Promise.reject(new Error('Network error')),
                }, { title: 'fallback', greeting() {
                    return '';
                } });

                return h('div', {
                    children: [
                        h('span', { id: 'error-title', children: [t.title] }),
                    ],
                });
            };

            const root = createRoot({ defaultLang: 'en' });
            root.mount(ErrorComponent, { node: rootElement });
            await tick(50);

            // Should be empty dict (no title property) — so textContent should be ''
            expect(rootElement.querySelector('#error-title')?.textContent).toBe('');

            root.destroy();
        });

        test('no resolver for lang and no wildcard — empty dict', async () => {
            const root = createRoot({ defaultLang: 'es' });
            root.mount(UnresolvedDictComponent, { node: rootElement });
            await tick(50);

            expect(rootElement.querySelector('#nores-title')?.textContent).toBe('');

            root.destroy();
        });
    });
});