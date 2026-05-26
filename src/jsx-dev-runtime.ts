import './types';
import { h, Fragment } from '.';

function jsx(type: any, props: any) {
  return h(type, props);
}

export { jsx, jsx as jsxs, jsx as jsxDEV, Fragment };
