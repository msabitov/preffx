import { createModel, effect, Signal } from '@preact/signals-core';
import { mount, destroy, onMountCallback, onDestroyCallback, isSignal, resolveValue, TPreffXItem } from '../utils/core';
import { childrenEffects } from './children';
import { Renderer, ssrNode } from '../utils/render';

// utils
const resolveRef = (ref: Signal | ((node: Node | null) => void), value: Node | null = null) => {
    if (ref) {
        if (typeof ref === 'function') ref(value);
        else if (isSignal(ref)) ref.value = value;
    }
};
const kebabCase = (str: string): string => str.replace(/[A-Z]/g, (v) => '-' + v.toLowerCase());
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

export const node = Renderer.isServerSide() ? ssrNode : ({
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
    const hydratedNode = Renderer.isHydrateActive() ? Renderer.takeHydrateNode() : undefined;
    const node = (hydratedNode || Renderer.createElement($ns, type, props && props.is ? {
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
