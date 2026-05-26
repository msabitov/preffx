import {
    Signal, signal, computed,
    effect, batch, untracked,
    action, createModel
} from "@preact/signals-core";
import * as CSS from "csstype";

export type SignalWithPrev<T = any> = Signal<T> & {prev: T | undefined};

type PreffXContext = Record<string | symbol, any>;

export type PreffXUtils<C extends PreffXContext = PreffXContext> = {
    // signal utils

    /**
     * Create a new signal
     * @param value — initial value
     */
    signal: typeof signal;
    /**
     * Create a computed signal
     * @param fn - computation callback.
     * @returns A new read-only signal.
     */
    computed: typeof computed;
    /**
     * Create signal effect
     * @param fn - effect callback.
     */
    effect: typeof effect;
    /**
     * Combine multiple value updates into one
     * @param fn - callback function
     */
    batch: typeof batch;
    /**
     * Run a callback without subscribing to the signals
     * @param fn - callback function
     */
    untracked: typeof untracked;
    action: typeof action;
    createModel: typeof createModel;
    // component utils

    /**
     * Context object
     */
    context: C;
    /**
     * Get unique id
     */
    id: () => string;

    // lifecycle

    /**
     * Run callback after component mounted
     * @param fn - callback function
     */
    onMount: (fn: () => void) => void;
    /**
     * Run callback before component destroyed
     * @param fn - callback function
     */
    onDestroy: (fn: () => void) => void;

    // basic components

    For: PC<{
        items: Signal<any[]>;
        callback: (item: any) => any;
        fallback: any;
    }>;
    Catch: PC<{
        fallback: any;
        children?: any | any[];
    }>;
    Portal: PC<{
        root: HTMLElement;
        children?: any | any[];
    }>;
}

/**
 * PreffX component
 */
export type PC<T extends object = object, C extends PreffXContext = PreffXContext> = (props: T, utils: PreffXUtils<C>) => any;
/**
 * Async PreffX component
 */
