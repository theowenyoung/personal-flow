import { assert } from "../_util/assert.ts";
import { makeMethodsEnumerable, notImplemented } from "./_utils.ts";
import { ERR_INVALID_ARG_TYPE, ERR_OUT_OF_RANGE, ERR_UNHANDLED_ERROR, } from "./_errors.ts";
import { inspect } from "./util.ts";
function ensureArray(maybeArray) {
    return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
}
function createIterResult(value, done) {
    return { value, done };
}
export let defaultMaxListeners = 10;
function validateMaxListeners(n, name) {
    if (!Number.isInteger(n) || Number.isNaN(n) || n < 0) {
        throw new ERR_OUT_OF_RANGE(name, "a non-negative number", inspect(n));
    }
}
function setMaxListeners(n, ...eventTargets) {
    validateMaxListeners(n, "n");
    if (eventTargets.length === 0) {
        defaultMaxListeners = n;
    }
    else {
        for (const target of eventTargets) {
            if (target instanceof EventEmitter) {
                target.setMaxListeners(n);
            }
            else if (target instanceof EventTarget) {
                notImplemented("setMaxListeners currently does not support EventTarget");
            }
            else {
                throw new ERR_INVALID_ARG_TYPE("eventTargets", ["EventEmitter", "EventTarget"], target);
            }
        }
    }
}
export class EventEmitter {
    static captureRejectionSymbol = Symbol.for("nodejs.rejection");
    static errorMonitor = Symbol("events.errorMonitor");
    static get defaultMaxListeners() {
        return defaultMaxListeners;
    }
    static set defaultMaxListeners(value) {
        validateMaxListeners(value, "defaultMaxListeners");
        defaultMaxListeners = value;
    }
    maxListeners;
    _events;
    static #init(emitter) {
        if (emitter._events == null ||
            emitter._events === Object.getPrototypeOf(emitter)._events) {
            emitter._events = Object.create(null);
        }
    }
    static call = function call(thisArg) {
        EventEmitter.#init(thisArg);
    };
    constructor() {
        EventEmitter.#init(this);
    }
    addListener(eventName, listener) {
        return EventEmitter.#addListener(this, eventName, listener, false);
    }
    emit(eventName, ...args) {
        if (hasListeners(this._events, eventName)) {
            if (eventName === "error" &&
                hasListeners(this._events, EventEmitter.errorMonitor)) {
                this.emit(EventEmitter.errorMonitor, ...args);
            }
            const listeners = ensureArray(this._events[eventName])
                .slice();
            for (const listener of listeners) {
                try {
                    listener.apply(this, args);
                }
                catch (err) {
                    this.emit("error", err);
                }
            }
            return true;
        }
        else if (eventName === "error") {
            if (hasListeners(this._events, EventEmitter.errorMonitor)) {
                this.emit(EventEmitter.errorMonitor, ...args);
            }
            let err = args.length > 0 ? args[0] : "Unhandled error.";
            if (err instanceof Error) {
                throw err;
            }
            try {
                err = inspect(err);
            }
            catch {
            }
            throw new ERR_UNHANDLED_ERROR(err);
        }
        return false;
    }
    eventNames() {
        return Reflect.ownKeys(this._events);
    }
    getMaxListeners() {
        return EventEmitter.#getMaxListeners(this);
    }
    listenerCount(eventName) {
        return EventEmitter.#listenerCount(this, eventName);
    }
    static listenerCount(emitter, eventName) {
        return emitter.listenerCount(eventName);
    }
    listeners(eventName) {
        return listeners(this._events, eventName, true);
    }
    rawListeners(eventName) {
        return listeners(this._events, eventName, false);
    }
    off(eventName, listener) {
    }
    on(eventName, listener) {
    }
    once(eventName, listener) {
        const wrapped = onceWrap(this, eventName, listener);
        this.on(eventName, wrapped);
        return this;
    }
    prependListener(eventName, listener) {
        return EventEmitter.#addListener(this, eventName, listener, true);
    }
    prependOnceListener(eventName, listener) {
        const wrapped = onceWrap(this, eventName, listener);
        this.prependListener(eventName, wrapped);
        return this;
    }
    removeAllListeners(eventName) {
        if (this._events === undefined) {
            return this;
        }
        if (eventName) {
            if (hasListeners(this._events, eventName)) {
                const listeners = ensureArray(this._events[eventName]).slice()
                    .reverse();
                for (const listener of listeners) {
                    this.removeListener(eventName, unwrapListener(listener));
                }
            }
        }
        else {
            const eventList = this.eventNames();
            eventList.forEach((eventName) => {
                if (eventName === "removeListener")
                    return;
                this.removeAllListeners(eventName);
            });
            this.removeAllListeners("removeListener");
        }
        return this;
    }
    removeListener(eventName, listener) {
        checkListenerArgument(listener);
        if (hasListeners(this._events, eventName)) {
            const maybeArr = this._events[eventName];
            assert(maybeArr);
            const arr = ensureArray(maybeArr);
            let listenerIndex = -1;
            for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i] == listener ||
                    (arr[i] && arr[i]["listener"] == listener)) {
                    listenerIndex = i;
                    break;
                }
            }
            if (listenerIndex >= 0) {
                arr.splice(listenerIndex, 1);
                if (arr.length === 0) {
                    delete this._events[eventName];
                }
                else if (arr.length === 1) {
                    this._events[eventName] = arr[0];
                }
                if (this._events.removeListener) {
                    this.emit("removeListener", eventName, listener);
                }
            }
        }
        return this;
    }
    setMaxListeners(n) {
        if (n !== Infinity) {
            validateMaxListeners(n, "n");
        }
        this.maxListeners = n;
        return this;
    }
    static once(emitter, name) {
        return new Promise((resolve, reject) => {
            if (emitter instanceof EventTarget) {
                emitter.addEventListener(name, (...args) => {
                    resolve(args);
                }, { once: true, passive: false, capture: false });
                return;
            }
            else if (emitter instanceof EventEmitter) {
                const eventListener = (...args) => {
                    if (errorListener !== undefined) {
                        emitter.removeListener("error", errorListener);
                    }
                    resolve(args);
                };
                let errorListener;
                if (name !== "error") {
                    errorListener = (err) => {
                        emitter.removeListener(name, eventListener);
                        reject(err);
                    };
                    emitter.once("error", errorListener);
                }
                emitter.once(name, eventListener);
                return;
            }
        });
    }
    static on(emitter, event) {
        const unconsumedEventValues = [];
        const unconsumedPromises = [];
        let error = null;
        let finished = false;
        const iterator = {
            next() {
                const value = unconsumedEventValues.shift();
                if (value) {
                    return Promise.resolve(createIterResult(value, false));
                }
                if (error) {
                    const p = Promise.reject(error);
                    error = null;
                    return p;
                }
                if (finished) {
                    return Promise.resolve(createIterResult(undefined, true));
                }
                return new Promise(function (resolve, reject) {
                    unconsumedPromises.push({ resolve, reject });
                });
            },
            return() {
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
                finished = true;
                for (const promise of unconsumedPromises) {
                    promise.resolve(createIterResult(undefined, true));
                }
                return Promise.resolve(createIterResult(undefined, true));
            },
            throw(err) {
                error = err;
                emitter.removeListener(event, eventHandler);
                emitter.removeListener("error", errorHandler);
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
        emitter.on(event, eventHandler);
        emitter.on("error", errorHandler);
        return iterator;
        function eventHandler(...args) {
            const promise = unconsumedPromises.shift();
            if (promise) {
                promise.resolve(createIterResult(args, false));
            }
            else {
                unconsumedEventValues.push(args);
            }
        }
        function errorHandler(err) {
            finished = true;
            const toError = unconsumedPromises.shift();
            if (toError) {
                toError.reject(err);
            }
            else {
                error = err;
            }
            iterator.return();
        }
    }
    static #addListener(target, eventName, listener, prepend) {
        checkListenerArgument(listener);
        let events = target._events;
        if (events == null) {
            EventEmitter.#init(target);
            events = target._events;
        }
        if (events.newListener) {
            target.emit("newListener", eventName, unwrapListener(listener));
        }
        if (hasListeners(events, eventName)) {
            let listeners = events[eventName];
            if (!Array.isArray(listeners)) {
                listeners = [listeners];
                events[eventName] = listeners;
            }
            if (prepend) {
                listeners.unshift(listener);
            }
            else {
                listeners.push(listener);
            }
        }
        else if (events) {
            events[eventName] = listener;
        }
        const max = EventEmitter.#getMaxListeners(target);
        if (max > 0 && EventEmitter.#listenerCount(target, eventName) > max) {
            const warning = new MaxListenersExceededWarning(target, eventName);
            EventEmitter.#warnIfNeeded(target, eventName, warning);
        }
        return target;
    }
    static #getMaxListeners(target) {
        return target.maxListeners == null
            ? EventEmitter.defaultMaxListeners
            : target.maxListeners;
    }
    static #listenerCount(target, eventName) {
        if (hasListeners(target._events, eventName)) {
            const maybeListeners = target._events[eventName];
            return Array.isArray(maybeListeners) ? maybeListeners.length : 1;
        }
        else {
            return 0;
        }
    }
    static #warnIfNeeded(target, eventName, warning) {
        const listeners = target._events[eventName];
        if (listeners.warned) {
            return;
        }
        listeners.warned = true;
        console.warn(warning);
        const maybeProcess = globalThis.process;
        if (maybeProcess) {
            maybeProcess.emitWarning(warning);
        }
    }
}
function checkListenerArgument(listener) {
    if (typeof listener !== "function") {
        throw new ERR_INVALID_ARG_TYPE("listener", "function", listener);
    }
}
function hasListeners(maybeEvents, eventName) {
    return maybeEvents != null && Boolean(maybeEvents[eventName]);
}
function listeners(events, eventName, unwrap) {
    if (!hasListeners(events, eventName)) {
        return [];
    }
    const eventListeners = events[eventName];
    if (Array.isArray(eventListeners)) {
        return unwrap
            ? unwrapListeners(eventListeners)
            : eventListeners.slice(0);
    }
    else {
        return [
            unwrap ? unwrapListener(eventListeners) : eventListeners,
        ];
    }
}
function unwrapListeners(arr) {
    const unwrappedListeners = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        unwrappedListeners[i] = unwrapListener(arr[i]);
    }
    return unwrappedListeners;
}
function unwrapListener(listener) {
    return listener["listener"] ?? listener;
}
function onceWrap(target, eventName, listener) {
    checkListenerArgument(listener);
    const wrapper = function (...args) {
        if (this.isCalled) {
            return;
        }
        this.context.removeListener(this.eventName, this.listener);
        this.isCalled = true;
        return this.listener.apply(this.context, args);
    };
    const wrapperContext = {
        eventName: eventName,
        listener: listener,
        rawListener: wrapper,
        context: target,
    };
    const wrapped = wrapper.bind(wrapperContext);
    wrapperContext.rawListener = wrapped;
    wrapped.listener = listener;
    return wrapped;
}
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
class MaxListenersExceededWarning extends Error {
    emitter;
    type;
    count;
    constructor(emitter, type) {
        const listenerCount = emitter.listenerCount(type);
        const message = "Possible EventEmitter memory leak detected. " +
            `${listenerCount} ${type == null ? "null" : type.toString()} listeners added to [${emitter.constructor.name}]. ` +
            " Use emitter.setMaxListeners() to increase limit";
        super(message);
        this.emitter = emitter;
        this.type = type;
        this.count = listenerCount;
        this.name = "MaxListenersExceededWarning";
    }
}
makeMethodsEnumerable(EventEmitter);
export default Object.assign(EventEmitter, { EventEmitter, setMaxListeners });
export const captureRejectionSymbol = EventEmitter.captureRejectionSymbol;
export const errorMonitor = EventEmitter.errorMonitor;
export const listenerCount = EventEmitter.listenerCount;
export const on = EventEmitter.on;
export const once = EventEmitter.once;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXVCQSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDNUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNwRSxPQUFPLEVBQ0wsb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixtQkFBbUIsR0FDcEIsTUFBTSxjQUFjLENBQUM7QUFDdEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQVNwQyxTQUFTLFdBQVcsQ0FBSSxVQUFtQjtJQUN6QyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMvRCxDQUFDO0FBR0QsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFVLEVBQUUsSUFBYTtJQUNqRCxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ3pCLENBQUM7QUFxQkQsTUFBTSxDQUFDLElBQUksbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0FBQ3BDLFNBQVMsb0JBQW9CLENBQUMsQ0FBUyxFQUFFLElBQVk7SUFDbkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3BELE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkU7QUFDSCxDQUFDO0FBRUQsU0FBUyxlQUFlLENBQ3RCLENBQVMsRUFDVCxHQUFHLFlBQStDO0lBRWxELG9CQUFvQixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QixJ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Q0FBQyxJQUFJLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IChjKSAyMDE5IERlbm9saWJzIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnQudHNcIjtcbmltcG9ydCB7IG1ha2VNZXRob2RzRW51bWVyYWJsZSwgbm90SW1wbGVtZW50ZWQgfSBmcm9tIFwiLi9fdXRpbHMudHNcIjtcbmltcG9ydCB7XG4gIEVSUl9JTlZBTElEX0FSR19UWVBFLFxuICBFUlJfT1VUX09GX1JBTkdFLFxuICBFUlJfVU5IQU5ETEVEX0VSUk9SLFxufSBmcm9tIFwiLi9fZXJyb3JzLnRzXCI7XG5pbXBvcnQgeyBpbnNwZWN0IH0gZnJvbSBcIi4vdXRpbC50c1wiO1xuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgR2VuZXJpY0Z1bmN0aW9uID0gKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV3JhcHBlZEZ1bmN0aW9uIGV4dGVuZHMgRnVuY3Rpb24ge1xuICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVBcnJheTxUPihtYXliZUFycmF5OiBUW10gfCBUKTogVFtdIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkobWF5YmVBcnJheSkgPyBtYXliZUFycmF5IDogW21heWJlQXJyYXldO1xufVxuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gY3JlYXRlSXRlclJlc3VsdCh2YWx1ZTogYW55LCBkb25lOiBib29sZWFuKTogSXRlcmF0b3JSZXN1bHQ8YW55PiB7XG4gIHJldHVybiB7IHZhbHVlLCBkb25lIH07XG59XG5cbmludGVyZmFjZSBBc3luY0l0ZXJhYmxlIHtcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgbmV4dCgpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueSwgYW55Pj47XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIHJldHVybigpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueSwgYW55Pj47XG4gIHRocm93KGVycjogRXJyb3IpOiB2b2lkO1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IGFueTtcbn1cblxudHlwZSBFdmVudE1hcCA9IFJlY29yZDxcbiAgc3RyaW5nIHwgc3ltYm9sLFxuICAoXG4gICAgfCAoQXJyYXk8R2VuZXJpY0Z1bmN0aW9uIHwgV3JhcHBlZEZ1bmN0aW9uPilcbiAgICB8IEdlbmVyaWNGdW5jdGlvblxuICAgIHwgV3JhcHBlZEZ1bmN0aW9uXG4gICkgJiB7IHdhcm5lZD86IGJvb2xlYW4gfVxuPjtcblxuZXhwb3J0IGxldCBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5mdW5jdGlvbiB2YWxpZGF0ZU1heExpc3RlbmVycyhuOiBudW1iZXIsIG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIU51bWJlci5pc0ludGVnZXIobikgfHwgTnVtYmVyLmlzTmFOKG4pIHx8IG4gPCAwKSB7XG4gICAgdGhyb3cgbmV3IEVSUl9PVVRfT0ZfUkFOR0UobmFtZSwgXCJhIG5vbi1uZWdhdGl2ZSBudW1iZXJcIiwgaW5zcGVjdChuKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKFxuICBuOiBudW1iZXIsXG4gIC4uLmV2ZW50VGFyZ2V0czogQXJyYXk8RXZlbnRFbWl0dGVyIHwgRXZlbnRUYXJnZXQ+XG4pOiB2b2lkIHtcbiAgdmFsaWRhdGVNYXhMaXN0ZW5lcnMobiwgXCJuXCIpO1xuICBpZiAoZXZlbnRUYXJnZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSBuO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgdGFyZ2V0IG9mIGV2ZW50VGFyZ2V0cykge1xuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIEV2ZW50RW1pdHRlcikge1xuICAgICAgICB0YXJnZXQuc2V0TWF4TGlzdGVuZXJzKG4pO1xuICAgICAgfSBlbHNlIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBFdmVudFRhcmdldCkge1xuICAgICAgICBub3RJbXBsZW1lbnRlZChcbiAgICAgICAgICBcInNldE1heExpc3RlbmVycyBjdXJyZW50bHkgZG9lcyBub3Qgc3VwcG9ydCBFdmVudFRhcmdldFwiLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVSUl9JTlZBTElEX0FSR19UWVBFKFxuICAgICAgICAgIFwiZXZlbnRUYXJnZXRzXCIsXG4gICAgICAgICAgW1wiRXZlbnRFbWl0dGVyXCIsIFwiRXZlbnRUYXJnZXRcIl0sXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFNlZSBhbHNvIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZXZlbnRzLmh0bWxcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50RW1pdHRlciB7XG4gIHB1YmxpYyBzdGF0aWMgY2FwdHVyZVJlamVjdGlvblN5bWJvbCA9IFN5bWJvbC5mb3IoXCJub2RlanMucmVqZWN0aW9uXCIpO1xuICBwdWJsaWMgc3RhdGljIGVycm9yTW9uaXRvciA9IFN5bWJvbChcImV2ZW50cy5lcnJvck1vbml0b3JcIik7XG4gIHB1YmxpYyBzdGF0aWMgZ2V0IGRlZmF1bHRNYXhMaXN0ZW5lcnMoKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gIH1cbiAgcHVibGljIHN0YXRpYyBzZXQgZGVmYXVsdE1heExpc3RlbmVycyh2YWx1ZTogbnVtYmVyKSB7XG4gICAgdmFsaWRhdGVNYXhMaXN0ZW5lcnModmFsdWUsIFwiZGVmYXVsdE1heExpc3RlbmVyc1wiKTtcbiAgICBkZWZhdWx0TWF4TGlzdGVuZXJzID0gdmFsdWU7XG4gIH1cblxuICBwcml2YXRlIG1heExpc3RlbmVyczogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9ldmVudHMhOiBFdmVudE1hcDtcblxuICBzdGF0aWMgI2luaXQoZW1pdHRlcjogRXZlbnRFbWl0dGVyKTogdm9pZCB7XG4gICAgaWYgKFxuICAgICAgZW1pdHRlci5fZXZlbnRzID09IG51bGwgfHxcbiAgICAgIGVtaXR0ZXIuX2V2ZW50cyA9PT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGVtaXR0ZXIpLl9ldmVudHMgLy8gSWYgYGVtaXR0ZXJgIGRvZXMgbm90IG93biBgX2V2ZW50c2AgYnV0IHRoZSBwcm90b3R5cGUgZG9lc1xuICAgICkge1xuICAgICAgZW1pdHRlci5fZXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogT3ZlcnJpZGVzIGBjYWxsYCB0byBtaW1pYyB0aGUgZXM1IGJlaGF2aW9yIHdpdGggdGhlIGVzNiBjbGFzcy5cbiAgICovXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIHN0YXRpYyBjYWxsID0gZnVuY3Rpb24gY2FsbCh0aGlzQXJnOiBhbnkpOiB2b2lkIHtcbiAgICBFdmVudEVtaXR0ZXIuI2luaXQodGhpc0FyZyk7XG4gIH07XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgRXZlbnRFbWl0dGVyLiNpbml0KHRoaXMpO1xuICB9XG5cbiAgLyoqIEFsaWFzIGZvciBlbWl0dGVyLm9uKGV2ZW50TmFtZSwgbGlzdGVuZXIpLiAqL1xuICBhZGRMaXN0ZW5lcihcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uIHwgV3JhcHBlZEZ1bmN0aW9uLFxuICApOiB0aGlzIHtcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLiNhZGRMaXN0ZW5lcih0aGlzLCBldmVudE5hbWUsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogU3luY2hyb25vdXNseSBjYWxscyBlYWNoIG9mIHRoZSBsaXN0ZW5lcnMgcmVnaXN0ZXJlZCBmb3IgdGhlIGV2ZW50IG5hbWVkXG4gICAqIGV2ZW50TmFtZSwgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZSByZWdpc3RlcmVkLCBwYXNzaW5nIHRoZSBzdXBwbGllZFxuICAgKiBhcmd1bWVudHMgdG8gZWFjaC5cbiAgICogQHJldHVybiB0cnVlIGlmIHRoZSBldmVudCBoYWQgbGlzdGVuZXJzLCBmYWxzZSBvdGhlcndpc2VcbiAgICovXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIHB1YmxpYyBlbWl0KGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLCAuLi5hcmdzOiBhbnlbXSk6IGJvb2xlYW4ge1xuICAgIGlmIChoYXNMaXN0ZW5lcnModGhpcy5fZXZlbnRzLCBldmVudE5hbWUpKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGV2ZW50TmFtZSA9PT0gXCJlcnJvclwiICYmXG4gICAgICAgIGhhc0xpc3RlbmVycyh0aGlzLl9ldmVudHMsIEV2ZW50RW1pdHRlci5lcnJvck1vbml0b3IpXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5lbWl0KEV2ZW50RW1pdHRlci5lcnJvck1vbml0b3IsIC4uLmFyZ3MpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsaXN0ZW5lcnMgPSBlbnN1cmVBcnJheSh0aGlzLl9ldmVudHNbZXZlbnROYW1lXSEpXG4gICAgICAgIC5zbGljZSgpIGFzIEFycmF5PEdlbmVyaWNGdW5jdGlvbj47IC8vIFdlIGNvcHkgd2l0aCBzbGljZSgpIHNvIGFycmF5IGlzIG5vdCBtdXRhdGVkIGR1cmluZyBlbWl0XG4gICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0aGlzLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGV2ZW50TmFtZSA9PT0gXCJlcnJvclwiKSB7XG4gICAgICBpZiAoaGFzTGlzdGVuZXJzKHRoaXMuX2V2ZW50cywgRXZlbnRFbWl0dGVyLmVycm9yTW9uaXRvcikpIHtcbiAgICAgICAgdGhpcy5lbWl0KEV2ZW50RW1pdHRlci5lcnJvck1vbml0b3IsIC4uLmFyZ3MpO1xuICAgICAgfVxuICAgICAgbGV0IGVyciA9IGFyZ3MubGVuZ3RoID4gMCA/IGFyZ3NbMF0gOiBcIlVuaGFuZGxlZCBlcnJvci5cIjtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGVyciA9IGluc3BlY3QoZXJyKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBwYXNzXG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRVJSX1VOSEFORExFRF9FUlJPUihlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhbiBhcnJheSBsaXN0aW5nIHRoZSBldmVudHMgZm9yIHdoaWNoIHRoZSBlbWl0dGVyIGhhc1xuICAgKiByZWdpc3RlcmVkIGxpc3RlbmVycy5cbiAgICovXG4gIHB1YmxpYyBldmVudE5hbWVzKCk6IFtzdHJpbmcgfCBzeW1ib2xdIHtcbiAgICByZXR1cm4gUmVmbGVjdC5vd25LZXlzKHRoaXMuX2V2ZW50cykgYXMgW1xuICAgICAgc3RyaW5nIHwgc3ltYm9sLFxuICAgIF07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBtYXggbGlzdGVuZXIgdmFsdWUgZm9yIHRoZSBFdmVudEVtaXR0ZXIgd2hpY2ggaXNcbiAgICogZWl0aGVyIHNldCBieSBlbWl0dGVyLnNldE1heExpc3RlbmVycyhuKSBvciBkZWZhdWx0cyB0b1xuICAgKiBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycy5cbiAgICovXG4gIHB1YmxpYyBnZXRNYXhMaXN0ZW5lcnMoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLiNnZXRNYXhMaXN0ZW5lcnModGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIGxpc3RlbmVycyBsaXN0ZW5pbmcgdG8gdGhlIGV2ZW50IG5hbWVkXG4gICAqIGV2ZW50TmFtZS5cbiAgICovXG4gIHB1YmxpYyBsaXN0ZW5lckNvdW50KGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sKTogbnVtYmVyIHtcbiAgICByZXR1cm4gRXZlbnRFbWl0dGVyLiNsaXN0ZW5lckNvdW50KHRoaXMsIGV2ZW50TmFtZSk7XG4gIH1cblxuICBzdGF0aWMgbGlzdGVuZXJDb3VudChcbiAgICBlbWl0dGVyOiBFdmVudEVtaXR0ZXIsXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICk6IG51bWJlciB7XG4gICAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudChldmVudE5hbWUpO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBhcnJheSBvZiBsaXN0ZW5lcnMgZm9yIHRoZSBldmVudCBuYW1lZCBldmVudE5hbWUuKi9cbiAgcHVibGljIGxpc3RlbmVycyhldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCk6IEdlbmVyaWNGdW5jdGlvbltdIHtcbiAgICByZXR1cm4gbGlzdGVuZXJzKHRoaXMuX2V2ZW50cywgZXZlbnROYW1lLCB0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgY29weSBvZiB0aGUgYXJyYXkgb2YgbGlzdGVuZXJzIGZvciB0aGUgZXZlbnQgbmFtZWQgZXZlbnROYW1lLFxuICAgKiBpbmNsdWRpbmcgYW55IHdyYXBwZXJzIChzdWNoIGFzIHRob3NlIGNyZWF0ZWQgYnkgLm9uY2UoKSkuXG4gICAqL1xuICBwdWJsaWMgcmF3TGlzdGVuZXJzKFxuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICApOiBBcnJheTxHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24+IHtcbiAgICByZXR1cm4gbGlzdGVuZXJzKHRoaXMuX2V2ZW50cywgZXZlbnROYW1lLCBmYWxzZSk7XG4gIH1cblxuICAvKiogQWxpYXMgZm9yIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoKS4gKi9cbiAgcHVibGljIG9mZihcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLXVudXNlZC12YXJzXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby11bnVzZWQtdmFyc1xuICAgIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb24sXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBiYW4tdHMtY29tbWVudFxuICAgIC8vIEB0cy1pZ25vcmVcbiAgKTogdGhpcyB7XG4gICAgLy8gVGhlIGJvZHkgb2YgdGhpcyBtZXRob2QgaXMgZW1wdHkgYmVjYXVzZSBpdCB3aWxsIGJlIG92ZXJ3cml0dGVuIGJ5IGxhdGVyIGNvZGUuIChgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO2ApXG4gICAgLy8gVGhlIHB1cnBvc2Ugb2YgdGhpcyBkaXJ0eSBoYWNrIGlzIHRvIGdldCBhcm91bmQgdGhlIGN1cnJlbnQgbGltaXRhdGlvbiBvZiBUeXBlU2NyaXB0IHR5cGUgY2hlY2tpbmcuXG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgbGlzdGVuZXIgZnVuY3Rpb24gdG8gdGhlIGVuZCBvZiB0aGUgbGlzdGVuZXJzIGFycmF5IGZvciB0aGUgZXZlbnRcbiAgICogIG5hbWVkIGV2ZW50TmFtZS4gTm8gY2hlY2tzIGFyZSBtYWRlIHRvIHNlZSBpZiB0aGUgbGlzdGVuZXIgaGFzIGFscmVhZHlcbiAgICogYmVlbiBhZGRlZC4gTXVsdGlwbGUgY2FsbHMgcGFzc2luZyB0aGUgc2FtZSBjb21iaW5hdGlvbiBvZiBldmVudE5hbWUgYW5kXG4gICAqIGxpc3RlbmVyIHdpbGwgcmVzdWx0IGluIHRoZSBsaXN0ZW5lciBiZWluZyBhZGRlZCwgYW5kIGNhbGxlZCwgbXVsdGlwbGVcbiAgICogdGltZXMuXG4gICAqL1xuICBwdWJsaWMgb24oXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby11bnVzZWQtdmFyc1xuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tdW51c2VkLXZhcnNcbiAgICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uIHwgV3JhcHBlZEZ1bmN0aW9uLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgYmFuLXRzLWNvbW1lbnRcbiAgICAvLyBAdHMtaWdub3JlXG4gICk6IHRoaXMge1xuICAgIC8vIFRoZSBib2R5IG9mIHRoaXMgbWV0aG9kIGlzIGVtcHR5IGJlY2F1c2UgaXQgd2lsbCBiZSBvdmVyd3JpdHRlbiBieSBsYXRlciBjb2RlLiAoYEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO2ApXG4gICAgLy8gVGhlIHB1cnBvc2Ugb2YgdGhpcyBkaXJ0eSBoYWNrIGlzIHRvIGdldCBhcm91bmQgdGhlIGN1cnJlbnQgbGltaXRhdGlvbiBvZiBUeXBlU2NyaXB0IHR5cGUgY2hlY2tpbmcuXG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIG9uZS10aW1lIGxpc3RlbmVyIGZ1bmN0aW9uIGZvciB0aGUgZXZlbnQgbmFtZWQgZXZlbnROYW1lLiBUaGUgbmV4dFxuICAgKiB0aW1lIGV2ZW50TmFtZSBpcyB0cmlnZ2VyZWQsIHRoaXMgbGlzdGVuZXIgaXMgcmVtb3ZlZCBhbmQgdGhlbiBpbnZva2VkLlxuICAgKi9cbiAgcHVibGljIG9uY2UoZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb24pOiB0aGlzIHtcbiAgICBjb25zdCB3cmFwcGVkOiBXcmFwcGVkRnVuY3Rpb24gPSBvbmNlV3JhcCh0aGlzLCBldmVudE5hbWUsIGxpc3RlbmVyKTtcbiAgICB0aGlzLm9uKGV2ZW50TmFtZSwgd3JhcHBlZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyB0aGUgbGlzdGVuZXIgZnVuY3Rpb24gdG8gdGhlIGJlZ2lubmluZyBvZiB0aGUgbGlzdGVuZXJzIGFycmF5IGZvciB0aGVcbiAgICogIGV2ZW50IG5hbWVkIGV2ZW50TmFtZS4gTm8gY2hlY2tzIGFyZSBtYWRlIHRvIHNlZSBpZiB0aGUgbGlzdGVuZXIgaGFzXG4gICAqIGFscmVhZHkgYmVlbiBhZGRlZC4gTXVsdGlwbGUgY2FsbHMgcGFzc2luZyB0aGUgc2FtZSBjb21iaW5hdGlvbiBvZlxuICAgKiBldmVudE5hbWUgYW5kIGxpc3RlbmVyIHdpbGwgcmVzdWx0IGluIHRoZSBsaXN0ZW5lciBiZWluZyBhZGRlZCwgYW5kXG4gICAqIGNhbGxlZCwgbXVsdGlwbGUgdGltZXMuXG4gICAqL1xuICBwdWJsaWMgcHJlcGVuZExpc3RlbmVyKFxuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICAgIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24sXG4gICk6IHRoaXMge1xuICAgIHJldHVybiBFdmVudEVtaXR0ZXIuI2FkZExpc3RlbmVyKHRoaXMsIGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBvbmUtdGltZSBsaXN0ZW5lciBmdW5jdGlvbiBmb3IgdGhlIGV2ZW50IG5hbWVkIGV2ZW50TmFtZSB0byB0aGVcbiAgICogYmVnaW5uaW5nIG9mIHRoZSBsaXN0ZW5lcnMgYXJyYXkuIFRoZSBuZXh0IHRpbWUgZXZlbnROYW1lIGlzIHRyaWdnZXJlZCxcbiAgICogdGhpcyBsaXN0ZW5lciBpcyByZW1vdmVkLCBhbmQgdGhlbiBpbnZva2VkLlxuICAgKi9cbiAgcHVibGljIHByZXBlbmRPbmNlTGlzdGVuZXIoXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbixcbiAgKTogdGhpcyB7XG4gICAgY29uc3Qgd3JhcHBlZDogV3JhcHBlZEZ1bmN0aW9uID0gb25jZVdyYXAodGhpcywgZXZlbnROYW1lLCBsaXN0ZW5lcik7XG4gICAgdGhpcy5wcmVwZW5kTGlzdGVuZXIoZXZlbnROYW1lLCB3cmFwcGVkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBSZW1vdmVzIGFsbCBsaXN0ZW5lcnMsIG9yIHRob3NlIG9mIHRoZSBzcGVjaWZpZWQgZXZlbnROYW1lLiAqL1xuICBwdWJsaWMgcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50TmFtZT86IHN0cmluZyB8IHN5bWJvbCk6IHRoaXMge1xuICAgIGlmICh0aGlzLl9ldmVudHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKGV2ZW50TmFtZSkge1xuICAgICAgaWYgKGhhc0xpc3RlbmVycyh0aGlzLl9ldmVudHMsIGV2ZW50TmFtZSkpIHtcbiAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gZW5zdXJlQXJyYXkodGhpcy5fZXZlbnRzW2V2ZW50TmFtZV0pLnNsaWNlKClcbiAgICAgICAgICAucmV2ZXJzZSgpO1xuICAgICAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoXG4gICAgICAgICAgICBldmVudE5hbWUsXG4gICAgICAgICAgICB1bndyYXBMaXN0ZW5lcihsaXN0ZW5lciksXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBldmVudExpc3QgPSB0aGlzLmV2ZW50TmFtZXMoKTtcbiAgICAgIGV2ZW50TGlzdC5mb3JFYWNoKChldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnROYW1lID09PSBcInJlbW92ZUxpc3RlbmVyXCIpIHJldHVybjtcbiAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnROYW1lKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJyZW1vdmVMaXN0ZW5lclwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIHRoZSBzcGVjaWZpZWQgbGlzdGVuZXIgZnJvbSB0aGUgbGlzdGVuZXIgYXJyYXkgZm9yIHRoZSBldmVudFxuICAgKiBuYW1lZCBldmVudE5hbWUuXG4gICAqL1xuICBwdWJsaWMgcmVtb3ZlTGlzdGVuZXIoXG4gICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gICAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbixcbiAgKTogdGhpcyB7XG4gICAgY2hlY2tMaXN0ZW5lckFyZ3VtZW50KGxpc3RlbmVyKTtcbiAgICBpZiAoaGFzTGlzdGVuZXJzKHRoaXMuX2V2ZW50cywgZXZlbnROYW1lKSkge1xuICAgICAgY29uc3QgbWF5YmVBcnIgPSB0aGlzLl9ldmVudHNbZXZlbnROYW1lXTtcblxuICAgICAgYXNzZXJ0KG1heWJlQXJyKTtcbiAgICAgIGNvbnN0IGFyciA9IGVuc3VyZUFycmF5KG1heWJlQXJyKTtcblxuICAgICAgbGV0IGxpc3RlbmVySW5kZXggPSAtMTtcbiAgICAgIGZvciAobGV0IGkgPSBhcnIubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgLy8gYXJyW2ldW1wibGlzdGVuZXJcIl0gaXMgdGhlIHJlZmVyZW5jZSB0byB0aGUgbGlzdGVuZXIgaW5zaWRlIGEgYm91bmQgJ29uY2UnIHdyYXBwZXJcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGFycltpXSA9PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChhcnJbaV0gJiYgKGFycltpXSBhcyBXcmFwcGVkRnVuY3Rpb24pW1wibGlzdGVuZXJcIl0gPT0gbGlzdGVuZXIpXG4gICAgICAgICkge1xuICAgICAgICAgIGxpc3RlbmVySW5kZXggPSBpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChsaXN0ZW5lckluZGV4ID49IDApIHtcbiAgICAgICAgYXJyLnNwbGljZShsaXN0ZW5lckluZGV4LCAxKTtcbiAgICAgICAgaWYgKGFyci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICAgIH0gZWxzZSBpZiAoYXJyLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG9ubHkgb25lIGxpc3RlbmVyLCBhbiBhcnJheSBpcyBub3QgbmVjZXNzYXJ5LlxuICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudE5hbWVdID0gYXJyWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgICAgICAgIHRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsIGV2ZW50TmFtZSwgbGlzdGVuZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzXG4gICAqIGFyZSBhZGRlZCBmb3IgYSBwYXJ0aWN1bGFyIGV2ZW50LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgdGhhdCBoZWxwc1xuICAgKiBmaW5kaW5nIG1lbW9yeSBsZWFrcy4gT2J2aW91c2x5LCBub3QgYWxsIGV2ZW50cyBzaG91bGQgYmUgbGltaXRlZCB0byBqdXN0XG4gICAqIDEwIGxpc3RlbmVycy4gVGhlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgbWV0aG9kIGFsbG93cyB0aGUgbGltaXQgdG8gYmVcbiAgICogbW9kaWZpZWQgZm9yIHRoaXMgc3BlY2lmaWMgRXZlbnRFbWl0dGVyIGluc3RhbmNlLiBUaGUgdmFsdWUgY2FuIGJlIHNldCB0b1xuICAgKiBJbmZpbml0eSAob3IgMCkgdG8gaW5kaWNhdGUgYW4gdW5saW1pdGVkIG51bWJlciBvZiBsaXN0ZW5lcnMuXG4gICAqL1xuICBwdWJsaWMgc2V0TWF4TGlzdGVuZXJzKG46IG51bWJlcik6IHRoaXMge1xuICAgIGlmIChuICE9PSBJbmZpbml0eSkge1xuICAgICAgdmFsaWRhdGVNYXhMaXN0ZW5lcnMobiwgXCJuXCIpO1xuICAgIH1cblxuICAgIHRoaXMubWF4TGlzdGVuZXJzID0gbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgUHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aGVuIHRoZSBFdmVudEVtaXR0ZXIgZW1pdHMgdGhlIGdpdmVuXG4gICAqIGV2ZW50IG9yIHRoYXQgaXMgcmVqZWN0ZWQgd2hlbiB0aGUgRXZlbnRFbWl0dGVyIGVtaXRzICdlcnJvcicuIFRoZSBQcm9taXNlXG4gICAqIHdpbGwgcmVzb2x2ZSB3aXRoIGFuIGFycmF5IG9mIGFsbCB0aGUgYXJndW1lbnRzIGVtaXR0ZWQgdG8gdGhlIGdpdmVuIGV2ZW50LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBvbmNlKFxuICAgIGVtaXR0ZXI6IEV2ZW50RW1pdHRlciB8IEV2ZW50VGFyZ2V0LFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICApOiBQcm9taXNlPGFueVtdPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGlmIChlbWl0dGVyIGluc3RhbmNlb2YgRXZlbnRUYXJnZXQpIHtcbiAgICAgICAgLy8gRXZlbnRUYXJnZXQgZG9lcyBub3QgaGF2ZSBgZXJyb3JgIGV2ZW50IHNlbWFudGljcyBsaWtlIE5vZGVcbiAgICAgICAgLy8gRXZlbnRFbWl0dGVycywgd2UgZG8gbm90IGxpc3RlbiB0byBgZXJyb3JgIGV2ZW50cyBoZXJlLlxuICAgICAgICBlbWl0dGVyLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShhcmdzKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIHsgb25jZTogdHJ1ZSwgcGFzc2l2ZTogZmFsc2UsIGNhcHR1cmU6IGZhbHNlIH0sXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSBpZiAoZW1pdHRlciBpbnN0YW5jZW9mIEV2ZW50RW1pdHRlcikge1xuICAgICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgICBjb25zdCBldmVudExpc3RlbmVyID0gKC4uLmFyZ3M6IGFueVtdKTogdm9pZCA9PiB7XG4gICAgICAgICAgaWYgKGVycm9yTGlzdGVuZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcihcImVycm9yXCIsIGVycm9yTGlzdGVuZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgICB9O1xuICAgICAgICBsZXQgZXJyb3JMaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uO1xuXG4gICAgICAgIC8vIEFkZGluZyBhbiBlcnJvciBsaXN0ZW5lciBpcyBub3Qgb3B0aW9uYWwgYmVjYXVzZVxuICAgICAgICAvLyBpZiBhbiBlcnJvciBpcyB0aHJvd24gb24gYW4gZXZlbnQgZW1pdHRlciB3ZSBjYW5ub3RcbiAgICAgICAgLy8gZ3VhcmFudGVlIHRoYXQgdGhlIGFjdHVhbCBldmVudCB3ZSBhcmUgd2FpdGluZyB3aWxsXG4gICAgICAgIC8vIGJlIGZpcmVkLiBUaGUgcmVzdWx0IGNvdWxkIGJlIGEgc2lsZW50IHdheSB0byBjcmVhdGVcbiAgICAgICAgLy8gbWVtb3J5IG9yIGZpbGUgZGVzY3JpcHRvciBsZWFrcywgd2hpY2ggaXMgc29tZXRoaW5nXG4gICAgICAgIC8vIHdlIHNob3VsZCBhdm9pZC5cbiAgICAgICAgaWYgKG5hbWUgIT09IFwiZXJyb3JcIikge1xuICAgICAgICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgICAgICAgZXJyb3JMaXN0ZW5lciA9IChlcnI6IGFueSk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5yZW1vdmVMaXN0ZW5lcihuYW1lLCBldmVudExpc3RlbmVyKTtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBlbWl0dGVyLm9uY2UoXCJlcnJvclwiLCBlcnJvckxpc3RlbmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVtaXR0ZXIub25jZShuYW1lLCBldmVudExpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQXN5bmNJdGVyYXRvciB0aGF0IGl0ZXJhdGVzIGV2ZW50TmFtZSBldmVudHMuIEl0IHdpbGwgdGhyb3cgaWZcbiAgICogdGhlIEV2ZW50RW1pdHRlciBlbWl0cyAnZXJyb3InLiBJdCByZW1vdmVzIGFsbCBsaXN0ZW5lcnMgd2hlbiBleGl0aW5nIHRoZVxuICAgKiBsb29wLiBUaGUgdmFsdWUgcmV0dXJuZWQgYnkgZWFjaCBpdGVyYXRpb24gaXMgYW4gYXJyYXkgY29tcG9zZWQgb2YgdGhlXG4gICAqIGVtaXR0ZWQgZXZlbnQgYXJndW1lbnRzLlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBvbihcbiAgICBlbWl0dGVyOiBFdmVudEVtaXR0ZXIsXG4gICAgZXZlbnQ6IHN0cmluZyB8IHN5bWJvbCxcbiAgKTogQXN5bmNJdGVyYWJsZSB7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCB1bmNvbnN1bWVkRXZlbnRWYWx1ZXM6IGFueVtdID0gW107XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCB1bmNvbnN1bWVkUHJvbWlzZXM6IGFueVtdID0gW107XG4gICAgbGV0IGVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xuICAgIGxldCBmaW5pc2hlZCA9IGZhbHNlO1xuXG4gICAgY29uc3QgaXRlcmF0b3IgPSB7XG4gICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgbmV4dCgpOiBQcm9taXNlPEl0ZXJhdG9yUmVzdWx0PGFueT4+IHtcbiAgICAgICAgLy8gRmlyc3QsIHdlIGNvbnN1bWUgYWxsIHVucmVhZCBldmVudHNcbiAgICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgICAgY29uc3QgdmFsdWU6IGFueSA9IHVuY29uc3VtZWRFdmVudFZhbHVlcy5zaGlmdCgpO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNyZWF0ZUl0ZXJSZXN1bHQodmFsdWUsIGZhbHNlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVuIHdlIGVycm9yLCBpZiBhbiBlcnJvciBoYXBwZW5lZFxuICAgICAgICAvLyBUaGlzIGhhcHBlbnMgb25lIHRpbWUgaWYgYXQgYWxsLCBiZWNhdXNlIGFmdGVyICdlcnJvcidcbiAgICAgICAgLy8gd2Ugc3RvcCBsaXN0ZW5pbmdcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc3QgcDogUHJvbWlzZTxuZXZlcj4gPSBQcm9taXNlLnJlamVjdChlcnJvcik7XG4gICAgICAgICAgLy8gT25seSB0aGUgZmlyc3QgZWxlbWVudCBlcnJvcnNcbiAgICAgICAgICBlcnJvciA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB0aGUgaXRlcmF0b3IgaXMgZmluaXNoZWQsIHJlc29sdmUgdG8gZG9uZVxuICAgICAgICBpZiAoZmluaXNoZWQpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNyZWF0ZUl0ZXJSZXN1bHQodW5kZWZpbmVkLCB0cnVlKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXYWl0IHVudGlsIGFuIGV2ZW50IGhhcHBlbnNcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICB1bmNvbnN1bWVkUHJvbWlzZXMucHVzaCh7IHJlc29sdmUsIHJlamVjdCB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuXG4gICAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgICAgcmV0dXJuKCk6IFByb21pc2U8SXRlcmF0b3JSZXN1bHQ8YW55Pj4ge1xuICAgICAgICBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBldmVudEhhbmRsZXIpO1xuICAgICAgICBlbWl0dGVyLnJlbW92ZUxpc3RlbmVyKFwiZXJyb3JcIiwgZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgZmluaXNoZWQgPSB0cnVlO1xuXG4gICAgICAgIGZvciAoY29uc3QgcHJvbWlzZSBvZiB1bmNvbnN1bWVkUHJvbWlzZXMpIHtcbiAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY3JlYXRlSXRlclJlc3VsdCh1bmRlZmluZWQsIHRydWUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoY3JlYXRlSXRlclJlc3VsdCh1bmRlZmluZWQsIHRydWUpKTtcbiAgICAgIH0sXG5cbiAgICAgIHRocm93KGVycjogRXJyb3IpOiB2b2lkIHtcbiAgICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGV2ZW50SGFuZGxlcik7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlTGlzdGVuZXIoXCJlcnJvclwiLCBlcnJvckhhbmRsZXIpO1xuICAgICAgfSxcblxuICAgICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICAgIFtTeW1ib2wuYXN5bmNJdGVyYXRvcl0oKTogYW55IHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuICAgIH07XG5cbiAgICBlbWl0dGVyLm9uKGV2ZW50LCBldmVudEhhbmRsZXIpO1xuICAgIGVtaXR0ZXIub24oXCJlcnJvclwiLCBlcnJvckhhbmRsZXIpO1xuXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xuXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBmdW5jdGlvbiBldmVudEhhbmRsZXIoLi4uYXJnczogYW55W10pOiB2b2lkIHtcbiAgICAgIGNvbnN0IHByb21pc2UgPSB1bmNvbnN1bWVkUHJvbWlzZXMuc2hpZnQoKTtcbiAgICAgIGlmIChwcm9taXNlKSB7XG4gICAgICAgIHByb21pc2UucmVzb2x2ZShjcmVhdGVJdGVyUmVzdWx0KGFyZ3MsIGZhbHNlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1bmNvbnN1bWVkRXZlbnRWYWx1ZXMucHVzaChhcmdzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGZ1bmN0aW9uIGVycm9ySGFuZGxlcihlcnI6IGFueSk6IHZvaWQge1xuICAgICAgZmluaXNoZWQgPSB0cnVlO1xuXG4gICAgICBjb25zdCB0b0Vycm9yID0gdW5jb25zdW1lZFByb21pc2VzLnNoaWZ0KCk7XG4gICAgICBpZiAodG9FcnJvcikge1xuICAgICAgICB0b0Vycm9yLnJlamVjdChlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIG5leHQgdGltZSB3ZSBjYWxsIG5leHQoKVxuICAgICAgICBlcnJvciA9IGVycjtcbiAgICAgIH1cblxuICAgICAgaXRlcmF0b3IucmV0dXJuKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVGhlIGdlbmVyaWMgdHlwZSBoZXJlIGlzIGEgd29ya2Fyb3VuZCBmb3IgYFRTMjMyMiBbRVJST1JdOiBUeXBlICdFdmVudEVtaXR0ZXInIGlzIG5vdCBhc3NpZ25hYmxlIHRvIHR5cGUgJ3RoaXMnLmAgZXJyb3IuXG4gIHN0YXRpYyAjYWRkTGlzdGVuZXI8VCBleHRlbmRzIEV2ZW50RW1pdHRlcj4oXG4gICAgdGFyZ2V0OiBULFxuICAgIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuICAgIGxpc3RlbmVyOiBHZW5lcmljRnVuY3Rpb24gfCBXcmFwcGVkRnVuY3Rpb24sXG4gICAgcHJlcGVuZDogYm9vbGVhbixcbiAgKTogVCB7XG4gICAgY2hlY2tMaXN0ZW5lckFyZ3VtZW50KGxpc3RlbmVyKTtcbiAgICBsZXQgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gICAgaWYgKGV2ZW50cyA9PSBudWxsKSB7XG4gICAgICBFdmVudEVtaXR0ZXIuI2luaXQodGFyZ2V0KTtcbiAgICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICAgIH1cblxuICAgIGlmIChldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgIHRhcmdldC5lbWl0KFwibmV3TGlzdGVuZXJcIiwgZXZlbnROYW1lLCB1bndyYXBMaXN0ZW5lcihsaXN0ZW5lcikpO1xuICAgIH1cblxuICAgIGlmIChoYXNMaXN0ZW5lcnMoZXZlbnRzLCBldmVudE5hbWUpKSB7XG4gICAgICBsZXQgbGlzdGVuZXJzID0gZXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdGVuZXJzKSkge1xuICAgICAgICBsaXN0ZW5lcnMgPSBbbGlzdGVuZXJzXTtcbiAgICAgICAgZXZlbnRzW2V2ZW50TmFtZV0gPSBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChwcmVwZW5kKSB7XG4gICAgICAgIGxpc3RlbmVycy51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50cykge1xuICAgICAgZXZlbnRzW2V2ZW50TmFtZV0gPSBsaXN0ZW5lcjtcbiAgICB9XG5cbiAgICBjb25zdCBtYXggPSBFdmVudEVtaXR0ZXIuI2dldE1heExpc3RlbmVycyh0YXJnZXQpO1xuICAgIGlmIChtYXggPiAwICYmIEV2ZW50RW1pdHRlci4jbGlzdGVuZXJDb3VudCh0YXJnZXQsIGV2ZW50TmFtZSkgPiBtYXgpIHtcbiAgICAgIGNvbnN0IHdhcm5pbmcgPSBuZXcgTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nKHRhcmdldCwgZXZlbnROYW1lKTtcbiAgICAgIEV2ZW50RW1pdHRlci4jd2FybklmTmVlZGVkKHRhcmdldCwgZXZlbnROYW1lLCB3YXJuaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgc3RhdGljICNnZXRNYXhMaXN0ZW5lcnModGFyZ2V0OiBFdmVudEVtaXR0ZXIpOiBudW1iZXIge1xuICAgIHJldHVybiB0YXJnZXQubWF4TGlzdGVuZXJzID09IG51bGxcbiAgICAgID8gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnNcbiAgICAgIDogdGFyZ2V0Lm1heExpc3RlbmVycztcbiAgfVxuXG4gIHN0YXRpYyAjbGlzdGVuZXJDb3VudChcbiAgICB0YXJnZXQ6IEV2ZW50RW1pdHRlcixcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgKTogbnVtYmVyIHtcbiAgICBpZiAoaGFzTGlzdGVuZXJzKHRhcmdldC5fZXZlbnRzLCBldmVudE5hbWUpKSB7XG4gICAgICBjb25zdCBtYXliZUxpc3RlbmVycyA9IHRhcmdldC5fZXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICByZXR1cm4gQXJyYXkuaXNBcnJheShtYXliZUxpc3RlbmVycykgPyBtYXliZUxpc3RlbmVycy5sZW5ndGggOiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgI3dhcm5JZk5lZWRlZChcbiAgICB0YXJnZXQ6IEV2ZW50RW1pdHRlcixcbiAgICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgICB3YXJuaW5nOiBFcnJvcixcbiAgKSB7XG4gICAgY29uc3QgbGlzdGVuZXJzID0gdGFyZ2V0Ll9ldmVudHNbZXZlbnROYW1lXTtcbiAgICBpZiAobGlzdGVuZXJzLndhcm5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsaXN0ZW5lcnMud2FybmVkID0gdHJ1ZTtcbiAgICBjb25zb2xlLndhcm4od2FybmluZyk7XG5cbiAgICAvLyBUT0RPKHVraTAwYSk6IEhlcmUgYXJlIHR3byBwcm9ibGVtczpcbiAgICAvLyAqIElmIGBnbG9iYWwudHNgIGlzIG5vdCBpbXBvcnRlZCwgdGhlbiBgZ2xvYmFsVGhpcy5wcm9jZXNzYCB3aWxsIGJlIHVuZGVmaW5lZC5cbiAgICAvLyAqIEltcG9ydGluZyBgcHJvY2Vzcy50c2AgZnJvbSB0aGlzIGZpbGUgd2lsbCByZXN1bHQgaW4gY2lyY3VsYXIgcmVmZXJlbmNlLlxuICAgIC8vIEFzIGEgd29ya2Fyb3VuZCwgZXhwbGljaXRseSBjaGVjayBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBgZ2xvYmFsVGhpcy5wcm9jZXNzYC5cbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IG1heWJlUHJvY2VzcyA9IChnbG9iYWxUaGlzIGFzIGFueSkucHJvY2VzcztcbiAgICBpZiAobWF5YmVQcm9jZXNzKSB7XG4gICAgICBtYXliZVByb2Nlc3MuZW1pdFdhcm5pbmcod2FybmluZyk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJBcmd1bWVudChsaXN0ZW5lcjogdW5rbm93bik6IHZvaWQge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aHJvdyBuZXcgRVJSX0lOVkFMSURfQVJHX1RZUEUoXCJsaXN0ZW5lclwiLCBcImZ1bmN0aW9uXCIsIGxpc3RlbmVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoYXNMaXN0ZW5lcnMoXG4gIG1heWJlRXZlbnRzOiBFdmVudE1hcCB8IG51bGwgfCB1bmRlZmluZWQsXG4gIGV2ZW50TmFtZTogc3RyaW5nIHwgc3ltYm9sLFxuKTogYm9vbGVhbiB7XG4gIHJldHVybiBtYXliZUV2ZW50cyAhPSBudWxsICYmIEJvb2xlYW4obWF5YmVFdmVudHNbZXZlbnROYW1lXSk7XG59XG5cbmZ1bmN0aW9uIGxpc3RlbmVycyhcbiAgZXZlbnRzOiBFdmVudE1hcCxcbiAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2wsXG4gIHVud3JhcDogYm9vbGVhbixcbik6IEdlbmVyaWNGdW5jdGlvbltdIHtcbiAgaWYgKCFoYXNMaXN0ZW5lcnMoZXZlbnRzLCBldmVudE5hbWUpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgZXZlbnRMaXN0ZW5lcnMgPSBldmVudHNbZXZlbnROYW1lXTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoZXZlbnRMaXN0ZW5lcnMpKSB7XG4gICAgcmV0dXJuIHVud3JhcFxuICAgICAgPyB1bndyYXBMaXN0ZW5lcnMoZXZlbnRMaXN0ZW5lcnMpXG4gICAgICA6IGV2ZW50TGlzdGVuZXJzLnNsaWNlKDApIGFzIEdlbmVyaWNGdW5jdGlvbltdO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXG4gICAgICB1bndyYXAgPyB1bndyYXBMaXN0ZW5lcihldmVudExpc3RlbmVycykgOiBldmVudExpc3RlbmVycyxcbiAgICBdIGFzIEdlbmVyaWNGdW5jdGlvbltdO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVud3JhcExpc3RlbmVycyhcbiAgYXJyOiAoR2VuZXJpY0Z1bmN0aW9uIHwgV3JhcHBlZEZ1bmN0aW9uKVtdLFxuKTogR2VuZXJpY0Z1bmN0aW9uW10ge1xuICBjb25zdCB1bndyYXBwZWRMaXN0ZW5lcnMgPSBuZXcgQXJyYXkoYXJyLmxlbmd0aCkgYXMgR2VuZXJpY0Z1bmN0aW9uW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgdW53cmFwcGVkTGlzdGVuZXJzW2ldID0gdW53cmFwTGlzdGVuZXIoYXJyW2ldKTtcbiAgfVxuICByZXR1cm4gdW53cmFwcGVkTGlzdGVuZXJzO1xufVxuXG5mdW5jdGlvbiB1bndyYXBMaXN0ZW5lcihcbiAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbiB8IFdyYXBwZWRGdW5jdGlvbixcbik6IEdlbmVyaWNGdW5jdGlvbiB7XG4gIHJldHVybiAobGlzdGVuZXIgYXMgV3JhcHBlZEZ1bmN0aW9uKVtcImxpc3RlbmVyXCJdID8/IGxpc3RlbmVyO1xufVxuXG4vLyBXcmFwcGVkIGZ1bmN0aW9uIHRoYXQgY2FsbHMgRXZlbnRFbWl0dGVyLnJlbW92ZUxpc3RlbmVyKGV2ZW50TmFtZSwgc2VsZikgb24gZXhlY3V0aW9uLlxuZnVuY3Rpb24gb25jZVdyYXAoXG4gIHRhcmdldDogRXZlbnRFbWl0dGVyLFxuICBldmVudE5hbWU6IHN0cmluZyB8IHN5bWJvbCxcbiAgbGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbixcbik6IFdyYXBwZWRGdW5jdGlvbiB7XG4gIGNoZWNrTGlzdGVuZXJBcmd1bWVudChsaXN0ZW5lcik7XG4gIGNvbnN0IHdyYXBwZXIgPSBmdW5jdGlvbiAoXG4gICAgdGhpczoge1xuICAgICAgZXZlbnROYW1lOiBzdHJpbmcgfCBzeW1ib2w7XG4gICAgICBsaXN0ZW5lcjogR2VuZXJpY0Z1bmN0aW9uO1xuICAgICAgcmF3TGlzdGVuZXI6IEdlbmVyaWNGdW5jdGlvbiB8IFdyYXBwZWRGdW5jdGlvbjtcbiAgICAgIGNvbnRleHQ6IEV2ZW50RW1pdHRlcjtcbiAgICAgIGlzQ2FsbGVkPzogYm9vbGVhbjtcbiAgICB9LFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgLi4uYXJnczogYW55W11cbiAgKTogdm9pZCB7XG4gICAgLy8gSWYgYGVtaXRgIGlzIGNhbGxlZCBpbiBsaXN0ZW5lcnMsIHRoZSBzYW1lIGxpc3RlbmVyIGNhbiBiZSBjYWxsZWQgbXVsdGlwbGUgdGltZXMuXG4gICAgLy8gVG8gcHJldmVudCB0aGF0LCBjaGVjayB0aGUgZmxhZyBoZXJlLlxuICAgIGlmICh0aGlzLmlzQ2FsbGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY29udGV4dC5yZW1vdmVMaXN0ZW5lcihcbiAgICAgIHRoaXMuZXZlbnROYW1lLFxuICAgICAgdGhpcy5saXN0ZW5lciBhcyBHZW5lcmljRnVuY3Rpb24sXG4gICAgKTtcbiAgICB0aGlzLmlzQ2FsbGVkID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5hcHBseSh0aGlzLmNvbnRleHQsIGFyZ3MpO1xuICB9O1xuICBjb25zdCB3cmFwcGVyQ29udGV4dCA9IHtcbiAgICBldmVudE5hbWU6IGV2ZW50TmFtZSxcbiAgICBsaXN0ZW5lcjogbGlzdGVuZXIsXG4gICAgcmF3TGlzdGVuZXI6ICh3cmFwcGVyIGFzIHVua25vd24pIGFzIFdyYXBwZWRGdW5jdGlvbixcbiAgICBjb250ZXh0OiB0YXJnZXQsXG4gIH07XG4gIGNvbnN0IHdyYXBwZWQgPSAod3JhcHBlci5iaW5kKFxuICAgIHdyYXBwZXJDb250ZXh0LFxuICApIGFzIHVua25vd24pIGFzIFdyYXBwZWRGdW5jdGlvbjtcbiAgd3JhcHBlckNvbnRleHQucmF3TGlzdGVuZXIgPSB3cmFwcGVkO1xuICB3cmFwcGVkLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHJldHVybiB3cmFwcGVkIGFzIFdyYXBwZWRGdW5jdGlvbjtcbn1cblxuLy8gRXZlbnRFbWl0dGVyI29uIHNob3VsZCBwb2ludCB0byB0aGUgc2FtZSBmdW5jdGlvbiBhcyBFdmVudEVtaXR0ZXIjYWRkTGlzdGVuZXIuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcbi8vIEV2ZW50RW1pdHRlciNvZmYgc2hvdWxkIHBvaW50IHRvIHRoZSBzYW1lIGZ1bmN0aW9uIGFzIEV2ZW50RW1pdHRlciNyZW1vdmVMaXN0ZW5lci5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcblxuY2xhc3MgTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nIGV4dGVuZHMgRXJyb3Ige1xuICByZWFkb25seSBjb3VudDogbnVtYmVyO1xuICBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSBlbWl0dGVyOiBFdmVudEVtaXR0ZXIsXG4gICAgcmVhZG9ubHkgdHlwZTogc3RyaW5nIHwgc3ltYm9sLFxuICApIHtcbiAgICBjb25zdCBsaXN0ZW5lckNvdW50ID0gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBcIlBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gXCIgK1xuICAgICAgYCR7bGlzdGVuZXJDb3VudH0gJHtcbiAgICAgICAgdHlwZSA9PSBudWxsID8gXCJudWxsXCIgOiB0eXBlLnRvU3RyaW5nKClcbiAgICAgIH0gbGlzdGVuZXJzIGFkZGVkIHRvIFske2VtaXR0ZXIuY29uc3RydWN0b3IubmFtZX1dLiBgICtcbiAgICAgIFwiIFVzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0XCI7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5jb3VudCA9IGxpc3RlbmVyQ291bnQ7XG4gICAgdGhpcy5uYW1lID0gXCJNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmdcIjtcbiAgfVxufVxuXG5tYWtlTWV0aG9kc0VudW1lcmFibGUoRXZlbnRFbWl0dGVyKTtcblxuZXhwb3J0IGRlZmF1bHQgT2JqZWN0LmFzc2lnbihFdmVudEVtaXR0ZXIsIHsgRXZlbnRFbWl0dGVyLCBzZXRNYXhMaXN0ZW5lcnMgfSk7XG5cbmV4cG9ydCBjb25zdCBjYXB0dXJlUmVqZWN0aW9uU3ltYm9sID0gRXZlbnRFbWl0dGVyLmNhcHR1cmVSZWplY3Rpb25TeW1ib2w7XG5leHBvcnQgY29uc3QgZXJyb3JNb25pdG9yID0gRXZlbnRFbWl0dGVyLmVycm9yTW9uaXRvcjtcbmV4cG9ydCBjb25zdCBsaXN0ZW5lckNvdW50ID0gRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQ7XG5leHBvcnQgY29uc3Qgb24gPSBFdmVudEVtaXR0ZXIub247XG5leHBvcnQgY29uc3Qgb25jZSA9IEV2ZW50RW1pdHRlci5vbmNlO1xuIl19