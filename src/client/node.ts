// common deps
import { createModel, effect, Signal } from '../state';
import {
    mount, destroy, onMountCallback, onDestroyCallback,
    isSignal, resolveValue, kebabCase, TPreffXItem
} from '../utils/core';
import { Renderer } from '../utils/render';
// client deps
import { childrenEffects } from './children';
import { createNode } from './utils';
import { takeHydrateNode } from './hydration';

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

/**
 * Create an element in the correct namespace (SVG/MathML aware)
 */
export const createElement = (ns: keyof typeof NS, name: string, options?: object) => {
    return createNode(NS[ns || TAG_NS[name] || 'html'], name, options);
};


// utils
const resolveRef = (ref: Signal | ((node: Node | null) => void), value: Node | null = null) => {
    if (ref) {
        if (typeof ref === 'function') ref(value);
        else if (isSignal(ref)) ref.value = value;
    }
};
const propVal = (prop: string, val: any) => `${kebabCase(prop)}:${'' + val};`
const isEmptyValue = (arg: any): boolean =>
    arg === false || arg === null || arg === undefined || arg === '' ||
    (typeof arg === 'number' && Number.isNaN(arg));
const stringify = (obj: object): string => Object.entries(obj).reduce((acc, item) => acc + (isEmptyValue(item[1]) ? '' : propVal(item[0], item[1])), '');
const isDefined = (arg: any) => arg !== null && arg !== undefined;

const createListener = (value: any) => {
    let fn: Function;
    let listenerOptions: Partial<Record<'stop' | 'prevent' | 'once' | 'capture' | 'passive', boolean>>;
    if (typeof value === 'object') {
        const {handler, ...mods} = value;
        listenerOptions = mods;
        fn = handler;
    } else {
        fn = value;
        listenerOptions = {
            once: false,
            passive: false,
            capture: false,
            prevent: false,
            stop: false
        };
    }
    return {
        listener: (e: Event) => {
            if (listenerOptions.prevent) e.preventDefault?.();
            if (listenerOptions.stop) e.stopPropagation?.();
            fn(e);
        },
        options: listenerOptions
    };  
};

const stringifyClassName = (nextValue: any) => {
    return Array.isArray(nextValue) ?
        nextValue.filter(Boolean).join(' ') :
            typeof nextValue === 'object' ? Object.entries(nextValue).reduce((acc, [k, v]) => acc + (v ? ' ' + k : ''), '') :
            '' + nextValue;
};

const stringifyStyle = (nextValue: any) => {
    return (typeof nextValue === 'object' && nextValue)
        ? stringify(nextValue)
        : '' + nextValue;
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

    const unsubscribeArray: Function[] = [];
    // props effect
    Object.entries(restProps).forEach(([key, val]) => {
        // event listeners
        if (key.startsWith('on')) {
            const event = key.slice(2).toLowerCase();
            if (isSignal(val)) {
                effect(() => {
                    const { listener, options } = createListener(val.value);
                    (node as HTMLElement).addEventListener(event, listener, options);
                    return () => {
                        node.removeEventListener(event, listener, options);
                    };
                });
            } else {
                const { listener, options } = createListener(val);
                (node as HTMLElement).addEventListener(event, listener, options);
                unsubscribeArray.push(() => {
                    node.removeEventListener(event, listener, options);
                });
            }
        // properties
        } else if (key.startsWith('$')) {
            const prop = key.slice(1);
            if (isSignal(val)) {
                effect(() => {
                    let nextResolved = val.value;
                    node[prop] = nextResolved;
                });
            } else {
                node[prop] = val;
            }
        // attributes
        } else {
            const attr = kebabCase(key);
            if (isSignal(val)) {
                effect(() => {
                    const nextValue = val.value;
                    if (isEmptyValue(nextValue)) {
                        node.removeAttribute(attr);
                    } else if (typeof nextValue === 'boolean') {
                        node.setAttribute(attr, '');
                    } else {
                        node.setAttribute(attr, '' + nextValue);
                    }
                });
            } else if (!isEmptyValue(val)) {
                if (typeof val === 'boolean') {
                    node.setAttribute(attr, '');
                } else {
                    node.setAttribute(attr, '' + val);
                }
            }
        }
    });
    // className
    if (isDefined(className)) {
        if (isSignal(className)) {
            effect(() => {
                const nextValue = resolveValue(className);
                // unified falsy rule: empty values remove the class attribute
                if (isEmptyValue(nextValue)) {
                    node.removeAttribute('class');
                    return;
                }
                const strValue = stringifyClassName(nextValue);
                node.setAttribute('class', strValue);
            });
        } else if (!isEmptyValue(className)) {
            const strValue = stringifyClassName(className);
            node.setAttribute('class', strValue);
        }
    }
    // style
    if (style) {
        if (isSignal(style)) {
            effect(() => {
                const nextValue = resolveValue(style);
                if (isEmptyValue(nextValue)) {
                    node.removeAttribute('style');
                    return;
                }
                const strValue = stringifyStyle(nextValue);
                node.setAttribute('style', strValue);
            });
        } else if (!isEmptyValue(style)) {
            const strValue = stringifyStyle(style);
            node.setAttribute('style', strValue);
        }
    }

    effect(() => {
        // remove all static event listeners
        return () => unsubscribeArray.forEach((fn) => fn());
    });

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
        $onMount,
        $onDestroy,
        children,
        ...clearProps
    } = props;

    // during active hydration reuse the existing server-rendered
    // element (positional matching) instead of materialising a fresh one.
    const hydration = Renderer.getScope()?.hydration;
    const hydratedNode = !!hydration?.queue ? takeHydrateNode(hydration) : undefined;
    const node = (hydratedNode || createElement($ns, type, props && props.is ? {
        is: props.is
    } : undefined)) as unknown as (Node & TPreffXItem);

    // reactive node
    const clearNodeEffects = nodeEffects({node, props: clearProps})
    // reactive children
    const clearChildrenEffects = childrenEffects({root: node, children });

    onMountCallback(node, () => {
        resolveRef($ref, node);
        mount(children);
        if ($onMount) {
            try {
                $onMount(node);
            } catch (e) {
                console.error(`Node $onMount error: `, e);
            }
        }
    });

    onDestroyCallback(node, () => {
        destroy(children);
        clearChildrenEffects();
        clearNodeEffects();
        resolveRef($ref);
        if ($onDestroy) {
            try {
                $onDestroy(node);
            } catch (e) {
                console.error(`Node $onDestroy error: `, e);
            }
        }
        (node as unknown as Element).remove();
    });

    return node;
};
