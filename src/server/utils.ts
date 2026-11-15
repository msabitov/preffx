// common types
import type { Resources, RootScope } from '../types';
// common deps
import { kebabCase, escapeHtml, resolveDeepRawValue, PREFFX_PRELOAD_ATTR } from '../utils/core';
import { isVNode, materialize} from '../vnode';
// server deps
import type { SSRNode, SuspenseNode } from './node';

export const NODE = 'node';
export const SUSPENSE = 'suspense';
export const TEXT_SEPARATOR = '<!--|-->';

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

/** A single walkable node output target */
export type WalkFrame =
    | { kind: typeof NODE; node: SSRNode }
    | { kind: typeof SUSPENSE; node: SuspenseNode }
    | { kind: 'text'; value: unknown };

/**
 * Unwrap value into flat element / suspense / text frames
 */
export function* resolveFrames(value: any, scope: RootScope): Generator<WalkFrame> {
    const r = resolveDeepRawValue(value);
    if (r === null || r === undefined || typeof r === 'boolean') return;
    if (Array.isArray(r)) {
        for (const item of r) yield* resolveFrames(item, scope);
        return;
    }
    if (isVNode(r)) {
        yield* resolveFrames(materialize(r, scope), scope);
        return;
    }
    if (r && typeof r === 'object' && 'kind' in r) {
        if (r.kind === SUSPENSE) {
            yield { kind: SUSPENSE, node: r as SuspenseNode };
            return;
        }
        if (r.kind === NODE) {
            yield { kind: NODE, node: r as SSRNode };
            return;
        }
    }
    yield { kind: 'text', value: r };
}

export const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

/**
 * Escape for attribute values (quotes + html entities)
 */
export const escapeAttr = (s: string): string => escapeHtml(String(s))
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Render a single SSR-node attribute into markup
 */
export const renderProp = (key: string, value: any): string => {
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

/**
 * Render `<type attrs>` opening markup
 */
export const renderOpenTag = (node: SSRNode): string => {
    const { type, props } = node;
    let attrs = '';
    if (props && typeof props === 'object') {
        const resolvedProps = resolveDeepRawValue(props);
        for (const key of Object.keys(resolvedProps)) {
            attrs += renderProp(key, resolvedProps[key]);
        }
    }
    return `<${type}${attrs}>`;
};

/** True when the element is a void (self-closing) HTML tag. */
export const isVoidTag = (tag: string): boolean => VOID_ELEMENTS.has(tag);

/** Walk an SSR value tree, yielding HTML chunks */
export function* walk(
    value: any,
    resources: Resources | undefined,
    scope: RootScope
): Generator<string> {
    // a chunk is text which does not start with '<',
    // so '<' can never appear at the start of text
    let prevWasText = false;
    for (const frame of resolveFrames(value, scope)) {
        if (frame.kind === 'suspense') {
            const node = frame.node;
            const pendingKeys = node.keys.filter((k) => resources?.get(k)?.pending.value);
            const target = pendingKeys.length ? (node.fallback ?? null) : node.children;
            // the boundary content is inlined,
            // so its first/last chunk may be text that must be separated from neighbours
            for (const chunk of walk(target, resources, scope)) {
                if (!chunk) continue;
                const isText = !chunk.startsWith('<');
                if (isText && prevWasText) yield TEXT_SEPARATOR;
                prevWasText = isText;
                yield chunk;
            }
        } else if (frame.kind === NODE) {
            const node = frame.node;
            yield renderOpenTag(node);
            prevWasText = false;
            if (!isVoidTag(node.type)) {
                if (node.props?.children !== undefined) yield* walk(node.props.children, resources, scope);
                yield `</${node.type}>`;
                prevWasText = false;
            }
        } else {
            const text = escapeHtml(String(frame.value));
            // empty values render nothing, so they must not consume a position
            if (!text) continue;
            if (prevWasText) yield TEXT_SEPARATOR;
            prevWasText = true;
            yield text;
        }
    }
}

/** Concatenate `walk` chunks into an HTML string. */
export const jsxToStatic = (root: any, scope: RootScope, resources?: Resources): string =>
    [...walk(root, resources, scope)].reduce((acc, c) => acc + c, '');

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
    const errors: Record<string, { message: string; name: string }> = {};
    resources.forEach((entry, key) => {
        // Only serialize resources that actually resolved;
        // pending ones are refetched on the client anyway
        if (!entry.pending.value) {
            if (entry.error?.value) errors[key] = entry.error.value;
            else data[key] = entry.state.value;
        }
    });
    const json = serializer({ errors, data });
    return `<script ${PREFFX_PRELOAD_ATTR}="${escapeAttr(prefix)}" type="application/json">${escapeJsonScript(json)}</script>`;
};