export type APC<T extends object = object, C extends PreffXContext = PreffXContext> = (props: T, utils: PreffXUtils<C>) => Promise<any>;
declare global {
    type Booleanish = boolean | "true" | "false";
    type CrossOrigin = "anonymous" | "use-credentials" | "";
    

    namespace JSX {
        // All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
        interface AriaAttributes {
            /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
            "aria-activedescendant"?: string;
            /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
            "aria-atomic"?: Booleanish;
            /**
             * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
             * presented if they are made.
             */
            "aria-autocomplete"?: "none" | "inline" | "list" | "both";
            /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
            "aria-busy"?: Booleanish;
            /**
             * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
             * @see aria-pressed @see aria-selected.
             */
            "aria-checked"?: boolean | "false" | "mixed" | "true";
            /**
             * Defines the total number of columns in a table, grid, or treegrid.
             * @see aria-colindex.
             */
            "aria-colcount"?: number;
            /**
             * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
             * @see aria-colcount @see aria-colspan.
             */
            "aria-colindex"?: number;
            /**
             * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
             * @see aria-colindex @see aria-rowspan.
             */
            "aria-colspan"?: number;
            /**
             * Identifies the element (or elements) whose contents or presence are controlled by the current element.
             * @see aria-owns.
             */
            "aria-controls"?: string;
            /** Indicates the element that represents the current item within a container or set of related elements. */
            "aria-current"?: boolean | "false" | "true" | "page" | "step" | "location" | "date" | "time";
            /**
             * Identifies the element (or elements) that describes the object.
             * @see aria-labelledby
             */
            "aria-describedby"?: string;
            /**
             * Identifies the element that provides a detailed, extended description for the object.
             * @see aria-describedby.
             */
            "aria-details"?: string;
            /**
             * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
             * @see aria-hidden @see aria-readonly.
             */
            "aria-disabled"?: Booleanish;
            /**
             * Indicates what functions can be performed when a dragged object is released on the drop target.
             * @deprecated in ARIA 1.1
             */
            "aria-dropeffect"?: "none" | "copy" | "execute" | "link" | "move" | "popup";
            /**
             * Identifies the element that provides an error message for the object.
             * @see aria-invalid @see aria-describedby.
             */
            "aria-errormessage"?: string;
            /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
            "aria-expanded"?: Booleanish;
            /**
             * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
             * allows assistive technology to override the general default of reading in document source order.
             */
            "aria-flowto"?: string;
            /**
             * Indicates an element's "grabbed" state in a drag-and-drop operation.
             * @deprecated in ARIA 1.1
             */
            "aria-grabbed"?: Booleanish;
            /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
            "aria-haspopup"?: boolean | "false" | "true" | "menu" | "listbox" | "tree" | "grid" | "dialog";
            /**
             * Indicates whether the element is exposed to an accessibility API.
             * @see aria-disabled.
             */
            "aria-hidden"?: Booleanish;
            /**
             * Indicates the entered value does not conform to the format expected by the application.
             * @see aria-errormessage.
             */
            "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling";
            /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
            "aria-keyshortcuts"?: string;
            /**
             * Defines a string value that labels the current element.
             * @see aria-labelledby.
             */
            "aria-label"?: string;
            /**
             * Identifies the element (or elements) that labels the current element.
             * @see aria-describedby.
             */
            "aria-labelledby"?: string;
            /** Defines the hierarchical level of an element within a structure. */
            "aria-level"?: number;
            /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
            "aria-live"?: "off" | "assertive" | "polite";
            /** Indicates whether an element is modal when displayed. */
            "aria-modal"?: Booleanish;
            /** Indicates whether a text box accepts multiple lines of input or only a single line. */
            "aria-multiline"?: Booleanish;
            /** Indicates that the user may select more than one item from the current selectable descendants. */
            "aria-multiselectable"?: Booleanish;
            /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
            "aria-orientation"?: "horizontal" | "vertical";
            /**
             * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
             * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
             * @see aria-controls.
             */
            "aria-owns"?: string;
            /**
             * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
             * A hint could be a sample value or a brief description of the expected format.
             */
            "aria-placeholder"?: string;
            /**
             * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
             * @see aria-setsize.
             */
            "aria-posinset"?: number;
            /**
             * Indicates the current "pressed" state of toggle buttons.
             * @see aria-checked @see aria-selected.
             */
            "aria-pressed"?: boolean | "false" | "mixed" | "true";
            /**
             * Indicates that the element is not editable, but is otherwise operable.
             * @see aria-disabled.
             */
            "aria-readonly"?: Booleanish;
            /**
             * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
             * @see aria-atomic.
             */
            "aria-relevant"?:
                | "additions"
                | "additions removals"
                | "additions text"
                | "all"
                | "removals"
                | "removals additions"
                | "removals text"
                | "text"
                | "text additions"
                | "text removals"
               ;
            /** Indicates that user input is required on the element before a form may be submitted. */
            "aria-required"?: Booleanish;
            /** Defines a human-readable, author-localized description for the role of an element. */
            "aria-roledescription"?: string;
            /**
             * Defines the total number of rows in a table, grid, or treegrid.
             * @see aria-rowindex.
             */
            "aria-rowcount"?: number;
            /**
             * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
             * @see aria-rowcount @see aria-rowspan.
             */
            "aria-rowindex"?: number;
            /**
             * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
             * @see aria-rowindex @see aria-colspan.
             */
            "aria-rowspan"?: number;
            /**
             * Indicates the current "selected" state of various widgets.
             * @see aria-checked @see aria-pressed.
             */
            "aria-selected"?: Booleanish;
            /**
             * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
             * @see aria-posinset.
             */
            "aria-setsize"?: number;
            /** Indicates if items in a table or grid are sorted in ascending or descending order. */
            "aria-sort"?: "none" | "ascending" | "descending" | "other";
            /** Defines the maximum allowed value for a range widget. */
            "aria-valuemax"?: number;
            /** Defines the minimum allowed value for a range widget. */
            "aria-valuemin"?: number;
            /**
             * Defines the current value for a range widget.
             * @see aria-valuetext.
             */
            "aria-valuenow"?: number;
            /** Defines the human readable text alternative of aria-valuenow for a range widget. */
            "aria-valuetext"?: string;
        }

        export type ModifierKey =
            | "Alt"
            | "AltGraph"
            | "CapsLock"
            | "Control"
            | "Fn"
            | "FnLock"
            | "Hyper"
            | "Meta"
            | "NumLock"
            | "ScrollLock"
            | "Shift"
            | "Super"
            | "Symbol"
            | "SymbolLock";

        //
        // Event Handler Types
        // ----------------------------------------------------------------------

        type EventHandler<E> = (event: E) => any;

        type FormEventHandler = EventHandler<Event>;
        type ClipboardEventHandler = EventHandler<ClipboardEvent>;
        type CompositionEventHandler = EventHandler<CompositionEvent>;
        type DragEventHandler = EventHandler<DragEvent>;
        type FocusEventHandler = EventHandler<FocusEvent>;
        type InputEventHandler = EventHandler<InputEvent>;
        type ChangeEventHandler = EventHandler<Event>;
        type KeyboardEventHandler = EventHandler<KeyboardEvent>;
        type MouseEventHandler = EventHandler<MouseEvent>;
        type TouchEventHandler = EventHandler<TouchEvent>;
        type PointerEventHandler = EventHandler<PointerEvent>;
        type UIEventHandler = EventHandler<UIEvent>;
        type WheelEventHandler = EventHandler<WheelEvent>;
        type AnimationEventHandler = EventHandler<AnimationEvent>;
        type TransitionEventHandler = EventHandler<TransitionEvent>;

        // DOM Attributes

        type EventHandlerModifier = 'prevent' | 'stop' | 'once' | 'passive' | 'capture';

        type NonFunctionPropertyNames<T> = {
            [K in keyof T]: T[K] extends Function ? never : K;
        }[keyof T];
        
        type OmitMethods<T> = Pick<T, NonFunctionPropertyNames<T>>;
        
        // Remap properties 'value' to '$value', etc.
        type Properties<T extends Element> = Partial<{
            [K in keyof OmitMethods<T> as K extends string ? `\$${K}` : K]: T[K] | Signal<T[K]>;
        } & {
            /**
             * Element namespace
             */
            $ns: 'svg' | 'mathml';
            /**
             * Element reference
             */
            $ref: Signal<T> | ((ref: T | null) => void);
        }>;

        type SignalAttrs<T extends Record<string, any>> = Partial<{
            [K in keyof OmitMethods<T>]: T[K] | Signal<T[K]>;
        }>;

        // Remap properties 'value' to '$value', etc.
        type ModifiedEventHandlers<T> = {
            [K in keyof T]: T[K] | {
                /**
                 * Event handler
                 */
                handler: T[K];
                /**
                 * Stop propagation flag
                 */
                stop?: boolean;
                /**
                 * Prevent default flag
                 */
                prevent?: boolean;
                once?: AddEventListenerOptions['once'];
                capture?: AddEventListenerOptions['capture'];
                passive?: AddEventListenerOptions['passive'];
            };
        };

        interface SVGProps extends SVGAttributes {
        }

        interface MathMLAttributes {
            dir?: string;
            displaystyle?: string;
            mathbackground?: string;
            mathcolor?: string;
            mathsize?: string;
            scriptlevel?: string;
            style?: string;
            tabindex?: string;
            nonce?: string;
            autofocus?: string;
            id?: string;
            class?: string;
        }

        interface MathMLProps extends SignalAttrs<MathMLAttributes>{
        }

        interface SVGLineElementAttributes extends SVGProps {}
        interface SVGTextElementAttributes extends SVGProps {}

        interface NativeEventHandlers {
            // Clipboard Events
            onCopy?: ClipboardEventHandler;
            onCut?: ClipboardEventHandler;
            onPaste?: ClipboardEventHandler;

            // Composition Events
            onCompositionEnd?: CompositionEventHandler;
            onCompositionStart?: CompositionEventHandler;
            onCompositionUpdate?: CompositionEventHandler;

            // Focus Events
            onFocus?: FocusEventHandler;
            onBlur?: FocusEventHandler;

            // Form Events
            onChange?: ChangeEventHandler;
            onBeforeInput?: InputEventHandler;
            onInput?: InputEventHandler;
            onReset?: FormEventHandler;
            onSubmit?: FormEventHandler;
            onInvalid?: FormEventHandler;
        
            // Keyboard Events
            onKeyDown?: KeyboardEventHandler;
            onKeyUp?: KeyboardEventHandler;

            // MouseEvents
            onAuxClick?: MouseEventHandler;
            onClick?: MouseEventHandler;
            onContextMenu?: MouseEventHandler;
            onDoubleClick?: MouseEventHandler;
            onDrag?: DragEventHandler;
            onDragEnd?: DragEventHandler;
            onDragEnter?: DragEventHandler;
            onDragExit?: DragEventHandler;
            onDragLeave?: DragEventHandler;
            onDragOver?: DragEventHandler;
            onDragStart?: DragEventHandler;
            onDrop?: DragEventHandler;
            onMouseDown?: MouseEventHandler;
            onMouseEnter?: MouseEventHandler;
            onMouseLeave?: MouseEventHandler;
            onMouseMove?: MouseEventHandler;
            onMouseOut?: MouseEventHandler;
            onMouseOver?: MouseEventHandler;
            onMouseUp?: MouseEventHandler;

            // Touch Events
            onTouchCancel?: TouchEventHandler;
            onTouchEnd?: TouchEventHandler;
            onTouchMove?: TouchEventHandler;
            onTouchStart?: TouchEventHandler;

            // Pointer Events
            onPointerDown?: PointerEventHandler;
            onPointerMove?: PointerEventHandler;
            onPointerUp?: PointerEventHandler;
            onPointerCancel?: PointerEventHandler;
            onPointerEnter?: PointerEventHandler;
            onPointerLeave?: PointerEventHandler;
            onPointerOver?: PointerEventHandler;
            onPointerOut?: PointerEventHandler;
            onGotPointerCapture?: PointerEventHandler;
            onLostPointerCapture?: PointerEventHandler;

            // UI Events
            onScroll?: UIEventHandler;

            // Wheel Events
            onWheel?: WheelEventHandler;

            // Animation Events
            onAnimationStart?: AnimationEventHandler;
            onAnimationEnd?: AnimationEventHandler;
            onAnimationIteration?: AnimationEventHandler;

            // Transition Events
            onTransitionEnd?: TransitionEventHandler;
        }

        interface EventHandlers extends ModifiedEventHandlers<NativeEventHandlers> {}

        export interface CSSProperties extends CSS.Properties<string | number> {
            /**
             * The index signature was removed to enable closed typing for style
             * using CSSType. You're able to use type assertion or module augmentation
             * to add properties or an index signature of your own.
             *
             * For examples and more information, visit:
             * https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
             */
        }

        // All the WAI-ARIA 1.1 role attribute values from https://www.w3.org/TR/wai-aria-1.1/#role_definitions
        type AriaRole =
            | "alert"
            | "alertdialog"
            | "application"
            | "article"
            | "banner"
            | "button"
            | "cell"
            | "checkbox"
            | "columnheader"
            | "combobox"
            | "complementary"
            | "contentinfo"
            | "definition"
            | "dialog"
            | "directory"
            | "document"
            | "feed"
            | "figure"
            | "form"
            | "grid"
            | "gridcell"
            | "group"
            | "heading"
            | "img"
            | "link"
            | "list"
            | "listbox"
            | "listitem"
            | "log"
            | "main"
            | "marquee"
            | "math"
            | "menu"
            | "menubar"
            | "menuitem"
            | "menuitemcheckbox"
            | "menuitemradio"
            | "navigation"
            | "none"
            | "note"
            | "option"
            | "presentation"
            | "progressbar"
            | "radio"
            | "radiogroup"
            | "region"
            | "row"
            | "rowgroup"
            | "rowheader"
            | "scrollbar"
            | "search"
            | "searchbox"
            | "separator"
            | "slider"
            | "spinbutton"
            | "status"
            | "switch"
            | "tab"
            | "table"
            | "tablist"
            | "tabpanel"
            | "term"
            | "textbox"
            | "timer"
            | "toolbar"
            | "tooltip"
            | "tree"
            | "treegrid"
            | "treeitem"
            | (string & {});

        interface CommonHTMLAttributes extends HTMLAttributes {
            // Standard HTML Attributes
            accept?: string;
            acceptCharset?: string;
            action?: string;
            allowFullScreen?: boolean;
            allowTransparency?: boolean;
            alt?: string;
            as?: string;
            async?: boolean;
            autoComplete?: string;
            autoPlay?: boolean;
            capture?: boolean | "user" | "environment";
            cellPadding?: number | string;
            cellSpacing?: number | string;
            charSet?: string;
            challenge?: string;
            checked?: boolean;
            cite?: string;
            classID?: string;
            cols?: number;
            colSpan?: number;
            controls?: boolean;
            coords?: string;
            crossOrigin?: CrossOrigin;
            data?: string;
            dateTime?: string;
            default?: boolean;
            defer?: boolean;
            disabled?: boolean;
            download?: any;
            encType?: string;
            form?: string;
            formAction?: string;
            formEncType?: string;
            formMethod?: string;
            formNoValidate?: boolean;
            formTarget?: string;
            frameBorder?: number | string;
            headers?: string;
            height?: number | string;
            high?: number;
            href?: string;
            hrefLang?: string;
            htmlFor?: string;
            httpEquiv?: string;
            integrity?: string;
            keyParams?: string;
            keyType?: string;
            kind?: string;
            label?: string;
            list?: string;
            loop?: boolean;
            low?: number;
            manifest?: string;
            marginHeight?: number;
            marginWidth?: number;
            max?: number | string;
            maxLength?: number;
            media?: string;
            mediaGroup?: string;
            method?: string;
            min?: number | string;
            minLength?: number;
            multiple?: boolean;
            muted?: boolean;
            name?: string;
            noValidate?: boolean;
            open?: boolean;
            optimum?: number;
            pattern?: string;
            placeholder?: string;
            playsInline?: boolean;
            poster?: string;
            preload?: string;
            readOnly?: boolean;
            required?: boolean;
            reversed?: boolean;
            rows?: number;
            rowSpan?: number;
            sandbox?: string;
            scope?: string;
            scoped?: boolean;
            scrolling?: string;
            seamless?: boolean;
            selected?: boolean;
            shape?: string;
            size?: number;
            sizes?: string;
            span?: number;
            src?: string;
            srcDoc?: string;
            srcLang?: string;
            srcSet?: string;
            start?: number;
            step?: number | string;
            summary?: string;
            target?: string;
            type?: string;
            useMap?: string;
            value?: string | readonly string[] | number;
            width?: number | string;
            wmode?: string;
            wrap?: string;
        }
        interface HTMLAttributes extends AriaAttributes, EventHandlers {
            // Standard HTML Attributes
            accessKey?: string;
            autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters" | undefined | (string & {});
            autoFocus?: boolean;
            class?: string;
            contentEditable?: Booleanish | "inherit";
            contextMenu?: string;
            dir?: string;
            draggable?: Booleanish;
            enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
            hidden?: boolean;
            id?: string;
            lang?: string;
            nonce?: string;
            placeholder?: string;
            slot?: string;
            spellCheck?: Booleanish;
            style?: CSSProperties;
            tabIndex?: number;
            title?: string;
            translate?: "yes" | "no";

            // Unknown
            radioGroup?: string; // <command>, <menuitem>

            // WAI-ARIA
            role?: AriaRole;

            // RDFa Attributes
            about?: string;
            content?: string;
            datatype?: string;
            inlist?: any;
            prefix?: string;
            property?: string;
            rel?: string;
            resource?: string;
            rev?: string;
            typeof?: string;
            vocab?: string;

            // Non-standard Attributes
            autoCorrect?: string;
            autoSave?: string;
            color?: string;
            itemProp?: string;
            itemScope?: boolean;
            itemType?: string;
            itemID?: string;
            itemRef?: string;
            results?: number;
            security?: string;
            unselectable?: "on" | "off";

            // Living Standard
            /**
             * Hints at the type of data that might be entered by the user while editing the element or its contents
             * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
             */
            inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
            /**
             * Specify that a standard HTML element should behave like a defined custom built-in element
             * @see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
             */
            is?: string;
        }

        type HTMLAttributeReferrerPolicy =
            | ""
            | "no-referrer"
            | "no-referrer-when-downgrade"
            | "origin"
            | "origin-when-cross-origin"
            | "same-origin"
            | "strict-origin"
            | "strict-origin-when-cross-origin"
            | "unsafe-url";

        type HTMLAttributeAnchorTarget =
            | "_self"
            | "_blank"
            | "_parent"
            | "_top"
            | (string & {});

        interface AnchorHTMLAttributes extends HTMLAttributes {
            download?: any;
            href?: string;
            hrefLang?: string;
            media?: string;
            ping?: string;
            target?: HTMLAttributeAnchorTarget;
            type?: string;
            referrerPolicy?: HTMLAttributeReferrerPolicy;
        }

        interface AudioHTMLAttributes extends MediaHTMLAttributes {}

        interface AreaHTMLAttributes extends HTMLAttributes {
            alt?: string;
            coords?: string;
            download?: any;
            href?: string;
            hrefLang?: string;
            media?: string;
            referrerPolicy?: HTMLAttributeReferrerPolicy;
            shape?: string;
            target?: string;
        }

        interface BaseHTMLAttributes extends HTMLAttributes {
            href?: string;
            target?: string;
        }

        interface BlockquoteHTMLAttributes extends HTMLAttributes {
            cite?: string;
        }

        interface ButtonHTMLAttributes extends HTMLAttributes {
            disabled?: boolean;
            form?: string;
            formAction?: string;
            formEncType?: string;
            formMethod?: string;
            formNoValidate?: boolean;
            formTarget?: string;
            name?: string;
            type?: "submit" | "reset" | "button";
            value?: string | readonly string[] | number;
        }

        interface CanvasHTMLAttributes extends HTMLAttributes {
            height?: number | string;
            width?: number | string;
        }

        interface ColHTMLAttributes extends HTMLAttributes {
            span?: number;
            width?: number | string;
        }

        interface ColgroupHTMLAttributes extends HTMLAttributes {
            span?: number;
        }

        interface DataHTMLAttributes extends HTMLAttributes {
            value?: string | readonly string[] | number;
        }

        interface DetailsHTMLAttributes extends HTMLAttributes {
            open?: boolean;
            name?: string;
        }

        interface DelHTMLAttributes extends HTMLAttributes {
            cite?: string;
            dateTime?: string;
        }

        interface DialogHTMLAttributes extends HTMLAttributes {
            open?: boolean;
        }

        interface EmbedHTMLAttributes extends HTMLAttributes {
            height?: number | string;
            src?: string;
            type?: string;
            width?: number | string;
        }

        interface FieldsetHTMLAttributes extends HTMLAttributes {
            disabled?: boolean;
            form?: string;
            name?: string;
        }

        interface FormHTMLAttributes extends HTMLAttributes {
            acceptCharset?: string;
            action?: string;
            autoComplete?: string;
            encType?: string;
            method?: string;
            name?: string;
            noValidate?: boolean;
            target?: string;
        }

        interface HtmlHTMLAttributes extends HTMLAttributes {
            manifest?: string;
        }

        interface IframeHTMLAttributes extends HTMLAttributes {
            allow?: string;
            allowFullScreen?: boolean;
            allowTransparency?: boolean;
            /** @deprecated */
            frameBorder?: number | string;
            height?: number | string;
            loading?: "eager" | "lazy";
            /** @deprecated */
            marginHeight?: number;
            /** @deprecated */
            marginWidth?: number;
            name?: string;
            referrerPolicy?: HTMLAttributeReferrerPolicy;
            sandbox?: string;
            /** @deprecated */
            scrolling?: string;
            seamless?: boolean;
            src?: string;
            srcDoc?: string;
            width?: number | string;
        }

        interface ImgHTMLAttributes extends HTMLAttributes {
            alt?: string;
            crossOrigin?: CrossOrigin;
            decoding?: "async" | "auto" | "sync";
            height?: number | string;
            loading?: "eager" | "lazy";
            referrerPolicy?: HTMLAttributeReferrerPolicy;
            sizes?: string;
            src?: string;
            srcSet?: string;
            useMap?: string;
            width?: number | string;
        }

        interface InsHTMLAttributes extends HTMLAttributes {
            cite?: string;
            dateTime?: string;
        }

        type HTMLInputTypeAttribute =
            | "button"
            | "checkbox"
            | "color"
            | "date"
            | "datetime-local"
            | "email"
            | "file"
            | "hidden"
            | "image"
            | "month"
            | "number"
            | "password"
            | "radio"
            | "range"
            | "reset"
            | "search"
            | "submit"
            | "tel"
            | "text"
            | "time"
            | "url"
            | "week"
            | (string & {});

        interface InputHTMLAttributes extends HTMLAttributes {
            accept?: string;
            alt?: string;
            autoComplete?: string;
            capture?: boolean | "user" | "environment"; // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
            checked?: boolean;
            disabled?: boolean;
            form?: string;
            formAction?: string;
            formEncType?: string;
            formMethod?: string;
            formNoValidate?: boolean;
            formTarget?: string;
            height?: number | string;
            list?: string;
            max?: number | string;
            maxLength?: number;
            min?: number | string;
            minLength?: number;
            multiple?: boolean;
            name?: string;
            pattern?: string;
            placeholder?: string;
            readOnly?: boolean;
            required?: boolean;
            size?: number;
            src?: string;
            step?: number | string;
            type?: HTMLInputTypeAttribute;
            value?: string | number;
            width?: number | string;
        }

        interface LabelHTMLAttributes extends HTMLAttributes {
            form?: string;
            htmlFor?: string;
        }

        interface LiHTMLAttributes extends HTMLAttributes {
            value?: string | readonly string[] | number;
        }

        interface LinkHTMLAttributes extends HTMLAttributes {
            as?: string;
            crossOrigin?: CrossOrigin;
            fetchPriority?: "high" | "low" | "auto";
            href?: string;
            hrefLang?: string;
            integrity?: string;
            media?: string;
            imageSrcSet?: string;
            referrerPolicy?: HTMLAttributeReferrerPolicy;
            sizes?: string;
            type?: string;
            charSet?: string;
        }

        interface MapHTMLAttributes extends HTMLAttributes {
            name?: string;
        }

        interface MenuHTMLAttributes extends HTMLAttributes {
            type?: string;
        }

        interface MediaHTMLAttributes extends HTMLAttributes {
            autoPlay?: boolean;
            controls?: boolean;
            controlsList?: string;
            crossOrigin?: CrossOrigin;
            loop?: boolean;
            mediaGroup?: string;
            muted?: boolean;
            playsInline?: boolean;
            preload?: string;
            src?: string;
        }

        interface MetaHTMLAttributes extends HTMLAttributes {
            charSet?: string;
            content?: string;
            httpEquiv?: string;
            media?: string;
            name?: string;
        }

        interface MeterHTMLAttributes extends HTMLAttributes {
            form?: string;
            high?: number;
            low?: number;
            max?: number | string;
            min?: number | string;
            optimum?: number;
            value?: string | readonly string[] | number;
        }

        interface QuoteHTMLAttributes extends HTMLAttributes {
            cite?: string;
        }

        interface ObjectHTMLAttributes extends HTMLAttributes {
            classID?: string;
            data?: string;
            form?: string;
            height?: number | string;
            name?: string;
            type?: string;
            useMap?: string;
            width?: number | string;
            wmode?: string;
        }

        interface OlHTMLAttributes extends HTMLAttributes {
            reversed?: boolean;
            start?: number;
            type?: "1" | "a" | "A" | "i" | "I";
        }

        interface OptgroupHTMLAttributes extends HTMLAttributes {
            disabled?: boolean;
            label?: string;
        }

        interface OptionHTMLAttributes extends HTMLAttributes {
            disabled?: boolean;
            label?: string;
            selected?: boolean;
            value?: string | readonly string[] | number;
        }

        interface OutputHTMLAttributes extends HTMLAttributes {
            form?: string;
            htmlFor?: string;
            name?: string;
        }

        interface ParamHTMLAttributes extends HTMLAttributes {
            name?: string;
            value?: string | readonly string[] | number;
        }

        interface ProgressHTMLAttributes extends HTMLAttributes {
            max?: number | string;
            value?: string | readonly string[] | number;
        }

        interface SlotHTMLAttributes extends HTMLAttributes {
            name?: string;
        }

        interface ScriptHTMLAttributes extends HTMLAttributes {
            async?: boolean;
            /** @deprecated */
            charSet?: string;
            crossOrigin?: CrossOrigin;
            defer?: boolean;
            integrity?: string;
            noModule?: boolean;
            referrerPolicy?: HTMLAttributeReferrerPolicy;
            src?: string;
            type?: string;
        }

        interface SelectHTMLAttributes extends HTMLAttributes {
            autoComplete?: string;
            disabled?: boolean;
            form?: string;
            multiple?: boolean;
            name?: string;
            required?: boolean;
            size?: number;
            value?: string | readonly string[] | number;
            onChange?: ChangeEventHandler;
        }

        interface SourceHTMLAttributes extends HTMLAttributes {
            height?: number | string;
            media?: string;
            sizes?: string;
            src?: string;
            srcSet?: string;
            type?: string;
            width?: number | string;
        }

        interface StyleHTMLAttributes extends HTMLAttributes {
            media?: string;
            scoped?: boolean;
            type?: string;
        }

        interface TableHTMLAttributes extends HTMLAttributes {
            cellPadding?: number | string;
            cellSpacing?: number | string;
            summary?: string;
            width?: number | string;
        }

        interface TextareaHTMLAttributes extends HTMLAttributes {
            autoComplete?: string;
            cols?: number;
            dirName?: string;
            disabled?: boolean;
            form?: string;
            maxLength?: number;
            minLength?: number;
            name?: string;
            placeholder?: string;
            readOnly?: boolean;
            required?: boolean;
            rows?: number;
            value?: string | readonly string[] | number;
            wrap?: string;

            onChange?: ChangeEventHandler;
        }

        interface TdHTMLAttributes extends HTMLAttributes {
            align?: "left" | "center" | "right" | "justify" | "char";
            colSpan?: number;
            headers?: string;
            rowSpan?: number;
            scope?: string;
            abbr?: string;
            height?: number | string;
            width?: number | string;
            valign?: "top" | "middle" | "bottom" | "baseline";
        }

        interface ThHTMLAttributes extends HTMLAttributes {
            align?: "left" | "center" | "right" | "justify" | "char";
            colSpan?: number;
            headers?: string;
            rowSpan?: number;
            scope?: string;
            abbr?: string;
        }

        interface TimeHTMLAttributes extends HTMLAttributes {
            dateTime?: string;
        }

        interface TrackHTMLAttributes extends HTMLAttributes {
            default?: boolean;
            kind?: string;
            label?: string;
            src?: string;
            srcLang?: string;
        }

        interface VideoHTMLAttributes extends MediaHTMLAttributes {
            height?: number | string;
            playsInline?: boolean;
            poster?: string;
            width?: number | string;
            disablePictureInPicture?: boolean;
            disableRemotePlayback?: boolean;
        }

        // this list is "complete" in that it contains every SVG attribute
        // that React supports, but the types can be improved.
        // Full list here: https://facebook.github.io/react/docs/dom-elements.html
        //
        // The three broad type categories are (in order of restrictiveness):
        //   - "number | string"
        //   - "string"
        //   - union of string literals
        interface SVGAttributes extends AriaAttributes, EventHandlers {
            class?: string;
            color?: string;
            height?: number | string;
            id?: string;
            lang?: string;
            max?: number | string;
            media?: string;
            method?: string;
            min?: number | string;
            name?: string;
            style?: CSSProperties;
            target?: string;
            type?: string;
            width?: number | string;

            // Other HTML properties supported by SVG elements in browsers
            role?: AriaRole;
            tabIndex?: number;
            crossOrigin?: CrossOrigin;

            // SVG Specific attributes
            accentHeight?: number | string;
            accumulate?: "none" | "sum";
            additive?: "replace" | "sum";
            alignmentBaseline?:
                | "auto"
                | "baseline"
                | "before-edge"
                | "text-before-edge"
                | "middle"
                | "central"
                | "after-edge"
                | "text-after-edge"
                | "ideographic"
                | "alphabetic"
                | "hanging"
                | "mathematical"
                | "inherit"
               ;
            allowReorder?: "no" | "yes";
            alphabetic?: number | string;
            amplitude?: number | string;
            arabicForm?: "initial" | "medial" | "terminal" | "isolated";
            ascent?: number | string;
            attributeName?: string;
            attributeType?: string;
            autoReverse?: Booleanish;
            azimuth?: number | string;
            baseFrequency?: number | string;
            baselineShift?: number | string;
            baseProfile?: number | string;
            bbox?: number | string;
            begin?: number | string;
            bias?: number | string;
            by?: number | string;
            calcMode?: number | string;
            capHeight?: number | string;
            clip?: number | string;
            clipPath?: string;
            clipPathUnits?: number | string;
            clipRule?: number | string;
            colorInterpolation?: number | string;
            colorInterpolationFilters?: "auto" | "sRGB" | "linearRGB" | "inherit";
            colorProfile?: number | string;
            colorRendering?: number | string;
            contentScriptType?: number | string;
            contentStyleType?: number | string;
            cursor?: number | string;
            cx?: number | string;
            cy?: number | string;
            d?: string;
            decelerate?: number | string;
            descent?: number | string;
            diffuseConstant?: number | string;
            direction?: number | string;
            display?: number | string;
            divisor?: number | string;
            dominantBaseline?: number | string;
            dur?: number | string;
            dx?: number | string;
            dy?: number | string;
            edgeMode?: number | string;
            elevation?: number | string;
            enableBackground?: number | string;
            end?: number | string;
            exponent?: number | string;
            externalResourcesRequired?: Booleanish;
            fill?: string;
            fillOpacity?: number | string;
            fillRule?: "nonzero" | "evenodd" | "inherit";
            filter?: string;
            filterRes?: number | string;
            filterUnits?: number | string;
            floodColor?: number | string;
            floodOpacity?: number | string;
            focusable?: Booleanish | "auto";
            fontFamily?: string;
            fontSize?: number | string;
            fontSizeAdjust?: number | string;
            fontStretch?: number | string;
            fontStyle?: number | string;
            fontVariant?: number | string;
            fontWeight?: number | string;
            format?: number | string;
            fr?: number | string;
            from?: number | string;
            fx?: number | string;
            fy?: number | string;
            g1?: number | string;
            g2?: number | string;
            glyphName?: number | string;
            glyphOrientationHorizontal?: number | string;
            glyphOrientationVertical?: number | string;
            glyphRef?: number | string;
            gradientTransform?: string;
            gradientUnits?: string;
            hanging?: number | string;
            horizAdvX?: number | string;
            horizOriginX?: number | string;
            href?: string;
            ideographic?: number | string;
            imageRendering?: number | string;
            in2?: number | string;
            in?: string;
            intercept?: number | string;
            k1?: number | string;
            k2?: number | string;
            k3?: number | string;
            k4?: number | string;
            k?: number | string;
            kernelMatrix?: number | string;
            kernelUnitLength?: number | string;
            kerning?: number | string;
            keyPoints?: number | string;
            keySplines?: number | string;
            keyTimes?: number | string;
            lengthAdjust?: number | string;
            letterSpacing?: number | string;
            lightingColor?: number | string;
            limitingConeAngle?: number | string;
            local?: number | string;
            markerEnd?: string;
            markerHeight?: number | string;
            markerMid?: string;
            markerStart?: string;
            markerUnits?: number | string;
            markerWidth?: number | string;
            mask?: string;
            maskContentUnits?: number | string;
            maskUnits?: number | string;
            mathematical?: number | string;
            mode?: number | string;
            numOctaves?: number | string;
            offset?: number | string;
            opacity?: number | string;
            operator?: number | string;
            order?: number | string;
            orient?: number | string;
            orientation?: number | string;
            origin?: number | string;
            overflow?: number | string;
            overlinePosition?: number | string;
            overlineThickness?: number | string;
            paintOrder?: number | string;
            panose1?: number | string;
            path?: string;
            pathLength?: number | string;
            patternContentUnits?: string;
            patternTransform?: number | string;
            patternUnits?: string;
            pointerEvents?: number | string;
            points?: string;
            pointsAtX?: number | string;
            pointsAtY?: number | string;
            pointsAtZ?: number | string;
            preserveAlpha?: Booleanish;
            preserveAspectRatio?: string;
            primitiveUnits?: number | string;
            r?: number | string;
            radius?: number | string;
            refX?: number | string;
            refY?: number | string;
            renderingIntent?: number | string;
            repeatCount?: number | string;
            repeatDur?: number | string;
            requiredExtensions?: number | string;
            requiredFeatures?: number | string;
            restart?: number | string;
            result?: string;
            rotate?: number | string;
            rx?: number | string;
            ry?: number | string;
            scale?: number | string;
            seed?: number | string;
            shapeRendering?: number | string;
            slope?: number | string;
            spacing?: number | string;
            specularConstant?: number | string;
            specularExponent?: number | string;
            speed?: number | string;
            spreadMethod?: string;
            startOffset?: number | string;
            stdDeviation?: number | string;
            stemh?: number | string;
            stemv?: number | string;
            stitchTiles?: number | string;
            stopColor?: string;
            stopOpacity?: number | string;
            strikethroughPosition?: number | string;
            strikethroughThickness?: number | string;
            string?: number | string;
            stroke?: string;
            strokeDasharray?: string | number;
            strokeDashoffset?: string | number;
            strokeLinecap?: "butt" | "round" | "square" | "inherit";
            strokeLinejoin?: "miter" | "round" | "bevel" | "inherit";
            strokeMiterlimit?: number | string;
            strokeOpacity?: number | string;
            strokeWidth?: number | string;
            surfaceScale?: number | string;
            systemLanguage?: number | string;
            tableValues?: number | string;
            targetX?: number | string;
            targetY?: number | string;
            textAnchor?: string;
            textDecoration?: number | string;
            textLength?: number | string;
            textRendering?: number | string;
            to?: number | string;
            transform?: string;
            u1?: number | string;
            u2?: number | string;
            underlinePosition?: number | string;
            underlineThickness?: number | string;
            unicode?: number | string;
            unicodeBidi?: number | string;
            unicodeRange?: number | string;
            unitsPerEm?: number | string;
            vAlphabetic?: number | string;
            values?: string;
            vectorEffect?: number | string;
            version?: string;
            vertAdvY?: number | string;
            vertOriginX?: number | string;
            vertOriginY?: number | string;
            vHanging?: number | string;
            vIdeographic?: number | string;
            viewBox?: string;
            viewTarget?: number | string;
            visibility?: number | string;
            vMathematical?: number | string;
            widths?: number | string;
            wordSpacing?: number | string;
            writingMode?: number | string;
            x1?: number | string;
            x2?: number | string;
            x?: number | string;
            xChannelSelector?: string;
            xHeight?: number | string;
            xlinkActuate?: string;
            xlinkArcrole?: string;
            xlinkHref?: string;
            xlinkRole?: string;
            xlinkShow?: string;
            xlinkTitle?: string;
            xlinkType?: string;
            xmlBase?: string;
            xmlLang?: string;
            xmlns?: string;
            xmlnsXlink?: string;
            xmlSpace?: string;
            y1?: number | string;
            y2?: number | string;
            y?: number | string;
            yChannelSelector?: string;
            z?: number | string;
            zoomAndPan?: string;
        }

        export interface IntrinsicElements {
            // HTML
            abbr: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            address: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            area: SignalAttrs<AreaHTMLAttributes> & Properties<HTMLAreaElement>;
            article: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            aside: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            audio: SignalAttrs<AudioHTMLAttributes> & Properties<HTMLAudioElement>;
            b: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            base: SignalAttrs<BaseHTMLAttributes> & Properties<HTMLBaseElement>;
            bdi: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            bdo: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            big: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            blockquote: SignalAttrs<BlockquoteHTMLAttributes> & Properties<HTMLQuoteElement>;
            body: SignalAttrs<HTMLAttributes> & Properties<HTMLBodyElement>;
            br: SignalAttrs<HTMLAttributes> & Properties<HTMLBRElement>;
            button: SignalAttrs<ButtonHTMLAttributes> & Properties<HTMLButtonElement>;
            canvas: SignalAttrs<CanvasHTMLAttributes> & Properties<HTMLCanvasElement>;
            caption: SignalAttrs<HTMLAttributes> & Properties<HTMLTableCaptionElement>;
            cite: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            code: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            col: SignalAttrs<ColHTMLAttributes> & Properties<HTMLTableColElement>;
            colgroup: SignalAttrs<ColgroupHTMLAttributes> & Properties<HTMLTableColElement>;
            data: SignalAttrs<DataHTMLAttributes> & Properties<HTMLDataElement>;
            datalist: SignalAttrs<HTMLAttributes> & Properties<HTMLDataListElement>;
            dd: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            del: SignalAttrs<DelHTMLAttributes> & Properties<HTMLModElement>;
            details: SignalAttrs<DetailsHTMLAttributes> & Properties<HTMLDetailsElement>;
            dfn: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            dialog: SignalAttrs<DialogHTMLAttributes> & Properties<HTMLDialogElement>;
            div: SignalAttrs<HTMLAttributes> & Properties<HTMLDivElement>;
            dl: SignalAttrs<HTMLAttributes> & Properties<HTMLDListElement>;
            dt: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            em: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            embed: SignalAttrs<EmbedHTMLAttributes> & Properties<HTMLEmbedElement>;
            fieldset: SignalAttrs<FieldsetHTMLAttributes> & Properties<HTMLFieldSetElement>;
            figcaption: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            figure: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            footer: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            form: SignalAttrs<FormHTMLAttributes> & Properties<HTMLFormElement>;
            h1: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadingElement>;
            h2: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadingElement>;
            h3: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadingElement>;
            h4: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadingElement>;
            h5: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadingElement>;
            h6: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadingElement>;
            head: SignalAttrs<HTMLAttributes> & Properties<HTMLHeadElement>;
            header: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            hgroup: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            hr: SignalAttrs<HTMLAttributes> & Properties<HTMLHRElement>;
            html: SignalAttrs<HtmlHTMLAttributes> & Properties<HTMLHtmlElement>;
            i: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            iframe: SignalAttrs<IframeHTMLAttributes> & Properties<HTMLIFrameElement>;
            img: SignalAttrs<ImgHTMLAttributes> & Properties<HTMLImageElement>;
            input: SignalAttrs<InputHTMLAttributes> & Properties<HTMLInputElement>;
            ins: SignalAttrs<InsHTMLAttributes> & Properties<HTMLModElement>;
            kbd: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            label: SignalAttrs<LabelHTMLAttributes> & Properties<HTMLLabelElement>;
            legend: SignalAttrs<HTMLAttributes> & Properties<HTMLLegendElement>;
            li: SignalAttrs<LiHTMLAttributes> & Properties<HTMLLIElement>;
            link: SignalAttrs<LinkHTMLAttributes> & Properties<HTMLLinkElement>;
            main: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            map: SignalAttrs<MapHTMLAttributes> & Properties<HTMLMapElement>;
            mark: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            menu: SignalAttrs<MenuHTMLAttributes> & Properties<HTMLMenuElement>;
            meta: SignalAttrs<MetaHTMLAttributes> & Properties<HTMLMetaElement>;
            meter: SignalAttrs<MeterHTMLAttributes> & Properties<HTMLMeterElement>;
            nav: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            noscript: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            object: SignalAttrs<ObjectHTMLAttributes> & Properties<HTMLObjectElement>;
            ol: SignalAttrs<OlHTMLAttributes> & Properties<HTMLOListElement>;
            optgroup: SignalAttrs<OptgroupHTMLAttributes> & Properties<HTMLOptGroupElement>;
            option: SignalAttrs<OptionHTMLAttributes> & Properties<HTMLOptionElement>;
            output: SignalAttrs<OutputHTMLAttributes> & Properties<HTMLOutputElement>;
            p: SignalAttrs<HTMLAttributes> & Properties<HTMLParagraphElement>;
            picture: SignalAttrs<HTMLAttributes> & Properties<HTMLPictureElement>;
            pre: SignalAttrs<HTMLAttributes> & Properties<HTMLPreElement>;
            progress: SignalAttrs<ProgressHTMLAttributes> & Properties<HTMLProgressElement>;
            q: SignalAttrs<QuoteHTMLAttributes> & Properties<HTMLQuoteElement>;
            rp: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            rt: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            ruby: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            s: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            samp: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            search: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            section: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            select: SignalAttrs<SelectHTMLAttributes> & Properties<HTMLSelectElement>;
            slot: SignalAttrs<HTMLAttributes> & Properties<HTMLSlotElement>;
            small: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            source: SignalAttrs<SourceHTMLAttributes> & Properties<HTMLSourceElement>;
            span: SignalAttrs<HTMLAttributes> & Properties<HTMLSpanElement>;
            strong: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            sub: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            summary: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            sup: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            table: SignalAttrs<TableHTMLAttributes> & Properties<HTMLTableElement>;
            tbody: SignalAttrs<HTMLAttributes> & Properties<HTMLTableSectionElement>;
            td: SignalAttrs<TdHTMLAttributes> & Properties<HTMLTableCellElement>;
            template: SignalAttrs<HTMLAttributes> & Properties<HTMLTemplateElement>;
            textarea: SignalAttrs<TextareaHTMLAttributes> & Properties<HTMLTextAreaElement>;
            tfoot: SignalAttrs<HTMLAttributes> & Properties<HTMLTableSectionElement>;
            th: SignalAttrs<ThHTMLAttributes> & Properties<HTMLTableCellElement>;
            thead: SignalAttrs<HTMLAttributes> & Properties<HTMLTableSectionElement>;
            time: SignalAttrs<TimeHTMLAttributes> & Properties<HTMLTimeElement>;
            title: SignalAttrs<HTMLAttributes> & Properties<HTMLTitleElement>;
            tr: SignalAttrs<HTMLAttributes> & Properties<HTMLTableRowElement>;
            track: SignalAttrs<TrackHTMLAttributes> & Properties<HTMLTrackElement>;
            u: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            ul: SignalAttrs<HTMLAttributes> & Properties<HTMLUListElement>;
            var: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;
            video: SignalAttrs<VideoHTMLAttributes> & Properties<HTMLVideoElement>;
            wbr: SignalAttrs<HTMLAttributes> & Properties<HTMLElement>;

            // common - both SVG and HTML
            a: SignalAttrs<AnchorHTMLAttributes> & (Properties<HTMLAnchorElement> | Properties<SVGAElement>);
            script: SignalAttrs<ScriptHTMLAttributes> & (Properties<HTMLScriptElement> | Properties<{$ns: 'svg'} & SVGScriptElement>);
            style: SignalAttrs<StyleHTMLAttributes> & (Properties<HTMLStyleElement> | Properties<{$ns: 'svg'} & SVGStyleElement>);

            // SVG
            svg: SignalAttrs<SVGProps> & Properties<SVGSVGElement>;

            animate: SVGProps;
            animateMotion: SVGProps;
            animateTransform: SignalAttrs<SVGProps> & Properties<SVGAnimateTransformElement>;
            circle: SignalAttrs<SVGProps> & Properties<SVGCircleElement>;
            clipPath: SignalAttrs<SVGProps> & Properties<SVGClipPathElement>;
            defs: SignalAttrs<SVGProps> & Properties<SVGDefsElement>;
            desc: SignalAttrs<SVGProps> & Properties<SVGDescElement>;
            ellipse: SignalAttrs<SVGProps> & Properties<SVGEllipseElement>;
            feBlend: SignalAttrs<SVGProps> & Properties<SVGFEBlendElement>;
            feColorMatrix: SignalAttrs<SVGProps> & Properties<SVGFEColorMatrixElement>;
            feComponentTransfer: SignalAttrs<SVGProps> & Properties<SVGFEComponentTransferElement>;
            feComposite: SignalAttrs<SVGProps> & Properties<SVGFECompositeElement>;
            feConvolveMatrix: SignalAttrs<SVGProps> & Properties<SVGFEConvolveMatrixElement>;
            feDiffuseLighting: SignalAttrs<SVGProps> & Properties<SVGFEDiffuseLightingElement>;
            feDisplacementMap: SignalAttrs<SVGProps> & Properties<SVGFEDisplacementMapElement>;
            feDistantLight: SignalAttrs<SVGProps> & Properties<SVGFEDistantLightElement>;
            feDropShadow: SignalAttrs<SVGProps> & Properties<SVGFEDropShadowElement>;
            feFlood: SignalAttrs<SVGProps> & Properties<SVGFEFloodElement>;
            feFuncA: SignalAttrs<SVGProps> & Properties<SVGFEFuncAElement>;
            feFuncB: SignalAttrs<SVGProps> & Properties<SVGFEFuncBElement>;
            feFuncG: SignalAttrs<SVGProps> & Properties<SVGFEFuncGElement>;
            feFuncR: SignalAttrs<SVGProps> & Properties<SVGFEFuncRElement>;
            feGaussianBlur: SignalAttrs<SVGProps> & Properties<SVGFEGaussianBlurElement>;
            feImage: SignalAttrs<SVGProps> & Properties<SVGFEImageElement>;
            feMerge: SignalAttrs<SVGProps> & Properties<SVGFEMergeElement>;
            feMergeNode: SignalAttrs<SVGProps> & Properties<SVGFEMergeNodeElement>;
            feMorphology: SignalAttrs<SVGProps> & Properties<SVGFEMorphologyElement>;
            feOffset: SignalAttrs<SVGProps> & Properties<SVGFEOffsetElement>;
            fePointLight: SignalAttrs<SVGProps> & Properties<SVGFEPointLightElement>;
            feSpecularLighting: SignalAttrs<SVGProps> & Properties<SVGFESpecularLightingElement>;
            feSpotLight: SignalAttrs<SVGProps> & Properties<SVGFESpotLightElement>;
            feTile: SignalAttrs<SVGProps> & Properties<SVGFETileElement>;
            feTurbulence: SignalAttrs<SVGProps> & Properties<SVGFETurbulenceElement>;
            filter: SignalAttrs<SVGProps> & Properties<SVGFilterElement>;
            foreignObject: SignalAttrs<SVGProps> & Properties<SVGForeignObjectElement>;
            g: SignalAttrs<SVGProps> & Properties<SVGGElement>;
            image: SignalAttrs<SVGProps> & Properties<SVGImageElement>;
            line: SVGLineElementAttributes & Properties<SVGLineElement>;
            linearGradient: SignalAttrs<SVGProps> & Properties<SVGLinearGradientElement>;
            marker: SignalAttrs<SVGProps> & Properties<SVGMarkerElement>;
            mask: SignalAttrs<SVGProps> & Properties<SVGMaskElement>;
            metadata: SignalAttrs<SVGProps> & Properties<SVGMetadataElement>;
            mpath: SignalAttrs<SVGProps> & Properties<SVGMPathElement>;
            path: SignalAttrs<SVGProps> & Properties<SVGPathElement>;
            pattern: SignalAttrs<SVGProps> & Properties<SVGPatternElement>;
            polygon: SignalAttrs<SVGProps> & Properties<SVGPolygonElement>;
            polyline: SignalAttrs<SVGProps> & Properties<SVGPolylineElement>;
            radialGradient: SignalAttrs<SVGProps> & Properties<SVGRadialGradientElement>;
            rect: SignalAttrs<SVGProps> & Properties<SVGRectElement>;
            stop: SignalAttrs<SVGProps> & Properties<SVGStopElement>;
            switch: SignalAttrs<SVGProps> & Properties<SVGSwitchElement>;
            symbol: SignalAttrs<SVGProps> & Properties<SVGSymbolElement>;
            text: SVGTextElementAttributes & Properties<SVGTextElement>;
            textPath: SignalAttrs<SVGProps> & Properties<SVGTextPathElement>;
            tspan: SignalAttrs<SVGProps> & Properties<SVGTSpanElement>;
            use: SignalAttrs<SVGProps> & Properties<SVGUseElement>;
            view: SignalAttrs<SVGProps> & Properties<SVGViewElement>;

            // MathML
            math: MathMLProps;

            'annotation-xml': MathMLProps;
            annotation: MathMLProps;
            merror: MathMLProps;
            mfrac: MathMLProps;
            mi: MathMLProps;
            mmultiscripts: MathMLProps;
            mn: MathMLProps;
            mo: MathMLProps;
            mover: MathMLProps;
            mpadded: MathMLProps;
            mphantom: MathMLProps;
            mprescripts: MathMLProps;
            mroot: MathMLProps;
            mrow: MathMLProps;
            ms: MathMLProps;
            mspace: MathMLProps;
            msqrt: MathMLProps;
            mstyle: MathMLProps;
            msub: MathMLProps;
            msup: MathMLProps;
            msubsup: MathMLProps;
            mtable: MathMLProps;
            mtd: MathMLProps;
            mtext: MathMLProps;
            mtr: MathMLProps;
            munder: MathMLProps;
            munderover: MathMLProps;
            semantics: MathMLProps;
        }
    }
}
