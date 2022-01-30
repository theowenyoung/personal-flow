import { getSystemErrorName, inspect } from "./util.ts";
import { codeMap, errorMap } from "./internal_binding/uv.ts";
import { assert } from "../_util/assert.ts";
import { fileURLToPath } from "./url.ts";
export { errorMap };
const classRegExp = /^([A-Z][a-z0-9]*)+$/;
const kTypes = [
    "string",
    "function",
    "number",
    "object",
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol",
];
const nodeInternalPrefix = "__node_internal_";
export function hideStackFrames(fn) {
    const hidden = nodeInternalPrefix + fn.name;
    Object.defineProperty(fn, "name", { value: hidden });
    return fn;
}
const captureLargerStackTrace = hideStackFrames(function captureLargerStackTrace(err) {
    Error.captureStackTrace(err);
    return err;
});
export const uvExceptionWithHostPort = hideStackFrames(function uvExceptionWithHostPort(err, syscall, address, port) {
    const { 0: code, 1: uvmsg } = uvErrmapGet(err) || uvUnmappedError;
    const message = `${syscall} ${code}: ${uvmsg}`;
    let details = "";
    if (port && port > 0) {
        details = ` ${address}:${port}`;
    }
    else if (address) {
        details = ` ${address}`;
    }
    const ex = new Error(`${message}${details}`);
    ex.code = code;
    ex.errno = err;
    ex.syscall = syscall;
    ex.address = address;
    if (port) {
        ex.port = port;
    }
    return captureLargerStackTrace(ex);
});
export const errnoException = hideStackFrames(function errnoException(err, syscall, original) {
    const code = getSystemErrorName(err);
    const message = original
        ? `${syscall} ${code} ${original}`
        : `${syscall} ${code}`;
    const ex = new Error(message);
    ex.errno = err;
    ex.code = code;
    ex.syscall = syscall;
    return captureLargerStackTrace(ex);
});
function uvErrmapGet(name) {
    return errorMap.get(name);
}
const uvUnmappedError = ["UNKNOWN", "unknown error"];
export const uvException = hideStackFrames(function uvException(ctx) {
    const { 0: code, 1: uvmsg } = uvErrmapGet(ctx.errno) || uvUnmappedError;
    let message = `${code}: ${ctx.message || uvmsg}, ${ctx.syscall}`;
    let path;
    let dest;
    if (ctx.path) {
        path = ctx.path.toString();
        message += ` '${path}'`;
    }
    if (ctx.dest) {
        dest = ctx.dest.toString();
        message += ` -> '${dest}'`;
    }
    const err = new Error(message);
    for (const prop of Object.keys(ctx)) {
        if (prop === "message" || prop === "path" || prop === "dest") {
            continue;
        }
        err[prop] = ctx[prop];
    }
    err.code = code;
    if (path) {
        err.path = path;
    }
    if (dest) {
        err.dest = dest;
    }
    return captureLargerStackTrace(err);
});
export const exceptionWithHostPort = hideStackFrames(function exceptionWithHostPort(err, syscall, address, port, additional) {
    const code = getSystemErrorName(err);
    let details = "";
    if (port && port > 0) {
        details = ` ${address}:${port}`;
    }
    else if (address) {
        details = ` ${address}`;
    }
    if (additional) {
        details += ` - Local (${additional})`;
    }
    const ex = new Error(`${syscall} ${code}${details}`);
    ex.errno = err;
    ex.code = code;
    ex.syscall = syscall;
    ex.address = address;
    if (port) {
        ex.port = port;
    }
    return captureLargerStackTrace(ex);
});
export const dnsException = hideStackFrames(function (code, syscall, hostname) {
    let errno;
    if (typeof code === "number") {
        errno = code;
        if (code === codeMap.get("EAI_NODATA") ||
            code === codeMap.get("EAI_NONAME")) {
            code = "ENOTFOUND";
        }
        else {
            code = getSystemErrorName(code);
        }
    }
    const message = `${syscall} ${code}${hostname ? ` ${hostname}` : ""}`;
    const ex = new Error(message);
    ex.errno = errno;
    ex.code = code;
    ex.syscall = syscall;
    if (hostname) {
        ex.hostname = hostname;
    }
    return captureLargerStackTrace(ex);
});
export class NodeErrorAbstraction extends Error {
    code;
    constructor(name, code, message) {
        super(message);
        this.code = code;
        this.name = name;
        this.stack = this.stack && `${name} [${this.code}]${this.stack.slice(20)}`;
    }
    toString() {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}
export class NodeError extends NodeErrorAbstraction {
    constructor(code, message) {
        super(Error.prototype.name, code, message);
    }
}
export class NodeSyntaxError extends NodeErrorAbstraction {
    constructor(code, message) {
        super(SyntaxError.prototype.name, code, message);
        Object.setPrototypeOf(this, SyntaxError.prototype);
        this.toString = function () {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class NodeRangeError extends NodeErrorAbstraction {
    constructor(code, message) {
        super(RangeError.prototype.name, code, message);
        Object.setPrototypeOf(this, RangeError.prototype);
        this.toString = function () {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class NodeTypeError extends NodeErrorAbstraction {
    constructor(code, message) {
        super(TypeError.prototype.name, code, message);
        Object.setPrototypeOf(this, TypeError.prototype);
        this.toString = function () {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class NodeURIError extends NodeErrorAbstraction {
    constructor(code, message) {
        super(URIError.prototype.name, code, message);
        Object.setPrototypeOf(this, URIError.prototype);
        this.toString = function () {
            return `${this.name} [${this.code}]: ${this.message}`;
        };
    }
}
export class ERR_INVALID_ARG_TYPE extends NodeTypeError {
    constructor(name, expected, actual) {
        expected = Array.isArray(expected) ? expected : [expected];
        let msg = "The ";
        if (name.endsWith(" argument")) {
            msg += `${name} `;
        }
        else {
            const type = name.includes(".") ? "property" : "argument";
            msg += `"${name}" ${type} `;
        }
        msg += "must be ";
        const types = [];
        const instances = [];
        const other = [];
        for (const value of expected) {
            if (kTypes.includes(value)) {
                types.push(value.toLocaleLowerCase());
            }
            else if (classRegExp.test(value)) {
                instances.push(value);
            }
            else {
                other.push(value);
            }
        }
        if (instances.length > 0) {
            const pos = types.indexOf("object");
            if (pos !== -1) {
                types.splice(pos, 1);
                instances.push("Object");
            }
        }
        if (types.length > 0) {
            if (types.length > 2) {
                const last = types.pop();
                msg += `one of type ${types.join(", ")}, or ${last}`;
            }
            else if (types.length === 2) {
                msg += `one of type ${types[0]} or ${types[1]}`;
            }
            else {
                msg += `of type ${types[0]}`;
            }
            if (instances.length > 0 || other.length > 0) {
                msg += " or ";
            }
        }
        if (instances.length > 0) {
            if (instances.length > 2) {
                const last = instances.pop();
                msg += `an instance of ${instances.join(", ")}, or ${last}`;
            }
            else {
                msg += `an instance of ${instances[0]}`;
                if (instances.length === 2) {
                    msg += ` or ${instances[1]}`;
                }
            }
            if (other.length > 0) {
                msg += " or ";
            }
        }
        if (other.length > 0) {
            if (other.length > 2) {
                const last = other.pop();
                msg += `one of ${other.join(", ")}, or ${last}`;
            }
            else if (other.length === 2) {
                msg += `one of ${other[0]} or ${other[1]}`;
            }
            else {
                if (other[0].toLowerCase() !== other[0]) {
                    msg += "an ";
                }
                msg += `${other[0]}`;
            }
        }
        super("ERR_INVALID_ARG_TYPE", `${msg}.${invalidArgTypeHelper(actual)}`);
    }
}
export class ERR_INVALID_ARG_VALUE extends NodeTypeError {
    constructor(name, value, reason = "is invalid") {
        const type = name.includes(".") ? "property" : "argument";
        const inspected = inspect(value);
        super("ERR_INVALID_ARG_VALUE", `The ${type} '${name}' ${reason}. Received ${inspected}`);
    }
}
function invalidArgTypeHelper(input) {
    if (input == null) {
        return ` Received ${input}`;
    }
    if (typeof input === "function" && input.name) {
        return ` Received function ${input.name}`;
    }
    if (typeof input === "object") {
        if (input.constructor && input.constructor.name) {
            return ` Received an instance of ${input.constructor.name}`;
        }
        return ` Received ${inspect(input, { depth: -1 })}`;
    }
    let inspected = inspect(input, { colors: false });
    if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`;
    }
    return ` Received type ${typeof input} (${inspected})`;
}
export class ERR_OUT_OF_RANGE extends RangeError {
    code = "ERR_OUT_OF_RANGE";
    constructor(str, range, received) {
        super(`The value of "${str}" is out of range. It must be ${range}. Received ${received}`);
        const { name } = this;
        this.name = `${name} [${this.code}]`;
        this.stack;
        this.name = name;
    }
}
export class ERR_AMBIGUOUS_ARGUMENT extends NodeTypeError {
    constructor(x, y) {
        super("ERR_AMBIGUOUS_ARGUMENT", `The "${x}" argument is ambiguous. ${y}`);
    }
}
export class ERR_ARG_NOT_ITERABLE extends NodeTypeError {
    constructor(x) {
        super("ERR_ARG_NOT_ITERABLE", `${x} must be iterable`);
    }
}
export class ERR_ASSERTION extends NodeError {
    constructor(x) {
        super("ERR_ASSERTION", `${x}`);
    }
}
export class ERR_ASYNC_CALLBACK extends NodeTypeError {
    constructor(x) {
        super("ERR_ASYNC_CALLBACK", `${x} must be a function`);
    }
}
export class ERR_ASYNC_TYPE extends NodeTypeError {
    constructor(x) {
        super("ERR_ASYNC_TYPE", `Invalid name for async "type": ${x}`);
    }
}
export class ERR_BROTLI_INVALID_PARAM extends NodeRangeError {
    constructor(x) {
        super("ERR_BROTLI_INVALID_PARAM", `${x} is not a valid Brotli parameter`);
    }
}
export class ERR_BUFFER_OUT_OF_BOUNDS extends NodeRangeError {
    constructor(name) {
        super("ERR_BUFFER_OUT_OF_BOUNDS", name
            ? `"${name}" is outside of buffer bounds`
            : "Attempt to access memory outside buffer bounds");
    }
}
export class ERR_BUFFER_TOO_LARGE extends NodeRangeError {
    constructor(x) {
        super("ERR_BUFFER_TOO_LARGE", `Cannot create a Buffer larger than ${x} bytes`);
    }
}
export class ERR_CANNOT_WATCH_SIGINT extends NodeError {
    constructor() {
        super("ERR_CANNOT_WATCH_SIGINT", "Cannot watch for SIGINT signals");
    }
}
export class ERR_CHILD_CLOSED_BEFORE_REPLY extends NodeError {
    constructor() {
        super("ERR_CHILD_CLOSED_BEFORE_REPLY", "Child closed before reply received");
    }
}
export class ERR_CHILD_PROCESS_IPC_REQUIRED extends NodeError {
    constructor(x) {
        super("ERR_CHILD_PROCESS_IPC_REQUIRED", `Forked processes must have an IPC channel, missing value 'ipc' in ${x}`);
    }
}
export class ERR_CHILD_PROCESS_STDIO_MAXBUFFER extends NodeRangeError {
    constructor(x) {
        super("ERR_CHILD_PROCESS_STDIO_MAXBUFFER", `${x} maxBuffer length exceeded`);
    }
}
export class ERR_CONSOLE_WRITABLE_STREAM extends NodeTypeError {
    constructor(x) {
        super("ERR_CONSOLE_WRITABLE_STREAM", `Console expects a writable stream instance for ${x}`);
    }
}
export class ERR_CONTEXT_NOT_INITIALIZED extends NodeError {
    constructor() {
        super("ERR_CONTEXT_NOT_INITIALIZED", "context used is not initialized");
    }
}
export class ERR_CPU_USAGE extends NodeError {
    constructor(x) {
        super("ERR_CPU_USAGE", `Unable to obtain cpu usage ${x}`);
    }
}
export class ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED extends NodeError {
    constructor() {
        super("ERR_CRYPTO_CUSTOM_ENGINE_NOT_SUPPORTED", "Custom engines not supported by this OpenSSL");
    }
}
export class ERR_CRYPTO_ECDH_INVALID_FORMAT extends NodeTypeError {
    constructor(x) {
        super("ERR_CRYPTO_ECDH_INVALID_FORMAT", `Invalid ECDH format: ${x}`);
    }
}
export class ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY extends NodeError {
    constructor() {
        super("ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY", "Public key is not valid for specified curve");
    }
}
export class ERR_CRYPTO_ENGINE_UNKNOWN extends NodeError {
    constructor(x) {
        super("ERR_CRYPTO_ENGINE_UNKNOWN", `Engine "${x}" was not found`);
    }
}
export class ERR_CRYPTO_FIPS_FORCED extends NodeError {
    constructor() {
        super("ERR_CRYPTO_FIPS_FORCED", "Cannot set FIPS mode, it was forced with --force-fips at startup.");
    }
}
export class ERR_CRYPTO_FIPS_UNAVAILABLE extends NodeError {
    constructor() {
        super("ERR_CRYPTO_FIPS_UNAVAILABLE", "Cannot set FIPS mode in a non-FIPS build.");
    }
}
export class ERR_CRYPTO_HASH_FINALIZED extends NodeError {
    constructor() {
        super("ERR_CRYPTO_HASH_FINALIZED", "Digest already called");
    }
}
export class ERR_CRYPTO_HASH_UPDATE_FAILED extends NodeError {
    constructor() {
        super("ERR_CRYPTO_HASH_UPDATE_FAILED", "Hash update failed");
    }
}
export class ERR_CRYPTO_INCOMPATIBLE_KEY extends NodeError {
    constructor(x, y) {
        super("ERR_CRYPTO_INCOMPATIBLE_KEY", `Incompatible ${x}: ${y}`);
    }
}
export class ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS extends NodeError {
    constructor(x, y) {
        super("ERR_CRYPTO_INCOMPATIBLE_KEY_OPTIONS", `The selected key encoding ${x} ${y}.`);
    }
}
export class ERR_CRYPTO_INVALID_DIGEST extends NodeTypeError {
    constructor(x) {
        super("ERR_CRYPTO_INVALID_DIGEST", `Invalid digest: ${x}`);
    }
}
export class ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE extends NodeTypeError {
    constructor(x, y) {
        super("ERR_CRYPTO_INVALID_KEY_OBJECT_TYPE", `Invalid key object type ${x}, expected ${y}.`);
    }
}
export class ERR_CRYPTO_INVALID_STATE extends NodeError {
    constructor(x) {
        super("ERR_CRYPTO_INVALID_STATE", `Invalid state for operation ${x}`);
    }
}
export class ERR_CRYPTO_PBKDF2_ERROR extends NodeError {
    constructor() {
        super("ERR_CRYPTO_PBKDF2_ERROR", "PBKDF2 error");
    }
}
export class ERR_CRYPTO_SCRYPT_INVALID_PARAMETER extends NodeError {
    constructor() {
        super("ERR_CRYPTO_SCRYPT_INVALID_PARAMETER", "Invalid scrypt parameter");
    }
}
export class ERR_CRYPTO_SCRYPT_NOT_SUPPORTED extends NodeError {
    constructor() {
        super("ERR_CRYPTO_SCRYPT_NOT_SUPPORTED", "Scrypt algorithm not supported");
    }
}
export class ERR_CRYPTO_SIGN_KEY_REQUIRED extends NodeError {
    constructor() {
        super("ERR_CRYPTO_SIGN_KEY_REQUIRED", "No key provided to sign");
    }
}
export class ERR_DIR_CLOSED extends NodeError {
    constructor() {
        super("ERR_DIR_CLOSED", "Directory handle was closed");
    }
}
export class ERR_DIR_CONCURRENT_OPERATION extends NodeError {
    constructor() {
        super("ERR_DIR_CONCURRENT_OPERATION", "Cannot do synchronous work on directory handle with concurrent asynchronous operations");
    }
}
export class ERR_DNS_SET_SERVERS_FAILED extends NodeError {
    constructor(x, y) {
        super("ERR_DNS_SET_SERVERS_FAILED", `c-ares failed to set servers: "${x}" [${y}]`);
    }
}
export class ERR_DOMAIN_CALLBACK_NOT_AVAILABLE extends NodeError {
    constructor() {
        super("ERR_DOMAIN_CALLBACK_NOT_AVAILABLE", "A callback was registered through " +
            "process.setUncaughtExceptionCaptureCallback(), which is mutually " +
            "exclusive with using the `domain` module");
    }
}
export class ERR_DOMAIN_CANNOT_SET_UNCAUGHT_EXCEPTION_CAPTURE extends NodeError {
    constructor() {
        super("ERR_DOMAIN_CANNOT_SET_UNCAUGHT_EXCEPTION_CAPTURE", "The `domain` module is in use, which is mutually exclusive with calling " +
            "process.setUncaughtExceptionCaptureCallback()");
    }
}
export class ERR_ENCODING_INVALID_ENCODED_DATA extends NodeErrorAbstraction {
    errno;
    constructor(encoding, ret) {
        super(TypeError.prototype.name, "ERR_ENCODING_INVALID_ENCODED_DATA", `The encoded data was not valid for encoding ${encoding}`);
        Object.setPrototypeOf(this, TypeError.prototype);
        this.errno = ret;
    }
}
export class ERR_ENCODING_NOT_SUPPORTED extends NodeRangeError {
    constructor(x) {
        super("ERR_ENCODING_NOT_SUPPORTED", `The "${x}" encoding is not supported`);
    }
}
export class ERR_EVAL_ESM_CANNOT_PRINT extends NodeError {
    constructor() {
        super("ERR_EVAL_ESM_CANNOT_PRINT", `--print cannot be used with ESM input`);
    }
}
export class ERR_EVENT_RECURSION extends NodeError {
    constructor(x) {
        super("ERR_EVENT_RECURSION", `The event "${x}" is already being dispatched`);
    }
}
export class ERR_FEATURE_UNAVAILABLE_ON_PLATFORM extends NodeTypeError {
    constructor(x) {
        super("ERR_FEATURE_UNAVAILABLE_ON_PLATFORM", `The feature ${x} is unavailable on the current platform, which is being used to run Node.js`);
    }
}
export class ERR_FS_FILE_TOO_LARGE extends NodeRangeError {
    constructor(x) {
        super("ERR_FS_FILE_TOO_LARGE", `File size (${x}) is greater than 2 GB`);
    }
}
export class ERR_FS_INVALID_SYMLINK_TYPE extends NodeError {
    constructor(x) {
        super("ERR_FS_INVALID_SYMLINK_TYPE", `Symlink type must be one of "dir", "file", or "junction". Received "${x}"`);
    }
}
export class ERR_HTTP2_ALTSVC_INVALID_ORIGIN extends NodeTypeError {
    constructor() {
        super("ERR_HTTP2_ALTSVC_INVALID_ORIGIN", `HTTP/2 ALTSVC frames require a valid origin`);
    }
}
export class ERR_HTTP2_ALTSVC_LENGTH extends NodeTypeError {
    constructor() {
        super("ERR_HTTP2_ALTSVC_LENGTH", `HTTP/2 ALTSVC frames are limited to 16382 bytes`);
    }
}
export class ERR_HTTP2_CONNECT_AUTHORITY extends NodeError {
    constructor() {
        super("ERR_HTTP2_CONNECT_AUTHORITY", `:authority header is required for CONNECT requests`);
    }
}
export class ERR_HTTP2_CONNECT_PATH extends NodeError {
    constructor() {
        super("ERR_HTTP2_CONNECT_PATH", `The :path header is forbidden for CONNECT requests`);
    }
}
export class ERR_HTTP2_CONNECT_SCHEME extends NodeError {
    constructor() {
        super("ERR_HTTP2_CONNECT_SCHEME", `The :scheme header is forbidden for CONNECT requests`);
    }
}
export class ERR_HTTP2_GOAWAY_SESSION extends NodeError {
    constructor() {
        super("ERR_HTTP2_GOAWAY_SESSION", `New streams cannot be created after receiving a GOAWAY`);
    }
}
export class ERR_HTTP2_HEADERS_AFTER_RESPOND extends NodeError {
    constructor() {
        super("ERR_HTTP2_HEADERS_AFTER_RESPOND", `Cannot specify additional headers after response initiated`);
    }
}
export class ERR_HTTP2_HEADERS_SENT extends NodeError {
    constructor() {
        super("ERR_HTTP2_HEADERS_SENT", `Response has already been initiated.`);
    }
}
export class ERR_HTTP2_HEADER_SINGLE_VALUE extends NodeTypeError {
    constructor(x) {
        super("ERR_HTTP2_HEADER_SINGLE_VALUE", `Header field "${x}" must only have a single value`);
    }
}
export class ERR_HTTP2_INFO_STATUS_NOT_ALLOWED extends NodeRangeError {
    constructor() {
        super("ERR_HTTP2_INFO_STATUS_NOT_ALLOWED", `Informational status codes cannot be used`);
    }
}
export class ERR_HTTP2_INVALID_CONNECTION_HEADERS extends NodeTypeError {
    constructor(x) {
        super("ERR_HTTP2_INVALID_CONNECTION_HEADERS", `HTTP/1 Connection specific headers are forbidden: "${x}"`);
    }
}
export class ERR_HTTP2_INVALID_HEADER_VALUE extends NodeTypeError {
    constructor(x, y) {
        super("ERR_HTTP2_INVALID_HEADER_VALUE", `Invalid value "${x}" for header "${y}"`);
    }
}
export class ERR_HTTP2_INVALID_INFO_STATUS extends NodeRangeError {
    constructor(x) {
        super("ERR_HTTP2_INVALID_INFO_STATUS", `Invalid informational status code: ${x}`);
    }
}
export class ERR_HTTP2_INVALID_ORIGIN extends NodeTypeError {
    constructor() {
        super("ERR_HTTP2_INVALID_ORIGIN", `HTTP/2 ORIGIN frames require a valid origin`);
    }
}
export class ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH extends NodeRangeError {
    constructor() {
        super("ERR_HTTP2_INVALID_PACKED_SETTINGS_LENGTH", `Packed settings length must be a multiple of six`);
    }
}
export class ERR_HTTP2_INVALID_PSEUDOHEADER extends NodeTypeError {
    constructor(x) {
        super("ERR_HTTP2_INVALID_PSEUDOHEADER", `"${x}" is an invalid pseudoheader or is used incorrectly`);
    }
}
export class ERR_HTTP2_INVALID_SESSION extends NodeError {
    constructor() {
        super("ERR_HTTP2_INVALID_SESSION", `The session has been destroyed`);
    }
}
export class ERR_HTTP2_INVALID_STREAM extends NodeError {
    constructor() {
        super("ERR_HTTP2_INVALID_STREAM", `The stream has been destroyed`);
    }
}
export class ERR_HTTP2_MAX_PENDING_SETTINGS_ACK extends NodeError {
    constructor() {
        super("ERR_HTTP2_MAX_PENDING_SETTINGS_ACK", `Maximum number of pending settings acknowledgements`);
    }
}
export class ERR_HTTP2_NESTED_PUSH extends NodeError {
    constructor() {
        super("ERR_HTTP2_NESTED_PUSH", `A push stream cannot initiate another push stream.`);
    }
}
export class ERR_HTTP2_NO_SOCKET_MANIPULATION extends NodeError {
    constructor() {
        super("ERR_HTTP2_NO_SOCKET_MANIPULATION", `HTTP/2 sockets should not be directly manipulated (e.g. read and written)`);
    }
}
export class ERR_HTTP2_ORIGIN_LENGTH extends NodeTypeError {
    constructor() {
        super("ERR_HTTP2_ORIGIN_LENGTH", `HTTP/2 ORIGIN frames are limited to 16382 bytes`);
    }
}
export class ERR_HTTP2_OUT_OF_STREAMS extends NodeError {
    constructor() {
        super("ERR_HTTP2_OUT_OF_STREAMS", `No stream ID is available because maximum stream ID has been reached`);
    }
}
export class ERR_HTTP2_PAYLOAD_FORBIDDEN extends NodeError {
    constructor(x) {
        super("ERR_HTTP2_PAYLOAD_FORBIDDEN", `Responses with ${x} status must not have a payload`);
    }
}
export class ERR_HTTP2_PING_CANCEL extends NodeError {
    constructor() {
        super("ERR_HTTP2_PING_CANCEL", `HTTP2 ping cancelled`);
    }
}
export class ERR_HTTP2_PING_LENGTH extends NodeRangeError {
    constructor() {
        super("ERR_HTTP2_PING_LENGTH", `HTTP2 ping payload must be 8 bytes`);
    }
}
export class ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED extends NodeTypeError {
    constructor() {
        super("ERR_HTTP2_PSEUDOHEADER_NOT_ALLOWED", `Cannot set HTTP/2 pseudo-headers`);
    }
}
export class ERR_HTTP2_PUSH_DISABLED extends NodeError {
    constructor() {
        super("ERR_HTTP2_PUSH_DISABLED", `HTTP/2 client has disabled push streams`);
    }
}
export class ERR_HTTP2_SEND_FILE extends NodeError {
    constructor() {
        super("ERR_HTTP2_SEND_FILE", `Directories cannot be sent`);
    }
}
export class ERR_HTTP2_SEND_FILE_NOSEEK extends NodeError {
    constructor() {
        super("ERR_HTTP2_SEND_FILE_NOSEEK", `Offset or length can only be specified for regular files`);
    }
}
export class ERR_HTTP2_SESSION_ERROR extends NodeError {
    constructor(x) {
        super("ERR_HTTP2_SESSION_ERROR", `Session closed with error code ${x}`);
    }
}
export class ERR_HTTP2_SETTINGS_CANCEL extends NodeError {
    constructor() {
        super("ERR_HTTP2_SETTINGS_CANCEL", `HTTP2 session settings canceled`);
    }
}
export class ERR_HTTP2_SOCKET_BOUND extends NodeError {
    constructor() {
        super("ERR_HTTP2_SOCKET_BOUND", `The socket is already bound to an Http2Session`);
    }
}
export class ERR_HTTP2_SOCKET_UNBOUND extends NodeError {
    constructor() {
        super("ERR_HTTP2_SOCKET_UNBOUND", `The socket has been disconnected from the Http2Session`);
    }
}
export class ERR_HTTP2_STATUS_101 extends NodeError {
    constructor() {
        super("ERR_HTTP2_STATUS_101", `HTTP status code 101 (Switching Protocols) is forbidden in HTTP/2`);
    }
}
export class ERR_HTTP2_STATUS_INVALID extends NodeRangeError {
    constructor(x) {
        super("ERR_HTTP2_STATUS_INVALID", `Invalid status code: ${x}`);
    }
}
export class ERR_HTTP2_STREAM_ERROR extends NodeError {
    constructor(x) {
        super("ERR_HTTP2_STREAM_ERROR", `Stream closed with error code ${x}`);
    }
}
export class ERR_HTTP2_STREAM_SELF_DEPENDENCY extends NodeError {
    constructor() {
        super("ERR_HTTP2_STREAM_SELF_DEPENDENCY", `A stream cannot depend on itself`);
    }
}
export class ERR_HTTP2_TRAILERS_ALREADY_SENT extends NodeError {
    constructor() {
        super("ERR_HTTP2_TRAILERS_ALREADY_SENT", `Trailing headers have already been sent`);
    }
}
export class ERR_HTTP2_TRAILERS_NOT_READY extends NodeError {
    constructor() {
        super("ERR_HTTP2_TRAILERS_NOT_READY", `Trailing headers cannot be sent until after the wantTrailers event is emitted`);
    }
}
export class ERR_HTTP2_UNSUPPORTED_PROTOCOL extends NodeError {
    constructor(x) {
        super("ERR_HTTP2_UNSUPPORTED_PROTOCOL", `protocol "${x}" is unsupported.`);
    }
}
export class ERR_HTTP_HEADERS_SENT extends NodeError {
    constructor(x) {
        super("ERR_HTTP_HEADERS_SENT", `Cannot ${x} headers after they are sent to the client`);
    }
}
export class ERR_HTTP_INVALID_HEADER_VALUE extends NodeTypeError {
    constructor(x, y) {
        super("ERR_HTTP_INVALID_HEADER_VALUE", `Invalid value "${x}" for header "${y}"`);
    }
}
export class ERR_HTTP_INVALID_STATUS_CODE extends NodeRangeError {
    constructor(x) {
        super("ERR_HTTP_INVALID_STATUS_CODE", `Invalid status code: ${x}`);
    }
}
export class ERR_HTTP_SOCKET_ENCODING extends NodeError {
    constructor() {
        super("ERR_HTTP_SOCKET_ENCODING", `Changing the socket encoding is not allowed per RFC7230 Section 3.`);
    }
}
export class ERR_HTTP_TRAILER_INVALID extends NodeError {
    constructor() {
        super("ERR_HTTP_TRAILER_INVALID", `Trailers are invalid with this transfer encoding`);
    }
}
export class ERR_INCOMPATIBLE_OPTION_PAIR extends NodeTypeError {
    constructor(x, y) {
        super("ERR_INCOMPATIBLE_OPTION_PAIR", `Option "${x}" cannot be used in combination with option "${y}"`);
    }
}
export class ERR_INPUT_TYPE_NOT_ALLOWED extends NodeError {
    constructor() {
        super("ERR_INPUT_TYPE_NOT_ALLOWED", `--input-type can only be used with string input via --eval, --print, or STDIN`);
    }
}
export class ERR_INSPECTOR_ALREADY_ACTIVATED extends NodeError {
    constructor() {
        super("ERR_INSPECTOR_ALREADY_ACTIVATED", `Inspector is already activated. Close it with inspector.close() before activating it again.`);
    }
}
export class ERR_INSPECTOR_ALREADY_CONNECTED extends NodeError {
    constructor(x) {
        super("ERR_INSPECTOR_ALREADY_CONNECTED", `${x} is already connected`);
    }
}
export class ERR_INSPECTOR_CLOSED extends NodeError {
    constructor() {
        super("ERR_INSPECTOR_CLOSED", `Session was closed`);
    }
}
export class ERR_INSPECTOR_COMMAND extends NodeError {
    constructor(x, y) {
        super("ERR_INSPECTOR_COMMAND", `Inspector error ${x}: ${y}`);
    }
}
export class ERR_INSPECTOR_NOT_ACTIVE extends NodeError {
    constructor() {
        super("ERR_INSPECTOR_NOT_ACTIVE", `Inspector is not active`);
    }
}
export class ERR_INSPECTOR_NOT_AVAILABLE extends NodeError {
    constructor() {
        super("ERR_INSPECTOR_NOT_AVAILABLE", `Inspector is not available`);
    }
}
export class ERR_INSPECTOR_NOT_CONNECTED extends NodeError {
    constructor() {
        super("ERR_INSPECTOR_NOT_CONNECTED", `Session is not connected`);
    }
}
export class ERR_INSPECTOR_NOT_WORKER extends NodeError {
    constructor() {
        super("ERR_INSPECTOR_NOT_WORKER", `Current thread is not a worker`);
    }
}
export class ERR_INVALID_ASYNC_ID extends NodeRangeError {
    constructor(x, y) {
        super("ERR_INVALID_ASYNC_ID", `Invalid ${x} value: ${y}`);
    }
}
export class ERR_INVALID_BUFFER_SIZE extends NodeRangeError {
    constructor(x) {
        super("ERR_INVALID_BUFFER_SIZE", `Buffer size must be a multiple of ${x}`);
    }
}
export class ERR_INVALID_CALLBACK extends NodeTypeError {
    constructor(object) {
        super("ERR_INVALID_CALLBACK", `Callback must be a function. Received ${inspect(object)}`);
    }
}
export class ERR_INVALID_CURSOR_POS extends NodeTypeError {
    constructor() {
        super("ERR_INVALID_CURSOR_POS", `Cannot set cursor row without setting its column`);
    }
}
export class ERR_INVALID_FD extends NodeRangeError {
    constructor(x) {
        super("ERR_INVALID_FD", `"fd" must be a positive integer: ${x}`);
    }
}
export class ERR_INVALID_FD_TYPE extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_FD_TYPE", `Unsupported fd type: ${x}`);
    }
}
export class ERR_INVALID_FILE_URL_HOST extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_FILE_URL_HOST", `File URL host must be "localhost" or empty on ${x}`);
    }
}
export class ERR_INVALID_FILE_URL_PATH extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_FILE_URL_PATH", `File URL path ${x}`);
    }
}
export class ERR_INVALID_HANDLE_TYPE extends NodeTypeError {
    constructor() {
        super("ERR_INVALID_HANDLE_TYPE", `This handle type cannot be sent`);
    }
}
export class ERR_INVALID_HTTP_TOKEN extends NodeTypeError {
    constructor(x, y) {
        super("ERR_INVALID_HTTP_TOKEN", `${x} must be a valid HTTP token ["${y}"]`);
    }
}
export class ERR_INVALID_IP_ADDRESS extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_IP_ADDRESS", `Invalid IP address: ${x}`);
    }
}
export class ERR_INVALID_OPT_VALUE_ENCODING extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_OPT_VALUE_ENCODING", `The value "${x}" is invalid for option "encoding"`);
    }
}
export class ERR_INVALID_PERFORMANCE_MARK extends NodeError {
    constructor(x) {
        super("ERR_INVALID_PERFORMANCE_MARK", `The "${x}" performance mark has not been set`);
    }
}
export class ERR_INVALID_PROTOCOL extends NodeTypeError {
    constructor(x, y) {
        super("ERR_INVALID_PROTOCOL", `Protocol "${x}" not supported. Expected "${y}"`);
    }
}
export class ERR_INVALID_REPL_EVAL_CONFIG extends NodeTypeError {
    constructor() {
        super("ERR_INVALID_REPL_EVAL_CONFIG", `Cannot specify both "breakEvalOnSigint" and "eval" for REPL`);
    }
}
export class ERR_INVALID_REPL_INPUT extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_REPL_INPUT", `${x}`);
    }
}
export class ERR_INVALID_SYNC_FORK_INPUT extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_SYNC_FORK_INPUT", `Asynchronous forks do not support Buffer, TypedArray, DataView or string input: ${x}`);
    }
}
export class ERR_INVALID_THIS extends NodeTypeError {
    constructor(x) {
        super("ERR_INVALID_THIS", `Value of "this" must be of type ${x}`);
    }
}
export class ERR_INVALID_TUPLE extends NodeTypeError {
    constructor(x, y) {
        super("ERR_INVALID_TUPLE", `${x} must be an iterable ${y} tuple`);
    }
}
export class ERR_INVALID_URI extends NodeURIError {
    constructor() {
        super("ERR_INVALID_URI", `URI malformed`);
    }
}
export class ERR_IPC_CHANNEL_CLOSED extends NodeError {
    constructor() {
        super("ERR_IPC_CHANNEL_CLOSED", `Channel closed`);
    }
}
export class ERR_IPC_DISCONNECTED extends NodeError {
    constructor() {
        super("ERR_IPC_DISCONNECTED", `IPC channel is already disconnected`);
    }
}
export class ERR_IPC_ONE_PIPE extends NodeError {
    constructor() {
        super("ERR_IPC_ONE_PIPE", `Child process can have only one IPC pipe`);
    }
}
export class ERR_IPC_SYNC_FORK extends NodeError {
    constructor() {
        super("ERR_IPC_SYNC_FORK", `IPC cannot be used with synchronous forks`);
    }
}
export class ERR_MANIFEST_DEPENDENCY_MISSING extends NodeError {
    constructor(x, y) {
        super("ERR_MANIFEST_DEPENDENCY_MISSING", `Manifest resource ${x} does not list ${y} as a dependency specifier`);
    }
}
export class ERR_MANIFEST_INTEGRITY_MISMATCH extends NodeSyntaxError {
    constructor(x) {
        super("ERR_MANIFEST_INTEGRITY_MISMATCH", `Manifest resource ${x} has multiple entries but integrity lists do not match`);
    }
}
export class ERR_MANIFEST_INVALID_RESOURCE_FIELD extends NodeTypeError {
    constructor(x, y) {
        super("ERR_MANIFEST_INVALID_RESOURCE_FIELD", `Manifest resource ${x} has invalid property value for ${y}`);
    }
}
export class ERR_MANIFEST_TDZ extends NodeError {
    constructor() {
        super("ERR_MANIFEST_TDZ", `Manifest initialization has not yet run`);
    }
}
export class ERR_MANIFEST_UNKNOWN_ONERROR extends NodeSyntaxError {
    constructor(x) {
        super("ERR_MANIFEST_UNKNOWN_ONERROR", `Manifest specified unknown error behavior "${x}".`);
    }
}
export class ERR_METHOD_NOT_IMPLEMENTED extends NodeError {
    constructor(x) {
        super("ERR_METHOD_NOT_IMPLEMENTED", `The ${x} method is not implemented`);
    }
}
export class ERR_MISSING_ARGS extends NodeTypeError {
    constructor(...args) {
        let msg = "The ";
        const len = args.length;
        const wrap = (a) => `"${a}"`;
        args = args.map((a) => (Array.isArray(a) ? a.map(wrap).join(" or ") : wrap(a)));
        switch (len) {
            case 1:
                msg += `${args[0]} argument`;
                break;
            case 2:
                msg += `${args[0]} and ${args[1]} arguments`;
                break;
            default:
                msg += args.slice(0, len - 1).join(", ");
                msg += `, and ${args[len - 1]} arguments`;
                break;
        }
        super("ERR_MISSING_ARGS", `${msg} must be specified`);
    }
}
export class ERR_MISSING_OPTION extends NodeTypeError {
    constructor(x) {
        super("ERR_MISSING_OPTION", `${x} is required`);
    }
}
export class ERR_MULTIPLE_CALLBACK extends NodeError {
    constructor() {
        super("ERR_MULTIPLE_CALLBACK", `Callback called multiple times`);
    }
}
export class ERR_NAPI_CONS_FUNCTION extends NodeTypeError {
    constructor() {
        super("ERR_NAPI_CONS_FUNCTION", `Constructor must be a function`);
    }
}
export class ERR_NAPI_INVALID_DATAVIEW_ARGS extends NodeRangeError {
    constructor() {
        super("ERR_NAPI_INVALID_DATAVIEW_ARGS", `byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in`);
    }
}
export class ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT extends NodeRangeError {
    constructor(x, y) {
        super("ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT", `start offset of ${x} should be a multiple of ${y}`);
    }
}
export class ERR_NAPI_INVALID_TYPEDARRAY_LENGTH extends NodeRangeError {
    constructor() {
        super("ERR_NAPI_INVALID_TYPEDARRAY_LENGTH", `Invalid typed array length`);
    }
}
export class ERR_NO_CRYPTO extends NodeError {
    constructor() {
        super("ERR_NO_CRYPTO", `Node.js is not compiled with OpenSSL crypto support`);
    }
}
export class ERR_NO_ICU extends NodeTypeError {
    constructor(x) {
        super("ERR_NO_ICU", `${x} is not supported on Node.js compiled without ICU`);
    }
}
export class ERR_QUICCLIENTSESSION_FAILED extends NodeError {
    constructor(x) {
        super("ERR_QUICCLIENTSESSION_FAILED", `Failed to create a new QuicClientSession: ${x}`);
    }
}
export class ERR_QUICCLIENTSESSION_FAILED_SETSOCKET extends NodeError {
    constructor() {
        super("ERR_QUICCLIENTSESSION_FAILED_SETSOCKET", `Failed to set the QuicSocket`);
    }
}
export class ERR_QUICSESSION_DESTROYED extends NodeError {
    constructor(x) {
        super("ERR_QUICSESSION_DESTROYED", `Cannot call ${x} after a QuicSession has been destroyed`);
    }
}
export class ERR_QUICSESSION_INVALID_DCID extends NodeError {
    constructor(x) {
        super("ERR_QUICSESSION_INVALID_DCID", `Invalid DCID value: ${x}`);
    }
}
export class ERR_QUICSESSION_UPDATEKEY extends NodeError {
    constructor() {
        super("ERR_QUICSESSION_UPDATEKEY", `Unable to update QuicSession keys`);
    }
}
export class ERR_QUICSOCKET_DESTROYED extends NodeError {
    constructor(x) {
        super("ERR_QUICSOCKET_DESTROYED", `Cannot call ${x} after a QuicSocket has been destroyed`);
    }
}
export class ERR_QUICSOCKET_INVALID_STATELESS_RESET_SECRET_LENGTH extends NodeError {
    constructor() {
        super("ERR_QUICSOCKET_INVALID_STATELESS_RESET_SECRET_LENGTH", `The stateResetToken must be exactly 16-bytes in length`);
    }
}
export class ERR_QUICSOCKET_LISTENING extends NodeError {
    constructor() {
        super("ERR_QUICSOCKET_LISTENING", `This QuicSocket is already listening`);
    }
}
export class ERR_QUICSOCKET_UNBOUND extends NodeError {
    constructor(x) {
        super("ERR_QUICSOCKET_UNBOUND", `Cannot call ${x} before a QuicSocket has been bound`);
    }
}
export class ERR_QUICSTREAM_DESTROYED extends NodeError {
    constructor(x) {
        super("ERR_QUICSTREAM_DESTROYED", `Cannot call ${x} after a QuicStream has been destroyed`);
    }
}
export class ERR_QUICSTREAM_INVALID_PUSH extends NodeError {
    constructor() {
        super("ERR_QUICSTREAM_INVALID_PUSH", `Push streams are only supported on client-initiated, bidirectional streams`);
    }
}
export class ERR_QUICSTREAM_OPEN_FAILED extends NodeError {
    constructor() {
        super("ERR_QUICSTREAM_OPEN_FAILED", `Opening a new QuicStream failed`);
    }
}
export class ERR_QUICSTREAM_UNSUPPORTED_PUSH extends NodeError {
    constructor() {
        super("ERR_QUICSTREAM_UNSUPPORTED_PUSH", `Push streams are not supported on this QuicSession`);
    }
}
export class ERR_QUIC_TLS13_REQUIRED extends NodeError {
    constructor() {
        super("ERR_QUIC_TLS13_REQUIRED", `QUIC requires TLS version 1.3`);
    }
}
export class ERR_SCRIPT_EXECUTION_INTERRUPTED extends NodeError {
    constructor() {
        super("ERR_SCRIPT_EXECUTION_INTERRUPTED", "Script execution was interrupted by `SIGINT`");
    }
}
export class ERR_SERVER_ALREADY_LISTEN extends NodeError {
    constructor() {
        super("ERR_SERVER_ALREADY_LISTEN", `Listen method has been called more than once without closing.`);
    }
}
export class ERR_SERVER_NOT_RUNNING extends NodeError {
    constructor() {
        super("ERR_SERVER_NOT_RUNNING", `Server is not running.`);
    }
}
export class ERR_SOCKET_ALREADY_BOUND extends NodeError {
    constructor() {
        super("ERR_SOCKET_ALREADY_BOUND", `Socket is already bound`);
    }
}
export class ERR_SOCKET_BAD_BUFFER_SIZE extends NodeTypeError {
    constructor() {
        super("ERR_SOCKET_BAD_BUFFER_SIZE", `Buffer size must be a positive integer`);
    }
}
export class ERR_SOCKET_BAD_PORT extends NodeRangeError {
    constructor(name, port, allowZero = true) {
        assert(typeof allowZero === "boolean", "The 'allowZero' argument must be of type boolean.");
        const operator = allowZero ? ">=" : ">";
        super("ERR_SOCKET_BAD_PORT", `${name} should be ${operator} 0 and < 65536. Received ${port}.`);
    }
}
export class ERR_SOCKET_BAD_TYPE extends NodeTypeError {
    constructor() {
        super("ERR_SOCKET_BAD_TYPE", `Bad socket type specified. Valid types are: udp4, udp6`);
    }
}
export class ERR_SOCKET_CLOSED extends NodeError {
    constructor() {
        super("ERR_SOCKET_CLOSED", `Socket is closed`);
    }
}
export class ERR_SOCKET_DGRAM_IS_CONNECTED extends NodeError {
    constructor() {
        super("ERR_SOCKET_DGRAM_IS_CONNECTED", `Already connected`);
    }
}
export class ERR_SOCKET_DGRAM_NOT_CONNECTED extends NodeError {
    constructor() {
        super("ERR_SOCKET_DGRAM_NOT_CONNECTED", `Not connected`);
    }
}
export class ERR_SOCKET_DGRAM_NOT_RUNNING extends NodeError {
    constructor() {
        super("ERR_SOCKET_DGRAM_NOT_RUNNING", `Not running`);
    }
}
export class ERR_SRI_PARSE extends NodeSyntaxError {
    constructor(name, char, position) {
        super("ERR_SRI_PARSE", `Subresource Integrity string ${name} had an unexpected ${char} at position ${position}`);
    }
}
export class ERR_STREAM_ALREADY_FINISHED extends NodeError {
    constructor(x) {
        super("ERR_STREAM_ALREADY_FINISHED", `Cannot call ${x} after a stream was finished`);
    }
}
export class ERR_STREAM_CANNOT_PIPE extends NodeError {
    constructor() {
        super("ERR_STREAM_CANNOT_PIPE", `Cannot pipe, not readable`);
    }
}
export class ERR_STREAM_DESTROYED extends NodeError {
    constructor(x) {
        super("ERR_STREAM_DESTROYED", `Cannot call ${x} after a stream was destroyed`);
    }
}
export class ERR_STREAM_NULL_VALUES extends NodeTypeError {
    constructor() {
        super("ERR_STREAM_NULL_VALUES", `May not write null values to stream`);
    }
}
export class ERR_STREAM_PREMATURE_CLOSE extends NodeError {
    constructor() {
        super("ERR_STREAM_PREMATURE_CLOSE", `Premature close`);
    }
}
export class ERR_STREAM_PUSH_AFTER_EOF extends NodeError {
    constructor() {
        super("ERR_STREAM_PUSH_AFTER_EOF", `stream.push() after EOF`);
    }
}
export class ERR_STREAM_UNSHIFT_AFTER_END_EVENT extends NodeError {
    constructor() {
        super("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", `stream.unshift() after end event`);
    }
}
export class ERR_STREAM_WRAP extends NodeError {
    constructor() {
        super("ERR_STREAM_WRAP", `Stream has StringDecoder set or is in objectMode`);
    }
}
export class ERR_STREAM_WRITE_AFTER_END extends NodeError {
    constructor() {
        super("ERR_STREAM_WRITE_AFTER_END", `write after end`);
    }
}
export class ERR_SYNTHETIC extends NodeError {
    constructor() {
        super("ERR_SYNTHETIC", `JavaScript Callstack`);
    }
}
export class ERR_TLS_DH_PARAM_SIZE extends NodeError {
    constructor(x) {
        super("ERR_TLS_DH_PARAM_SIZE", `DH parameter size ${x} is less than 2048`);
    }
}
export class ERR_TLS_HANDSHAKE_TIMEOUT extends NodeError {
    constructor() {
        super("ERR_TLS_HANDSHAKE_TIMEOUT", `TLS handshake timeout`);
    }
}
export class ERR_TLS_INVALID_CONTEXT extends NodeTypeError {
    constructor(x) {
        super("ERR_TLS_INVALID_CONTEXT", `${x} must be a SecureContext`);
    }
}
export class ERR_TLS_INVALID_STATE extends NodeError {
    constructor() {
        super("ERR_TLS_INVALID_STATE", `TLS socket connection must be securely established`);
    }
}
export class ERR_TLS_INVALID_PROTOCOL_VERSION extends NodeTypeError {
    constructor(protocol, x) {
        super("ERR_TLS_INVALID_PROTOCOL_VERSION", `${protocol} is not a valid ${x} TLS protocol version`);
    }
}
export class ERR_TLS_PROTOCOL_VERSION_CONFLICT extends NodeTypeError {
    constructor(prevProtocol, protocol) {
        super("ERR_TLS_PROTOCOL_VERSION_CONFLICT", `TLS protocol version ${prevProtocol} conflicts with secureProtocol ${protocol}`);
    }
}
export class ERR_TLS_RENEGOTIATION_DISABLED extends NodeError {
    constructor() {
        super("ERR_TLS_RENEGOTIATION_DISABLED", `TLS session renegotiation disabled for this socket`);
    }
}
export class ERR_TLS_REQUIRED_SERVER_NAME extends NodeError {
    constructor() {
        super("ERR_TLS_REQUIRED_SERVER_NAME", `"servername" is required parameter for Server.addContext`);
    }
}
export class ERR_TLS_SESSION_ATTACK extends NodeError {
    constructor() {
        super("ERR_TLS_SESSION_ATTACK", `TLS session renegotiation attack detected`);
    }
}
export class ERR_TLS_SNI_FROM_SERVER extends NodeError {
    constructor() {
        super("ERR_TLS_SNI_FROM_SERVER", `Cannot issue SNI from a TLS server-side socket`);
    }
}
export class ERR_TRACE_EVENTS_CATEGORY_REQUIRED extends NodeTypeError {
    constructor() {
        super("ERR_TRACE_EVENTS_CATEGORY_REQUIRED", `At least one category is required`);
    }
}
export class ERR_TRACE_EVENTS_UNAVAILABLE extends NodeError {
    constructor() {
        super("ERR_TRACE_EVENTS_UNAVAILABLE", `Trace events are unavailable`);
    }
}
export class ERR_UNAVAILABLE_DURING_EXIT extends NodeError {
    constructor() {
        super("ERR_UNAVAILABLE_DURING_EXIT", `Cannot call function in process exit handler`);
    }
}
export class ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET extends NodeError {
    constructor() {
        super("ERR_UNCAUGHT_EXCEPTION_CAPTURE_ALREADY_SET", "`process.setupUncaughtExceptionCapture()` was called while a capture callback was already active");
    }
}
export class ERR_UNESCAPED_CHARACTERS extends NodeTypeError {
    constructor(x) {
        super("ERR_UNESCAPED_CHARACTERS", `${x} contains unescaped characters`);
    }
}
export class ERR_UNHANDLED_ERROR extends NodeError {
    constructor(x) {
        super("ERR_UNHANDLED_ERROR", `Unhandled error. (${x})`);
    }
}
export class ERR_UNKNOWN_BUILTIN_MODULE extends NodeError {
    constructor(x) {
        super("ERR_UNKNOWN_BUILTIN_MODULE", `No such built-in module: ${x}`);
    }
}
export class ERR_UNKNOWN_CREDENTIAL extends NodeError {
    constructor(x, y) {
        super("ERR_UNKNOWN_CREDENTIAL", `${x} identifier does not exist: ${y}`);
    }
}
export class ERR_UNKNOWN_ENCODING extends NodeTypeError {
    constructor(x) {
        super("ERR_UNKNOWN_ENCODING", `Unknown encoding: ${x}`);
    }
}
export class ERR_UNKNOWN_FILE_EXTENSION extends NodeTypeError {
    constructor(x, y) {
        super("ERR_UNKNOWN_FILE_EXTENSION", `Unknown file extension "${x}" for ${y}`);
    }
}
export class ERR_UNKNOWN_MODULE_FORMAT extends NodeRangeError {
    constructor(x) {
        super("ERR_UNKNOWN_MODULE_FORMAT", `Unknown module format: ${x}`);
    }
}
export class ERR_UNKNOWN_SIGNAL extends NodeTypeError {
    constructor(x) {
        super("ERR_UNKNOWN_SIGNAL", `Unknown signal: ${x}`);
    }
}
export class ERR_UNSUPPORTED_DIR_IMPORT extends NodeError {
    constructor(x, y) {
        super("ERR_UNSUPPORTED_DIR_IMPORT", `Directory import '${x}' is not supported resolving ES modules, imported from ${y}`);
    }
}
export class ERR_UNSUPPORTED_ESM_URL_SCHEME extends NodeError {
    constructor() {
        super("ERR_UNSUPPORTED_ESM_URL_SCHEME", `Only file and data URLs are supported by the default ESM loader`);
    }
}
export class ERR_V8BREAKITERATOR extends NodeError {
    constructor() {
        super("ERR_V8BREAKITERATOR", `Full ICU data not installed. See https://github.com/nodejs/node/wiki/Intl`);
    }
}
export class ERR_VALID_PERFORMANCE_ENTRY_TYPE extends NodeError {
    constructor() {
        super("ERR_VALID_PERFORMANCE_ENTRY_TYPE", `At least one valid performance entry type is required`);
    }
}
export class ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING extends NodeTypeError {
    constructor() {
        super("ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING", `A dynamic import callback was not specified.`);
    }
}
export class ERR_VM_MODULE_ALREADY_LINKED extends NodeError {
    constructor() {
        super("ERR_VM_MODULE_ALREADY_LINKED", `Module has already been linked`);
    }
}
export class ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA extends NodeError {
    constructor() {
        super("ERR_VM_MODULE_CANNOT_CREATE_CACHED_DATA", `Cached data cannot be created for a module which has been evaluated`);
    }
}
export class ERR_VM_MODULE_DIFFERENT_CONTEXT extends NodeError {
    constructor() {
        super("ERR_VM_MODULE_DIFFERENT_CONTEXT", `Linked modules must use the same context`);
    }
}
export class ERR_VM_MODULE_LINKING_ERRORED extends NodeError {
    constructor() {
        super("ERR_VM_MODULE_LINKING_ERRORED", `Linking has already failed for the provided module`);
    }
}
export class ERR_VM_MODULE_NOT_MODULE extends NodeError {
    constructor() {
        super("ERR_VM_MODULE_NOT_MODULE", `Provided module is not an instance of Module`);
    }
}
export class ERR_VM_MODULE_STATUS extends NodeError {
    constructor(x) {
        super("ERR_VM_MODULE_STATUS", `Module status ${x}`);
    }
}
export class ERR_WASI_ALREADY_STARTED extends NodeError {
    constructor() {
        super("ERR_WASI_ALREADY_STARTED", `WASI instance has already started`);
    }
}
export class ERR_WORKER_INIT_FAILED extends NodeError {
    constructor(x) {
        super("ERR_WORKER_INIT_FAILED", `Worker initialization failure: ${x}`);
    }
}
export class ERR_WORKER_NOT_RUNNING extends NodeError {
    constructor() {
        super("ERR_WORKER_NOT_RUNNING", `Worker instance not running`);
    }
}
export class ERR_WORKER_OUT_OF_MEMORY extends NodeError {
    constructor(x) {
        super("ERR_WORKER_OUT_OF_MEMORY", `Worker terminated due to reaching memory limit: ${x}`);
    }
}
export class ERR_WORKER_UNSERIALIZABLE_ERROR extends NodeError {
    constructor() {
        super("ERR_WORKER_UNSERIALIZABLE_ERROR", `Serializing an uncaught exception failed`);
    }
}
export class ERR_WORKER_UNSUPPORTED_EXTENSION extends NodeTypeError {
    constructor(x) {
        super("ERR_WORKER_UNSUPPORTED_EXTENSION", `The worker script extension must be ".js", ".mjs", or ".cjs". Received "${x}"`);
    }
}
export class ERR_WORKER_UNSUPPORTED_OPERATION extends NodeTypeError {
    constructor(x) {
        super("ERR_WORKER_UNSUPPORTED_OPERATION", `${x} is not supported in workers`);
    }
}
export class ERR_ZLIB_INITIALIZATION_FAILED extends NodeError {
    constructor() {
        super("ERR_ZLIB_INITIALIZATION_FAILED", `Initialization failed`);
    }
}
export class ERR_FALSY_VALUE_REJECTION extends NodeError {
    reason;
    constructor(reason) {
        super("ERR_FALSY_VALUE_REJECTION", "Promise was rejected with falsy value");
        this.reason = reason;
    }
}
export class ERR_HTTP2_INVALID_SETTING_VALUE extends NodeRangeError {
    actual;
    min;
    max;
    constructor(name, actual, min, max) {
        super("ERR_HTTP2_INVALID_SETTING_VALUE", `Invalid value for setting "${name}": ${actual}`);
        this.actual = actual;
        if (min !== undefined) {
            this.min = min;
            this.max = max;
        }
    }
}
export class ERR_HTTP2_STREAM_CANCEL extends NodeError {
    cause;
    constructor(error) {
        super("ERR_HTTP2_STREAM_CANCEL", typeof error.message === "string"
            ? `The pending stream has been canceled (caused by: ${error.message})`
            : "The pending stream has been canceled");
        if (error) {
            this.cause = error;
        }
    }
}
export class ERR_INVALID_ADDRESS_FAMILY extends NodeRangeError {
    host;
    port;
    constructor(addressType, host, port) {
        super("ERR_INVALID_ADDRESS_FAMILY", `Invalid address family: ${addressType} ${host}:${port}`);
        this.host = host;
        this.port = port;
    }
}
export class ERR_INVALID_CHAR extends NodeTypeError {
    constructor(name, field) {
        super("ERR_INVALID_CHAR", field
            ? `Invalid character in ${name}`
            : `Invalid character in ${name} ["${field}"]`);
    }
}
export class ERR_INVALID_OPT_VALUE extends NodeTypeError {
    constructor(name, value) {
        super("ERR_INVALID_OPT_VALUE", `The value "${value}" is invalid for option "${name}"`);
    }
}
export class ERR_INVALID_RETURN_PROPERTY extends NodeTypeError {
    constructor(input, name, prop, value) {
        super("ERR_INVALID_RETURN_PROPERTY", `Expected a valid ${input} to be returned for the "${prop}" from the "${name}" function but got ${value}.`);
    }
}
function buildReturnPropertyType(value) {
    if (value && value.constructor && value.constructor.name) {
        return `instance of ${value.constructor.name}`;
    }
    else {
        return `type ${typeof value}`;
    }
}
export class ERR_INVALID_RETURN_PROPERTY_VALUE extends NodeTypeError {
    constructor(input, name, prop, value) {
        super("ERR_INVALID_RETURN_PROPERTY_VALUE", `Expected ${input} to be returned for the "${prop}" from the "${name}" function but got ${buildReturnPropertyType(value)}.`);
    }
}
export class ERR_INVALID_RETURN_VALUE extends NodeTypeError {
    constructor(input, name, value) {
        super("ERR_INVALID_RETURN_VALUE", `Expected ${input} to be returned from the "${name}" function but got ${buildReturnPropertyType(value)}.`);
    }
}
export class ERR_INVALID_URL extends NodeTypeError {
    input;
    constructor(input) {
        super("ERR_INVALID_URL", `Invalid URL: ${input}`);
        this.input = input;
    }
}
export class ERR_INVALID_URL_SCHEME extends NodeTypeError {
    constructor(expected) {
        expected = Array.isArray(expected) ? expected : [expected];
        const res = expected.length === 2
            ? `one of scheme ${expected[0]} or ${expected[1]}`
            : `of scheme ${expected[0]}`;
        super("ERR_INVALID_URL_SCHEME", `The URL must be ${res}`);
    }
}
export class ERR_MODULE_NOT_FOUND extends NodeError {
    constructor(path, base, type = "package") {
        super("ERR_MODULE_NOT_FOUND", `Cannot find ${type} '${path}' imported from ${base}`);
    }
}
export class ERR_INVALID_PACKAGE_CONFIG extends NodeError {
    constructor(path, base, message) {
        const msg = `Invalid package config ${path}${base ? ` while importing ${base}` : ""}${message ? `. ${message}` : ""}`;
        super("ERR_INVALID_PACKAGE_CONFIG", msg);
    }
}
export class ERR_INVALID_MODULE_SPECIFIER extends NodeTypeError {
    constructor(request, reason, base) {
        super("ERR_INVALID_MODULE_SPECIFIER", `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`);
    }
}
export class ERR_INVALID_PACKAGE_TARGET extends NodeError {
    constructor(pkgPath, key, target, isImport, base) {
        let msg;
        const relError = typeof target === "string" && !isImport &&
            target.length && !target.startsWith("./");
        if (key === ".") {
            assert(isImport === false);
            msg = `Invalid "exports" main target ${JSON.stringify(target)} defined ` +
                `in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ""}${relError ? '; targets must start with "./"' : ""}`;
        }
        else {
            msg = `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(target)} defined for '${key}' in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ""}${relError ? '; targets must start with "./"' : ""}`;
        }
        super("ERR_INVALID_PACKAGE_TARGET", msg);
    }
}
export class ERR_PACKAGE_IMPORT_NOT_DEFINED extends NodeTypeError {
    constructor(specifier, packageJSONUrl, base) {
        const packagePath = packageJSONUrl &&
            fileURLToPath(new URL(".", packageJSONUrl));
        const msg = `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ""} imported from ${fileURLToPath(base)}`;
        super("ERR_PACKAGE_IMPORT_NOT_DEFINED", msg);
    }
}
export class ERR_PACKAGE_PATH_NOT_EXPORTED extends NodeError {
    constructor(subpath, packageJSONUrl, base) {
        const pkgPath = fileURLToPath(new URL(".", packageJSONUrl));
        const basePath = base && fileURLToPath(base);
        let msg;
        if (subpath === ".") {
            msg = `No "exports" main defined in ${pkgPath}package.json${basePath ? ` imported from ${basePath}` : ""}`;
        }
        else {
            msg =
                `Package subpath '${subpath}' is not defined by "exports" in ${pkgPath}package.json${basePath ? ` imported from ${basePath}` : ""}`;
        }
        super("ERR_PACKAGE_PATH_NOT_EXPORTED", msg);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX2Vycm9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIl9lcnJvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZUEsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRXpDLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUtwQixNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQztBQU0xQyxNQUFNLE1BQU0sR0FBRztJQUNiLFFBQVE7SUFDUixVQUFVO0lBQ1YsUUFBUTtJQUNSLFFBQVE7SUFFUixVQUFVO0lBQ1YsUUFBUTtJQUNSLFNBQVM7SUFDVCxRQUFRO0lBQ1IsUUFBUTtDQUNULENBQUM7QUFFRixNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO0FBTTlDLE1BQU0sVUFBVSxlQUFlLENBQUMsRUFBbUI7SUFHakQsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztJQUM1QyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUVyRCxPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFFRCxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FDN0MsU0FBUyx1QkFBdUIsQ0FBQyxHQUFHO0lBRWxDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUU3QixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FDRixDQUFDO0FBb0JGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FDcEQsU0FBUyx1QkFBdUIsQ0FDOUIsR0FBVyxFQUNYLE9BQWUsRUFDZixPQUFlLEVBQ2YsSUFBYTtJQUViLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDO0lBQ2xFLE1BQU0sT0FBTyxHQUFHLEdBQUcsT0FBTyxJQUFJLElBQUksS0FBSyxLQUFLLEVBQUUsQ0FBQztJQUMvQyxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFFakIsSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRTtRQUNwQixPQUFPLEdBQUcsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFLENBQUM7S0FDakM7U0FBTSxJQUFJLE9BQU8sRUFBRTtRQUNsQixPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztLQUN6QjtJQUdELE1BQU0sRUFBRSxHQUFRLElBQUksS0FBSyxDQUFDLEdBQUcsT0FBTyxHQUFHLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDbEQsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDZixFQUFFLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUNmLEVBQUUsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBQ3JCLEVBQUUsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBRXJCLElBQUksSUFBSSxFQUFFO1FBQ1IsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7S0FDaEI7SUFFRCxPQUFPLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FDRixDQUFDO0FBVUYsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGVBQWUsQ0FDM0MsU0FBUyxjQUFjLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRO0lBQzVDLE1BQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sT0FBTyxHQUFHLFFBQVE7UUFDdEIsQ0FBQyxDQUFDLEdBQUcsT0FBTyxJQUFJLElBQUksSUFBSSxRQUFRLEVBQUU7UUFDbEMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDO0lBR3pCLE1BQU0sRUFBRSxHQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLEVBQUUsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO0lBQ2YsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDZixFQUFFLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUVyQixPQUFPLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FDRixDQUFDO0FBRUYsU0FBUyxXQUFXLENBQUMsSUFBWTtJQUMvQixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUIsQ0FBQztBQUVELE1BQU0sZUFBZSxHQUFHLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBV3JELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsU0FBUyxXQUFXLENBQUMsR0FBRztJQUNqRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxlQUFlLENBQUM7SUFFeEUsSUFBSSxPQUFPLEdBQUcsR0FBRyxJQUFJLEtBQUssR0FBRyxDQUFDLE9BQU8sSUFBSSxLQUFLLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpFLElBQUksSUFBSSxDQUFDO0lBQ1QsSUFBSSxJQUFJLENBQUM7SUFFVCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUU7UUFDWixJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQixPQUFPLElBQUksS0FBSyxJQUFJLEdBQUcsQ0FBQztLQUN6QjtJQUNELElBQUksR0FBRyxDQUFDLElBQUksRUFBRTtRQUNaLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzNCLE9BQU8sSUFBSSxRQUFRLElBQUksR0FBRyxDQUFDO0tBQzVCO0lBR0QsTUFBTSxHQUFHLEdBQVEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFcEMsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ25DLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUU7WUFDNUQsU0FBUztTQUNWO1FBRUQsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN2QjtJQUVELEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBRWhCLElBQUksSUFBSSxFQUFFO1FBQ1IsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7S0FDakI7SUFFRCxJQUFJLElBQUksRUFBRTtRQUNSLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0tBQ2pCO0lBRUQsT0FBTyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQztBQVlILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FDbEQsU0FBUyxxQkFBcUIsQ0FDNUIsR0FBVyxFQUNYLE9BQWUsRUFDZixPQUFlLEVBQ2YsSUFBWSxFQUNaLFVBQWtCO0lBRWxCLE1BQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JDLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUVqQixJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO1FBQ3BCLE9BQU8sR0FBRyxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQztLQUNqQztTQUFNLElBQUksT0FBTyxFQUFFO1FBQ2xCLE9BQU8sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO0tBQ3pCO0lBRUQsSUFBSSxVQUFVLEVBQUU7UUFDZCxPQUFPLElBQUksYUFBYSxVQUFVLEdBQUcsQ0FBQztLQUN2QztJQUdELE1BQU0sRUFBRSxHQUFRLElBQUksS0FBSyxDQUFDLEdBQUcsT0FBTyxJQUFJLElBQUksR0FBRyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzFELEVBQUUsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO0lBQ2YsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDZixFQUFFLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUNyQixFQUFFLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUVyQixJQUFJLElBQUksRUFBRTtRQUNSLEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0tBQ2hCO0lBRUQsT0FBTyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQ0YsQ0FBQztBQU9GLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsVUFBVSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVE7SUFDM0UsSUFBSSxLQUFLLENBQUM7SUFJVixJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtRQUM1QixLQUFLLEdBQUcsSUFBSSxDQUFDO1FBR2IsSUFDRSxJQUFJLEtBQUssT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFDbEMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQ2xDO1lBQ0EsSUFBSSxHQUFHLFdBQVcsQ0FBQztTQUNwQjthQUFNO1lBQ0wsSUFBSSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pDO0tBQ0Y7SUFFRCxNQUFNLE9BQU8sR0FBRyxHQUFHLE9BQU8sSUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUd0RSxNQUFNLEVBQUUsR0FBUSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNuQyxFQUFFLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNqQixFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNmLEVBQUUsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBRXJCLElBQUksUUFBUSxFQUFFO1FBQ1osRUFBRSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7S0FDeEI7SUFFRCxPQUFPLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDO0FBTUgsTUFBTSxPQUFPLG9CQUFxQixTQUFRLEtBQUs7SUFDN0MsSUFBSSxDQUFTO0lBRWIsWUFBWSxJQUFZLEVBQUUsSUFBWSxFQUFFLE9BQWU7UUFDckQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFHakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUM3RSxDQUFDO0lBRUQsUUFBUTtRQUNOLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3hELENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxTQUFVLFNBQVEsb0JBQW9CO0lBQ2pELFlBQVksSUFBWSxFQUFFLE9BQWU7UUFDdkMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3QyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxvQkFBb0I7SUFFdkQsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN2QyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsUUFBUSxHQUFHO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGNBQWUsU0FBUSxvQkFBb0I7SUFDdEQsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN2QyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsUUFBUSxHQUFHO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGFBQWMsU0FBUSxvQkFBb0I7SUFDckQsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN2QyxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsUUFBUSxHQUFHO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSxvQkFBb0I7SUFDcEQsWUFBWSxJQUFZLEVBQUUsT0FBZTtRQUN2QyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLENBQUMsUUFBUSxHQUFHO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGFBQWE7SUFDckQsWUFBWSxJQUFZLEVBQUUsUUFBMkIsRUFBRSxNQUFlO1FBRXBFLFFBQVEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0QsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDO1FBQ2pCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRTtZQUU5QixHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQztTQUNuQjthQUFNO1lBQ0wsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7WUFDMUQsR0FBRyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksR0FBRyxDQUFDO1NBQzdCO1FBQ0QsR0FBRyxJQUFJLFVBQVUsQ0FBQztRQUVsQixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNqQixLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRTtZQUM1QixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQzFCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQzthQUN2QztpQkFBTSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2xDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDdkI7aUJBQU07Z0JBQ0wsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNuQjtTQUNGO1FBSUQsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN4QixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNkLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzFCO1NBQ0Y7UUFFRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3BCLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDekIsR0FBRyxJQUFJLGVBQWUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQzthQUN0RDtpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUM3QixHQUFHLElBQUksZUFBZSxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDakQ7aUJBQU07Z0JBQ0wsR0FBRyxJQUFJLFdBQVcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDOUI7WUFDRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM1QyxHQUFHLElBQUksTUFBTSxDQUFDO2FBQ2Y7U0FDRjtRQUVELElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDeEIsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDeEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUM3QixHQUFHLElBQUksa0JBQWtCLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7YUFDN0Q7aUJBQU07Z0JBQ0wsR0FBRyxJQUFJLGtCQUFrQixTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtvQkFDMUIsR0FBRyxJQUFJLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7aUJBQzlCO2FBQ0Y7WUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUNwQixHQUFHLElBQUksTUFBTSxDQUFDO2FBQ2Y7U0FDRjtRQUVELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEIsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDcEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUN6QixHQUFHLElBQUksVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO2FBQ2pEO2lCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzdCLEdBQUcsSUFBSSxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUM1QztpQkFBTTtnQkFDTCxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3ZDLEdBQUcsSUFBSSxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDdEI7U0FDRjtRQUVELEtBQUssQ0FDSCxzQkFBc0IsRUFDdEIsR0FBRyxHQUFHLElBQUksb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FDekMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxhQUFhO0lBQ3RELFlBQVksSUFBWSxFQUFFLEtBQWMsRUFBRSxTQUFpQixZQUFZO1FBQ3JFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBQzFELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQyxLQUFLLENBQ0gsdUJBQXVCLEVBQ3ZCLE9BQU8sSUFBSSxLQUFLLElBQUksS0FBSyxNQUFNLGNBQWMsU0FBUyxFQUFFLENBQ3pELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFJRCxTQUFTLG9CQUFvQixDQUFDLEtBQVU7SUFDdEMsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1FBQ2pCLE9BQU8sYUFBYSxLQUFLLEVBQUUsQ0FBQztLQUM3QjtJQUNELElBQUksT0FBTyxLQUFLLEtBQUssVUFBVSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7UUFDN0MsT0FBTyxzQkFBc0IsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0tBQzNDO0lBQ0QsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDN0IsSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFO1lBQy9DLE9BQU8sNEJBQTRCLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDN0Q7UUFDRCxPQUFPLGFBQWEsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztLQUNyRDtJQUNELElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNsRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxFQUFFO1FBQ3pCLFNBQVMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUM7S0FDNUM7SUFDRCxPQUFPLGtCQUFrQixPQUFPLEtBQUssS0FBSyxTQUFTLEdBQUcsQ0FBQztBQUN6RCxDQUFDO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFDOUMsSUFBSSxHQUFHLGtCQUFrQixDQUFDO0lBRTFCLFlBQVksR0FBVyxFQUFFLEtBQWEsRUFBRSxRQUFpQjtRQUN2RCxLQUFLLENBQ0gsaUJBQWlCLEdBQUcsaUNBQWlDLEtBQUssY0FBYyxRQUFRLEVBQUUsQ0FDbkYsQ0FBQztRQUVGLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFdEIsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUM7UUFFckMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUVYLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxhQUFhO0lBQ3ZELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUFDLHdCQUF3QixFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsYUFBYTtJQUNyRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3pELENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxhQUFjLFNBQVEsU0FBUztJQUMxQyxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGFBQWE7SUFDbkQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sY0FBZSxTQUFRLGFBQWE7SUFDL0MsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxrQ0FBa0MsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqRSxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsY0FBYztJQUMxRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBQzVFLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxjQUFjO0lBQzFELFlBQVksSUFBYTtRQUN2QixLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLElBQUk7WUFDRixDQUFDLENBQUMsSUFBSSxJQUFJLCtCQUErQjtZQUN6QyxDQUFDLENBQUMsZ0RBQWdELENBQ3JELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsY0FBYztJQUN0RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILHNCQUFzQixFQUN0QixzQ0FBc0MsQ0FBQyxRQUFRLENBQ2hELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsU0FBUztJQUNwRDtRQUNFLEtBQUssQ0FDSCx5QkFBeUIsRUFDekIsaUNBQWlDLENBQ2xDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsU0FBUztJQUMxRDtRQUNFLEtBQUssQ0FDSCwrQkFBK0IsRUFDL0Isb0NBQW9DLENBQ3JDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sOEJBQStCLFNBQVEsU0FBUztJQUMzRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILGdDQUFnQyxFQUNoQyxxRUFBcUUsQ0FBQyxFQUFFLENBQ3pFLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8saUNBQWtDLFNBQVEsY0FBYztJQUNuRSxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILG1DQUFtQyxFQUNuQyxHQUFHLENBQUMsNEJBQTRCLENBQ2pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsYUFBYTtJQUM1RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDZCQUE2QixFQUM3QixrREFBa0QsQ0FBQyxFQUFFLENBQ3RELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsU0FBUztJQUN4RDtRQUNFLEtBQUssQ0FDSCw2QkFBNkIsRUFDN0IsaUNBQWlDLENBQ2xDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sYUFBYyxTQUFRLFNBQVM7SUFDMUMsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxlQUFlLEVBQ2YsOEJBQThCLENBQUMsRUFBRSxDQUNsQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHNDQUF1QyxTQUFRLFNBQVM7SUFDbkU7UUFDRSxLQUFLLENBQ0gsd0NBQXdDLEVBQ3hDLDhDQUE4QyxDQUMvQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLDhCQUErQixTQUFRLGFBQWE7SUFDL0QsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxnQ0FBZ0MsRUFDaEMsd0JBQXdCLENBQUMsRUFBRSxDQUM1QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGtDQUFtQyxTQUFRLFNBQVM7SUFDL0Q7UUFDRSxLQUFLLENBQ0gsb0NBQW9DLEVBQ3BDLDZDQUE2QyxDQUM5QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFNBQVM7SUFDdEQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCwyQkFBMkIsRUFDM0IsV0FBVyxDQUFDLGlCQUFpQixDQUM5QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFNBQVM7SUFDbkQ7UUFDRSxLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLG1FQUFtRSxDQUNwRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFNBQVM7SUFDeEQ7UUFDRSxLQUFLLENBQ0gsNkJBQTZCLEVBQzdCLDJDQUEyQyxDQUM1QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFNBQVM7SUFDdEQ7UUFDRSxLQUFLLENBQ0gsMkJBQTJCLEVBQzNCLHVCQUF1QixDQUN4QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFNBQVM7SUFDMUQ7UUFDRSxLQUFLLENBQ0gsK0JBQStCLEVBQy9CLG9CQUFvQixDQUNyQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFNBQVM7SUFDeEQsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQ0gsNkJBQTZCLEVBQzdCLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQzFCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sbUNBQW9DLFNBQVEsU0FBUztJQUNoRSxZQUFZLENBQVMsRUFBRSxDQUFTO1FBQzlCLEtBQUssQ0FDSCxxQ0FBcUMsRUFDckMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FDdkMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxhQUFhO0lBQzFELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsMkJBQTJCLEVBQzNCLG1CQUFtQixDQUFDLEVBQUUsQ0FDdkIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxrQ0FBbUMsU0FBUSxhQUFhO0lBQ25FLFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILG9DQUFvQyxFQUNwQywyQkFBMkIsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUMvQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFNBQVM7SUFDckQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsK0JBQStCLENBQUMsRUFBRSxDQUNuQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFNBQVM7SUFDcEQ7UUFDRSxLQUFLLENBQ0gseUJBQXlCLEVBQ3pCLGNBQWMsQ0FDZixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLG1DQUFvQyxTQUFRLFNBQVM7SUFDaEU7UUFDRSxLQUFLLENBQ0gscUNBQXFDLEVBQ3JDLDBCQUEwQixDQUMzQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLCtCQUFnQyxTQUFRLFNBQVM7SUFDNUQ7UUFDRSxLQUFLLENBQ0gsaUNBQWlDLEVBQ2pDLGdDQUFnQyxDQUNqQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFNBQVM7SUFDekQ7UUFDRSxLQUFLLENBQ0gsOEJBQThCLEVBQzlCLHlCQUF5QixDQUMxQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGNBQWUsU0FBUSxTQUFTO0lBQzNDO1FBQ0UsS0FBSyxDQUNILGdCQUFnQixFQUNoQiw2QkFBNkIsQ0FDOUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxTQUFTO0lBQ3pEO1FBQ0UsS0FBSyxDQUNILDhCQUE4QixFQUM5Qix3RkFBd0YsQ0FDekYsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILDRCQUE0QixFQUM1QixrQ0FBa0MsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUM5QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLFNBQVM7SUFDOUQ7UUFDRSxLQUFLLENBQ0gsbUNBQW1DLEVBQ25DLG9DQUFvQztZQUNsQyxtRUFBbUU7WUFDbkUsMENBQTBDLENBQzdDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sZ0RBQ1gsU0FBUSxTQUFTO0lBQ2pCO1FBQ0UsS0FBSyxDQUNILGtEQUFrRCxFQUNsRCwwRUFBMEU7WUFDeEUsK0NBQStDLENBQ2xELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8saUNBQWtDLFNBQVEsb0JBQW9CO0lBRXpFLEtBQUssQ0FBUztJQUNkLFlBQVksUUFBZ0IsRUFBRSxHQUFXO1FBQ3ZDLEtBQUssQ0FDSCxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFDeEIsbUNBQW1DLEVBQ25DLCtDQUErQyxRQUFRLEVBQUUsQ0FDMUQsQ0FBQztRQUNGLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQztJQUNuQixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsY0FBYztJQUM1RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDRCQUE0QixFQUM1QixRQUFRLENBQUMsNkJBQTZCLENBQ3ZDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsU0FBUztJQUN0RDtRQUNFLEtBQUssQ0FDSCwyQkFBMkIsRUFDM0IsdUNBQXVDLENBQ3hDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsU0FBUztJQUNoRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILHFCQUFxQixFQUNyQixjQUFjLENBQUMsK0JBQStCLENBQy9DLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sbUNBQW9DLFNBQVEsYUFBYTtJQUNwRSxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILHFDQUFxQyxFQUNyQyxlQUFlLENBQUMsNkVBQTZFLENBQzlGLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsY0FBYztJQUN2RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILHVCQUF1QixFQUN2QixjQUFjLENBQUMsd0JBQXdCLENBQ3hDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsU0FBUztJQUN4RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDZCQUE2QixFQUM3Qix1RUFBdUUsQ0FBQyxHQUFHLENBQzVFLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsYUFBYTtJQUNoRTtRQUNFLEtBQUssQ0FDSCxpQ0FBaUMsRUFDakMsNkNBQTZDLENBQzlDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsYUFBYTtJQUN4RDtRQUNFLEtBQUssQ0FDSCx5QkFBeUIsRUFDekIsaURBQWlELENBQ2xELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsU0FBUztJQUN4RDtRQUNFLEtBQUssQ0FDSCw2QkFBNkIsRUFDN0Isb0RBQW9ELENBQ3JELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsU0FBUztJQUNuRDtRQUNFLEtBQUssQ0FDSCx3QkFBd0IsRUFDeEIsb0RBQW9ELENBQ3JELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsc0RBQXNELENBQ3ZELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsd0RBQXdELENBQ3pELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsU0FBUztJQUM1RDtRQUNFLEtBQUssQ0FDSCxpQ0FBaUMsRUFDakMsNERBQTRELENBQzdELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsU0FBUztJQUNuRDtRQUNFLEtBQUssQ0FDSCx3QkFBd0IsRUFDeEIsc0NBQXNDLENBQ3ZDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsYUFBYTtJQUM5RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILCtCQUErQixFQUMvQixpQkFBaUIsQ0FBQyxpQ0FBaUMsQ0FDcEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxjQUFjO0lBQ25FO1FBQ0UsS0FBSyxDQUNILG1DQUFtQyxFQUNuQywyQ0FBMkMsQ0FDNUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxvQ0FBcUMsU0FBUSxhQUFhO0lBQ3JFLFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsc0NBQXNDLEVBQ3RDLHNEQUFzRCxDQUFDLEdBQUcsQ0FDM0QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxhQUFhO0lBQy9ELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILGdDQUFnQyxFQUNoQyxrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ3pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsY0FBYztJQUMvRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILCtCQUErQixFQUMvQixzQ0FBc0MsQ0FBQyxFQUFFLENBQzFDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsYUFBYTtJQUN6RDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsNkNBQTZDLENBQzlDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0NBQXlDLFNBQVEsY0FBYztJQUMxRTtRQUNFLEtBQUssQ0FDSCwwQ0FBMEMsRUFDMUMsa0RBQWtELENBQ25ELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sOEJBQStCLFNBQVEsYUFBYTtJQUMvRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILGdDQUFnQyxFQUNoQyxJQUFJLENBQUMscURBQXFELENBQzNELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsU0FBUztJQUN0RDtRQUNFLEtBQUssQ0FDSCwyQkFBMkIsRUFDM0IsZ0NBQWdDLENBQ2pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsK0JBQStCLENBQ2hDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sa0NBQW1DLFNBQVEsU0FBUztJQUMvRDtRQUNFLEtBQUssQ0FDSCxvQ0FBb0MsRUFDcEMscURBQXFELENBQ3RELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsU0FBUztJQUNsRDtRQUNFLEtBQUssQ0FDSCx1QkFBdUIsRUFDdkIsb0RBQW9ELENBQ3JELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsU0FBUztJQUM3RDtRQUNFLEtBQUssQ0FDSCxrQ0FBa0MsRUFDbEMsMkVBQTJFLENBQzVFLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsYUFBYTtJQUN4RDtRQUNFLEtBQUssQ0FDSCx5QkFBeUIsRUFDekIsaURBQWlELENBQ2xELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsc0VBQXNFLENBQ3ZFLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsU0FBUztJQUN4RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDZCQUE2QixFQUM3QixrQkFBa0IsQ0FBQyxpQ0FBaUMsQ0FDckQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxTQUFTO0lBQ2xEO1FBQ0UsS0FBSyxDQUNILHVCQUF1QixFQUN2QixzQkFBc0IsQ0FDdkIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxjQUFjO0lBQ3ZEO1FBQ0UsS0FBSyxDQUNILHVCQUF1QixFQUN2QixvQ0FBb0MsQ0FDckMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxrQ0FBbUMsU0FBUSxhQUFhO0lBQ25FO1FBQ0UsS0FBSyxDQUNILG9DQUFvQyxFQUNwQyxrQ0FBa0MsQ0FDbkMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxTQUFTO0lBQ3BEO1FBQ0UsS0FBSyxDQUNILHlCQUF5QixFQUN6Qix5Q0FBeUMsQ0FDMUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxTQUFTO0lBQ2hEO1FBQ0UsS0FBSyxDQUNILHFCQUFxQixFQUNyQiw0QkFBNEIsQ0FDN0IsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZEO1FBQ0UsS0FBSyxDQUNILDRCQUE0QixFQUM1QiwwREFBMEQsQ0FDM0QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxTQUFTO0lBQ3BELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gseUJBQXlCLEVBQ3pCLGtDQUFrQyxDQUFDLEVBQUUsQ0FDdEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxTQUFTO0lBQ3REO1FBQ0UsS0FBSyxDQUNILDJCQUEyQixFQUMzQixpQ0FBaUMsQ0FDbEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25EO1FBQ0UsS0FBSyxDQUNILHdCQUF3QixFQUN4QixnREFBZ0QsQ0FDakQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxTQUFTO0lBQ3JEO1FBQ0UsS0FBSyxDQUNILDBCQUEwQixFQUMxQix3REFBd0QsQ0FDekQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxTQUFTO0lBQ2pEO1FBQ0UsS0FBSyxDQUNILHNCQUFzQixFQUN0QixtRUFBbUUsQ0FDcEUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxjQUFjO0lBQzFELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLHdCQUF3QixDQUFDLEVBQUUsQ0FDNUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25ELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLGlDQUFpQyxDQUFDLEVBQUUsQ0FDckMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxTQUFTO0lBQzdEO1FBQ0UsS0FBSyxDQUNILGtDQUFrQyxFQUNsQyxrQ0FBa0MsQ0FDbkMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxTQUFTO0lBQzVEO1FBQ0UsS0FBSyxDQUNILGlDQUFpQyxFQUNqQyx5Q0FBeUMsQ0FDMUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxTQUFTO0lBQ3pEO1FBQ0UsS0FBSyxDQUNILDhCQUE4QixFQUM5QiwrRUFBK0UsQ0FDaEYsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxTQUFTO0lBQzNELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsZ0NBQWdDLEVBQ2hDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FDbEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxTQUFTO0lBQ2xELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsdUJBQXVCLEVBQ3ZCLFVBQVUsQ0FBQyw0Q0FBNEMsQ0FDeEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxhQUFhO0lBQzlELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILCtCQUErQixFQUMvQixrQkFBa0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ3pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsY0FBYztJQUM5RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDhCQUE4QixFQUM5Qix3QkFBd0IsQ0FBQyxFQUFFLENBQzVCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsb0VBQW9FLENBQ3JFLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRDtRQUNFLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsa0RBQWtELENBQ25ELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsYUFBYTtJQUM3RCxZQUFZLENBQVMsRUFBRSxDQUFTO1FBQzlCLEtBQUssQ0FDSCw4QkFBOEIsRUFDOUIsV0FBVyxDQUFDLGdEQUFnRCxDQUFDLEdBQUcsQ0FDakUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZEO1FBQ0UsS0FBSyxDQUNILDRCQUE0QixFQUM1QiwrRUFBK0UsQ0FDaEYsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxTQUFTO0lBQzVEO1FBQ0UsS0FBSyxDQUNILGlDQUFpQyxFQUNqQyw2RkFBNkYsQ0FDOUYsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxTQUFTO0lBQzVELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsaUNBQWlDLEVBQ2pDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FDNUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxTQUFTO0lBQ2pEO1FBQ0UsS0FBSyxDQUNILHNCQUFzQixFQUN0QixvQkFBb0IsQ0FDckIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxTQUFTO0lBQ2xELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILHVCQUF1QixFQUN2QixtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUM3QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFNBQVM7SUFDckQ7UUFDRSxLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLHlCQUF5QixDQUMxQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFNBQVM7SUFDeEQ7UUFDRSxLQUFLLENBQ0gsNkJBQTZCLEVBQzdCLDRCQUE0QixDQUM3QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFNBQVM7SUFDeEQ7UUFDRSxLQUFLLENBQ0gsNkJBQTZCLEVBQzdCLDBCQUEwQixDQUMzQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFNBQVM7SUFDckQ7UUFDRSxLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLGdDQUFnQyxDQUNqQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGNBQWM7SUFDdEQsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQ0gsc0JBQXNCLEVBQ3RCLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUMzQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHVCQUF3QixTQUFRLGNBQWM7SUFDekQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCx5QkFBeUIsRUFDekIscUNBQXFDLENBQUMsRUFBRSxDQUN6QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGFBQWE7SUFDckQsWUFBWSxNQUFlO1FBQ3pCLEtBQUssQ0FDSCxzQkFBc0IsRUFDdEIseUNBQXlDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUMzRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGFBQWE7SUFDdkQ7UUFDRSxLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLGtEQUFrRCxDQUNuRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGNBQWUsU0FBUSxjQUFjO0lBQ2hELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsZ0JBQWdCLEVBQ2hCLG9DQUFvQyxDQUFDLEVBQUUsQ0FDeEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxhQUFhO0lBQ3BELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gscUJBQXFCLEVBQ3JCLHdCQUF3QixDQUFDLEVBQUUsQ0FDNUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxhQUFhO0lBQzFELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsMkJBQTJCLEVBQzNCLGlEQUFpRCxDQUFDLEVBQUUsQ0FDckQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxhQUFhO0lBQzFELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsMkJBQTJCLEVBQzNCLGlCQUFpQixDQUFDLEVBQUUsQ0FDckIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxhQUFhO0lBQ3hEO1FBQ0UsS0FBSyxDQUNILHlCQUF5QixFQUN6QixpQ0FBaUMsQ0FDbEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxhQUFhO0lBQ3ZELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILHdCQUF3QixFQUN4QixHQUFHLENBQUMsaUNBQWlDLENBQUMsSUFBSSxDQUMzQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGFBQWE7SUFDdkQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCx3QkFBd0IsRUFDeEIsdUJBQXVCLENBQUMsRUFBRSxDQUMzQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDhCQUErQixTQUFRLGFBQWE7SUFDL0QsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxnQ0FBZ0MsRUFDaEMsY0FBYyxDQUFDLG9DQUFvQyxDQUNwRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFNBQVM7SUFDekQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCw4QkFBOEIsRUFDOUIsUUFBUSxDQUFDLHFDQUFxQyxDQUMvQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGFBQWE7SUFDckQsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQ0gsc0JBQXNCLEVBQ3RCLGFBQWEsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQ2pELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsYUFBYTtJQUM3RDtRQUNFLEtBQUssQ0FDSCw4QkFBOEIsRUFDOUIsNkRBQTZELENBQzlELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsYUFBYTtJQUN2RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILHdCQUF3QixFQUN4QixHQUFHLENBQUMsRUFBRSxDQUNQLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsYUFBYTtJQUM1RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDZCQUE2QixFQUM3QixtRkFBbUYsQ0FBQyxFQUFFLENBQ3ZGLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsYUFBYTtJQUNqRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILGtCQUFrQixFQUNsQixtQ0FBbUMsQ0FBQyxFQUFFLENBQ3ZDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsYUFBYTtJQUNsRCxZQUFZLENBQVMsRUFBRSxDQUFTO1FBQzlCLEtBQUssQ0FDSCxtQkFBbUIsRUFDbkIsR0FBRyxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FDdEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxlQUFnQixTQUFRLFlBQVk7SUFDL0M7UUFDRSxLQUFLLENBQ0gsaUJBQWlCLEVBQ2pCLGVBQWUsQ0FDaEIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25EO1FBQ0UsS0FBSyxDQUNILHdCQUF3QixFQUN4QixnQkFBZ0IsQ0FDakIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxTQUFTO0lBQ2pEO1FBQ0UsS0FBSyxDQUNILHNCQUFzQixFQUN0QixxQ0FBcUMsQ0FDdEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxTQUFTO0lBQzdDO1FBQ0UsS0FBSyxDQUNILGtCQUFrQixFQUNsQiwwQ0FBMEMsQ0FDM0MsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxTQUFTO0lBQzlDO1FBQ0UsS0FBSyxDQUNILG1CQUFtQixFQUNuQiwyQ0FBMkMsQ0FDNUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxTQUFTO0lBQzVELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILGlDQUFpQyxFQUNqQyxxQkFBcUIsQ0FBQyxrQkFBa0IsQ0FBQyw0QkFBNEIsQ0FDdEUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxlQUFlO0lBQ2xFLFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsaUNBQWlDLEVBQ2pDLHFCQUFxQixDQUFDLHdEQUF3RCxDQUMvRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG1DQUFvQyxTQUFRLGFBQWE7SUFDcEUsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQ0gscUNBQXFDLEVBQ3JDLHFCQUFxQixDQUFDLG1DQUFtQyxDQUFDLEVBQUUsQ0FDN0QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxTQUFTO0lBQzdDO1FBQ0UsS0FBSyxDQUNILGtCQUFrQixFQUNsQix5Q0FBeUMsQ0FDMUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxlQUFlO0lBQy9ELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsOEJBQThCLEVBQzlCLDhDQUE4QyxDQUFDLElBQUksQ0FDcEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsNEJBQTRCLEVBQzVCLE9BQU8sQ0FBQyw0QkFBNEIsQ0FDckMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxhQUFhO0lBQ2pELFlBQVksR0FBRyxJQUEyQjtRQUN4QyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUM7UUFFakIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUV4QixNQUFNLElBQUksR0FBRyxDQUFDLENBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUV0QyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDYixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQy9ELENBQUM7UUFFRixRQUFRLEdBQUcsRUFBRTtZQUNYLEtBQUssQ0FBQztnQkFDSixHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztnQkFDN0IsTUFBTTtZQUNSLEtBQUssQ0FBQztnQkFDSixHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7Z0JBQzdDLE1BQU07WUFDUjtnQkFDRSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekMsR0FBRyxJQUFJLFNBQVMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDO2dCQUMxQyxNQUFNO1NBQ1Q7UUFFRCxLQUFLLENBQ0gsa0JBQWtCLEVBQ2xCLEdBQUcsR0FBRyxvQkFBb0IsQ0FDM0IsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxhQUFhO0lBQ25ELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsb0JBQW9CLEVBQ3BCLEdBQUcsQ0FBQyxjQUFjLENBQ25CLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsU0FBUztJQUNsRDtRQUNFLEtBQUssQ0FDSCx1QkFBdUIsRUFDdkIsZ0NBQWdDLENBQ2pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsYUFBYTtJQUN2RDtRQUNFLEtBQUssQ0FDSCx3QkFBd0IsRUFDeEIsZ0NBQWdDLENBQ2pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sOEJBQStCLFNBQVEsY0FBYztJQUNoRTtRQUNFLEtBQUssQ0FDSCxnQ0FBZ0MsRUFDaEMsb0dBQW9HLENBQ3JHLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8scUNBQXNDLFNBQVEsY0FBYztJQUN2RSxZQUFZLENBQVMsRUFBRSxDQUFTO1FBQzlCLEtBQUssQ0FDSCx1Q0FBdUMsRUFDdkMsbUJBQW1CLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUNwRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGtDQUFtQyxTQUFRLGNBQWM7SUFDcEU7UUFDRSxLQUFLLENBQ0gsb0NBQW9DLEVBQ3BDLDRCQUE0QixDQUM3QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGFBQWMsU0FBUSxTQUFTO0lBQzFDO1FBQ0UsS0FBSyxDQUNILGVBQWUsRUFDZixxREFBcUQsQ0FDdEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxVQUFXLFNBQVEsYUFBYTtJQUMzQyxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILFlBQVksRUFDWixHQUFHLENBQUMsbURBQW1ELENBQ3hELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsU0FBUztJQUN6RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDhCQUE4QixFQUM5Qiw2Q0FBNkMsQ0FBQyxFQUFFLENBQ2pELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sc0NBQXVDLFNBQVEsU0FBUztJQUNuRTtRQUNFLEtBQUssQ0FDSCx3Q0FBd0MsRUFDeEMsOEJBQThCLENBQy9CLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsU0FBUztJQUN0RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDJCQUEyQixFQUMzQixlQUFlLENBQUMseUNBQXlDLENBQzFELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsU0FBUztJQUN6RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDhCQUE4QixFQUM5Qix1QkFBdUIsQ0FBQyxFQUFFLENBQzNCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsU0FBUztJQUN0RDtRQUNFLEtBQUssQ0FDSCwyQkFBMkIsRUFDM0IsbUNBQW1DLENBQ3BDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsU0FBUztJQUNyRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDBCQUEwQixFQUMxQixlQUFlLENBQUMsd0NBQXdDLENBQ3pELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sb0RBQ1gsU0FBUSxTQUFTO0lBQ2pCO1FBQ0UsS0FBSyxDQUNILHNEQUFzRCxFQUN0RCx3REFBd0QsQ0FDekQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxTQUFTO0lBQ3JEO1FBQ0UsS0FBSyxDQUNILDBCQUEwQixFQUMxQixzQ0FBc0MsQ0FDdkMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25ELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLGVBQWUsQ0FBQyxxQ0FBcUMsQ0FDdEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxTQUFTO0lBQ3JELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLGVBQWUsQ0FBQyx3Q0FBd0MsQ0FDekQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxTQUFTO0lBQ3hEO1FBQ0UsS0FBSyxDQUNILDZCQUE2QixFQUM3Qiw0RUFBNEUsQ0FDN0UsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZEO1FBQ0UsS0FBSyxDQUNILDRCQUE0QixFQUM1QixpQ0FBaUMsQ0FDbEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxTQUFTO0lBQzVEO1FBQ0UsS0FBSyxDQUNILGlDQUFpQyxFQUNqQyxvREFBb0QsQ0FDckQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxTQUFTO0lBQ3BEO1FBQ0UsS0FBSyxDQUNILHlCQUF5QixFQUN6QiwrQkFBK0IsQ0FDaEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxTQUFTO0lBQzdEO1FBQ0UsS0FBSyxDQUNILGtDQUFrQyxFQUNsQyw4Q0FBOEMsQ0FDL0MsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxTQUFTO0lBQ3REO1FBQ0UsS0FBSyxDQUNILDJCQUEyQixFQUMzQiwrREFBK0QsQ0FDaEUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25EO1FBQ0UsS0FBSyxDQUNILHdCQUF3QixFQUN4Qix3QkFBd0IsQ0FDekIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxTQUFTO0lBQ3JEO1FBQ0UsS0FBSyxDQUNILDBCQUEwQixFQUMxQix5QkFBeUIsQ0FDMUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxhQUFhO0lBQzNEO1FBQ0UsS0FBSyxDQUNILDRCQUE0QixFQUM1Qix3Q0FBd0MsQ0FDekMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxjQUFjO0lBQ3JELFlBQVksSUFBWSxFQUFFLElBQWEsRUFBRSxTQUFTLEdBQUcsSUFBSTtRQUN2RCxNQUFNLENBQ0osT0FBTyxTQUFTLEtBQUssU0FBUyxFQUM5QixtREFBbUQsQ0FDcEQsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFFeEMsS0FBSyxDQUNILHFCQUFxQixFQUNyQixHQUFHLElBQUksY0FBYyxRQUFRLDRCQUE0QixJQUFJLEdBQUcsQ0FDakUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxhQUFhO0lBQ3BEO1FBQ0UsS0FBSyxDQUNILHFCQUFxQixFQUNyQix3REFBd0QsQ0FDekQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxTQUFTO0lBQzlDO1FBQ0UsS0FBSyxDQUNILG1CQUFtQixFQUNuQixrQkFBa0IsQ0FDbkIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxTQUFTO0lBQzFEO1FBQ0UsS0FBSyxDQUNILCtCQUErQixFQUMvQixtQkFBbUIsQ0FDcEIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxTQUFTO0lBQzNEO1FBQ0UsS0FBSyxDQUNILGdDQUFnQyxFQUNoQyxlQUFlLENBQ2hCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsU0FBUztJQUN6RDtRQUNFLEtBQUssQ0FDSCw4QkFBOEIsRUFDOUIsYUFBYSxDQUNkLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sYUFBYyxTQUFRLGVBQWU7SUFDaEQsWUFBWSxJQUFZLEVBQUUsSUFBWSxFQUFFLFFBQWdCO1FBQ3RELEtBQUssQ0FDSCxlQUFlLEVBQ2YsZ0NBQWdDLElBQUksc0JBQXNCLElBQUksZ0JBQWdCLFFBQVEsRUFBRSxDQUN6RixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFNBQVM7SUFDeEQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCw2QkFBNkIsRUFDN0IsZUFBZSxDQUFDLDhCQUE4QixDQUMvQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFNBQVM7SUFDbkQ7UUFDRSxLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLDJCQUEyQixDQUM1QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUFDakQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxzQkFBc0IsRUFDdEIsZUFBZSxDQUFDLCtCQUErQixDQUNoRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLGFBQWE7SUFDdkQ7UUFDRSxLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLHFDQUFxQyxDQUN0QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFNBQVM7SUFDdkQ7UUFDRSxLQUFLLENBQ0gsNEJBQTRCLEVBQzVCLGlCQUFpQixDQUNsQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFNBQVM7SUFDdEQ7UUFDRSxLQUFLLENBQ0gsMkJBQTJCLEVBQzNCLHlCQUF5QixDQUMxQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGtDQUFtQyxTQUFRLFNBQVM7SUFDL0Q7UUFDRSxLQUFLLENBQ0gsb0NBQW9DLEVBQ3BDLGtDQUFrQyxDQUNuQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGVBQWdCLFNBQVEsU0FBUztJQUM1QztRQUNFLEtBQUssQ0FDSCxpQkFBaUIsRUFDakIsa0RBQWtELENBQ25ELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsU0FBUztJQUN2RDtRQUNFLEtBQUssQ0FDSCw0QkFBNEIsRUFDNUIsaUJBQWlCLENBQ2xCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sYUFBYyxTQUFRLFNBQVM7SUFDMUM7UUFDRSxLQUFLLENBQ0gsZUFBZSxFQUNmLHNCQUFzQixDQUN2QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFNBQVM7SUFDbEQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCx1QkFBdUIsRUFDdkIscUJBQXFCLENBQUMsb0JBQW9CLENBQzNDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsU0FBUztJQUN0RDtRQUNFLEtBQUssQ0FDSCwyQkFBMkIsRUFDM0IsdUJBQXVCLENBQ3hCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsYUFBYTtJQUN4RCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILHlCQUF5QixFQUN6QixHQUFHLENBQUMsMEJBQTBCLENBQy9CLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsU0FBUztJQUNsRDtRQUNFLEtBQUssQ0FDSCx1QkFBdUIsRUFDdkIsb0RBQW9ELENBQ3JELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsYUFBYTtJQUNqRSxZQUFZLFFBQWdCLEVBQUUsQ0FBUztRQUNyQyxLQUFLLENBQ0gsa0NBQWtDLEVBQ2xDLEdBQUcsUUFBUSxtQkFBbUIsQ0FBQyx1QkFBdUIsQ0FDdkQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxhQUFhO0lBQ2xFLFlBQVksWUFBb0IsRUFBRSxRQUFnQjtRQUNoRCxLQUFLLENBQ0gsbUNBQW1DLEVBQ25DLHdCQUF3QixZQUFZLGtDQUFrQyxRQUFRLEVBQUUsQ0FDakYsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxTQUFTO0lBQzNEO1FBQ0UsS0FBSyxDQUNILGdDQUFnQyxFQUNoQyxvREFBb0QsQ0FDckQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxTQUFTO0lBQ3pEO1FBQ0UsS0FBSyxDQUNILDhCQUE4QixFQUM5QiwwREFBMEQsQ0FDM0QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25EO1FBQ0UsS0FBSyxDQUNILHdCQUF3QixFQUN4QiwyQ0FBMkMsQ0FDNUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxTQUFTO0lBQ3BEO1FBQ0UsS0FBSyxDQUNILHlCQUF5QixFQUN6QixnREFBZ0QsQ0FDakQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxrQ0FBbUMsU0FBUSxhQUFhO0lBQ25FO1FBQ0UsS0FBSyxDQUNILG9DQUFvQyxFQUNwQyxtQ0FBbUMsQ0FDcEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxTQUFTO0lBQ3pEO1FBQ0UsS0FBSyxDQUNILDhCQUE4QixFQUM5Qiw4QkFBOEIsQ0FDL0IsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxTQUFTO0lBQ3hEO1FBQ0UsS0FBSyxDQUNILDZCQUE2QixFQUM3Qiw4Q0FBOEMsQ0FDL0MsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQ0FBMkMsU0FBUSxTQUFTO0lBQ3ZFO1FBQ0UsS0FBSyxDQUNILDRDQUE0QyxFQUM1QyxrR0FBa0csQ0FDbkcsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxhQUFhO0lBQ3pELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FDckMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxTQUFTO0lBQ2hELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gscUJBQXFCLEVBQ3JCLHFCQUFxQixDQUFDLEdBQUcsQ0FDMUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZELFlBQVksQ0FBUztRQUNuQixLQUFLLENBQ0gsNEJBQTRCLEVBQzVCLDRCQUE0QixDQUFDLEVBQUUsQ0FDaEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUNELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxTQUFTO0lBQ25ELFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUNILHdCQUF3QixFQUN4QixHQUFHLENBQUMsK0JBQStCLENBQUMsRUFBRSxDQUN2QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGFBQWE7SUFDckQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxzQkFBc0IsRUFDdEIscUJBQXFCLENBQUMsRUFBRSxDQUN6QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDBCQUEyQixTQUFRLGFBQWE7SUFDM0QsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQ0gsNEJBQTRCLEVBQzVCLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQ3pDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8seUJBQTBCLFNBQVEsY0FBYztJQUMzRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILDJCQUEyQixFQUMzQiwwQkFBMEIsQ0FBQyxFQUFFLENBQzlCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsYUFBYTtJQUNuRCxZQUFZLENBQVM7UUFDbkIsS0FBSyxDQUNILG9CQUFvQixFQUNwQixtQkFBbUIsQ0FBQyxFQUFFLENBQ3ZCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsU0FBUztJQUN2RCxZQUFZLENBQVMsRUFBRSxDQUFTO1FBQzlCLEtBQUssQ0FDSCw0QkFBNEIsRUFDNUIscUJBQXFCLENBQUMsMERBQTBELENBQUMsRUFBRSxDQUNwRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDhCQUErQixTQUFRLFNBQVM7SUFDM0Q7UUFDRSxLQUFLLENBQ0gsZ0NBQWdDLEVBQ2hDLGlFQUFpRSxDQUNsRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFNBQVM7SUFDaEQ7UUFDRSxLQUFLLENBQ0gscUJBQXFCLEVBQ3JCLDJFQUEyRSxDQUM1RSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLFNBQVM7SUFDN0Q7UUFDRSxLQUFLLENBQ0gsa0NBQWtDLEVBQ2xDLHVEQUF1RCxDQUN4RCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNDQUF1QyxTQUFRLGFBQWE7SUFDdkU7UUFDRSxLQUFLLENBQ0gsd0NBQXdDLEVBQ3hDLDhDQUE4QyxDQUMvQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFNBQVM7SUFDekQ7UUFDRSxLQUFLLENBQ0gsOEJBQThCLEVBQzlCLGdDQUFnQyxDQUNqQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHVDQUF3QyxTQUFRLFNBQVM7SUFDcEU7UUFDRSxLQUFLLENBQ0gseUNBQXlDLEVBQ3pDLHFFQUFxRSxDQUN0RSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLCtCQUFnQyxTQUFRLFNBQVM7SUFDNUQ7UUFDRSxLQUFLLENBQ0gsaUNBQWlDLEVBQ2pDLDBDQUEwQyxDQUMzQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFNBQVM7SUFDMUQ7UUFDRSxLQUFLLENBQ0gsK0JBQStCLEVBQy9CLG9EQUFvRCxDQUNyRCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFNBQVM7SUFDckQ7UUFDRSxLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLDhDQUE4QyxDQUMvQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFNBQVM7SUFDakQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxzQkFBc0IsRUFDdEIsaUJBQWlCLENBQUMsRUFBRSxDQUNyQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFNBQVM7SUFDckQ7UUFDRSxLQUFLLENBQ0gsMEJBQTBCLEVBQzFCLG1DQUFtQyxDQUNwQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFNBQVM7SUFDbkQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCx3QkFBd0IsRUFDeEIsa0NBQWtDLENBQUMsRUFBRSxDQUN0QyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFNBQVM7SUFDbkQ7UUFDRSxLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLDZCQUE2QixDQUM5QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFNBQVM7SUFDckQsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsbURBQW1ELENBQUMsRUFBRSxDQUN2RCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLCtCQUFnQyxTQUFRLFNBQVM7SUFDNUQ7UUFDRSxLQUFLLENBQ0gsaUNBQWlDLEVBQ2pDLDBDQUEwQyxDQUMzQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLGFBQWE7SUFDakUsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxrQ0FBa0MsRUFDbEMsMkVBQTJFLENBQUMsR0FBRyxDQUNoRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLGdDQUFpQyxTQUFRLGFBQWE7SUFDakUsWUFBWSxDQUFTO1FBQ25CLEtBQUssQ0FDSCxrQ0FBa0MsRUFDbEMsR0FBRyxDQUFDLDhCQUE4QixDQUNuQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLDhCQUErQixTQUFRLFNBQVM7SUFDM0Q7UUFDRSxLQUFLLENBQ0gsZ0NBQWdDLEVBQ2hDLHVCQUF1QixDQUN4QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFNBQVM7SUFDdEQsTUFBTSxDQUFTO0lBQ2YsWUFBWSxNQUFjO1FBQ3hCLEtBQUssQ0FDSCwyQkFBMkIsRUFDM0IsdUNBQXVDLENBQ3hDLENBQUM7UUFDRixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0NBQ0Y7QUFDRCxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsY0FBYztJQUNqRSxNQUFNLENBQVU7SUFDaEIsR0FBRyxDQUFVO0lBQ2IsR0FBRyxDQUFVO0lBRWIsWUFBWSxJQUFZLEVBQUUsTUFBZSxFQUFFLEdBQVksRUFBRSxHQUFZO1FBQ25FLEtBQUssQ0FDSCxpQ0FBaUMsRUFDakMsOEJBQThCLElBQUksTUFBTSxNQUFNLEVBQUUsQ0FDakQsQ0FBQztRQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRTtZQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUNmLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQztDQUNGO0FBQ0QsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFNBQVM7SUFDcEQsS0FBSyxDQUFTO0lBQ2QsWUFBWSxLQUFZO1FBQ3RCLEtBQUssQ0FDSCx5QkFBeUIsRUFDekIsT0FBTyxLQUFLLENBQUMsT0FBTyxLQUFLLFFBQVE7WUFDL0IsQ0FBQyxDQUFDLG9EQUFvRCxLQUFLLENBQUMsT0FBTyxHQUFHO1lBQ3RFLENBQUMsQ0FBQyxzQ0FBc0MsQ0FDM0MsQ0FBQztRQUNGLElBQUksS0FBSyxFQUFFO1lBQ1QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7U0FDcEI7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsY0FBYztJQUM1RCxJQUFJLENBQVM7SUFDYixJQUFJLENBQVM7SUFDYixZQUFZLFdBQW1CLEVBQUUsSUFBWSxFQUFFLElBQVk7UUFDekQsS0FBSyxDQUNILDRCQUE0QixFQUM1QiwyQkFBMkIsV0FBVyxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FDekQsQ0FBQztRQUNGLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxhQUFhO0lBQ2pELFlBQVksSUFBWSxFQUFFLEtBQWM7UUFDdEMsS0FBSyxDQUNILGtCQUFrQixFQUNsQixLQUFLO1lBQ0gsQ0FBQyxDQUFDLHdCQUF3QixJQUFJLEVBQUU7WUFDaEMsQ0FBQyxDQUFDLHdCQUF3QixJQUFJLE1BQU0sS0FBSyxJQUFJLENBQ2hELENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsYUFBYTtJQUN0RCxZQUFZLElBQVksRUFBRSxLQUFjO1FBQ3RDLEtBQUssQ0FDSCx1QkFBdUIsRUFDdkIsY0FBYyxLQUFLLDRCQUE0QixJQUFJLEdBQUcsQ0FDdkQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxhQUFhO0lBQzVELFlBQVksS0FBYSxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsS0FBYTtRQUNsRSxLQUFLLENBQ0gsNkJBQTZCLEVBQzdCLG9CQUFvQixLQUFLLDRCQUE0QixJQUFJLGVBQWUsSUFBSSxzQkFBc0IsS0FBSyxHQUFHLENBQzNHLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFHRCxTQUFTLHVCQUF1QixDQUFDLEtBQVU7SUFDekMsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtRQUN4RCxPQUFPLGVBQWUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUNoRDtTQUFNO1FBQ0wsT0FBTyxRQUFRLE9BQU8sS0FBSyxFQUFFLENBQUM7S0FDL0I7QUFDSCxDQUFDO0FBRUQsTUFBTSxPQUFPLGlDQUFrQyxTQUFRLGFBQWE7SUFDbEUsWUFBWSxLQUFhLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxLQUFjO1FBQ25FLEtBQUssQ0FDSCxtQ0FBbUMsRUFDbkMsWUFBWSxLQUFLLDRCQUE0QixJQUFJLGVBQWUsSUFBSSxzQkFDbEUsdUJBQXVCLENBQUMsS0FBSyxDQUMvQixHQUFHLENBQ0osQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxhQUFhO0lBQ3pELFlBQVksS0FBYSxFQUFFLElBQVksRUFBRSxLQUFjO1FBQ3JELEtBQUssQ0FDSCwwQkFBMEIsRUFDMUIsWUFBWSxLQUFLLDZCQUE2QixJQUFJLHNCQUNoRCx1QkFBdUIsQ0FBQyxLQUFLLENBQy9CLEdBQUcsQ0FDSixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLGVBQWdCLFNBQVEsYUFBYTtJQUNoRCxLQUFLLENBQVM7SUFDZCxZQUFZLEtBQWE7UUFDdkIsS0FBSyxDQUNILGlCQUFpQixFQUNqQixnQkFBZ0IsS0FBSyxFQUFFLENBQ3hCLENBQUM7UUFDRixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsYUFBYTtJQUN2RCxZQUFZLFFBQThDO1FBQ3hELFFBQVEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0QsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxpQkFBaUIsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNsRCxDQUFDLENBQUMsYUFBYSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvQixLQUFLLENBQ0gsd0JBQXdCLEVBQ3hCLG1CQUFtQixHQUFHLEVBQUUsQ0FDekIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxTQUFTO0lBQ2pELFlBQVksSUFBWSxFQUFFLElBQVksRUFBRSxPQUFlLFNBQVM7UUFDOUQsS0FBSyxDQUNILHNCQUFzQixFQUN0QixlQUFlLElBQUksS0FBSyxJQUFJLG1CQUFtQixJQUFJLEVBQUUsQ0FDdEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxTQUFTO0lBQ3ZELFlBQVksSUFBWSxFQUFFLElBQWEsRUFBRSxPQUFnQjtRQUN2RCxNQUFNLEdBQUcsR0FBRywwQkFBMEIsSUFBSSxHQUN4QyxJQUFJLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDdEMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25DLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsYUFBYTtJQUM3RCxZQUFZLE9BQWUsRUFBRSxNQUFjLEVBQUUsSUFBYTtRQUN4RCxLQUFLLENBQ0gsOEJBQThCLEVBQzlCLG1CQUFtQixPQUFPLEtBQUssTUFBTSxHQUNuQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDcEMsRUFBRSxDQUNILENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsU0FBUztJQUN2RCxZQUNFLE9BQWUsRUFDZixHQUFXLEVBRVgsTUFBVyxFQUNYLFFBQWtCLEVBQ2xCLElBQWE7UUFFYixJQUFJLEdBQVcsQ0FBQztRQUNoQixNQUFNLFFBQVEsR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksQ0FBQyxRQUFRO1lBQ3RELE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRTtZQUNmLE1BQU0sQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLENBQUM7WUFDM0IsR0FBRyxHQUFHLGlDQUFpQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXO2dCQUN0RSx5QkFBeUIsT0FBTyxlQUM5QixJQUFJLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDcEMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztTQUN6RDthQUFNO1lBQ0wsR0FBRyxHQUFHLFlBQVksUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsWUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQ3ZCLGlCQUFpQixHQUFHLDJCQUEyQixPQUFPLGVBQ3BELElBQUksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUNwQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQ3ZEO1FBQ0QsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FDRjtBQUVELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxhQUFhO0lBQy9ELFlBQ0UsU0FBaUIsRUFDakIsY0FBK0IsRUFDL0IsSUFBa0I7UUFFbEIsTUFBTSxXQUFXLEdBQUcsY0FBYztZQUNoQyxhQUFhLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsTUFBTSxHQUFHLEdBQUcsNkJBQTZCLFNBQVMsbUJBQ2hELFdBQVcsQ0FBQyxDQUFDLENBQUMsZUFBZSxXQUFXLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFDM0Qsa0JBQWtCLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBRXhDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMvQyxDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsU0FBUztJQUMxRCxZQUNFLE9BQWUsRUFDZixjQUFzQixFQUN0QixJQUFhO1FBRWIsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFN0MsSUFBSSxHQUFXLENBQUM7UUFDaEIsSUFBSSxPQUFPLEtBQUssR0FBRyxFQUFFO1lBQ25CLEdBQUcsR0FBRyxnQ0FBZ0MsT0FBTyxlQUMzQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDNUMsRUFBRSxDQUFDO1NBQ0o7YUFBTTtZQUNMLEdBQUc7Z0JBQ0Qsb0JBQW9CLE9BQU8sb0NBQW9DLE9BQU8sZUFDcEUsUUFBUSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzVDLEVBQUUsQ0FBQztTQUNOO1FBRUQsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBOb2RlLmpzIGNvbnRyaWJ1dG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIExpY2Vuc2UuXG4vKiogKioqKioqKioqKiBOT1QgSU1QTEVNRU5URURcbiAqIEVSUl9NQU5JRkVTVF9BU1NFUlRfSU5URUdSSVRZXG4gKiBFUlJfUVVJQ1NFU1NJT05fVkVSU0lPTl9ORUdPVElBVElPTlxuICogRVJSX1JFUVVJUkVfRVNNXG4gKiBFUlJfVExTX0NFUlRfQUxUTkFNRV9JTlZBTElEXG4gKiBFUlJfV09SS0VSX0lOVkFMSURfRVhFQ19BUkdWXG4gKiBFUlJfV09SS0VSX1BBVEhcbiAqIEVSUl9RVUlDX0VSUk9SXG4gKiBFUlJfU09DS0VUX0JVRkZFUl9TSVpFIC8vU3lzdGVtIGVycm9yLCBzaG91bGRuJ3QgZXZlciBoYXBwZW4gaW5zaWRlIERlbm9cbiAqIEVSUl9TWVNURU1fRVJST1IgLy9TeXN0ZW0gZXJyb3IsIHNob3VsZG4ndCBldmVyIGhhcHBlbiBpbnNpZGUgRGVub1xuICogRVJSX1RUWV9JTklUX0ZBSUxFRCAvL1N5c3RlbSBlcnJvciwgc2hvdWxkbid0IGV2ZXIgaGFwcGVuIGluc2lkZSBEZW5vXG4gKiBFUlJfSU5WQUxJRF9QQUNLQUdFX0NPTkZJRyAvLyBwYWNrYWdlLmpzb24gc3R1ZmYsIHByb2JhYmx5IHVzZWxlc3NcbiAqICoqKioqKioqKioqICovXG5cbmltcG9ydCB7IGdldFN5c3RlbUVycm9yTmFtZSwgaW5zcGVjdCB9IGZyb20gXCIuL3V0aWwudHNcIjtcbmltcG9ydCB7IGNvZGVNYXAsIGVycm9yTWFwIH0gZnJvbSBcIi4vaW50ZXJuYWxfYmluZGluZy91di50c1wiO1xuaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIi4uL191dGlsL2Fzc2VydC50c1wiO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gXCIuL3VybC50c1wiO1xuXG5leHBvcnQgeyBlcnJvck1hcCB9O1xuXG4vKipcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvZjNlYjIyNC9saWIvaW50ZXJuYWwvZXJyb3JzLmpzXG4gKi9cbmNvbnN0IGNsYXNzUmVnRXhwID0gL14oW0EtWl1bYS16MC05XSopKyQvO1xuXG4vKipcbiAqIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvZjNlYjIyNC9saWIvaW50ZXJuYWwvZXJyb3JzLmpzXG4gKiBAZGVzY3JpcHRpb24gU29ydGVkIGJ5IGEgcm91Z2ggZXN0aW1hdGUgb24gbW9zdCBmcmVxdWVudGx5IHVzZWQgZW50cmllcy5cbiAqL1xuY29uc3Qga1R5cGVzID0gW1xuICBcInN0cmluZ1wiLFxuICBcImZ1bmN0aW9uXCIsXG4gIFwibnVtYmVyXCIsXG4gIFwib2JqZWN0XCIsXG4gIC8vIEFjY2VwdCAnRnVuY3Rpb24nIGFuZCAnT2JqZWN0JyBhcyBhbHRlcm5hdGl2ZSB0byB0aGUgbG93ZXIgY2FzZWQgdmVyc2lvbi5cbiAgXCJGdW5jdGlvblwiLFxuICBcIk9iamVjdFwiLFxuICBcImJvb2xlYW5cIixcbiAgXCJiaWdpbnRcIixcbiAgXCJzeW1ib2xcIixcbl07XG5cbmNvbnN0IG5vZGVJbnRlcm5hbFByZWZpeCA9IFwiX19ub2RlX2ludGVybmFsX1wiO1xuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxudHlwZSBHZW5lcmljRnVuY3Rpb24gPSAoLi4uYXJnczogYW55W10pID0+IGFueTtcblxuLyoqIFRoaXMgZnVuY3Rpb24gcmVtb3ZlcyB1bm5lY2Vzc2FyeSBmcmFtZXMgZnJvbSBOb2RlLmpzIGNvcmUgZXJyb3JzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhpZGVTdGFja0ZyYW1lcyhmbjogR2VuZXJpY0Z1bmN0aW9uKSB7XG4gIC8vIFdlIHJlbmFtZSB0aGUgZnVuY3Rpb25zIHRoYXQgd2lsbCBiZSBoaWRkZW4gdG8gY3V0IG9mZiB0aGUgc3RhY2t0cmFjZVxuICAvLyBhdCB0aGUgb3V0ZXJtb3N0IG9uZS5cbiAgY29uc3QgaGlkZGVuID0gbm9kZUludGVybmFsUHJlZml4ICsgZm4ubmFtZTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGZuLCBcIm5hbWVcIiwgeyB2YWx1ZTogaGlkZGVuIH0pO1xuXG4gIHJldHVybiBmbjtcbn1cblxuY29uc3QgY2FwdHVyZUxhcmdlclN0YWNrVHJhY2UgPSBoaWRlU3RhY2tGcmFtZXMoXG4gIGZ1bmN0aW9uIGNhcHR1cmVMYXJnZXJTdGFja1RyYWNlKGVycikge1xuICAgIC8vIEB0cy1pZ25vcmUgdGhpcyBmdW5jdGlvbiBpcyBub3QgYXZhaWxhYmxlIGluIGxpYi5kb20uZC50c1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKGVycik7XG5cbiAgICByZXR1cm4gZXJyO1xuICB9LFxuKTtcblxuZXhwb3J0IGludGVyZmFjZSBFcnJub0V4Y2VwdGlvbiBleHRlbmRzIEVycm9yIHtcbiAgZXJybm8/OiBudW1iZXI7XG4gIGNvZGU/OiBzdHJpbmc7XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHN5c2NhbGw/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhpcyBjcmVhdGVzIGFuIGVycm9yIGNvbXBhdGlibGUgd2l0aCBlcnJvcnMgcHJvZHVjZWQgaW4gdGhlIEMrK1xuICogVGhpcyBmdW5jdGlvbiBzaG91bGQgcmVwbGFjZSB0aGUgZGVwcmVjYXRlZFxuICogYGV4Y2VwdGlvbldpdGhIb3N0UG9ydCgpYCBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gZXJyIEEgbGlidXYgZXJyb3IgbnVtYmVyXG4gKiBAcGFyYW0gc3lzY2FsbFxuICogQHBhcmFtIGFkZHJlc3NcbiAqIEBwYXJhbSBwb3J0XG4gKiBAcmV0dXJuIFRoZSBlcnJvci5cbiAqL1xuZXhwb3J0IGNvbnN0IHV2RXhjZXB0aW9uV2l0aEhvc3RQb3J0ID0gaGlkZVN0YWNrRnJhbWVzKFxuICBmdW5jdGlvbiB1dkV4Y2VwdGlvbldpdGhIb3N0UG9ydChcbiAgICBlcnI6IG51bWJlcixcbiAgICBzeXNjYWxsOiBzdHJpbmcsXG4gICAgYWRkcmVzczogc3RyaW5nLFxuICAgIHBvcnQ/OiBudW1iZXIsXG4gICkge1xuICAgIGNvbnN0IHsgMDogY29kZSwgMTogdXZtc2cgfSA9IHV2RXJybWFwR2V0KGVycikgfHwgdXZVbm1hcHBlZEVycm9yO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtzeXNjYWxsfSAke2NvZGV9OiAke3V2bXNnfWA7XG4gICAgbGV0IGRldGFpbHMgPSBcIlwiO1xuXG4gICAgaWYgKHBvcnQgJiYgcG9ydCA+IDApIHtcbiAgICAgIGRldGFpbHMgPSBgICR7YWRkcmVzc306JHtwb3J0fWA7XG4gICAgfSBlbHNlIGlmIChhZGRyZXNzKSB7XG4gICAgICBkZXRhaWxzID0gYCAke2FkZHJlc3N9YDtcbiAgICB9XG5cbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IGV4OiBhbnkgPSBuZXcgRXJyb3IoYCR7bWVzc2FnZX0ke2RldGFpbHN9YCk7XG4gICAgZXguY29kZSA9IGNvZGU7XG4gICAgZXguZXJybm8gPSBlcnI7XG4gICAgZXguc3lzY2FsbCA9IHN5c2NhbGw7XG4gICAgZXguYWRkcmVzcyA9IGFkZHJlc3M7XG5cbiAgICBpZiAocG9ydCkge1xuICAgICAgZXgucG9ydCA9IHBvcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhcHR1cmVMYXJnZXJTdGFja1RyYWNlKGV4KTtcbiAgfSxcbik7XG5cbi8qKlxuICogVGhpcyB1c2VkIHRvIGJlIGB1dGlsLl9lcnJub0V4Y2VwdGlvbigpYC5cbiAqXG4gKiBAcGFyYW0gZXJyIEEgbGlidXYgZXJyb3IgbnVtYmVyXG4gKiBAcGFyYW0gc3lzY2FsbFxuICogQHBhcmFtIG9yaWdpbmFsXG4gKiBAcmV0dXJuIEEgYEVycm5vRXhjZXB0aW9uYFxuICovXG5leHBvcnQgY29uc3QgZXJybm9FeGNlcHRpb24gPSBoaWRlU3RhY2tGcmFtZXMoXG4gIGZ1bmN0aW9uIGVycm5vRXhjZXB0aW9uKGVyciwgc3lzY2FsbCwgb3JpZ2luYWwpOiBFcnJub0V4Y2VwdGlvbiB7XG4gICAgY29uc3QgY29kZSA9IGdldFN5c3RlbUVycm9yTmFtZShlcnIpO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBvcmlnaW5hbFxuICAgICAgPyBgJHtzeXNjYWxsfSAke2NvZGV9ICR7b3JpZ2luYWx9YFxuICAgICAgOiBgJHtzeXNjYWxsfSAke2NvZGV9YDtcblxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgY29uc3QgZXg6IGFueSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICBleC5lcnJubyA9IGVycjtcbiAgICBleC5jb2RlID0gY29kZTtcbiAgICBleC5zeXNjYWxsID0gc3lzY2FsbDtcblxuICAgIHJldHVybiBjYXB0dXJlTGFyZ2VyU3RhY2tUcmFjZShleCk7XG4gIH0sXG4pO1xuXG5mdW5jdGlvbiB1dkVycm1hcEdldChuYW1lOiBudW1iZXIpIHtcbiAgcmV0dXJuIGVycm9yTWFwLmdldChuYW1lKTtcbn1cblxuY29uc3QgdXZVbm1hcHBlZEVycm9yID0gW1wiVU5LTk9XTlwiLCBcInVua25vd24gZXJyb3JcIl07XG5cbi8qKlxuICogVGhpcyBjcmVhdGVzIGFuIGVycm9yIGNvbXBhdGlibGUgd2l0aCBlcnJvcnMgcHJvZHVjZWQgaW4gdGhlIEMrK1xuICogZnVuY3Rpb24gVVZFeGNlcHRpb24gdXNpbmcgYSBjb250ZXh0IG9iamVjdCB3aXRoIGRhdGEgYXNzZW1ibGVkIGluIEMrKy5cbiAqIFRoZSBnb2FsIGlzIHRvIG1pZ3JhdGUgdGhlbSB0byBFUlJfKiBlcnJvcnMgbGF0ZXIgd2hlbiBjb21wYXRpYmlsaXR5IGlzXG4gKiBub3QgYSBjb25jZXJuLlxuICpcbiAqIEBwYXJhbSBjdHhcbiAqIEByZXR1cm4gVGhlIGVycm9yLlxuICovXG5leHBvcnQgY29uc3QgdXZFeGNlcHRpb24gPSBoaWRlU3RhY2tGcmFtZXMoZnVuY3Rpb24gdXZFeGNlcHRpb24oY3R4KSB7XG4gIGNvbnN0IHsgMDogY29kZSwgMTogdXZtc2cgfSA9IHV2RXJybWFwR2V0KGN0eC5lcnJubykgfHwgdXZVbm1hcHBlZEVycm9yO1xuXG4gIGxldCBtZXNzYWdlID0gYCR7Y29kZX06ICR7Y3R4Lm1lc3NhZ2UgfHwgdXZtc2d9LCAke2N0eC5zeXNjYWxsfWA7XG5cbiAgbGV0IHBhdGg7XG4gIGxldCBkZXN0O1xuXG4gIGlmIChjdHgucGF0aCkge1xuICAgIHBhdGggPSBjdHgucGF0aC50b1N0cmluZygpO1xuICAgIG1lc3NhZ2UgKz0gYCAnJHtwYXRofSdgO1xuICB9XG4gIGlmIChjdHguZGVzdCkge1xuICAgIGRlc3QgPSBjdHguZGVzdC50b1N0cmluZygpO1xuICAgIG1lc3NhZ2UgKz0gYCAtPiAnJHtkZXN0fSdgO1xuICB9XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgY29uc3QgZXJyOiBhbnkgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG5cbiAgZm9yIChjb25zdCBwcm9wIG9mIE9iamVjdC5rZXlzKGN0eCkpIHtcbiAgICBpZiAocHJvcCA9PT0gXCJtZXNzYWdlXCIgfHwgcHJvcCA9PT0gXCJwYXRoXCIgfHwgcHJvcCA9PT0gXCJkZXN0XCIpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGVycltwcm9wXSA9IGN0eFtwcm9wXTtcbiAgfVxuXG4gIGVyci5jb2RlID0gY29kZTtcblxuICBpZiAocGF0aCkge1xuICAgIGVyci5wYXRoID0gcGF0aDtcbiAgfVxuXG4gIGlmIChkZXN0KSB7XG4gICAgZXJyLmRlc3QgPSBkZXN0O1xuICB9XG5cbiAgcmV0dXJuIGNhcHR1cmVMYXJnZXJTdGFja1RyYWNlKGVycik7XG59KTtcblxuLyoqXG4gKiBEZXByZWNhdGVkLCBuZXcgZnVuY3Rpb24gaXMgYHV2RXhjZXB0aW9uV2l0aEhvc3RQb3J0KClgXG4gKiBOZXcgZnVuY3Rpb24gYWRkZWQgdGhlIGVycm9yIGRlc2NyaXB0aW9uIGRpcmVjdGx5XG4gKiBmcm9tIEMrKy4gdGhpcyBtZXRob2QgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG4gKiBAcGFyYW0gZXJyIEEgbGlidXYgZXJyb3IgbnVtYmVyXG4gKiBAcGFyYW0gc3lzY2FsbFxuICogQHBhcmFtIGFkZHJlc3NcbiAqIEBwYXJhbSBwb3J0XG4gKiBAcGFyYW0gYWRkaXRpb25hbFxuICovXG5leHBvcnQgY29uc3QgZXhjZXB0aW9uV2l0aEhvc3RQb3J0ID0gaGlkZVN0YWNrRnJhbWVzKFxuICBmdW5jdGlvbiBleGNlcHRpb25XaXRoSG9zdFBvcnQoXG4gICAgZXJyOiBudW1iZXIsXG4gICAgc3lzY2FsbDogc3RyaW5nLFxuICAgIGFkZHJlc3M6IHN0cmluZyxcbiAgICBwb3J0OiBudW1iZXIsXG4gICAgYWRkaXRpb25hbDogc3RyaW5nLFxuICApIHtcbiAgICBjb25zdCBjb2RlID0gZ2V0U3lzdGVtRXJyb3JOYW1lKGVycik7XG4gICAgbGV0IGRldGFpbHMgPSBcIlwiO1xuXG4gICAgaWYgKHBvcnQgJiYgcG9ydCA+IDApIHtcbiAgICAgIGRldGFpbHMgPSBgICR7YWRkcmVzc306JHtwb3J0fWA7XG4gICAgfSBlbHNlIGlmIChhZGRyZXNzKSB7XG4gICAgICBkZXRhaWxzID0gYCAke2FkZHJlc3N9YDtcbiAgICB9XG5cbiAgICBpZiAoYWRkaXRpb25hbCkge1xuICAgICAgZGV0YWlscyArPSBgIC0gTG9jYWwgKCR7YWRkaXRpb25hbH0pYDtcbiAgICB9XG5cbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIGNvbnN0IGV4OiBhbnkgPSBuZXcgRXJyb3IoYCR7c3lzY2FsbH0gJHtjb2RlfSR7ZGV0YWlsc31gKTtcbiAgICBleC5lcnJubyA9IGVycjtcbiAgICBleC5jb2RlID0gY29kZTtcbiAgICBleC5zeXNjYWxsID0gc3lzY2FsbDtcbiAgICBleC5hZGRyZXNzID0gYWRkcmVzcztcblxuICAgIGlmIChwb3J0KSB7XG4gICAgICBleC5wb3J0ID0gcG9ydDtcbiAgICB9XG5cbiAgICByZXR1cm4gY2FwdHVyZUxhcmdlclN0YWNrVHJhY2UoZXgpO1xuICB9LFxuKTtcblxuLyoqXG4gKiBAcGFyYW0gY29kZSBBIGxpYnV2IGVycm9yIG51bWJlciBvciBhIGMtYXJlcyBlcnJvciBjb2RlXG4gKiBAcGFyYW0gc3lzY2FsbFxuICogQHBhcmFtIGhvc3RuYW1lXG4gKi9cbmV4cG9ydCBjb25zdCBkbnNFeGNlcHRpb24gPSBoaWRlU3RhY2tGcmFtZXMoZnVuY3Rpb24gKGNvZGUsIHN5c2NhbGwsIGhvc3RuYW1lKSB7XG4gIGxldCBlcnJubztcblxuICAvLyBJZiBgY29kZWAgaXMgb2YgdHlwZSBudW1iZXIsIGl0IGlzIGEgbGlidXYgZXJyb3IgbnVtYmVyLCBlbHNlIGl0IGlzIGFcbiAgLy8gYy1hcmVzIGVycm9yIGNvZGUuXG4gIGlmICh0eXBlb2YgY29kZSA9PT0gXCJudW1iZXJcIikge1xuICAgIGVycm5vID0gY29kZTtcbiAgICAvLyBFTk9URk9VTkQgaXMgbm90IGEgcHJvcGVyIFBPU0lYIGVycm9yLCBidXQgdGhpcyBlcnJvciBoYXMgYmVlbiBpbiBwbGFjZVxuICAgIC8vIGxvbmcgZW5vdWdoIHRoYXQgaXQncyBub3QgcHJhY3RpY2FsIHRvIHJlbW92ZSBpdC5cbiAgICBpZiAoXG4gICAgICBjb2RlID09PSBjb2RlTWFwLmdldChcIkVBSV9OT0RBVEFcIikgfHxcbiAgICAgIGNvZGUgPT09IGNvZGVNYXAuZ2V0KFwiRUFJX05PTkFNRVwiKVxuICAgICkge1xuICAgICAgY29kZSA9IFwiRU5PVEZPVU5EXCI7IC8vIEZhYnJpY2F0ZWQgZXJyb3IgbmFtZS5cbiAgICB9IGVsc2Uge1xuICAgICAgY29kZSA9IGdldFN5c3RlbUVycm9yTmFtZShjb2RlKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBtZXNzYWdlID0gYCR7c3lzY2FsbH0gJHtjb2RlfSR7aG9zdG5hbWUgPyBgICR7aG9zdG5hbWV9YCA6IFwiXCJ9YDtcblxuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBjb25zdCBleDogYW55ID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICBleC5lcnJubyA9IGVycm5vO1xuICBleC5jb2RlID0gY29kZTtcbiAgZXguc3lzY2FsbCA9IHN5c2NhbGw7XG5cbiAgaWYgKGhvc3RuYW1lKSB7XG4gICAgZXguaG9zdG5hbWUgPSBob3N0bmFtZTtcbiAgfVxuXG4gIHJldHVybiBjYXB0dXJlTGFyZ2VyU3RhY2tUcmFjZShleCk7XG59KTtcblxuLyoqXG4gKiBBbGwgZXJyb3IgaW5zdGFuY2VzIGluIE5vZGUgaGF2ZSBhZGRpdGlvbmFsIG1ldGhvZHMgYW5kIHByb3BlcnRpZXNcbiAqIFRoaXMgZXhwb3J0IGNsYXNzIGlzIG1lYW50IHRvIGJlIGV4dGVuZGVkIGJ5IHRoZXNlIGluc3RhbmNlcyBhYnN0cmFjdGluZyBuYXRpdmUgSlMgZXJyb3IgaW5zdGFuY2VzXG4gKi9cbmV4cG9ydCBjbGFzcyBOb2RlRXJyb3JBYnN0cmFjdGlvbiBleHRlbmRzIEVycm9yIHtcbiAgY29kZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLmNvZGUgPSBjb2RlO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgLy9UaGlzIG51bWJlciBjaGFuZ2VzIGRlcGVuZGluZyBvbiB0aGUgbmFtZSBvZiB0aGlzIGNsYXNzXG4gICAgLy8yMCBjaGFyYWN0ZXJzIGFzIG9mIG5vd1xuICAgIHRoaXMuc3RhY2sgPSB0aGlzLnN0YWNrICYmIGAke25hbWV9IFske3RoaXMuY29kZX1dJHt0aGlzLnN0YWNrLnNsaWNlKDIwKX1gO1xuICB9XG5cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIGAke3RoaXMubmFtZX0gWyR7dGhpcy5jb2RlfV06ICR7dGhpcy5tZXNzYWdlfWA7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE5vZGVFcnJvciBleHRlbmRzIE5vZGVFcnJvckFic3RyYWN0aW9uIHtcbiAgY29uc3RydWN0b3IoY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihFcnJvci5wcm90b3R5cGUubmFtZSwgY29kZSwgbWVzc2FnZSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE5vZGVTeW50YXhFcnJvciBleHRlbmRzIE5vZGVFcnJvckFic3RyYWN0aW9uXG4gIGltcGxlbWVudHMgU3ludGF4RXJyb3Ige1xuICBjb25zdHJ1Y3Rvcihjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZykge1xuICAgIHN1cGVyKFN5bnRheEVycm9yLnByb3RvdHlwZS5uYW1lLCBjb2RlLCBtZXNzYWdlKTtcbiAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgU3ludGF4RXJyb3IucHJvdG90eXBlKTtcbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGAke3RoaXMubmFtZX0gWyR7dGhpcy5jb2RlfV06ICR7dGhpcy5tZXNzYWdlfWA7XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTm9kZVJhbmdlRXJyb3IgZXh0ZW5kcyBOb2RlRXJyb3JBYnN0cmFjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoUmFuZ2VFcnJvci5wcm90b3R5cGUubmFtZSwgY29kZSwgbWVzc2FnZSk7XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIFJhbmdlRXJyb3IucHJvdG90eXBlKTtcbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGAke3RoaXMubmFtZX0gWyR7dGhpcy5jb2RlfV06ICR7dGhpcy5tZXNzYWdlfWA7XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTm9kZVR5cGVFcnJvciBleHRlbmRzIE5vZGVFcnJvckFic3RyYWN0aW9uIGltcGxlbWVudHMgVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihUeXBlRXJyb3IucHJvdG90eXBlLm5hbWUsIGNvZGUsIG1lc3NhZ2UpO1xuICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBUeXBlRXJyb3IucHJvdG90eXBlKTtcbiAgICB0aGlzLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGAke3RoaXMubmFtZX0gWyR7dGhpcy5jb2RlfV06ICR7dGhpcy5tZXNzYWdlfWA7XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTm9kZVVSSUVycm9yIGV4dGVuZHMgTm9kZUVycm9yQWJzdHJhY3Rpb24gaW1wbGVtZW50cyBVUklFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoVVJJRXJyb3IucHJvdG90eXBlLm5hbWUsIGNvZGUsIG1lc3NhZ2UpO1xuICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBVUklFcnJvci5wcm90b3R5cGUpO1xuICAgIHRoaXMudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gYCR7dGhpcy5uYW1lfSBbJHt0aGlzLmNvZGV9XTogJHt0aGlzLm1lc3NhZ2V9YDtcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9BUkdfVFlQRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGV4cGVjdGVkOiBzdHJpbmcgfCBzdHJpbmdbXSwgYWN0dWFsOiB1bmtub3duKSB7XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvZjNlYjIyNC9saWIvaW50ZXJuYWwvZXJyb3JzLmpzI0wxMDM3LUwxMDg3XG4gICAgZXhwZWN0ZWQgPSBBcnJheS5pc0FycmF5KGV4cGVjdGVkKSA/IGV4cGVjdGVkIDogW2V4cGVjdGVkXTtcbiAgICBsZXQgbXNnID0gXCJUaGUgXCI7XG4gICAgaWYgKG5hbWUuZW5kc1dpdGgoXCIgYXJndW1lbnRcIikpIHtcbiAgICAgIC8vIEZvciBjYXNlcyBsaWtlICdmaXJzdCBhcmd1bWVudCdcbiAgICAgIG1zZyArPSBgJHtuYW1lfSBgO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0eXBlID0gbmFtZS5pbmNsdWRlcyhcIi5cIikgPyBcInByb3BlcnR5XCIgOiBcImFyZ3VtZW50XCI7XG4gICAgICBtc2cgKz0gYFwiJHtuYW1lfVwiICR7dHlwZX0gYDtcbiAgICB9XG4gICAgbXNnICs9IFwibXVzdCBiZSBcIjtcblxuICAgIGNvbnN0IHR5cGVzID0gW107XG4gICAgY29uc3QgaW5zdGFuY2VzID0gW107XG4gICAgY29uc3Qgb3RoZXIgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHZhbHVlIG9mIGV4cGVjdGVkKSB7XG4gICAgICBpZiAoa1R5cGVzLmluY2x1ZGVzKHZhbHVlKSkge1xuICAgICAgICB0eXBlcy5wdXNoKHZhbHVlLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xuICAgICAgfSBlbHNlIGlmIChjbGFzc1JlZ0V4cC50ZXN0KHZhbHVlKSkge1xuICAgICAgICBpbnN0YW5jZXMucHVzaCh2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdGhlci5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTcGVjaWFsIGhhbmRsZSBgb2JqZWN0YCBpbiBjYXNlIG90aGVyIGluc3RhbmNlcyBhcmUgYWxsb3dlZCB0byBvdXRsaW5lXG4gICAgLy8gdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gZWFjaCBvdGhlci5cbiAgICBpZiAoaW5zdGFuY2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHBvcyA9IHR5cGVzLmluZGV4T2YoXCJvYmplY3RcIik7XG4gICAgICBpZiAocG9zICE9PSAtMSkge1xuICAgICAgICB0eXBlcy5zcGxpY2UocG9zLCAxKTtcbiAgICAgICAgaW5zdGFuY2VzLnB1c2goXCJPYmplY3RcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGlmICh0eXBlcy5sZW5ndGggPiAyKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSB0eXBlcy5wb3AoKTtcbiAgICAgICAgbXNnICs9IGBvbmUgb2YgdHlwZSAke3R5cGVzLmpvaW4oXCIsIFwiKX0sIG9yICR7bGFzdH1gO1xuICAgICAgfSBlbHNlIGlmICh0eXBlcy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgbXNnICs9IGBvbmUgb2YgdHlwZSAke3R5cGVzWzBdfSBvciAke3R5cGVzWzFdfWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtc2cgKz0gYG9mIHR5cGUgJHt0eXBlc1swXX1gO1xuICAgICAgfVxuICAgICAgaWYgKGluc3RhbmNlcy5sZW5ndGggPiAwIHx8IG90aGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbXNnICs9IFwiIG9yIFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpbnN0YW5jZXMubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKGluc3RhbmNlcy5sZW5ndGggPiAyKSB7XG4gICAgICAgIGNvbnN0IGxhc3QgPSBpbnN0YW5jZXMucG9wKCk7XG4gICAgICAgIG1zZyArPSBgYW4gaW5zdGFuY2Ugb2YgJHtpbnN0YW5jZXMuam9pbihcIiwgXCIpfSwgb3IgJHtsYXN0fWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtc2cgKz0gYGFuIGluc3RhbmNlIG9mICR7aW5zdGFuY2VzWzBdfWA7XG4gICAgICAgIGlmIChpbnN0YW5jZXMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgbXNnICs9IGAgb3IgJHtpbnN0YW5jZXNbMV19YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG90aGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgbXNnICs9IFwiIG9yIFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvdGhlci5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAob3RoZXIubGVuZ3RoID4gMikge1xuICAgICAgICBjb25zdCBsYXN0ID0gb3RoZXIucG9wKCk7XG4gICAgICAgIG1zZyArPSBgb25lIG9mICR7b3RoZXIuam9pbihcIiwgXCIpfSwgb3IgJHtsYXN0fWA7XG4gICAgICB9IGVsc2UgaWYgKG90aGVyLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBtc2cgKz0gYG9uZSBvZiAke290aGVyWzBdfSBvciAke290aGVyWzFdfWA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3RoZXJbMF0udG9Mb3dlckNhc2UoKSAhPT0gb3RoZXJbMF0pIHtcbiAgICAgICAgICBtc2cgKz0gXCJhbiBcIjtcbiAgICAgICAgfVxuICAgICAgICBtc2cgKz0gYCR7b3RoZXJbMF19YDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfQVJHX1RZUEVcIixcbiAgICAgIGAke21zZ30uJHtpbnZhbGlkQXJnVHlwZUhlbHBlcihhY3R1YWwpfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQVJHX1ZBTFVFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24sIHJlYXNvbjogc3RyaW5nID0gXCJpcyBpbnZhbGlkXCIpIHtcbiAgICBjb25zdCB0eXBlID0gbmFtZS5pbmNsdWRlcyhcIi5cIikgPyBcInByb3BlcnR5XCIgOiBcImFyZ3VtZW50XCI7XG4gICAgY29uc3QgaW5zcGVjdGVkID0gaW5zcGVjdCh2YWx1ZSk7XG5cbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfQVJHX1ZBTFVFXCIsXG4gICAgICBgVGhlICR7dHlwZX0gJyR7bmFtZX0nICR7cmVhc29ufS4gUmVjZWl2ZWQgJHtpbnNwZWN0ZWR9YCxcbiAgICApO1xuICB9XG59XG5cbi8vIEEgaGVscGVyIGZ1bmN0aW9uIHRvIHNpbXBsaWZ5IGNoZWNraW5nIGZvciBFUlJfSU5WQUxJRF9BUkdfVFlQRSBvdXRwdXQuXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZnVuY3Rpb24gaW52YWxpZEFyZ1R5cGVIZWxwZXIoaW5wdXQ6IGFueSkge1xuICBpZiAoaW5wdXQgPT0gbnVsbCkge1xuICAgIHJldHVybiBgIFJlY2VpdmVkICR7aW5wdXR9YDtcbiAgfVxuICBpZiAodHlwZW9mIGlucHV0ID09PSBcImZ1bmN0aW9uXCIgJiYgaW5wdXQubmFtZSkge1xuICAgIHJldHVybiBgIFJlY2VpdmVkIGZ1bmN0aW9uICR7aW5wdXQubmFtZX1gO1xuICB9XG4gIGlmICh0eXBlb2YgaW5wdXQgPT09IFwib2JqZWN0XCIpIHtcbiAgICBpZiAoaW5wdXQuY29uc3RydWN0b3IgJiYgaW5wdXQuY29uc3RydWN0b3IubmFtZSkge1xuICAgICAgcmV0dXJuIGAgUmVjZWl2ZWQgYW4gaW5zdGFuY2Ugb2YgJHtpbnB1dC5jb25zdHJ1Y3Rvci5uYW1lfWA7XG4gICAgfVxuICAgIHJldHVybiBgIFJlY2VpdmVkICR7aW5zcGVjdChpbnB1dCwgeyBkZXB0aDogLTEgfSl9YDtcbiAgfVxuICBsZXQgaW5zcGVjdGVkID0gaW5zcGVjdChpbnB1dCwgeyBjb2xvcnM6IGZhbHNlIH0pO1xuICBpZiAoaW5zcGVjdGVkLmxlbmd0aCA+IDI1KSB7XG4gICAgaW5zcGVjdGVkID0gYCR7aW5zcGVjdGVkLnNsaWNlKDAsIDI1KX0uLi5gO1xuICB9XG4gIHJldHVybiBgIFJlY2VpdmVkIHR5cGUgJHt0eXBlb2YgaW5wdXR9ICgke2luc3BlY3RlZH0pYDtcbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9PVVRfT0ZfUkFOR0UgZXh0ZW5kcyBSYW5nZUVycm9yIHtcbiAgY29kZSA9IFwiRVJSX09VVF9PRl9SQU5HRVwiO1xuXG4gIGNvbnN0cnVjdG9yKHN0cjogc3RyaW5nLCByYW5nZTogc3RyaW5nLCByZWNlaXZlZDogdW5rbm93bikge1xuICAgIHN1cGVyKFxuICAgICAgYFRoZSB2YWx1ZSBvZiBcIiR7c3RyfVwiIGlzIG91dCBvZiByYW5nZS4gSXQgbXVzdCBiZSAke3JhbmdlfS4gUmVjZWl2ZWQgJHtyZWNlaXZlZH1gLFxuICAgICk7XG5cbiAgICBjb25zdCB7IG5hbWUgfSA9IHRoaXM7XG4gICAgLy8gQWRkIHRoZSBlcnJvciBjb2RlIHRvIHRoZSBuYW1lIHRvIGluY2x1ZGUgaXQgaW4gdGhlIHN0YWNrIHRyYWNlLlxuICAgIHRoaXMubmFtZSA9IGAke25hbWV9IFske3RoaXMuY29kZX1dYDtcbiAgICAvLyBBY2Nlc3MgdGhlIHN0YWNrIHRvIGdlbmVyYXRlIHRoZSBlcnJvciBtZXNzYWdlIGluY2x1ZGluZyB0aGUgZXJyb3IgY29kZSBmcm9tIHRoZSBuYW1lLlxuICAgIHRoaXMuc3RhY2s7XG4gICAgLy8gUmVzZXQgdGhlIG5hbWUgdG8gdGhlIGFjdHVhbCBuYW1lLlxuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9BTUJJR1VPVVNfQVJHVU1FTlQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIkVSUl9BTUJJR1VPVVNfQVJHVU1FTlRcIiwgYFRoZSBcIiR7eH1cIiBhcmd1bWVudCBpcyBhbWJpZ3VvdXMuICR7eX1gKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0FSR19OT1RfSVRFUkFCTEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXCJFUlJfQVJHX05PVF9JVEVSQUJMRVwiLCBgJHt4fSBtdXN0IGJlIGl0ZXJhYmxlYCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9BU1NFUlRJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIkVSUl9BU1NFUlRJT05cIiwgYCR7eH1gKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0FTWU5DX0NBTExCQUNLIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFwiRVJSX0FTWU5DX0NBTExCQUNLXCIsIGAke3h9IG11c3QgYmUgYSBmdW5jdGlvbmApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQVNZTkNfVFlQRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcIkVSUl9BU1lOQ19UWVBFXCIsIGBJbnZhbGlkIG5hbWUgZm9yIGFzeW5jIFwidHlwZVwiOiAke3h9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9CUk9UTElfSU5WQUxJRF9QQVJBTSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXCJFUlJfQlJPVExJX0lOVkFMSURfUEFSQU1cIiwgYCR7eH0gaXMgbm90IGEgdmFsaWQgQnJvdGxpIHBhcmFtZXRlcmApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQlVGRkVSX09VVF9PRl9CT1VORFMgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG5hbWU/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0JVRkZFUl9PVVRfT0ZfQk9VTkRTXCIsXG4gICAgICBuYW1lXG4gICAgICAgID8gYFwiJHtuYW1lfVwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kc2BcbiAgICAgICAgOiBcIkF0dGVtcHQgdG8gYWNjZXNzIG1lbW9yeSBvdXRzaWRlIGJ1ZmZlciBib3VuZHNcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQlVGRkVSX1RPT19MQVJHRSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9CVUZGRVJfVE9PX0xBUkdFXCIsXG4gICAgICBgQ2Fubm90IGNyZWF0ZSBhIEJ1ZmZlciBsYXJnZXIgdGhhbiAke3h9IGJ5dGVzYCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ0FOTk9UX1dBVENIX1NJR0lOVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ0FOTk9UX1dBVENIX1NJR0lOVFwiLFxuICAgICAgXCJDYW5ub3Qgd2F0Y2ggZm9yIFNJR0lOVCBzaWduYWxzXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NISUxEX0NMT1NFRF9CRUZPUkVfUkVQTFkgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NISUxEX0NMT1NFRF9CRUZPUkVfUkVQTFlcIixcbiAgICAgIFwiQ2hpbGQgY2xvc2VkIGJlZm9yZSByZXBseSByZWNlaXZlZFwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DSElMRF9QUk9DRVNTX0lQQ19SRVFVSVJFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ0hJTERfUFJPQ0VTU19JUENfUkVRVUlSRURcIixcbiAgICAgIGBGb3JrZWQgcHJvY2Vzc2VzIG11c3QgaGF2ZSBhbiBJUEMgY2hhbm5lbCwgbWlzc2luZyB2YWx1ZSAnaXBjJyBpbiAke3h9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ0hJTERfUFJPQ0VTU19TVERJT19NQVhCVUZGRVIgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ0hJTERfUFJPQ0VTU19TVERJT19NQVhCVUZGRVJcIixcbiAgICAgIGAke3h9IG1heEJ1ZmZlciBsZW5ndGggZXhjZWVkZWRgLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DT05TT0xFX1dSSVRBQkxFX1NUUkVBTSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NPTlNPTEVfV1JJVEFCTEVfU1RSRUFNXCIsXG4gICAgICBgQ29uc29sZSBleHBlY3RzIGEgd3JpdGFibGUgc3RyZWFtIGluc3RhbmNlIGZvciAke3h9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ09OVEVYVF9OT1RfSU5JVElBTElaRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NPTlRFWFRfTk9UX0lOSVRJQUxJWkVEXCIsXG4gICAgICBcImNvbnRleHQgdXNlZCBpcyBub3QgaW5pdGlhbGl6ZWRcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1BVX1VTQUdFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUFVfVVNBR0VcIixcbiAgICAgIGBVbmFibGUgdG8gb2J0YWluIGNwdSB1c2FnZSAke3h9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0NVU1RPTV9FTkdJTkVfTk9UX1NVUFBPUlRFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0NVU1RPTV9FTkdJTkVfTk9UX1NVUFBPUlRFRFwiLFxuICAgICAgXCJDdXN0b20gZW5naW5lcyBub3Qgc3VwcG9ydGVkIGJ5IHRoaXMgT3BlblNTTFwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fRUNESF9JTlZBTElEX0ZPUk1BVCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19FQ0RIX0lOVkFMSURfRk9STUFUXCIsXG4gICAgICBgSW52YWxpZCBFQ0RIIGZvcm1hdDogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19FQ0RIX0lOVkFMSURfUFVCTElDX0tFWSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0VDREhfSU5WQUxJRF9QVUJMSUNfS0VZXCIsXG4gICAgICBcIlB1YmxpYyBrZXkgaXMgbm90IHZhbGlkIGZvciBzcGVjaWZpZWQgY3VydmVcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0VOR0lORV9VTktOT1dOIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fRU5HSU5FX1VOS05PV05cIixcbiAgICAgIGBFbmdpbmUgXCIke3h9XCIgd2FzIG5vdCBmb3VuZGAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19GSVBTX0ZPUkNFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0ZJUFNfRk9SQ0VEXCIsXG4gICAgICBcIkNhbm5vdCBzZXQgRklQUyBtb2RlLCBpdCB3YXMgZm9yY2VkIHdpdGggLS1mb3JjZS1maXBzIGF0IHN0YXJ0dXAuXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19GSVBTX1VOQVZBSUxBQkxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fRklQU19VTkFWQUlMQUJMRVwiLFxuICAgICAgXCJDYW5ub3Qgc2V0IEZJUFMgbW9kZSBpbiBhIG5vbi1GSVBTIGJ1aWxkLlwiLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9DUllQVE9fSEFTSF9GSU5BTElaRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19IQVNIX0ZJTkFMSVpFRFwiLFxuICAgICAgXCJEaWdlc3QgYWxyZWFkeSBjYWxsZWRcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0hBU0hfVVBEQVRFX0ZBSUxFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0hBU0hfVVBEQVRFX0ZBSUxFRFwiLFxuICAgICAgXCJIYXNoIHVwZGF0ZSBmYWlsZWRcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0lOQ09NUEFUSUJMRV9LRVkgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0lOQ09NUEFUSUJMRV9LRVlcIixcbiAgICAgIGBJbmNvbXBhdGlibGUgJHt4fTogJHt5fWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19JTkNPTVBBVElCTEVfS0VZX09QVElPTlMgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX0lOQ09NUEFUSUJMRV9LRVlfT1BUSU9OU1wiLFxuICAgICAgYFRoZSBzZWxlY3RlZCBrZXkgZW5jb2RpbmcgJHt4fSAke3l9LmAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19JTlZBTElEX0RJR0VTVCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0NSWVBUT19JTlZBTElEX0RJR0VTVFwiLFxuICAgICAgYEludmFsaWQgZGlnZXN0OiAke3h9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX0lOVkFMSURfS0VZX09CSkVDVF9UWVBFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fSU5WQUxJRF9LRVlfT0JKRUNUX1RZUEVcIixcbiAgICAgIGBJbnZhbGlkIGtleSBvYmplY3QgdHlwZSAke3h9LCBleHBlY3RlZCAke3l9LmAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19JTlZBTElEX1NUQVRFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fSU5WQUxJRF9TVEFURVwiLFxuICAgICAgYEludmFsaWQgc3RhdGUgZm9yIG9wZXJhdGlvbiAke3h9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX1BCS0RGMl9FUlJPUiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX1BCS0RGMl9FUlJPUlwiLFxuICAgICAgXCJQQktERjIgZXJyb3JcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX1NDUllQVF9JTlZBTElEX1BBUkFNRVRFUiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX1NDUllQVF9JTlZBTElEX1BBUkFNRVRFUlwiLFxuICAgICAgXCJJbnZhbGlkIHNjcnlwdCBwYXJhbWV0ZXJcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfQ1JZUFRPX1NDUllQVF9OT1RfU1VQUE9SVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9DUllQVE9fU0NSWVBUX05PVF9TVVBQT1JURURcIixcbiAgICAgIFwiU2NyeXB0IGFsZ29yaXRobSBub3Qgc3VwcG9ydGVkXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0NSWVBUT19TSUdOX0tFWV9SRVFVSVJFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfQ1JZUFRPX1NJR05fS0VZX1JFUVVJUkVEXCIsXG4gICAgICBcIk5vIGtleSBwcm92aWRlZCB0byBzaWduXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0RJUl9DTE9TRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0RJUl9DTE9TRURcIixcbiAgICAgIFwiRGlyZWN0b3J5IGhhbmRsZSB3YXMgY2xvc2VkXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0RJUl9DT05DVVJSRU5UX09QRVJBVElPTiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRElSX0NPTkNVUlJFTlRfT1BFUkFUSU9OXCIsXG4gICAgICBcIkNhbm5vdCBkbyBzeW5jaHJvbm91cyB3b3JrIG9uIGRpcmVjdG9yeSBoYW5kbGUgd2l0aCBjb25jdXJyZW50IGFzeW5jaHJvbm91cyBvcGVyYXRpb25zXCIsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0ROU19TRVRfU0VSVkVSU19GQUlMRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRE5TX1NFVF9TRVJWRVJTX0ZBSUxFRFwiLFxuICAgICAgYGMtYXJlcyBmYWlsZWQgdG8gc2V0IHNlcnZlcnM6IFwiJHt4fVwiIFske3l9XWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0RPTUFJTl9DQUxMQkFDS19OT1RfQVZBSUxBQkxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9ET01BSU5fQ0FMTEJBQ0tfTk9UX0FWQUlMQUJMRVwiLFxuICAgICAgXCJBIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkIHRocm91Z2ggXCIgK1xuICAgICAgICBcInByb2Nlc3Muc2V0VW5jYXVnaHRFeGNlcHRpb25DYXB0dXJlQ2FsbGJhY2soKSwgd2hpY2ggaXMgbXV0dWFsbHkgXCIgK1xuICAgICAgICBcImV4Y2x1c2l2ZSB3aXRoIHVzaW5nIHRoZSBgZG9tYWluYCBtb2R1bGVcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfRE9NQUlOX0NBTk5PVF9TRVRfVU5DQVVHSFRfRVhDRVBUSU9OX0NBUFRVUkVcbiAgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0RPTUFJTl9DQU5OT1RfU0VUX1VOQ0FVR0hUX0VYQ0VQVElPTl9DQVBUVVJFXCIsXG4gICAgICBcIlRoZSBgZG9tYWluYCBtb2R1bGUgaXMgaW4gdXNlLCB3aGljaCBpcyBtdXR1YWxseSBleGNsdXNpdmUgd2l0aCBjYWxsaW5nIFwiICtcbiAgICAgICAgXCJwcm9jZXNzLnNldFVuY2F1Z2h0RXhjZXB0aW9uQ2FwdHVyZUNhbGxiYWNrKClcIixcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfRU5DT0RJTkdfSU5WQUxJRF9FTkNPREVEX0RBVEEgZXh0ZW5kcyBOb2RlRXJyb3JBYnN0cmFjdGlvblxuICBpbXBsZW1lbnRzIFR5cGVFcnJvciB7XG4gIGVycm5vOiBudW1iZXI7XG4gIGNvbnN0cnVjdG9yKGVuY29kaW5nOiBzdHJpbmcsIHJldDogbnVtYmVyKSB7XG4gICAgc3VwZXIoXG4gICAgICBUeXBlRXJyb3IucHJvdG90eXBlLm5hbWUsXG4gICAgICBcIkVSUl9FTkNPRElOR19JTlZBTElEX0VOQ09ERURfREFUQVwiLFxuICAgICAgYFRoZSBlbmNvZGVkIGRhdGEgd2FzIG5vdCB2YWxpZCBmb3IgZW5jb2RpbmcgJHtlbmNvZGluZ31gLFxuICAgICk7XG4gICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIFR5cGVFcnJvci5wcm90b3R5cGUpO1xuXG4gICAgdGhpcy5lcnJubyA9IHJldDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0VOQ09ESU5HX05PVF9TVVBQT1JURUQgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRU5DT0RJTkdfTk9UX1NVUFBPUlRFRFwiLFxuICAgICAgYFRoZSBcIiR7eH1cIiBlbmNvZGluZyBpcyBub3Qgc3VwcG9ydGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0VWQUxfRVNNX0NBTk5PVF9QUklOVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRVZBTF9FU01fQ0FOTk9UX1BSSU5UXCIsXG4gICAgICBgLS1wcmludCBjYW5ub3QgYmUgdXNlZCB3aXRoIEVTTSBpbnB1dGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9FVkVOVF9SRUNVUlNJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0VWRU5UX1JFQ1VSU0lPTlwiLFxuICAgICAgYFRoZSBldmVudCBcIiR7eH1cIiBpcyBhbHJlYWR5IGJlaW5nIGRpc3BhdGNoZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfRkVBVFVSRV9VTkFWQUlMQUJMRV9PTl9QTEFURk9STSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0ZFQVRVUkVfVU5BVkFJTEFCTEVfT05fUExBVEZPUk1cIixcbiAgICAgIGBUaGUgZmVhdHVyZSAke3h9IGlzIHVuYXZhaWxhYmxlIG9uIHRoZSBjdXJyZW50IHBsYXRmb3JtLCB3aGljaCBpcyBiZWluZyB1c2VkIHRvIHJ1biBOb2RlLmpzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0ZTX0ZJTEVfVE9PX0xBUkdFIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0ZTX0ZJTEVfVE9PX0xBUkdFXCIsXG4gICAgICBgRmlsZSBzaXplICgke3h9KSBpcyBncmVhdGVyIHRoYW4gMiBHQmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9GU19JTlZBTElEX1NZTUxJTktfVFlQRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRlNfSU5WQUxJRF9TWU1MSU5LX1RZUEVcIixcbiAgICAgIGBTeW1saW5rIHR5cGUgbXVzdCBiZSBvbmUgb2YgXCJkaXJcIiwgXCJmaWxlXCIsIG9yIFwianVuY3Rpb25cIi4gUmVjZWl2ZWQgXCIke3h9XCJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfQUxUU1ZDX0lOVkFMSURfT1JJR0lOIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfQUxUU1ZDX0lOVkFMSURfT1JJR0lOXCIsXG4gICAgICBgSFRUUC8yIEFMVFNWQyBmcmFtZXMgcmVxdWlyZSBhIHZhbGlkIG9yaWdpbmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9BTFRTVkNfTEVOR1RIIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfQUxUU1ZDX0xFTkdUSFwiLFxuICAgICAgYEhUVFAvMiBBTFRTVkMgZnJhbWVzIGFyZSBsaW1pdGVkIHRvIDE2MzgyIGJ5dGVzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0NPTk5FQ1RfQVVUSE9SSVRZIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9DT05ORUNUX0FVVEhPUklUWVwiLFxuICAgICAgYDphdXRob3JpdHkgaGVhZGVyIGlzIHJlcXVpcmVkIGZvciBDT05ORUNUIHJlcXVlc3RzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0NPTk5FQ1RfUEFUSCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfQ09OTkVDVF9QQVRIXCIsXG4gICAgICBgVGhlIDpwYXRoIGhlYWRlciBpcyBmb3JiaWRkZW4gZm9yIENPTk5FQ1QgcmVxdWVzdHNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfQ09OTkVDVF9TQ0hFTUUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0NPTk5FQ1RfU0NIRU1FXCIsXG4gICAgICBgVGhlIDpzY2hlbWUgaGVhZGVyIGlzIGZvcmJpZGRlbiBmb3IgQ09OTkVDVCByZXF1ZXN0c2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9HT0FXQVlfU0VTU0lPTiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfR09BV0FZX1NFU1NJT05cIixcbiAgICAgIGBOZXcgc3RyZWFtcyBjYW5ub3QgYmUgY3JlYXRlZCBhZnRlciByZWNlaXZpbmcgYSBHT0FXQVlgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfSEVBREVSU19BRlRFUl9SRVNQT05EIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9IRUFERVJTX0FGVEVSX1JFU1BPTkRcIixcbiAgICAgIGBDYW5ub3Qgc3BlY2lmeSBhZGRpdGlvbmFsIGhlYWRlcnMgYWZ0ZXIgcmVzcG9uc2UgaW5pdGlhdGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0hFQURFUlNfU0VOVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSEVBREVSU19TRU5UXCIsXG4gICAgICBgUmVzcG9uc2UgaGFzIGFscmVhZHkgYmVlbiBpbml0aWF0ZWQuYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0hFQURFUl9TSU5HTEVfVkFMVUUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9IRUFERVJfU0lOR0xFX1ZBTFVFXCIsXG4gICAgICBgSGVhZGVyIGZpZWxkIFwiJHt4fVwiIG11c3Qgb25seSBoYXZlIGEgc2luZ2xlIHZhbHVlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lORk9fU1RBVFVTX05PVF9BTExPV0VEIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lORk9fU1RBVFVTX05PVF9BTExPV0VEXCIsXG4gICAgICBgSW5mb3JtYXRpb25hbCBzdGF0dXMgY29kZXMgY2Fubm90IGJlIHVzZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfSU5WQUxJRF9DT05ORUNUSU9OX0hFQURFUlMgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9JTlZBTElEX0NPTk5FQ1RJT05fSEVBREVSU1wiLFxuICAgICAgYEhUVFAvMSBDb25uZWN0aW9uIHNwZWNpZmljIGhlYWRlcnMgYXJlIGZvcmJpZGRlbjogXCIke3h9XCJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfSU5WQUxJRF9IRUFERVJfVkFMVUUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfSEVBREVSX1ZBTFVFXCIsXG4gICAgICBgSW52YWxpZCB2YWx1ZSBcIiR7eH1cIiBmb3IgaGVhZGVyIFwiJHt5fVwiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfSU5GT19TVEFUVVMgZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSU5WQUxJRF9JTkZPX1NUQVRVU1wiLFxuICAgICAgYEludmFsaWQgaW5mb3JtYXRpb25hbCBzdGF0dXMgY29kZTogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX09SSUdJTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfT1JJR0lOXCIsXG4gICAgICBgSFRUUC8yIE9SSUdJTiBmcmFtZXMgcmVxdWlyZSBhIHZhbGlkIG9yaWdpbmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9JTlZBTElEX1BBQ0tFRF9TRVRUSU5HU19MRU5HVEggZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSU5WQUxJRF9QQUNLRURfU0VUVElOR1NfTEVOR1RIXCIsXG4gICAgICBgUGFja2VkIHNldHRpbmdzIGxlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2Ygc2l4YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfUFNFVURPSEVBREVSIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSU5WQUxJRF9QU0VVRE9IRUFERVJcIixcbiAgICAgIGBcIiR7eH1cIiBpcyBhbiBpbnZhbGlkIHBzZXVkb2hlYWRlciBvciBpcyB1c2VkIGluY29ycmVjdGx5YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfU0VTU0lPTiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfSU5WQUxJRF9TRVNTSU9OXCIsXG4gICAgICBgVGhlIHNlc3Npb24gaGFzIGJlZW4gZGVzdHJveWVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfU1RSRUFNIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9JTlZBTElEX1NUUkVBTVwiLFxuICAgICAgYFRoZSBzdHJlYW0gaGFzIGJlZW4gZGVzdHJveWVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX01BWF9QRU5ESU5HX1NFVFRJTkdTX0FDSyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfTUFYX1BFTkRJTkdfU0VUVElOR1NfQUNLXCIsXG4gICAgICBgTWF4aW11bSBudW1iZXIgb2YgcGVuZGluZyBzZXR0aW5ncyBhY2tub3dsZWRnZW1lbnRzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX05FU1RFRF9QVVNIIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9ORVNURURfUFVTSFwiLFxuICAgICAgYEEgcHVzaCBzdHJlYW0gY2Fubm90IGluaXRpYXRlIGFub3RoZXIgcHVzaCBzdHJlYW0uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX05PX1NPQ0tFVF9NQU5JUFVMQVRJT04gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX05PX1NPQ0tFVF9NQU5JUFVMQVRJT05cIixcbiAgICAgIGBIVFRQLzIgc29ja2V0cyBzaG91bGQgbm90IGJlIGRpcmVjdGx5IG1hbmlwdWxhdGVkIChlLmcuIHJlYWQgYW5kIHdyaXR0ZW4pYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX09SSUdJTl9MRU5HVEggZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9PUklHSU5fTEVOR1RIXCIsXG4gICAgICBgSFRUUC8yIE9SSUdJTiBmcmFtZXMgYXJlIGxpbWl0ZWQgdG8gMTYzODIgYnl0ZXNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfT1VUX09GX1NUUkVBTVMgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX09VVF9PRl9TVFJFQU1TXCIsXG4gICAgICBgTm8gc3RyZWFtIElEIGlzIGF2YWlsYWJsZSBiZWNhdXNlIG1heGltdW0gc3RyZWFtIElEIGhhcyBiZWVuIHJlYWNoZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfUEFZTE9BRF9GT1JCSURERU4gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1BBWUxPQURfRk9SQklEREVOXCIsXG4gICAgICBgUmVzcG9uc2VzIHdpdGggJHt4fSBzdGF0dXMgbXVzdCBub3QgaGF2ZSBhIHBheWxvYWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfUElOR19DQU5DRUwgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1BJTkdfQ0FOQ0VMXCIsXG4gICAgICBgSFRUUDIgcGluZyBjYW5jZWxsZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfUElOR19MRU5HVEggZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfUElOR19MRU5HVEhcIixcbiAgICAgIGBIVFRQMiBwaW5nIHBheWxvYWQgbXVzdCBiZSA4IGJ5dGVzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1BTRVVET0hFQURFUl9OT1RfQUxMT1dFRCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1BTRVVET0hFQURFUl9OT1RfQUxMT1dFRFwiLFxuICAgICAgYENhbm5vdCBzZXQgSFRUUC8yIHBzZXVkby1oZWFkZXJzYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1BVU0hfRElTQUJMRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1BVU0hfRElTQUJMRURcIixcbiAgICAgIGBIVFRQLzIgY2xpZW50IGhhcyBkaXNhYmxlZCBwdXNoIHN0cmVhbXNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU0VORF9GSUxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TRU5EX0ZJTEVcIixcbiAgICAgIGBEaXJlY3RvcmllcyBjYW5ub3QgYmUgc2VudGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TRU5EX0ZJTEVfTk9TRUVLIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TRU5EX0ZJTEVfTk9TRUVLXCIsXG4gICAgICBgT2Zmc2V0IG9yIGxlbmd0aCBjYW4gb25seSBiZSBzcGVjaWZpZWQgZm9yIHJlZ3VsYXIgZmlsZXNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU0VTU0lPTl9FUlJPUiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfU0VTU0lPTl9FUlJPUlwiLFxuICAgICAgYFNlc3Npb24gY2xvc2VkIHdpdGggZXJyb3IgY29kZSAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NFVFRJTkdTX0NBTkNFTCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUDJfU0VUVElOR1NfQ0FOQ0VMXCIsXG4gICAgICBgSFRUUDIgc2Vzc2lvbiBzZXR0aW5ncyBjYW5jZWxlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TT0NLRVRfQk9VTkQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NPQ0tFVF9CT1VORFwiLFxuICAgICAgYFRoZSBzb2NrZXQgaXMgYWxyZWFkeSBib3VuZCB0byBhbiBIdHRwMlNlc3Npb25gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU09DS0VUX1VOQk9VTkQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NPQ0tFVF9VTkJPVU5EXCIsXG4gICAgICBgVGhlIHNvY2tldCBoYXMgYmVlbiBkaXNjb25uZWN0ZWQgZnJvbSB0aGUgSHR0cDJTZXNzaW9uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NUQVRVU18xMDEgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NUQVRVU18xMDFcIixcbiAgICAgIGBIVFRQIHN0YXR1cyBjb2RlIDEwMSAoU3dpdGNoaW5nIFByb3RvY29scykgaXMgZm9yYmlkZGVuIGluIEhUVFAvMmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9TVEFUVVNfSU5WQUxJRCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TVEFUVVNfSU5WQUxJRFwiLFxuICAgICAgYEludmFsaWQgc3RhdHVzIGNvZGU6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSFRUUDJfU1RSRUFNX0VSUk9SIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9TVFJFQU1fRVJST1JcIixcbiAgICAgIGBTdHJlYW0gY2xvc2VkIHdpdGggZXJyb3IgY29kZSAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NUUkVBTV9TRUxGX0RFUEVOREVOQ1kgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NUUkVBTV9TRUxGX0RFUEVOREVOQ1lcIixcbiAgICAgIGBBIHN0cmVhbSBjYW5ub3QgZGVwZW5kIG9uIGl0c2VsZmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9UUkFJTEVSU19BTFJFQURZX1NFTlQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1RSQUlMRVJTX0FMUkVBRFlfU0VOVFwiLFxuICAgICAgYFRyYWlsaW5nIGhlYWRlcnMgaGF2ZSBhbHJlYWR5IGJlZW4gc2VudGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQMl9UUkFJTEVSU19OT1RfUkVBRFkgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1RSQUlMRVJTX05PVF9SRUFEWVwiLFxuICAgICAgYFRyYWlsaW5nIGhlYWRlcnMgY2Fubm90IGJlIHNlbnQgdW50aWwgYWZ0ZXIgdGhlIHdhbnRUcmFpbGVycyBldmVudCBpcyBlbWl0dGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1VOU1VQUE9SVEVEX1BST1RPQ09MIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQMl9VTlNVUFBPUlRFRF9QUk9UT0NPTFwiLFxuICAgICAgYHByb3RvY29sIFwiJHt4fVwiIGlzIHVuc3VwcG9ydGVkLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQX0hFQURFUlNfU0VOVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUF9IRUFERVJTX1NFTlRcIixcbiAgICAgIGBDYW5ub3QgJHt4fSBoZWFkZXJzIGFmdGVyIHRoZXkgYXJlIHNlbnQgdG8gdGhlIGNsaWVudGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQX0lOVkFMSURfSEVBREVSX1ZBTFVFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQX0lOVkFMSURfSEVBREVSX1ZBTFVFXCIsXG4gICAgICBgSW52YWxpZCB2YWx1ZSBcIiR7eH1cIiBmb3IgaGVhZGVyIFwiJHt5fVwiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFBfSU5WQUxJRF9TVEFUVVNfQ09ERSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQX0lOVkFMSURfU1RBVFVTX0NPREVcIixcbiAgICAgIGBJbnZhbGlkIHN0YXR1cyBjb2RlOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFBfU09DS0VUX0VOQ09ESU5HIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9IVFRQX1NPQ0tFVF9FTkNPRElOR1wiLFxuICAgICAgYENoYW5naW5nIHRoZSBzb2NrZXQgZW5jb2RpbmcgaXMgbm90IGFsbG93ZWQgcGVyIFJGQzcyMzAgU2VjdGlvbiAzLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9IVFRQX1RSQUlMRVJfSU5WQUxJRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSFRUUF9UUkFJTEVSX0lOVkFMSURcIixcbiAgICAgIGBUcmFpbGVycyBhcmUgaW52YWxpZCB3aXRoIHRoaXMgdHJhbnNmZXIgZW5jb2RpbmdgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5DT01QQVRJQkxFX09QVElPTl9QQUlSIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTkNPTVBBVElCTEVfT1BUSU9OX1BBSVJcIixcbiAgICAgIGBPcHRpb24gXCIke3h9XCIgY2Fubm90IGJlIHVzZWQgaW4gY29tYmluYXRpb24gd2l0aCBvcHRpb24gXCIke3l9XCJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5QVVRfVFlQRV9OT1RfQUxMT1dFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5QVVRfVFlQRV9OT1RfQUxMT1dFRFwiLFxuICAgICAgYC0taW5wdXQtdHlwZSBjYW4gb25seSBiZSB1c2VkIHdpdGggc3RyaW5nIGlucHV0IHZpYSAtLWV2YWwsIC0tcHJpbnQsIG9yIFNURElOYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOU1BFQ1RPUl9BTFJFQURZX0FDVElWQVRFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX0FMUkVBRFlfQUNUSVZBVEVEXCIsXG4gICAgICBgSW5zcGVjdG9yIGlzIGFscmVhZHkgYWN0aXZhdGVkLiBDbG9zZSBpdCB3aXRoIGluc3BlY3Rvci5jbG9zZSgpIGJlZm9yZSBhY3RpdmF0aW5nIGl0IGFnYWluLmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfQUxSRUFEWV9DT05ORUNURUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOU1BFQ1RPUl9BTFJFQURZX0NPTk5FQ1RFRFwiLFxuICAgICAgYCR7eH0gaXMgYWxyZWFkeSBjb25uZWN0ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5TUEVDVE9SX0NMT1NFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX0NMT1NFRFwiLFxuICAgICAgYFNlc3Npb24gd2FzIGNsb3NlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfQ09NTUFORCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlNQRUNUT1JfQ09NTUFORFwiLFxuICAgICAgYEluc3BlY3RvciBlcnJvciAke3h9OiAke3l9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOU1BFQ1RPUl9OT1RfQUNUSVZFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlNQRUNUT1JfTk9UX0FDVElWRVwiLFxuICAgICAgYEluc3BlY3RvciBpcyBub3QgYWN0aXZlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOU1BFQ1RPUl9OT1RfQVZBSUxBQkxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlNQRUNUT1JfTk9UX0FWQUlMQUJMRVwiLFxuICAgICAgYEluc3BlY3RvciBpcyBub3QgYXZhaWxhYmxlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOU1BFQ1RPUl9OT1RfQ09OTkVDVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlNQRUNUT1JfTk9UX0NPTk5FQ1RFRFwiLFxuICAgICAgYFNlc3Npb24gaXMgbm90IGNvbm5lY3RlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlNQRUNUT1JfTk9UX1dPUktFUiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5TUEVDVE9SX05PVF9XT1JLRVJcIixcbiAgICAgIGBDdXJyZW50IHRocmVhZCBpcyBub3QgYSB3b3JrZXJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9BU1lOQ19JRCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfQVNZTkNfSURcIixcbiAgICAgIGBJbnZhbGlkICR7eH0gdmFsdWU6ICR7eX1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9CVUZGRVJfU0laRSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0JVRkZFUl9TSVpFXCIsXG4gICAgICBgQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9DQUxMQkFDSyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihvYmplY3Q6IHVua25vd24pIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfQ0FMTEJBQ0tcIixcbiAgICAgIGBDYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24uIFJlY2VpdmVkICR7aW5zcGVjdChvYmplY3QpfWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0NVUlNPUl9QT1MgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0NVUlNPUl9QT1NcIixcbiAgICAgIGBDYW5ub3Qgc2V0IGN1cnNvciByb3cgd2l0aG91dCBzZXR0aW5nIGl0cyBjb2x1bW5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9GRCBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0ZEXCIsXG4gICAgICBgXCJmZFwiIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfRkRfVFlQRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfRkRfVFlQRVwiLFxuICAgICAgYFVuc3VwcG9ydGVkIGZkIHR5cGU6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9GSUxFX1VSTF9IT1NUIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9GSUxFX1VSTF9IT1NUXCIsXG4gICAgICBgRmlsZSBVUkwgaG9zdCBtdXN0IGJlIFwibG9jYWxob3N0XCIgb3IgZW1wdHkgb24gJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX0ZJTEVfVVJMX1BBVEggZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0ZJTEVfVVJMX1BBVEhcIixcbiAgICAgIGBGaWxlIFVSTCBwYXRoICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9IQU5ETEVfVFlQRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfSEFORExFX1RZUEVcIixcbiAgICAgIGBUaGlzIGhhbmRsZSB0eXBlIGNhbm5vdCBiZSBzZW50YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfSFRUUF9UT0tFTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9IVFRQX1RPS0VOXCIsXG4gICAgICBgJHt4fSBtdXN0IGJlIGEgdmFsaWQgSFRUUCB0b2tlbiBbXCIke3l9XCJdYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfSVBfQUREUkVTUyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfSVBfQUREUkVTU1wiLFxuICAgICAgYEludmFsaWQgSVAgYWRkcmVzczogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX09QVF9WQUxVRV9FTkNPRElORyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfT1BUX1ZBTFVFX0VOQ09ESU5HXCIsXG4gICAgICBgVGhlIHZhbHVlIFwiJHt4fVwiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcImVuY29kaW5nXCJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9QRVJGT1JNQU5DRV9NQVJLIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1BFUkZPUk1BTkNFX01BUktcIixcbiAgICAgIGBUaGUgXCIke3h9XCIgcGVyZm9ybWFuY2UgbWFyayBoYXMgbm90IGJlZW4gc2V0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUFJPVE9DT0wgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfUFJPVE9DT0xcIixcbiAgICAgIGBQcm90b2NvbCBcIiR7eH1cIiBub3Qgc3VwcG9ydGVkLiBFeHBlY3RlZCBcIiR7eX1cImAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1JFUExfRVZBTF9DT05GSUcgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1JFUExfRVZBTF9DT05GSUdcIixcbiAgICAgIGBDYW5ub3Qgc3BlY2lmeSBib3RoIFwiYnJlYWtFdmFsT25TaWdpbnRcIiBhbmQgXCJldmFsXCIgZm9yIFJFUExgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9SRVBMX0lOUFVUIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9SRVBMX0lOUFVUXCIsXG4gICAgICBgJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1NZTkNfRk9SS19JTlBVVCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfU1lOQ19GT1JLX0lOUFVUXCIsXG4gICAgICBgQXN5bmNocm9ub3VzIGZvcmtzIGRvIG5vdCBzdXBwb3J0IEJ1ZmZlciwgVHlwZWRBcnJheSwgRGF0YVZpZXcgb3Igc3RyaW5nIGlucHV0OiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfVEhJUyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfVEhJU1wiLFxuICAgICAgYFZhbHVlIG9mIFwidGhpc1wiIG11c3QgYmUgb2YgdHlwZSAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfVFVQTEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfVFVQTEVcIixcbiAgICAgIGAke3h9IG11c3QgYmUgYW4gaXRlcmFibGUgJHt5fSB0dXBsZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX1VSSSBleHRlbmRzIE5vZGVVUklFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9VUklcIixcbiAgICAgIGBVUkkgbWFsZm9ybWVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lQQ19DSEFOTkVMX0NMT1NFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSVBDX0NIQU5ORUxfQ0xPU0VEXCIsXG4gICAgICBgQ2hhbm5lbCBjbG9zZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfSVBDX0RJU0NPTk5FQ1RFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSVBDX0RJU0NPTk5FQ1RFRFwiLFxuICAgICAgYElQQyBjaGFubmVsIGlzIGFscmVhZHkgZGlzY29ubmVjdGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0lQQ19PTkVfUElQRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSVBDX09ORV9QSVBFXCIsXG4gICAgICBgQ2hpbGQgcHJvY2VzcyBjYW4gaGF2ZSBvbmx5IG9uZSBJUEMgcGlwZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9JUENfU1lOQ19GT1JLIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JUENfU1lOQ19GT1JLXCIsXG4gICAgICBgSVBDIGNhbm5vdCBiZSB1c2VkIHdpdGggc3luY2hyb25vdXMgZm9ya3NgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTUFOSUZFU1RfREVQRU5ERU5DWV9NSVNTSU5HIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01BTklGRVNUX0RFUEVOREVOQ1lfTUlTU0lOR1wiLFxuICAgICAgYE1hbmlmZXN0IHJlc291cmNlICR7eH0gZG9lcyBub3QgbGlzdCAke3l9IGFzIGEgZGVwZW5kZW5jeSBzcGVjaWZpZXJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTUFOSUZFU1RfSU5URUdSSVRZX01JU01BVENIIGV4dGVuZHMgTm9kZVN5bnRheEVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9NQU5JRkVTVF9JTlRFR1JJVFlfTUlTTUFUQ0hcIixcbiAgICAgIGBNYW5pZmVzdCByZXNvdXJjZSAke3h9IGhhcyBtdWx0aXBsZSBlbnRyaWVzIGJ1dCBpbnRlZ3JpdHkgbGlzdHMgZG8gbm90IG1hdGNoYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01BTklGRVNUX0lOVkFMSURfUkVTT1VSQ0VfRklFTEQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01BTklGRVNUX0lOVkFMSURfUkVTT1VSQ0VfRklFTERcIixcbiAgICAgIGBNYW5pZmVzdCByZXNvdXJjZSAke3h9IGhhcyBpbnZhbGlkIHByb3BlcnR5IHZhbHVlIGZvciAke3l9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01BTklGRVNUX1REWiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTUFOSUZFU1RfVERaXCIsXG4gICAgICBgTWFuaWZlc3QgaW5pdGlhbGl6YXRpb24gaGFzIG5vdCB5ZXQgcnVuYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01BTklGRVNUX1VOS05PV05fT05FUlJPUiBleHRlbmRzIE5vZGVTeW50YXhFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTUFOSUZFU1RfVU5LTk9XTl9PTkVSUk9SXCIsXG4gICAgICBgTWFuaWZlc3Qgc3BlY2lmaWVkIHVua25vd24gZXJyb3IgYmVoYXZpb3IgXCIke3h9XCIuYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01FVEhPRF9OT1RfSU1QTEVNRU5URUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01FVEhPRF9OT1RfSU1QTEVNRU5URURcIixcbiAgICAgIGBUaGUgJHt4fSBtZXRob2QgaXMgbm90IGltcGxlbWVudGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX01JU1NJTkdfQVJHUyBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvciguLi5hcmdzOiAoc3RyaW5nIHwgc3RyaW5nW10pW10pIHtcbiAgICBsZXQgbXNnID0gXCJUaGUgXCI7XG5cbiAgICBjb25zdCBsZW4gPSBhcmdzLmxlbmd0aDtcblxuICAgIGNvbnN0IHdyYXAgPSAoYTogdW5rbm93bikgPT4gYFwiJHthfVwiYDtcblxuICAgIGFyZ3MgPSBhcmdzLm1hcChcbiAgICAgIChhKSA9PiAoQXJyYXkuaXNBcnJheShhKSA/IGEubWFwKHdyYXApLmpvaW4oXCIgb3IgXCIpIDogd3JhcChhKSksXG4gICAgKTtcblxuICAgIHN3aXRjaCAobGVuKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIG1zZyArPSBgJHthcmdzWzBdfSBhcmd1bWVudGA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBtc2cgKz0gYCR7YXJnc1swXX0gYW5kICR7YXJnc1sxXX0gYXJndW1lbnRzYDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBtc2cgKz0gYXJncy5zbGljZSgwLCBsZW4gLSAxKS5qb2luKFwiLCBcIik7XG4gICAgICAgIG1zZyArPSBgLCBhbmQgJHthcmdzW2xlbiAtIDFdfSBhcmd1bWVudHNgO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01JU1NJTkdfQVJHU1wiLFxuICAgICAgYCR7bXNnfSBtdXN0IGJlIHNwZWNpZmllZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NSVNTSU5HX09QVElPTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX01JU1NJTkdfT1BUSU9OXCIsXG4gICAgICBgJHt4fSBpcyByZXF1aXJlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9NVUxUSVBMRV9DQUxMQkFDSyBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTVVMVElQTEVfQ0FMTEJBQ0tcIixcbiAgICAgIGBDYWxsYmFjayBjYWxsZWQgbXVsdGlwbGUgdGltZXNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTkFQSV9DT05TX0ZVTkNUSU9OIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTkFQSV9DT05TX0ZVTkNUSU9OXCIsXG4gICAgICBgQ29uc3RydWN0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX05BUElfSU5WQUxJRF9EQVRBVklFV19BUkdTIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX05BUElfSU5WQUxJRF9EQVRBVklFV19BUkdTXCIsXG4gICAgICBgYnl0ZV9vZmZzZXQgKyBieXRlX2xlbmd0aCBzaG91bGQgYmUgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIHRoZSBzaXplIGluIGJ5dGVzIG9mIHRoZSBhcnJheSBwYXNzZWQgaW5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTkFQSV9JTlZBTElEX1RZUEVEQVJSQVlfQUxJR05NRU5UIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTkFQSV9JTlZBTElEX1RZUEVEQVJSQVlfQUxJR05NRU5UXCIsXG4gICAgICBgc3RhcnQgb2Zmc2V0IG9mICR7eH0gc2hvdWxkIGJlIGEgbXVsdGlwbGUgb2YgJHt5fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9OQVBJX0lOVkFMSURfVFlQRURBUlJBWV9MRU5HVEggZXh0ZW5kcyBOb2RlUmFuZ2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTkFQSV9JTlZBTElEX1RZUEVEQVJSQVlfTEVOR1RIXCIsXG4gICAgICBgSW52YWxpZCB0eXBlZCBhcnJheSBsZW5ndGhgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTk9fQ1JZUFRPIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9OT19DUllQVE9cIixcbiAgICAgIGBOb2RlLmpzIGlzIG5vdCBjb21waWxlZCB3aXRoIE9wZW5TU0wgY3J5cHRvIHN1cHBvcnRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfTk9fSUNVIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTk9fSUNVXCIsXG4gICAgICBgJHt4fSBpcyBub3Qgc3VwcG9ydGVkIG9uIE5vZGUuanMgY29tcGlsZWQgd2l0aG91dCBJQ1VgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ0NMSUVOVFNFU1NJT05fRkFJTEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDQ0xJRU5UU0VTU0lPTl9GQUlMRURcIixcbiAgICAgIGBGYWlsZWQgdG8gY3JlYXRlIGEgbmV3IFF1aWNDbGllbnRTZXNzaW9uOiAke3h9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNDTElFTlRTRVNTSU9OX0ZBSUxFRF9TRVRTT0NLRVQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNDTElFTlRTRVNTSU9OX0ZBSUxFRF9TRVRTT0NLRVRcIixcbiAgICAgIGBGYWlsZWQgdG8gc2V0IHRoZSBRdWljU29ja2V0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNTRVNTSU9OX0RFU1RST1lFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NFU1NJT05fREVTVFJPWUVEXCIsXG4gICAgICBgQ2Fubm90IGNhbGwgJHt4fSBhZnRlciBhIFF1aWNTZXNzaW9uIGhhcyBiZWVuIGRlc3Ryb3llZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU0VTU0lPTl9JTlZBTElEX0RDSUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTRVNTSU9OX0lOVkFMSURfRENJRFwiLFxuICAgICAgYEludmFsaWQgRENJRCB2YWx1ZTogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU0VTU0lPTl9VUERBVEVLRVkgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTRVNTSU9OX1VQREFURUtFWVwiLFxuICAgICAgYFVuYWJsZSB0byB1cGRhdGUgUXVpY1Nlc3Npb24ga2V5c2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU09DS0VUX0RFU1RST1lFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NPQ0tFVF9ERVNUUk9ZRURcIixcbiAgICAgIGBDYW5ub3QgY2FsbCAke3h9IGFmdGVyIGEgUXVpY1NvY2tldCBoYXMgYmVlbiBkZXN0cm95ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NPQ0tFVF9JTlZBTElEX1NUQVRFTEVTU19SRVNFVF9TRUNSRVRfTEVOR1RIXG4gIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU09DS0VUX0lOVkFMSURfU1RBVEVMRVNTX1JFU0VUX1NFQ1JFVF9MRU5HVEhcIixcbiAgICAgIGBUaGUgc3RhdGVSZXNldFRva2VuIG11c3QgYmUgZXhhY3RseSAxNi1ieXRlcyBpbiBsZW5ndGhgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfUVVJQ1NPQ0tFVF9MSVNURU5JTkcgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTT0NLRVRfTElTVEVOSU5HXCIsXG4gICAgICBgVGhpcyBRdWljU29ja2V0IGlzIGFscmVhZHkgbGlzdGVuaW5nYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNTT0NLRVRfVU5CT1VORCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NPQ0tFVF9VTkJPVU5EXCIsXG4gICAgICBgQ2Fubm90IGNhbGwgJHt4fSBiZWZvcmUgYSBRdWljU29ja2V0IGhhcyBiZWVuIGJvdW5kYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNTVFJFQU1fREVTVFJPWUVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU1RSRUFNX0RFU1RST1lFRFwiLFxuICAgICAgYENhbm5vdCBjYWxsICR7eH0gYWZ0ZXIgYSBRdWljU3RyZWFtIGhhcyBiZWVuIGRlc3Ryb3llZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU1RSRUFNX0lOVkFMSURfUFVTSCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfUVVJQ1NUUkVBTV9JTlZBTElEX1BVU0hcIixcbiAgICAgIGBQdXNoIHN0cmVhbXMgYXJlIG9ubHkgc3VwcG9ydGVkIG9uIGNsaWVudC1pbml0aWF0ZWQsIGJpZGlyZWN0aW9uYWwgc3RyZWFtc2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU1RSRUFNX09QRU5fRkFJTEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9RVUlDU1RSRUFNX09QRU5fRkFJTEVEXCIsXG4gICAgICBgT3BlbmluZyBhIG5ldyBRdWljU3RyZWFtIGZhaWxlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9RVUlDU1RSRUFNX1VOU1VQUE9SVEVEX1BVU0ggZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNTVFJFQU1fVU5TVVBQT1JURURfUFVTSFwiLFxuICAgICAgYFB1c2ggc3RyZWFtcyBhcmUgbm90IHN1cHBvcnRlZCBvbiB0aGlzIFF1aWNTZXNzaW9uYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1FVSUNfVExTMTNfUkVRVUlSRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1FVSUNfVExTMTNfUkVRVUlSRURcIixcbiAgICAgIGBRVUlDIHJlcXVpcmVzIFRMUyB2ZXJzaW9uIDEuM2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TQ1JJUFRfRVhFQ1VUSU9OX0lOVEVSUlVQVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TQ1JJUFRfRVhFQ1VUSU9OX0lOVEVSUlVQVEVEXCIsXG4gICAgICBcIlNjcmlwdCBleGVjdXRpb24gd2FzIGludGVycnVwdGVkIGJ5IGBTSUdJTlRgXCIsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TRVJWRVJfQUxSRUFEWV9MSVNURU4gZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NFUlZFUl9BTFJFQURZX0xJU1RFTlwiLFxuICAgICAgYExpc3RlbiBtZXRob2QgaGFzIGJlZW4gY2FsbGVkIG1vcmUgdGhhbiBvbmNlIHdpdGhvdXQgY2xvc2luZy5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU0VSVkVSX05PVF9SVU5OSU5HIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TRVJWRVJfTk9UX1JVTk5JTkdcIixcbiAgICAgIGBTZXJ2ZXIgaXMgbm90IHJ1bm5pbmcuYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9BTFJFQURZX0JPVU5EIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TT0NLRVRfQUxSRUFEWV9CT1VORFwiLFxuICAgICAgYFNvY2tldCBpcyBhbHJlYWR5IGJvdW5kYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9CQURfQlVGRkVSX1NJWkUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TT0NLRVRfQkFEX0JVRkZFUl9TSVpFXCIsXG4gICAgICBgQnVmZmVyIHNpemUgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU09DS0VUX0JBRF9QT1JUIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHBvcnQ6IHVua25vd24sIGFsbG93WmVybyA9IHRydWUpIHtcbiAgICBhc3NlcnQoXG4gICAgICB0eXBlb2YgYWxsb3daZXJvID09PSBcImJvb2xlYW5cIixcbiAgICAgIFwiVGhlICdhbGxvd1plcm8nIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLlwiLFxuICAgICk7XG5cbiAgICBjb25zdCBvcGVyYXRvciA9IGFsbG93WmVybyA/IFwiPj1cIiA6IFwiPlwiO1xuXG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TT0NLRVRfQkFEX1BPUlRcIixcbiAgICAgIGAke25hbWV9IHNob3VsZCBiZSAke29wZXJhdG9yfSAwIGFuZCA8IDY1NTM2LiBSZWNlaXZlZCAke3BvcnR9LmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TT0NLRVRfQkFEX1RZUEUgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TT0NLRVRfQkFEX1RZUEVcIixcbiAgICAgIGBCYWQgc29ja2V0IHR5cGUgc3BlY2lmaWVkLiBWYWxpZCB0eXBlcyBhcmU6IHVkcDQsIHVkcDZgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU09DS0VUX0NMT1NFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0NMT1NFRFwiLFxuICAgICAgYFNvY2tldCBpcyBjbG9zZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU09DS0VUX0RHUkFNX0lTX0NPTk5FQ1RFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU09DS0VUX0RHUkFNX0lTX0NPTk5FQ1RFRFwiLFxuICAgICAgYEFscmVhZHkgY29ubmVjdGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NPQ0tFVF9ER1JBTV9OT1RfQ09OTkVDVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TT0NLRVRfREdSQU1fTk9UX0NPTk5FQ1RFRFwiLFxuICAgICAgYE5vdCBjb25uZWN0ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU09DS0VUX0RHUkFNX05PVF9SVU5OSU5HIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TT0NLRVRfREdSQU1fTk9UX1JVTk5JTkdcIixcbiAgICAgIGBOb3QgcnVubmluZ2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TUklfUEFSU0UgZXh0ZW5kcyBOb2RlU3ludGF4RXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGNoYXI6IHN0cmluZywgcG9zaXRpb246IG51bWJlcikge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU1JJX1BBUlNFXCIsXG4gICAgICBgU3VicmVzb3VyY2UgSW50ZWdyaXR5IHN0cmluZyAke25hbWV9IGhhZCBhbiB1bmV4cGVjdGVkICR7Y2hhcn0gYXQgcG9zaXRpb24gJHtwb3NpdGlvbn1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1RSRUFNX0FMUkVBRFlfRklOSVNIRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9BTFJFQURZX0ZJTklTSEVEXCIsXG4gICAgICBgQ2Fubm90IGNhbGwgJHt4fSBhZnRlciBhIHN0cmVhbSB3YXMgZmluaXNoZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1RSRUFNX0NBTk5PVF9QSVBFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TVFJFQU1fQ0FOTk9UX1BJUEVcIixcbiAgICAgIGBDYW5ub3QgcGlwZSwgbm90IHJlYWRhYmxlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9ERVNUUk9ZRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9ERVNUUk9ZRURcIixcbiAgICAgIGBDYW5ub3QgY2FsbCAke3h9IGFmdGVyIGEgc3RyZWFtIHdhcyBkZXN0cm95ZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1RSRUFNX05VTExfVkFMVUVTIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU1RSRUFNX05VTExfVkFMVUVTXCIsXG4gICAgICBgTWF5IG5vdCB3cml0ZSBudWxsIHZhbHVlcyB0byBzdHJlYW1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1RSRUFNX1BSRU1BVFVSRV9DTE9TRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU1RSRUFNX1BSRU1BVFVSRV9DTE9TRVwiLFxuICAgICAgYFByZW1hdHVyZSBjbG9zZWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9TVFJFQU1fUFVTSF9BRlRFUl9FT0YgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9QVVNIX0FGVEVSX0VPRlwiLFxuICAgICAgYHN0cmVhbS5wdXNoKCkgYWZ0ZXIgRU9GYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9VTlNISUZUX0FGVEVSX0VORF9FVkVOVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfU1RSRUFNX1VOU0hJRlRfQUZURVJfRU5EX0VWRU5UXCIsXG4gICAgICBgc3RyZWFtLnVuc2hpZnQoKSBhZnRlciBlbmQgZXZlbnRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1RSRUFNX1dSQVAgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9XUkFQXCIsXG4gICAgICBgU3RyZWFtIGhhcyBTdHJpbmdEZWNvZGVyIHNldCBvciBpcyBpbiBvYmplY3RNb2RlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1NUUkVBTV9XUklURV9BRlRFUl9FTkQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1NUUkVBTV9XUklURV9BRlRFUl9FTkRcIixcbiAgICAgIGB3cml0ZSBhZnRlciBlbmRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfU1lOVEhFVElDIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9TWU5USEVUSUNcIixcbiAgICAgIGBKYXZhU2NyaXB0IENhbGxzdGFja2AsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfREhfUEFSQU1fU0laRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX0RIX1BBUkFNX1NJWkVcIixcbiAgICAgIGBESCBwYXJhbWV0ZXIgc2l6ZSAke3h9IGlzIGxlc3MgdGhhbiAyMDQ4YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RMU19IQU5EU0hBS0VfVElNRU9VVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX0hBTkRTSEFLRV9USU1FT1VUXCIsXG4gICAgICBgVExTIGhhbmRzaGFrZSB0aW1lb3V0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RMU19JTlZBTElEX0NPTlRFWFQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UTFNfSU5WQUxJRF9DT05URVhUXCIsXG4gICAgICBgJHt4fSBtdXN0IGJlIGEgU2VjdXJlQ29udGV4dGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfSU5WQUxJRF9TVEFURSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX0lOVkFMSURfU1RBVEVcIixcbiAgICAgIGBUTFMgc29ja2V0IGNvbm5lY3Rpb24gbXVzdCBiZSBzZWN1cmVseSBlc3RhYmxpc2hlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfSU5WQUxJRF9QUk9UT0NPTF9WRVJTSU9OIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHByb3RvY29sOiBzdHJpbmcsIHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX0lOVkFMSURfUFJPVE9DT0xfVkVSU0lPTlwiLFxuICAgICAgYCR7cHJvdG9jb2x9IGlzIG5vdCBhIHZhbGlkICR7eH0gVExTIHByb3RvY29sIHZlcnNpb25gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVExTX1BST1RPQ09MX1ZFUlNJT05fQ09ORkxJQ1QgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IocHJldlByb3RvY29sOiBzdHJpbmcsIHByb3RvY29sOiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19QUk9UT0NPTF9WRVJTSU9OX0NPTkZMSUNUXCIsXG4gICAgICBgVExTIHByb3RvY29sIHZlcnNpb24gJHtwcmV2UHJvdG9jb2x9IGNvbmZsaWN0cyB3aXRoIHNlY3VyZVByb3RvY29sICR7cHJvdG9jb2x9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RMU19SRU5FR09USUFUSU9OX0RJU0FCTEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9UTFNfUkVORUdPVElBVElPTl9ESVNBQkxFRFwiLFxuICAgICAgYFRMUyBzZXNzaW9uIHJlbmVnb3RpYXRpb24gZGlzYWJsZWQgZm9yIHRoaXMgc29ja2V0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RMU19SRVFVSVJFRF9TRVJWRVJfTkFNRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVExTX1JFUVVJUkVEX1NFUlZFUl9OQU1FXCIsXG4gICAgICBgXCJzZXJ2ZXJuYW1lXCIgaXMgcmVxdWlyZWQgcGFyYW1ldGVyIGZvciBTZXJ2ZXIuYWRkQ29udGV4dGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UTFNfU0VTU0lPTl9BVFRBQ0sgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19TRVNTSU9OX0FUVEFDS1wiLFxuICAgICAgYFRMUyBzZXNzaW9uIHJlbmVnb3RpYXRpb24gYXR0YWNrIGRldGVjdGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RMU19TTklfRlJPTV9TRVJWRVIgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RMU19TTklfRlJPTV9TRVJWRVJcIixcbiAgICAgIGBDYW5ub3QgaXNzdWUgU05JIGZyb20gYSBUTFMgc2VydmVyLXNpZGUgc29ja2V0YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1RSQUNFX0VWRU5UU19DQVRFR09SWV9SRVFVSVJFRCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RSQUNFX0VWRU5UU19DQVRFR09SWV9SRVFVSVJFRFwiLFxuICAgICAgYEF0IGxlYXN0IG9uZSBjYXRlZ29yeSBpcyByZXF1aXJlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9UUkFDRV9FVkVOVFNfVU5BVkFJTEFCTEUgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1RSQUNFX0VWRU5UU19VTkFWQUlMQUJMRVwiLFxuICAgICAgYFRyYWNlIGV2ZW50cyBhcmUgdW5hdmFpbGFibGVgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5BVkFJTEFCTEVfRFVSSU5HX0VYSVQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOQVZBSUxBQkxFX0RVUklOR19FWElUXCIsXG4gICAgICBgQ2Fubm90IGNhbGwgZnVuY3Rpb24gaW4gcHJvY2VzcyBleGl0IGhhbmRsZXJgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5DQVVHSFRfRVhDRVBUSU9OX0NBUFRVUkVfQUxSRUFEWV9TRVQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOQ0FVR0hUX0VYQ0VQVElPTl9DQVBUVVJFX0FMUkVBRFlfU0VUXCIsXG4gICAgICBcImBwcm9jZXNzLnNldHVwVW5jYXVnaHRFeGNlcHRpb25DYXB0dXJlKClgIHdhcyBjYWxsZWQgd2hpbGUgYSBjYXB0dXJlIGNhbGxiYWNrIHdhcyBhbHJlYWR5IGFjdGl2ZVwiLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5FU0NBUEVEX0NIQVJBQ1RFUlMgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTkVTQ0FQRURfQ0hBUkFDVEVSU1wiLFxuICAgICAgYCR7eH0gY29udGFpbnMgdW5lc2NhcGVkIGNoYXJhY3RlcnNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5IQU5ETEVEX0VSUk9SIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTkhBTkRMRURfRVJST1JcIixcbiAgICAgIGBVbmhhbmRsZWQgZXJyb3IuICgke3h9KWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9VTktOT1dOX0JVSUxUSU5fTU9EVUxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTktOT1dOX0JVSUxUSU5fTU9EVUxFXCIsXG4gICAgICBgTm8gc3VjaCBidWlsdC1pbiBtb2R1bGU6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5LTk9XTl9DUkVERU5USUFMIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nLCB5OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOS05PV05fQ1JFREVOVElBTFwiLFxuICAgICAgYCR7eH0gaWRlbnRpZmllciBkb2VzIG5vdCBleGlzdDogJHt5fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9VTktOT1dOX0VOQ09ESU5HIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5LTk9XTl9FTkNPRElOR1wiLFxuICAgICAgYFVua25vd24gZW5jb2Rpbmc6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5LTk9XTl9GSUxFX0VYVEVOU0lPTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcsIHk6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVU5LTk9XTl9GSUxFX0VYVEVOU0lPTlwiLFxuICAgICAgYFVua25vd24gZmlsZSBleHRlbnNpb24gXCIke3h9XCIgZm9yICR7eX1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5LTk9XTl9NT0RVTEVfRk9STUFUIGV4dGVuZHMgTm9kZVJhbmdlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOS05PV05fTU9EVUxFX0ZPUk1BVFwiLFxuICAgICAgYFVua25vd24gbW9kdWxlIGZvcm1hdDogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9VTktOT1dOX1NJR05BTCBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1VOS05PV05fU0lHTkFMXCIsXG4gICAgICBgVW5rbm93biBzaWduYWw6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVU5TVVBQT1JURURfRElSX0lNUE9SVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZywgeTogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTlNVUFBPUlRFRF9ESVJfSU1QT1JUXCIsXG4gICAgICBgRGlyZWN0b3J5IGltcG9ydCAnJHt4fScgaXMgbm90IHN1cHBvcnRlZCByZXNvbHZpbmcgRVMgbW9kdWxlcywgaW1wb3J0ZWQgZnJvbSAke3l9YCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1VOU1VQUE9SVEVEX0VTTV9VUkxfU0NIRU1FIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9VTlNVUFBPUlRFRF9FU01fVVJMX1NDSEVNRVwiLFxuICAgICAgYE9ubHkgZmlsZSBhbmQgZGF0YSBVUkxzIGFyZSBzdXBwb3J0ZWQgYnkgdGhlIGRlZmF1bHQgRVNNIGxvYWRlcmAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9WOEJSRUFLSVRFUkFUT1IgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1Y4QlJFQUtJVEVSQVRPUlwiLFxuICAgICAgYEZ1bGwgSUNVIGRhdGEgbm90IGluc3RhbGxlZC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS93aWtpL0ludGxgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVkFMSURfUEVSRk9STUFOQ0VfRU5UUllfVFlQRSBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVkFMSURfUEVSRk9STUFOQ0VfRU5UUllfVFlQRVwiLFxuICAgICAgYEF0IGxlYXN0IG9uZSB2YWxpZCBwZXJmb3JtYW5jZSBlbnRyeSB0eXBlIGlzIHJlcXVpcmVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZNX0RZTkFNSUNfSU1QT1JUX0NBTExCQUNLX01JU1NJTkcgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WTV9EWU5BTUlDX0lNUE9SVF9DQUxMQkFDS19NSVNTSU5HXCIsXG4gICAgICBgQSBkeW5hbWljIGltcG9ydCBjYWxsYmFjayB3YXMgbm90IHNwZWNpZmllZC5gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVk1fTU9EVUxFX0FMUkVBRFlfTElOS0VEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WTV9NT0RVTEVfQUxSRUFEWV9MSU5LRURcIixcbiAgICAgIGBNb2R1bGUgaGFzIGFscmVhZHkgYmVlbiBsaW5rZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVk1fTU9EVUxFX0NBTk5PVF9DUkVBVEVfQ0FDSEVEX0RBVEEgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1ZNX01PRFVMRV9DQU5OT1RfQ1JFQVRFX0NBQ0hFRF9EQVRBXCIsXG4gICAgICBgQ2FjaGVkIGRhdGEgY2Fubm90IGJlIGNyZWF0ZWQgZm9yIGEgbW9kdWxlIHdoaWNoIGhhcyBiZWVuIGV2YWx1YXRlZGAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9WTV9NT0RVTEVfRElGRkVSRU5UX0NPTlRFWFQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1ZNX01PRFVMRV9ESUZGRVJFTlRfQ09OVEVYVFwiLFxuICAgICAgYExpbmtlZCBtb2R1bGVzIG11c3QgdXNlIHRoZSBzYW1lIGNvbnRleHRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfVk1fTU9EVUxFX0xJTktJTkdfRVJST1JFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfVk1fTU9EVUxFX0xJTktJTkdfRVJST1JFRFwiLFxuICAgICAgYExpbmtpbmcgaGFzIGFscmVhZHkgZmFpbGVkIGZvciB0aGUgcHJvdmlkZWQgbW9kdWxlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZNX01PRFVMRV9OT1RfTU9EVUxFIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9WTV9NT0RVTEVfTk9UX01PRFVMRVwiLFxuICAgICAgYFByb3ZpZGVkIG1vZHVsZSBpcyBub3QgYW4gaW5zdGFuY2Ugb2YgTW9kdWxlYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1ZNX01PRFVMRV9TVEFUVVMgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1ZNX01PRFVMRV9TVEFUVVNcIixcbiAgICAgIGBNb2R1bGUgc3RhdHVzICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfV0FTSV9BTFJFQURZX1NUQVJURUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1dBU0lfQUxSRUFEWV9TVEFSVEVEXCIsXG4gICAgICBgV0FTSSBpbnN0YW5jZSBoYXMgYWxyZWFkeSBzdGFydGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1dPUktFUl9JTklUX0ZBSUxFRCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHg6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfV09SS0VSX0lOSVRfRkFJTEVEXCIsXG4gICAgICBgV29ya2VyIGluaXRpYWxpemF0aW9uIGZhaWx1cmU6ICR7eH1gLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfV09SS0VSX05PVF9SVU5OSU5HIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9XT1JLRVJfTk9UX1JVTk5JTkdcIixcbiAgICAgIGBXb3JrZXIgaW5zdGFuY2Ugbm90IHJ1bm5pbmdgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfV09SS0VSX09VVF9PRl9NRU1PUlkgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1dPUktFUl9PVVRfT0ZfTUVNT1JZXCIsXG4gICAgICBgV29ya2VyIHRlcm1pbmF0ZWQgZHVlIHRvIHJlYWNoaW5nIG1lbW9yeSBsaW1pdDogJHt4fWAsXG4gICAgKTtcbiAgfVxufVxuZXhwb3J0IGNsYXNzIEVSUl9XT1JLRVJfVU5TRVJJQUxJWkFCTEVfRVJST1IgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1dPUktFUl9VTlNFUklBTElaQUJMRV9FUlJPUlwiLFxuICAgICAgYFNlcmlhbGl6aW5nIGFuIHVuY2F1Z2h0IGV4Y2VwdGlvbiBmYWlsZWRgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfV09SS0VSX1VOU1VQUE9SVEVEX0VYVEVOU0lPTiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih4OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1dPUktFUl9VTlNVUFBPUlRFRF9FWFRFTlNJT05cIixcbiAgICAgIGBUaGUgd29ya2VyIHNjcmlwdCBleHRlbnNpb24gbXVzdCBiZSBcIi5qc1wiLCBcIi5tanNcIiwgb3IgXCIuY2pzXCIuIFJlY2VpdmVkIFwiJHt4fVwiYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX1dPUktFUl9VTlNVUFBPUlRFRF9PUEVSQVRJT04gZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoeDogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9XT1JLRVJfVU5TVVBQT1JURURfT1BFUkFUSU9OXCIsXG4gICAgICBgJHt4fSBpcyBub3Qgc3VwcG9ydGVkIGluIHdvcmtlcnNgLFxuICAgICk7XG4gIH1cbn1cbmV4cG9ydCBjbGFzcyBFUlJfWkxJQl9JTklUSUFMSVpBVElPTl9GQUlMRUQgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX1pMSUJfSU5JVElBTElaQVRJT05fRkFJTEVEXCIsXG4gICAgICBgSW5pdGlhbGl6YXRpb24gZmFpbGVkYCxcbiAgICApO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0ZBTFNZX1ZBTFVFX1JFSkVDVElPTiBleHRlbmRzIE5vZGVFcnJvciB7XG4gIHJlYXNvbjogc3RyaW5nO1xuICBjb25zdHJ1Y3RvcihyZWFzb246IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfRkFMU1lfVkFMVUVfUkVKRUNUSU9OXCIsXG4gICAgICBcIlByb21pc2Ugd2FzIHJlamVjdGVkIHdpdGggZmFsc3kgdmFsdWVcIixcbiAgICApO1xuICAgIHRoaXMucmVhc29uID0gcmVhc29uO1xuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX0lOVkFMSURfU0VUVElOR19WQUxVRSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgYWN0dWFsOiB1bmtub3duO1xuICBtaW4/OiBudW1iZXI7XG4gIG1heD86IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGFjdHVhbDogdW5rbm93biwgbWluPzogbnVtYmVyLCBtYXg/OiBudW1iZXIpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX0lOVkFMSURfU0VUVElOR19WQUxVRVwiLFxuICAgICAgYEludmFsaWQgdmFsdWUgZm9yIHNldHRpbmcgXCIke25hbWV9XCI6ICR7YWN0dWFsfWAsXG4gICAgKTtcbiAgICB0aGlzLmFjdHVhbCA9IGFjdHVhbDtcbiAgICBpZiAobWluICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMubWluID0gbWluO1xuICAgICAgdGhpcy5tYXggPSBtYXg7XG4gICAgfVxuICB9XG59XG5leHBvcnQgY2xhc3MgRVJSX0hUVFAyX1NUUkVBTV9DQU5DRUwgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjYXVzZT86IEVycm9yO1xuICBjb25zdHJ1Y3RvcihlcnJvcjogRXJyb3IpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0hUVFAyX1NUUkVBTV9DQU5DRUxcIixcbiAgICAgIHR5cGVvZiBlcnJvci5tZXNzYWdlID09PSBcInN0cmluZ1wiXG4gICAgICAgID8gYFRoZSBwZW5kaW5nIHN0cmVhbSBoYXMgYmVlbiBjYW5jZWxlZCAoY2F1c2VkIGJ5OiAke2Vycm9yLm1lc3NhZ2V9KWBcbiAgICAgICAgOiBcIlRoZSBwZW5kaW5nIHN0cmVhbSBoYXMgYmVlbiBjYW5jZWxlZFwiLFxuICAgICk7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICB0aGlzLmNhdXNlID0gZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9BRERSRVNTX0ZBTUlMWSBleHRlbmRzIE5vZGVSYW5nZUVycm9yIHtcbiAgaG9zdDogc3RyaW5nO1xuICBwb3J0OiBudW1iZXI7XG4gIGNvbnN0cnVjdG9yKGFkZHJlc3NUeXBlOiBzdHJpbmcsIGhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0FERFJFU1NfRkFNSUxZXCIsXG4gICAgICBgSW52YWxpZCBhZGRyZXNzIGZhbWlseTogJHthZGRyZXNzVHlwZX0gJHtob3N0fToke3BvcnR9YCxcbiAgICApO1xuICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgdGhpcy5wb3J0ID0gcG9ydDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfQ0hBUiBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGZpZWxkPzogc3RyaW5nKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX0NIQVJcIixcbiAgICAgIGZpZWxkXG4gICAgICAgID8gYEludmFsaWQgY2hhcmFjdGVyIGluICR7bmFtZX1gXG4gICAgICAgIDogYEludmFsaWQgY2hhcmFjdGVyIGluICR7bmFtZX0gW1wiJHtmaWVsZH1cIl1gLFxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9JTlZBTElEX09QVF9WQUxVRSBleHRlbmRzIE5vZGVUeXBlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSB7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX09QVF9WQUxVRVwiLFxuICAgICAgYFRoZSB2YWx1ZSBcIiR7dmFsdWV9XCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwiJHtuYW1lfVwiYCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9SRVRVUk5fUFJPUEVSVFkgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoaW5wdXQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBwcm9wOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfUkVUVVJOX1BST1BFUlRZXCIsXG4gICAgICBgRXhwZWN0ZWQgYSB2YWxpZCAke2lucHV0fSB0byBiZSByZXR1cm5lZCBmb3IgdGhlIFwiJHtwcm9wfVwiIGZyb20gdGhlIFwiJHtuYW1lfVwiIGZ1bmN0aW9uIGJ1dCBnb3QgJHt2YWx1ZX0uYCxcbiAgICApO1xuICB9XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5mdW5jdGlvbiBidWlsZFJldHVyblByb3BlcnR5VHlwZSh2YWx1ZTogYW55KSB7XG4gIGlmICh2YWx1ZSAmJiB2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lKSB7XG4gICAgcmV0dXJuIGBpbnN0YW5jZSBvZiAke3ZhbHVlLmNvbnN0cnVjdG9yLm5hbWV9YDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYHR5cGUgJHt0eXBlb2YgdmFsdWV9YDtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUkVUVVJOX1BST1BFUlRZX1ZBTFVFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGlucHV0OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgcHJvcDogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9SRVRVUk5fUFJPUEVSVFlfVkFMVUVcIixcbiAgICAgIGBFeHBlY3RlZCAke2lucHV0fSB0byBiZSByZXR1cm5lZCBmb3IgdGhlIFwiJHtwcm9wfVwiIGZyb20gdGhlIFwiJHtuYW1lfVwiIGZ1bmN0aW9uIGJ1dCBnb3QgJHtcbiAgICAgICAgYnVpbGRSZXR1cm5Qcm9wZXJ0eVR5cGUodmFsdWUpXG4gICAgICB9LmAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUkVUVVJOX1ZBTFVFIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGlucHV0OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfUkVUVVJOX1ZBTFVFXCIsXG4gICAgICBgRXhwZWN0ZWQgJHtpbnB1dH0gdG8gYmUgcmV0dXJuZWQgZnJvbSB0aGUgXCIke25hbWV9XCIgZnVuY3Rpb24gYnV0IGdvdCAke1xuICAgICAgICBidWlsZFJldHVyblByb3BlcnR5VHlwZSh2YWx1ZSlcbiAgICAgIH0uYCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9VUkwgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgaW5wdXQ6IHN0cmluZztcbiAgY29uc3RydWN0b3IoaW5wdXQ6IHN0cmluZykge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfSU5WQUxJRF9VUkxcIixcbiAgICAgIGBJbnZhbGlkIFVSTDogJHtpbnB1dH1gLFxuICAgICk7XG4gICAgdGhpcy5pbnB1dCA9IGlucHV0O1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9VUkxfU0NIRU1FIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGV4cGVjdGVkOiBzdHJpbmcgfCBbc3RyaW5nXSB8IFtzdHJpbmcsIHN0cmluZ10pIHtcbiAgICBleHBlY3RlZCA9IEFycmF5LmlzQXJyYXkoZXhwZWN0ZWQpID8gZXhwZWN0ZWQgOiBbZXhwZWN0ZWRdO1xuICAgIGNvbnN0IHJlcyA9IGV4cGVjdGVkLmxlbmd0aCA9PT0gMlxuICAgICAgPyBgb25lIG9mIHNjaGVtZSAke2V4cGVjdGVkWzBdfSBvciAke2V4cGVjdGVkWzFdfWBcbiAgICAgIDogYG9mIHNjaGVtZSAke2V4cGVjdGVkWzBdfWA7XG4gICAgc3VwZXIoXG4gICAgICBcIkVSUl9JTlZBTElEX1VSTF9TQ0hFTUVcIixcbiAgICAgIGBUaGUgVVJMIG11c3QgYmUgJHtyZXN9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfTU9EVUxFX05PVF9GT1VORCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHBhdGg6IHN0cmluZywgYmFzZTogc3RyaW5nLCB0eXBlOiBzdHJpbmcgPSBcInBhY2thZ2VcIikge1xuICAgIHN1cGVyKFxuICAgICAgXCJFUlJfTU9EVUxFX05PVF9GT1VORFwiLFxuICAgICAgYENhbm5vdCBmaW5kICR7dHlwZX0gJyR7cGF0aH0nIGltcG9ydGVkIGZyb20gJHtiYXNlfWAsXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRVJSX0lOVkFMSURfUEFDS0FHRV9DT05GSUcgZXh0ZW5kcyBOb2RlRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwYXRoOiBzdHJpbmcsIGJhc2U/OiBzdHJpbmcsIG1lc3NhZ2U/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBtc2cgPSBgSW52YWxpZCBwYWNrYWdlIGNvbmZpZyAke3BhdGh9JHtcbiAgICAgIGJhc2UgPyBgIHdoaWxlIGltcG9ydGluZyAke2Jhc2V9YCA6IFwiXCJcbiAgICB9JHttZXNzYWdlID8gYC4gJHttZXNzYWdlfWAgOiBcIlwifWA7XG4gICAgc3VwZXIoXCJFUlJfSU5WQUxJRF9QQUNLQUdFX0NPTkZJR1wiLCBtc2cpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9NT0RVTEVfU1BFQ0lGSUVSIGV4dGVuZHMgTm9kZVR5cGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHJlcXVlc3Q6IHN0cmluZywgcmVhc29uOiBzdHJpbmcsIGJhc2U/OiBzdHJpbmcpIHtcbiAgICBzdXBlcihcbiAgICAgIFwiRVJSX0lOVkFMSURfTU9EVUxFX1NQRUNJRklFUlwiLFxuICAgICAgYEludmFsaWQgbW9kdWxlIFwiJHtyZXF1ZXN0fVwiICR7cmVhc29ufSR7XG4gICAgICAgIGJhc2UgPyBgIGltcG9ydGVkIGZyb20gJHtiYXNlfWAgOiBcIlwiXG4gICAgICB9YCxcbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfSU5WQUxJRF9QQUNLQUdFX1RBUkdFVCBleHRlbmRzIE5vZGVFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHBrZ1BhdGg6IHN0cmluZyxcbiAgICBrZXk6IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIHRhcmdldDogYW55LFxuICAgIGlzSW1wb3J0PzogYm9vbGVhbixcbiAgICBiYXNlPzogc3RyaW5nLFxuICApIHtcbiAgICBsZXQgbXNnOiBzdHJpbmc7XG4gICAgY29uc3QgcmVsRXJyb3IgPSB0eXBlb2YgdGFyZ2V0ID09PSBcInN0cmluZ1wiICYmICFpc0ltcG9ydCAmJlxuICAgICAgdGFyZ2V0Lmxlbmd0aCAmJiAhdGFyZ2V0LnN0YXJ0c1dpdGgoXCIuL1wiKTtcbiAgICBpZiAoa2V5ID09PSBcIi5cIikge1xuICAgICAgYXNzZXJ0KGlzSW1wb3J0ID09PSBmYWxzZSk7XG4gICAgICBtc2cgPSBgSW52YWxpZCBcImV4cG9ydHNcIiBtYWluIHRhcmdldCAke0pTT04uc3RyaW5naWZ5KHRhcmdldCl9IGRlZmluZWQgYCArXG4gICAgICAgIGBpbiB0aGUgcGFja2FnZSBjb25maWcgJHtwa2dQYXRofXBhY2thZ2UuanNvbiR7XG4gICAgICAgICAgYmFzZSA/IGAgaW1wb3J0ZWQgZnJvbSAke2Jhc2V9YCA6IFwiXCJcbiAgICAgICAgfSR7cmVsRXJyb3IgPyAnOyB0YXJnZXRzIG11c3Qgc3RhcnQgd2l0aCBcIi4vXCInIDogXCJcIn1gO1xuICAgIH0gZWxzZSB7XG4gICAgICBtc2cgPSBgSW52YWxpZCBcIiR7aXNJbXBvcnQgPyBcImltcG9ydHNcIiA6IFwiZXhwb3J0c1wifVwiIHRhcmdldCAke1xuICAgICAgICBKU09OLnN0cmluZ2lmeSh0YXJnZXQpXG4gICAgICB9IGRlZmluZWQgZm9yICcke2tleX0nIGluIHRoZSBwYWNrYWdlIGNvbmZpZyAke3BrZ1BhdGh9cGFja2FnZS5qc29uJHtcbiAgICAgICAgYmFzZSA/IGAgaW1wb3J0ZWQgZnJvbSAke2Jhc2V9YCA6IFwiXCJcbiAgICAgIH0ke3JlbEVycm9yID8gJzsgdGFyZ2V0cyBtdXN0IHN0YXJ0IHdpdGggXCIuL1wiJyA6IFwiXCJ9YDtcbiAgICB9XG4gICAgc3VwZXIoXCJFUlJfSU5WQUxJRF9QQUNLQUdFX1RBUkdFVFwiLCBtc2cpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFUlJfUEFDS0FHRV9JTVBPUlRfTk9UX0RFRklORUQgZXh0ZW5kcyBOb2RlVHlwZUVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgc3BlY2lmaWVyOiBzdHJpbmcsXG4gICAgcGFja2FnZUpTT05Vcmw6IFVSTCB8IHVuZGVmaW5lZCxcbiAgICBiYXNlOiBzdHJpbmcgfCBVUkwsXG4gICkge1xuICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gcGFja2FnZUpTT05VcmwgJiZcbiAgICAgIGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi5cIiwgcGFja2FnZUpTT05VcmwpKTtcbiAgICBjb25zdCBtc2cgPSBgUGFja2FnZSBpbXBvcnQgc3BlY2lmaWVyIFwiJHtzcGVjaWZpZXJ9XCIgaXMgbm90IGRlZmluZWQke1xuICAgICAgcGFja2FnZVBhdGggPyBgIGluIHBhY2thZ2UgJHtwYWNrYWdlUGF0aH1wYWNrYWdlLmpzb25gIDogXCJcIlxuICAgIH0gaW1wb3J0ZWQgZnJvbSAke2ZpbGVVUkxUb1BhdGgoYmFzZSl9YDtcblxuICAgIHN1cGVyKFwiRVJSX1BBQ0tBR0VfSU1QT1JUX05PVF9ERUZJTkVEXCIsIG1zZyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVSUl9QQUNLQUdFX1BBVEhfTk9UX0VYUE9SVEVEIGV4dGVuZHMgTm9kZUVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgc3VicGF0aDogc3RyaW5nLFxuICAgIHBhY2thZ2VKU09OVXJsOiBzdHJpbmcsXG4gICAgYmFzZT86IHN0cmluZyxcbiAgKSB7XG4gICAgY29uc3QgcGtnUGF0aCA9IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi5cIiwgcGFja2FnZUpTT05VcmwpKTtcbiAgICBjb25zdCBiYXNlUGF0aCA9IGJhc2UgJiYgZmlsZVVSTFRvUGF0aChiYXNlKTtcblxuICAgIGxldCBtc2c6IHN0cmluZztcbiAgICBpZiAoc3VicGF0aCA9PT0gXCIuXCIpIHtcbiAgICAgIG1zZyA9IGBObyBcImV4cG9ydHNcIiBtYWluIGRlZmluZWQgaW4gJHtwa2dQYXRofXBhY2thZ2UuanNvbiR7XG4gICAgICAgIGJhc2VQYXRoID8gYCBpbXBvcnRlZCBmcm9tICR7YmFzZVBhdGh9YCA6IFwiXCJcbiAgICAgIH1gO1xuICAgIH0gZWxzZSB7XG4gICAgICBtc2cgPVxuICAgICAgICBgUGFja2FnZSBzdWJwYXRoICcke3N1YnBhdGh9JyBpcyBub3QgZGVmaW5lZCBieSBcImV4cG9ydHNcIiBpbiAke3BrZ1BhdGh9cGFja2FnZS5qc29uJHtcbiAgICAgICAgICBiYXNlUGF0aCA/IGAgaW1wb3J0ZWQgZnJvbSAke2Jhc2VQYXRofWAgOiBcIlwiXG4gICAgICAgIH1gO1xuICAgIH1cblxuICAgIHN1cGVyKFwiRVJSX1BBQ0tBR0VfUEFUSF9OT1RfRVhQT1JURURcIiwgbXNnKTtcbiAgfVxufVxuIl19