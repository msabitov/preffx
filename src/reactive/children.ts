import { batch, createModel, effect, signal } from '@preact/signals-core';
import { destroy, mount, isPromise, isSignal, resolveDeepValue, isArray } from '../utils';
import { SignalWithPrev } from 'types';

// only signal can be a reason to recomputation
const deepReason = (arg: any): any => isSignal(arg) ? (
    arg.peek() !== (arg as SignalWithPrev).prev ? arg : deepReason(arg.peek())
) : null;

// DOM
const updateChildren = (root: HTMLElement, items: Node[]) => {
    const nextChildNodes = items;
    const nextLength = nextChildNodes.length;
    const nextChildSet = new Set(nextChildNodes);

    const currentChildNodes = [...root.childNodes];
    const currentLength = currentChildNodes.length;
    const currentChildSet = new Set(currentChildNodes);

    if (!nextLength) currentChildNodes.forEach((node) => {
        root.removeChild(node);
    });
    else if (!currentLength) nextChildNodes.forEach((node) => {
        root.append(node);
    });
    else {
        nextChildNodes.forEach((val, ind) => {
            const current = root.childNodes[ind];
            const next = val;
            // change if not equal
            if (next !== current) {
                // no node at the index
                if (!current) root.append(next);
                // move to new position if it just changes position
                else if (currentChildSet.has(next as ChildNode)) {
                    // move to the end
                    if (ind >= currentLength) root.append(next);
                    // move to the index
                    else root.insertBefore(next, current)
                // replace with new if current node is not in the next
                } else if (!nextChildSet.has(current)) current.replaceWith(next);
                // current node is in the next and next node is realy new
                else root.insertBefore(next, current);
            }
        });
        // remove extra items
        while (nextLength < root.childNodes.length) {
            const lastChild = root.lastChild;
            lastChild && root.removeChild(lastChild);
        }
    }
};

// children reactivity
const ChildrenModel = createModel<any, any>(({root, children}) => {
    const childrenArray = children ?
        Array.isArray(children) ? children : [children] :
        [];
    const cache = signal(new Map<any, Node[] | null>());
    const mutations = new Set();

    const getNextCache = (key: any, val: any) => {
        const nextMap = new Map(cache.peek().entries());
        return nextMap.set(key, val);
    };

    batch(() => childrenArray.forEach((item) => {
        // recalculates with effect if item is Signal
        effect(() => {
            const value = resolveDeepValue(item);
            cache.value = getNextCache(item, value);
            return () => {
                // value changed - cached is invalid
                cache.peek().delete(item);
                mutations.add(item);
            };
        });
    }));

    // children effect
    effect(() => {
        const cacheMap = cache.value;

        if (childrenArray.length) {
            const currentChildren = childrenArray.reduce((acc, item: any) => {
                const value = cacheMap.get(item);
                if (value) acc.push(value);
                return acc;
            }, []);
    
            const {added, removed} = [...mutations.values()].reduce((acc: any, signal) => {
                const item = deepReason(signal);
                if (item) {
                    const currentValue = item.peek();
                    const prevValue = item.prev;
                    const current = isPromise(currentValue) ? null : currentValue;
                    const previous = isPromise(prevValue) ? null : prevValue;
                    if (isArray(current) && isArray(previous)) {
                        const currentSet = new Set(current);
                        const prevSet = new Set(previous);
                        const addedSet = currentSet.difference(prevSet);
                        const removedSet = prevSet.difference(currentSet);
                        acc.added.push(...addedSet.values());
                        acc.removed.push(...removedSet.values());
                    } else if (current && !previous) {
                        if (isPromise(prevValue)) acc.added.push(item);
                        else acc.added.push(current);
                    } else if (previous && !current) acc.removed.push(previous);
                    else if (current && item.prev) {
                        acc.added.push(current);
                        acc.removed.push(previous);
                    }
                    item.prev = current;
                }
                return acc;
            }, {
                added: [],
                removed: []
            }) as {added: any[]; removed: any[];};
    
            if (root.isConnected && removed.length) destroy(removed);
            
            updateChildren(root, currentChildren.flat(Infinity));
    
            if (root.isConnected && added.length) mount(added);
        }

        // clear mutations
        mutations.clear();
    });

    effect(() => {
        return () => {
            // clear cache
            cache.peek().clear();
            // clear mutations
            mutations.clear();
        }
    });

    return {};
});

export const childrenEffects = ({
    root, children
}: {
    root: Node;
    children: any;
}) => {
    const model = new ChildrenModel({root, children });
    return model[Symbol.dispose];
};
