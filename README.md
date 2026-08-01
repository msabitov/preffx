<p align="center">
  <a href="https://effnd.tech/preffx/">
    <img alt="PreffX" src="https://effnd.tech/preffx/logo.svg" height="256px" />
  </a>
</p>

<h1 align="center">PreffX</h1>

<div align="center">

[![license](https://badgen.net/static/license/Apache%202.0/blue)](https://sourcecraft.dev/msabitov/preffx/browse/LICENSE?rev=master)
[![npm latest package](https://badgen.net/npm/v/preffx)](https://www.npmjs.com/package/preffx)
![minified size](https://badgen.net/bundlephobia/min/preffx)
![minzipped size](https://badgen.net/bundlephobia/minzip/preffx)
![install size](https://badgen.net/packagephobia/install/preffx)

</div>

PreffX is a self-confident JS library for creating reactive DOM. It is inspired by React and Preact, but offers its own signal-based approach.

⚠️ The project is in an experimental stage, do not use in a production environment ⚠️

## Basic principles

-   React-like JSX syntax;
-   [Preact signals](https://preactjs.com/guide/v10/signals/) as reactivity core;
-   only signals cause rerender;
-   each component is executed only once;
-   component props come as the first argument and all utilities come as the second argument - there is no need to import them,
-   both sync and async function components support;
-   distinction between properties and attributes (all properties are prefixed with `$`) - for example, `$value` is a property, and `value` is an attribute.

## Links

-   [Docs (in development)](https://effnd.tech/preffx/)
-   [SourceCraft](https://sourcecraft.dev/msabitov/preffx)
-   [GitHub](https://github.com/msabitov/preffx)
-   [NPM](https://www.npmjs.com/package/preffx)

## Installation

The recommended way is to use the `create-preffx` interactive utility, which allows you to define name, language, and CSS solution for the project:

```bash
npx create-preffx
```

Alternatively you can use [degit](https://github.com/Rich-Harris/degit):

```bash
npx degit msabitov/vite-preffx preffx-starter 
cd preffx-starter         
npm install        
npm run dev
```

You can also try [StackBlitz demo](https://stackblitz.com/edit/vitejs-preffx?file=src%2FApp.tsx)

## Examples

- Simple counter:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { signal }) => {
    const count = signal(0);
    return <button
        onClick={() => {
            count.value += 1
        }}
    >
        Count is {count}
    </button>
};
```

- How to create element refs:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { signal }) => {
    const signalRef = signal();
    return <div $ref={signalRef}>
        <div
            $ref={(refVal) => {
                // it will be called after element mounted with refVal = HTMLDivElement
                // and before element destroyed with refVal = null
            }}
            $onMount={(refVal) => {
                // it will be called after element mounted with refVal = HTMLDivElement
            }}
            $onDestroy={() => {
                // it will be called before element destroyed with refVal = HTMLDivElement
            }}
        >
            Refs
        </button>
    </div>
};
```

- Lifecycle hooks:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { onMount, onDestroy }) => {
    const { count } = props;

    onMount(() => {
        // some mount logic
    });
    
    onDestroy(() => {
        // some destroy logic
    });
    return <button
        onClick={() => {
            count.value += 1
        }}
    >
        Count is {count}
    </button>
};
```

- List rendering:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { For }) => {
    const items = signal([
        {
            name: 'First'
        },
        {
            name: 'Second'
        }
    ]);

    return <ul>
        <For
            items={items}
            callback={(item) => <li>Item with name: {item.name}</li>}
            fallback={<li>No items</li>}
        />
    </ul>;
};
```

- Context handling:

```tsx
import type { PC } from 'preffx';

const contextKey = 'ctx-counter';

const AnotherComponent: PC = (props, { context }) => {
    // read context
    const counter = context[contextKey];
    return <span>
        {counter}
    </span>;
};

export const App: PC = (props, { signal, context }) => {
    const counter = signal(0);
    // modify context
    context[contextKey] = counter;
    return <p>
        {valueFromContext}
        <AnotherComponent />
    </p>;
};
```

- Async components:

```tsx
import type { APC } from 'preffx';
import { getData } from './data';
import { AnotherComponent, AnotherAsyncComponent } from './components';

const AsyncComponent: APC<{
    name: string;
}> = async (props, utils) => {
    const data = await getData()
    const componentRoot = await <AnotherAsyncComponent name='nested'/>;
    return <div>
        <AnotherComponent data={data} />
        {componentRoot}
    </div>;
}
```

- Error handling:

```tsx
import type { PC } from 'preffx';
import { AnotherComponent } from './components';

export const App: PC = (props, { Catch }) => {
    return <div>
        Sometimes components return errors
        <Catch fallback={<div>Catched!</div>}>
            <AnotherComponent />
        </Catch>
    </div>;
};
```

- Defered value handling:

```tsx
import type { PC } from 'preffx';
import { AsyncComponent } from './components';

export const App: PC = (props, { computed, Defer }) => {
    const def = computed(() => <AsyncComponent id={props.id} />);
    return <Defer
        value={def}
        initial={<div>Please wait</div>}
    />;
};
```

- Portal:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { Portal }) => {
    return <>
        <span>Some text inside current tree</span>
        <Portal root={document.getElementById('portal')}>
            <div>Text inside portal</div>
        </Portal>
    </>;
};
```

- Unique identifiers:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { id }) => {
    // get unique id
    const inputId = id();
    return <>
        <label>
            Password:
            <input
                type="password"
                aria-describedby={inputId}
            />
        </label>
        <p id={inputId}>
            The password should contain at least 18 characters
        </p>
    </>;
};
```

- Simple routing:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { computed, url }) => {
    const routeContent = computed(() => {
        // depends on url signal
        switch(url.value.pathname) {
            case '/home':
                return <div>Home page content</div>
            case '/contacts':
                return <div>Contacts page content</div>;
            default:
                return <div>Other page content</div>
        }
    });
    return <div>
        <a href='/home'>Home</a>
        <a href='/contacts'>Contacts</a>
        {routeContent}
    </div>;
};
```

- Advanced routing:

```tsx
import type { PC } from 'preffx';

export const App: PC = (props, { routes }) => {
    const routesContent = routes({
        // root
        '/': () => <div>Home page content</div>,
        // route params
        '/:lang?/user/:id': (_, {routeParams}) => <div>User #{routeParams.id} ({routeParams.lang || 'en'})</div>,
        // fallback
        '*': () => <div>Not found</div>
    });
    return <div>
        <a href='/'>Home</a>
        <a href='/user/42'>User page</a>
        <a href='/ru/user/42'>User page (ru)</a>
        <a href='/inknown'>Unknown page</a>
        {routesContent}
    </div>;
};
```

- Simple i18n example:

```tsx
import type { PC } from 'preffx';

const dictionary = {
    en: {
        openProfile: 'Open profile',
        showStats: 'Show statistics'
    },
    ru: {
        openProfile: 'Открыть профиль',
        showStats: 'Показать статистику'
    }
};

export const App: PC = (props, { computed, lang }) => {
    const captions = computed(() => {
        // depends on lang signal
        return dictionary[lang.value] || dictionary.en;
    });
    return <div>
        <button>{captions.openProfile}</button>
        <button>{captions.showStats}</button>
    </div>;
};
```

- Advanced i18n example:

```tsx
import type { APC } from 'preffx';

const getRuDictionary = async () => {
    // there can be dynamic imports
    return {
        openProfile(name: string) {
            return 'Открыть профиль № ' + name;
        },
        showStats: 'Показать статистику'
    };
};

const getEnDictionary = async () => {
    // there can be dynamic imports
    return {
        openProfile(name: string) {
            return 'Open profile № ' + name;
        },
        showStats: 'Show stats'
    };
};

export const App: APC = async (props, { dict, setLang }) => {
    const initialDict = await getEnDictionary();
    // locales need to be passed with dictionary resolvers,
    // resolvers can be async
    const captions = dict({
        ru: getRuDictionary,
        en: getEnDictionary
    }, initialDict);
    return <div>
        <button onClick={() => setLang('en')}>EN</button>
        <button onClick={() => setLang('ru')}>RU</button>
        <span>
            <button>{captions.openProfile('42')}</button>
            <button>{captions.showStats}</button>
        </span>    
    </div>;
};
```
