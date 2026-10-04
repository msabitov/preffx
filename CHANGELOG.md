# Changelog

All notable changes to [PreffX](https://github.com/msabitov/preffx) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-10-04

### Added
- `preffx/state` export that provides all reactive utils from `@preact/signals-core`, as well as `state` and `reduce` (tests added)

### Changed
- all signals based handlers now use `preffx/state` utils

## [0.7.5] - 2026-09-27

### Added
- added tests for DOM event listener subscription/unsubscription, covering static listeners and dynamic listeners passed through a signal

### Fixed
- node props handling fixed: static (non-signal) values for properties, event listeners and attributes are now applied directly instead of being wrapped in an effect; only signal values are reactive
- README coverage badge fixed

### Changed
- `@preact/signals-core` dependency bumped to `^1.14.4`
- dictionary (`dict`) proxy fields are now resolved lazily: functional fields return a callable that creates a computed on invocation, scalar fields return a cached computed

## [0.7.4] - 2026-09-20

### Fixed
- fixed Vitest coverage config
- manual signal disposal within the component has been removed, as the reactive model from `@preact/signals-core` handles this automatically
- fixed a bug causing double destroy of reactive children: `destroy()` is now idempotent (a torn-down value is skipped on subsequent calls), since reactive children are reachable through both the DOM teardown cascade and the `ChildrenModel` cache cleanup (tests added)

## [0.7.3] - 2026-09-12

### Added
- added tests for attribute handling of JSX nodes
- coverage config added

### Fixed
- fixed bug with handling boolean JSX attribute values
- fixed bug with handling object value of style attribute

### Changed
- README badges

## [0.7.2] - 2026-09-05

### Added
- `jsx-runtime` and `jsx-dev-runtime` modules now export the `JSX` namespace and the `JSXInternal` type alias
- `Navigate` type added and used as the type of the `navigate` root util
- CHANGELOG.md added

### Changed
- JSX types have been moved from the `types` module to a new dedicated `jsx` module
- minor JSX element types changes

## [0.7.1] - 2026-08-31

### Fixed
- fixed a bug with `csstype` dependency - it is deleted since it is not necessary for basic use of the library

### Changed
- minor README changes

## [0.7.0] - 2026-08-30

### Added
- `preffx/server` module added, it allows to create PreffX root on the server side and use `renderToString()` method to serialize data and layout (tests added)
- `resource` utility added, it allows to declare async data fetchers to preload data on the server side (tests added)
- `Suspense` built-in component added, it allows to show fallback content when some `resources` inside are in the pending state

### Changed
- breaking change: the `createRoot()` function params changed - `mount`-specific params moved to `root.mount()` method (tests updated)
- all tests are splitted into two projects according to the environment (browser or Node)
- several fixes in package.json and README

## [0.6.2] - 2026-08-15

### Changed
- the logic for rendering multiple roots has been improved - it now handles effects and computed signals
- the logic for allocating unique identifiers has been adjusted - now when the root is destroyed, the counters are reset, but the prefix remains the same (test updated)
- part of the logic for working with DOM has been moved to a separate module

## [0.6.1] - 2026-08-08

### Added
- `defaultURL` setting added to PreffX root params - it allows to use detached routing (without Navigating API, signals only) (test added)

### Changed
- routing utils are now root-scoped to allow use several independent PreffX roots

## [0.6.0] - 2026-08-01

### Added
- `dict` has been added to the component's utils argument, allowing dictionaries to be used declaratively for multiple locales (tests added)
- `dict` usage example added to the README
- `defaultLang` param now can be specified for a PreffX root via `createRoot`

### Changed
- intl tests moved to a separate file
- `lang` and `setLang` utils are root scoped now

## [0.5.0] - 2026-07-26

### Added
- `routes` added to component's utils arg, it allows to configure routing in a declarative way (tests added)
- `routeParams` added to component's utils arg, it allows to access params of current route (tests added)
- advanced routing example added to the README

### Changed
- `matchPath` tests implemented in separate file

## [0.4.1] - 2026-07-19

### Added
- `navigate` utility added, currently it just wraps `Navigator.navigate` function
- `id` tests added

### Changed
- the README has been updated to describe how to use the `create-preffx` CLI to create a new PreffX project
- updated the example for getting an element's ref

## [0.4.0] - 2026-07-12

### Added
- `lang` and `setLang` utilities added (tests added)
- `lang` usage example added to README
- `state` and `reducer` utilities added, they emulate similar React hooks (tests added)

## [0.3.0] - 2026-07-05

### Added
- DOM nodes now support `$onMount` and `$onDestroy` parameters for more explicit handling of mounting and unmounting
- the readonly `url` signal added to the component's utils - it allows to create simple router (test added, README example added)

### Fixed
- component lifecycle fixed - all child hooks run before parent ones (tests added)

### Changed
- breaking change: the `createRoot().mount()` function now accepts the component function as the first argument and the passed parameters as the second. This is necessary to correctly capture the state of multiple roots (tests have been added and updated)

## [0.2.4] - 2026-06-28

### Added
- the lifecycle interceptors `onMount` and `onDestroy` can now save multiple handlers for a single component - all registered callbacks will be executed
- basic tests of the `Catch` component have been added
- basic tests of the `Portal` component have been added
- basic tests of the `Defer` component have been added

## [0.2.3] - 2026-06-21

### Added
- `For` component basic tests added
- `Fragment` component basic tests added

### Fixed
- fixed a callback bug in the `For` component - now it gets the current item from `items` as the first argument
- fixed a bug with ignoring zero as the value of a class or attribute of a DOM node
- fixed an error with setting the state of the root element

### Changed
- improved types for special components

## [0.2.2] - 2026-06-14

### Added
- MathML element types have been specified
- basic reactivity tests added

### Changed
- identifier conversions now use a radix parameter of 36 instead of the previous 16

## [0.2.1] - 2026-06-07

### Added
- several tests added for `createRoot` function

### Changed
- TypeScript version was updated
- `degit` usage example added to the README

## [0.2.0] - 2026-05-31

### Added
- PreffX root params added - now you can specify prefix for unique ids and add root context
- `Defer` component added - it can defer rendering of async signal after it will be resolved
- `createModel` and `action` functions from `@preact/signals-core` added to component utils
- usage examples added in the README

## [0.1.0] - 2026-05-27

### Added
- initial commit - initial release of PreffX

---

[0.8.0]: https://github.com/msabitov/preffx
[0.7.5]: https://github.com/msabitov/preffx/commit/9dba07105ef2622de39e16f574259286c71bac09
[0.7.4]: https://github.com/msabitov/preffx/commit/52c49431d76dbb3d66a6486be2e1d9f0af1aed09
[0.7.3]: https://github.com/msabitov/preffx/commit/1301266cc82b7321bac8fec8d3825696136f2cb6
[0.7.2]: https://github.com/msabitov/preffx/commit/ceb817e39b933038b195c4d5e99da82e66020c78
[0.7.1]: https://github.com/msabitov/preffx/commit/7e1c28ae7fa85dd2d809c37fc2735f6ea607f1cb
[0.7.0]: https://github.com/msabitov/preffx/commit/2bde4f6e2c81fedcd1d7396c93da81c21916dba4
[0.6.2]: https://github.com/msabitov/preffx/commit/c7b61d21c20e70798a6505078d444c0010d488b2
[0.6.1]: https://github.com/msabitov/preffx/commit/b971c45d2b981b6be09e7588d3bf0289c2d15c1c
[0.6.0]: https://github.com/msabitov/preffx/commit/77e896dff60aa8864b6b6f542ceb03fcfbe4ae35
[0.5.0]: https://github.com/msabitov/preffx/commit/d88bf117d0ae04b947625178c3de074d01553ca9
[0.4.1]: https://github.com/msabitov/preffx/commit/8301535547910c5d9a6966d13f5cda620872f7dd
[0.4.0]: https://github.com/msabitov/preffx/commit/ab79956cfb85c315d37986f5b6546f22d53963e9
[0.3.0]: https://github.com/msabitov/preffx/commit/7ffd79cdf13de2b8729fc5ada4557144952506ae
[0.2.4]: https://github.com/msabitov/preffx/commit/8593f73748550e0a5e47ab89436f6c86c50d784a
[0.2.3]: https://github.com/msabitov/preffx/commit/17ac4a1b0409790bfb71a9c469daefbae89a0752
[0.2.2]: https://github.com/msabitov/preffx/commit/b0eef9dbed54fba121187f8e0f00652ae68c4e03
[0.2.1]: https://github.com/msabitov/preffx/commit/82cd2015bd435d819d05881735663d255dd6d19d
[0.2.0]: https://github.com/msabitov/preffx/commit/84d2da38a3cd423bbe53ff420a5ff8a92b72cfea
[0.1.0]: https://github.com/msabitov/preffx/commit/87d42bbd7dd3add0bbfc39395d7741cc18a9a48b