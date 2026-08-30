import './types';
import { h, Fragment } from './h';

function jsx(type: any, props: any) {
  return h(type, props);
}

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };
