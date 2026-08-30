import type { Resources } from '../types';
import { SSRNode, SuspenseNode, isSuspenseNode, isSSRNode } from '../utils/render';
import { isSignal, isArray, PREFFX_PRELOAD_ATTR } from '../utils/core';

export const kebabCase = (str: string): string => str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());

/** Serialize a style object/string into CSS text. */
export const serializeStyle = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') {
        return Object.entries(val).reduce((acc, [k, v]) => {
            const key = kebabCase(k);
            return acc + (v != null && v !== false ? `${key}:${'' + v};` : '');
        }, '');
    }
    return '';
};

/** Resolve signals/arrays into plain values. */
export const resolve = (val: any): any => {
    if (isSignal(val)) return resolve(val.value);
    if (isArray(val)) return val.map(resolve);
    return val;
};

/** A single walkable node output target */
export type WalkFrame =
    | { kind: 'element'; node: SSRNode }
    | { kind: 'suspense'; node: SuspenseNode }
    | { kind: 'text'; value: unknown };

/** Unwrap value into flat element / suspense / text frames */
export function* resolveFrames(value: any): Generator<WalkFrame> {
    const r = resolve(value);
    if (r === null || r === undefined || typeof r === 'boolean') return;
    if (Array.isArray(r)) {
        for (const item of r) yield* resolveFrames(item);
        return;
    }
    if (isSuspenseNode(r)) {
        yield { kind: 'suspense', node: r as SuspenseNode };
        return;
    }
    if (isSSRNode(r)) {
        yield { kind: 'element', node: r as SSRNode };
        return;
    }
    yield { kind: 'text', value: r };
}

export const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/** Escape special characters for HTML text content */
export const escapeHtml = (s: string): string => s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');

/** Escape for attribute values (quotes + html entities) */
export const escapeAttr = (s: string): string => escapeHtml(String(s)).replace(/"/g, '"');

/** Render a single SSR-node attribute into markup */
export const renderProp = (props: Record<string, any>, key: string, value: any): string => {
    // SSR never emits event listeners, node properties, children
    if (key === 'children' || key.startsWith('on') || key.startsWith('$')) return '';
    if (key === 'class') {
        if (value === undefined || value === null || value === false) return '';
        return ` class="${escapeAttr(String(value))}"`;
    }
    if (key === 'style') {
        const str = serializeStyle(value);
        if (!str) return '';
        return ` style="${escapeAttr(str)}"`;
    }
    if (typeof value === 'boolean') {
        return value ? ` ${key}` : '';
    }
    if (value === undefined || value === null) return '';
    const attr = kebabCase(key);
    return ` ${attr}="${escapeAttr(String(value))}"`;
};

/** Render `<type attrs>` opening markup. */
export const renderOpenTag = (node: SSRNode): string => {
    const { type, props } = node;
    let attrs = '';
    if (props && typeof props === 'object') {
        const resolvedProps = resolve(props);
        for (const key of Object.keys(resolvedProps)) {
            attrs += renderProp(resolvedProps, key, resolvedProps[key]);
        }
    }
    return `<${type}${attrs}>`;
};

/** True when the element is a void (self-closing) HTML tag. */
export const isVoidTag = (tag: string): boolean => VOID_ELEMENTS.has(tag);

/** Walk an SSR value tree, yielding HTML chunks */
export function* walk(
    value: any,
    resources: Resources | undefined
): Generator<string> {
    for (const frame of resolveFrames(value)) {
        if (frame.kind === 'suspense') {
            const node = frame.node;
            const pendingKeys = node.keys.filter((k) => !resources?.get(k)?.state.value);
            if (pendingKeys.length) {
                yield* walk(node.fallback ?? null, resources);
            } else {
                yield* walk(node.children, resources);
            }
        } else if (frame.kind === 'element') {
            const node = frame.node;
            yield renderOpenTag(node);
            if (!isVoidTag(node.type)) {
                if (node.props?.children !== undefined) yield* walk(node.props.children, resources);
                yield `</${node.type}>`;
            }
        } else {
            yield escapeHtml(String(frame.value));
        }
    }
}

/** Concatenate `walk` chunks into an HTML string. */
export const jsxToStatic = (root: any, resources?: Resources): string =>
    [...walk(root, resources)].reduce((acc, c) => acc + c, '');

/** Escape JSON for a safe inline `<script>` embed */
const escapeJsonScript = (s: string): string => s
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/**
 * Build a per-root `<script data-preffx-preload="<prefix>">` from resource values.
 * The `data-preffx-preload` attribute scopes the payload to a single root, so
 * multiple roots on one page hydrate independently — each client mount looks up
 * *its own* prefix instead of a single shared script.
 */
export const serializeData = (
    resources: Resources,
    serializer: (v: unknown) => string = JSON.stringify,
    prefix: string
): string => {
    const data: Record<string, unknown> = {};
    resources.forEach((entry, key) => {
        data[key] = entry.state.value;
    });
    const json = serializer(data);
    return `<script ${PREFFX_PRELOAD_ATTR}="${escapeAttr(prefix)}" type="application/json">${escapeJsonScript(json)}</script>`;
};