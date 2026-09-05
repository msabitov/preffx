import type { JSX } from './jsx';
import { h, Fragment } from './h';

export type { JSX };
export type { JSX as JSXInternal };

function jsx(type: string | Function, props: any): any {
  return h(type, props);
}

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };
