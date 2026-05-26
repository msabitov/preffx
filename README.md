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

⚠️ The project is currently in an experimental stage, do not use in a production environment. ⚠️

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

Try [Vite + PreffX](https://stackblitz.com/edit/vitejs-preffx?file=src%2FApp.tsx) demo

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
    const count = signal(0);

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
import { AnotherComponent } from './components';

export const App: PC = (props, { context }) => {
    // get value from context
    const valueFromContext = context.someValue;
    // add value for children context
    context.forChild = 'Another value';
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
