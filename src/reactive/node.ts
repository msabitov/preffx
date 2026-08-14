import { createModel, effect, Signal } from '@preact/signals-core';
import { mount, destroy, onMountCallback, onDestroyCallback, isSignal, resolveValue, TPreffXItem } from '../utils/core';
import { childrenEffects } from './children';
import { Renderer } from '../utils/render';

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
        $onMount,
        $onDestroy,
        children,
        ...clearProps
    } = props;

    const node = Renderer.createElement($ns, type, props && props.is ? {
        is: props.is
    } : undefined) as unknown as (Node & TPreffXItem);

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
