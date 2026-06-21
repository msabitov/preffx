import { createModel, effect, Signal } from '@preact/signals-core';
import { mount, destroy, onMountCallback, onDestroyCallback, isSignal, resolveValue, TPreffXItem } from '../utils';
import { childrenEffects } from './children';

// utils
const resolveRef = (ref: Signal | ((node: Node | null) => void), value: Node | null = null) => {
    if (ref) {
        if (typeof ref === 'function') ref(value);
        else if (isSignal(ref)) ref.value = value;
    }
};
const kebabCase = (str: string): string => str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());
const propVal = (prop: string, val: any) => `${kebabCase(prop)}:${'' + val};`
const stringify = (obj: object): string => Object.entries(obj).reduce((acc, item) => acc + (item[1] ? propVal(item[0], item[1]) : ''), '');
const isDefined = (arg: any) => arg !== null && arg !== undefined;

// DOM
const HTML = 'html';
const SVG = 'svg';
const MATHML = 'mathml';

const NS = {
    [HTML]: 'http://www.w3.org/1999/xhtml',
    [SVG]: 'http://www.w3.org/2000/svg',
    [MATHML]: 'http://www.w3.org/1998/Math/MathML'
} as const;

// mapping between tagname and namespace
const TAG_NS: Record<string, keyof typeof NS> = {
    // a - html/svg,
    // image - html/svg,
    // style, script - html/svg
    animate: SVG,
    animateMotion: SVG,
    animateTransform: SVG,
    circle: SVG,
    clipPath: SVG,
    defs: SVG,
    desc: SVG,
    ellipse: SVG,
    feBlend: SVG,
    feColorMatrix: SVG,
    feComponentTransfer: SVG,
    feComposite: SVG,
    feConvolveMatrix: SVG,
    feDiffuseLighting: SVG,
    feDisplacementMap: SVG,
    feDistantLight: SVG,
    feDropShadow: SVG,
    feFlood: SVG,
    feFuncA: SVG,
    feFuncB: SVG,
    feFuncG: SVG,
    feFuncR: SVG,
    feGaussianBlur: SVG,
    feImage: SVG,
    feMerge: SVG,
    feMergeNode: SVG,
    feMorphology: SVG,
    feOffset: SVG,
    fePointLight: SVG,
    feSpecularLighting: SVG,
    feSpotLight: SVG,
    feTile: SVG,
    feTurbulence: SVG,
    filter: SVG,
    foreignObject: SVG,
    g: SVG,
    line: SVG,
    linearGradient: SVG,
    marker: SVG,
    mask: SVG,
    metadata: SVG,
    mpath: SVG,
    path: SVG,
    pattern: SVG,
    polygon: SVG,
    polyline: SVG,
    radialGradient: SVG,
    rect: SVG,
    set: SVG,
    stop: SVG,
    svg: SVG,
    switch: SVG,
    symbol: SVG,
    text: SVG,
    textPath: SVG,
    title: SVG,
    tspan: SVG,
    use: SVG,
    view: SVG,
    // mathml
    math: MATHML,
    annotation: MATHML,
    'annotation-xml': MATHML,
    merror: MATHML,
    mfrac: MATHML,
    mi: MATHML,
    mmultiscripts: MATHML,
    mn: MATHML,
    mo: MATHML,
    mover: MATHML,
    mpadded: MATHML,
    mphantom: MATHML,
    mprescripts: MATHML,
    mroot: MATHML,
    mrow: MATHML,
    ms: MATHML,
    semantics: MATHML,
    mspace: MATHML,
    msqrt: MATHML,
    mstyle: MATHML,
    msub: MATHML,
    msup: MATHML,
    msubsup: MATHML,
    mtable: MATHML,
    mtd: MATHML,
    mtext: MATHML,
    mtr: MATHML,
    munder: MATHML,
    munderover: MATHML
};

export const createElement = (ns: keyof typeof NS, name: string, options?: object) => {
    return document.createElementNS(NS[ns || TAG_NS[name] || 'html'], name, options);
};


// node reactive model
const NodeModel = createModel<any, any>(({
    node, props
}) => {
    const {
        style,
        class: className,
        ...restProps
    } = props;
    // props effect
    Object.entries(restProps).forEach(([key, val]) => {
        // event listeners
        if (key.startsWith('on')) {
            const event = key.slice(2).toLowerCase();
            effect(() => {
                const nextValue = resolveValue(val);
                let nextHandler: Function;
                let listenerOptions: Partial<Record<'stop' | 'prevent' | 'once' | 'capture' | 'passive', boolean>>;
                if (typeof nextValue === 'object') {
                    const {handler, ...mods} = nextValue;
                    listenerOptions = mods;
                    nextHandler = handler;
                } else {
                    nextHandler = nextValue;
                    listenerOptions = {
                        once: false,
                        passive: false,
                        capture: false,
                        prevent: false,
                        stop: false
                    };
                }
                const listener = (e: Event) => {
                    if (listenerOptions.prevent) e.preventDefault?.();
                    if (listenerOptions.stop) e.stopPropagation?.();
                    nextHandler(e);
                };
                (node as HTMLElement).addEventListener(event, listener, listenerOptions);
                return () => {
                    node.removeEventListener(event, listener, listenerOptions);
                };
            });
        // properties
        } else if (key.startsWith('$')) {
            const prop = key.slice(1);
            effect(() => {
                let nextResolved = resolveValue(val);
                node[prop] = nextResolved;
            });
        // attributes
        } else {
            const attr = kebabCase(key);
            effect(() => {
                const nextValue = resolveValue(val);
                if (isDefined(nextValue)) {
                    if (typeof nextValue === 'boolean') node.setAttribute(attr, '');
                    else node.setAttribute(attr, nextValue);
                } else node.removeAttribute(attr);
            });
        }
    });
    // className
    if (isDefined(className)) {
        effect(() => {
            const nextValue = resolveValue(className);
            const strValue = Array.isArray(nextValue) ?
                nextValue.filter(Boolean).join(' ') :
                typeof nextValue === 'object' ? Object.entries(nextValue).reduce((acc, [k, v]) => acc + (v ? ' ' + k : ''), '') :
                nextValue;
            if (isDefined(strValue)) node.setAttribute('class', strValue + '');
            else node.removeAttribute('class');
        });
    }
    // style
    if (style) {
        effect(() => {
            const nextValue = resolveValue(style);
            const strValue = style && (typeof style === 'object') ? stringify(nextValue) : nextValue;
            if (strValue) node.setAttribute('style', strValue + '');
            else node.removeAttribute('style');
        });
    }

    return {};
});

const nodeEffects = ({
    node, props
}: {
    node: Node;
    props: object;
}) => {
    const model = new NodeModel({node, props});
    return model[Symbol.dispose];
};

export const node = ({
    type,
    props
}: {
    type: string;
    props: any;
}) => {
    const {
        $ref,
        $ns,
        children,
        ...clearProps
    } = props;

    const node = createElement($ns, type, props && props.is ? {
        is: props.is
    } : undefined) as unknown as (Node & TPreffXItem);

    // reactive node
    const clearNodeEffects = nodeEffects({node, props: clearProps})
    // reactive children
    const clearChildrenEffects = childrenEffects({root: node, children });

    onMountCallback(node, () => {
        resolveRef($ref, node);
        mount(children);
    });

    onDestroyCallback(node, () => {
        destroy(children);
        clearChildrenEffects();
        clearNodeEffects();
        resolveRef($ref);
    });

    return node;
};
