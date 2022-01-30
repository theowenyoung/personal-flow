import { YAMLError } from "../error.ts";
import { Mark } from "../mark.ts";
import * as common from "../utils.ts";
import { LoaderState } from "./loader_state.ts";
const { hasOwn } = Object;
const CONTEXT_FLOW_IN = 1;
const CONTEXT_FLOW_OUT = 2;
const CONTEXT_BLOCK_IN = 3;
const CONTEXT_BLOCK_OUT = 4;
const CHOMPING_CLIP = 1;
const CHOMPING_STRIP = 2;
const CHOMPING_KEEP = 3;
const PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
const PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
const PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
const PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
const PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
    return Object.prototype.toString.call(obj);
}
function isEOL(c) {
    return c === 0x0a || c === 0x0d;
}
function isWhiteSpace(c) {
    return c === 0x09 || c === 0x20;
}
function isWsOrEol(c) {
    return (c === 0x09 ||
        c === 0x20 ||
        c === 0x0a ||
        c === 0x0d);
}
function isFlowIndicator(c) {
    return (c === 0x2c ||
        c === 0x5b ||
        c === 0x5d ||
        c === 0x7b ||
        c === 0x7d);
}
function fromHexCode(c) {
    if (0x30 <= c && c <= 0x39) {
        return c - 0x30;
    }
    const lc = c | 0x20;
    if (0x61 <= lc && lc <= 0x66) {
        return lc - 0x61 + 10;
    }
    return -1;
}
function escapedHexLen(c) {
    if (c === 0x78) {
        return 2;
    }
    if (c === 0x75) {
        return 4;
    }
    if (c === 0x55) {
        return 8;
    }
    return 0;
}
function fromDecimalCode(c) {
    if (0x30 <= c && c <= 0x39) {
        return c - 0x30;
    }
    return -1;
}
function simpleEscapeSequence(c) {
    return c === 0x30
        ? "\x00"
        : c === 0x61
            ? "\x07"
            : c === 0x62
                ? "\x08"
                : c === 0x74
                    ? "\x09"
                    : c === 0x09
                        ? "\x09"
                        : c === 0x6e
                            ? "\x0A"
                            : c === 0x76
                                ? "\x0B"
                                : c === 0x66
                                    ? "\x0C"
                                    : c === 0x72
                                        ? "\x0D"
                                        : c === 0x65
                                            ? "\x1B"
                                            : c === 0x20
                                                ? " "
                                                : c === 0x22
                                                    ? "\x22"
                                                    : c === 0x2f
                                                        ? "/"
                                                        : c === 0x5c
                                                            ? "\x5C"
                                                            : c === 0x4e
                                                                ? "\x85"
                                                                : c === 0x5f
                                                                    ? "\xA0"
                                                                    : c === 0x4c
                                                                        ? "\u2028"
                                                                        : c === 0x50
                                                                            ? "\u2029"
                                                                            : "";
}
function charFromCodepoint(c) {
    if (c <= 0xffff) {
        return String.fromCharCode(c);
    }
    return String.fromCharCode(((c - 0x010000) >> 10) + 0xd800, ((c - 0x010000) & 0x03ff) + 0xdc00);
}
const simpleEscapeCheck = Array.from({ length: 256 });
const simpleEscapeMap = Array.from({ length: 256 });
for (let i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
}
function generateError(state, message) {
    return new YAMLError(message, new Mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart));
}
function throwError(state, message) {
    throw generateError(state, message);
}
function throwWarning(state, message) {
    if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
    }
}
const directiveHandlers = {
    YAML(state, _name, ...args) {
        if (state.version !== null) {
            return throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
            return throwError(state, "YAML directive accepts exactly one argument");
        }
        const match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
            return throwError(state, "ill-formed argument of the YAML directive");
        }
        const major = parseInt(match[1], 10);
        const minor = parseInt(match[2], 10);
        if (major !== 1) {
            return throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
            return throwWarning(state, "unsupported YAML version of the document");
        }
    },
    TAG(state, _name, ...args) {
        if (args.length !== 2) {
            return throwError(state, "TAG directive accepts exactly two arguments");
        }
        const handle = args[0];
        const prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
            return throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (state.tagMap && hasOwn(state.tagMap, handle)) {
            return throwError(state, `there is a previously declared suffix for "${handle}" tag handle`);
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
            return throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        if (typeof state.tagMap === "undefined") {
            state.tagMap = {};
        }
        state.tagMap[handle] = prefix;
    },
};
function captureSegment(state, start, end, checkJson) {
    let result;
    if (start < end) {
        result = state.input.slice(start, end);
        if (checkJson) {
            for (let position = 0, length = result.length; position < length; position++) {
                const character = result.charCodeAt(position);
                if (!(character === 0x09 || (0x20 <= character && character <= 0x10ffff))) {
                    return throwError(state, "expected valid JSON character");
                }
            }
        }
        else if (PATTERN_NON_PRINTABLE.test(result)) {
            return throwError(state, "the stream contains non-printable characters");
        }
        state.result += result;
    }
}
function mergeMappings(state, destination, source, overridableKeys) {
    if (!common.isObject(source)) {
        return throwError(state, "cannot merge mappings; the provided source object is unacceptable");
    }
    const keys = Object.keys(source);
    for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        if (!hasOwn(destination, key)) {
            destination[key] = source[key];
            overridableKeys[key] = true;
        }
    }
}
function storeMappingPair(state, result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
    if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (let index = 0, quantity = keyNode.length; index < quantity; index++) {
            if (Array.isArray(keyNode[index])) {
                return throwError(state, "nested arrays are not supported inside keys");
            }
            if (typeof keyNode === "object" &&
                _class(keyNode[index]) === "[object Object]") {
                keyNode[index] = "[object Object]";
            }
        }
    }
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
    }
    keyNode = String(keyNode);
    if (result === null) {
        result = {};
    }
    if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
            for (let index = 0, quantity = valueNode.length; index < quantity; index++) {
                mergeMappings(state, result, valueNode[index], overridableKeys);
            }
        }
        else {
            mergeMappings(state, result, valueNode, overridableKeys);
        }
    }
    else {
        if (!state.json &&
            !hasOwn(overridableKeys, keyNode) &&
            hasOwn(result, keyNode)) {
            state.line = startLine || state.line;
            state.position = startPos || state.position;
            return throwError(state, "duplicated mapping key");
        }
        result[keyNode] = valueNode;
        delete overridableKeys[keyNode];
    }
    return result;
}
function readLineBreak(state) {
    const ch = state.input.charCodeAt(state.position);
    if (ch === 0x0a) {
        state.position++;
    }
    else if (ch === 0x0d) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 0x0a) {
            state.position++;
        }
    }
    else {
        return throwError(state, "a line break is expected");
    }
    state.line += 1;
    state.lineStart = state.position;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
    let lineBreaks = 0, ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
        while (isWhiteSpace(ch)) {
            ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 0x23) {
            do {
                ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0x0a && ch !== 0x0d && ch !== 0);
        }
        if (isEOL(ch)) {
            readLineBreak(state);
            ch = state.input.charCodeAt(state.position);
            lineBreaks++;
            state.lineIndent = 0;
            while (ch === 0x20) {
                state.lineIndent++;
                ch = state.input.charCodeAt(++state.position);
            }
        }
        else {
            break;
        }
    }
    if (checkIndent !== -1 &&
        lineBreaks !== 0 &&
        state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
    }
    return lineBreaks;
}
function testDocumentSeparator(state) {
    let _position = state.position;
    let ch = state.input.charCodeAt(_position);
    if ((ch === 0x2d || ch === 0x2e) &&
        ch === state.input.charCodeAt(_position + 1) &&
        ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || isWsOrEol(ch)) {
            return true;
        }
    }
    return false;
}
function writeFoldedLines(state, count) {
    if (count === 1) {
        state.result += " ";
    }
    else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
    }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    const kind = state.kind;
    const result = state.result;
    let ch = state.input.charCodeAt(state.position);
    if (isWsOrEol(ch) ||
        isFlowIndicator(ch) ||
        ch === 0x23 ||
        ch === 0x26 ||
        ch === 0x2a ||
        ch === 0x21 ||
        ch === 0x7c ||
        ch === 0x3e ||
        ch === 0x27 ||
        ch === 0x22 ||
        ch === 0x25 ||
        ch === 0x40 ||
        ch === 0x60) {
        return false;
    }
    let following;
    if (ch === 0x3f || ch === 0x2d) {
        following = state.input.charCodeAt(state.position + 1);
        if (isWsOrEol(following) ||
            (withinFlowCollection && isFlowIndicator(following))) {
            return false;
        }
    }
    state.kind = "scalar";
    state.result = "";
    let captureEnd, captureStart = (captureEnd = state.position);
    let hasPendingContent = false;
    let line = 0;
    while (ch !== 0) {
        if (ch === 0x3a) {
            following = state.input.charCodeAt(state.position + 1);
            if (isWsOrEol(following) ||
                (withinFlowCollection && isFlowIndicator(following))) {
                break;
            }
        }
        else if (ch === 0x23) {
            const preceding = state.input.charCodeAt(state.position - 1);
            if (isWsOrEol(preceding)) {
                break;
            }
        }
        else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
            (withinFlowCollection && isFlowIndicator(ch))) {
            break;
        }
        else if (isEOL(ch)) {
            line = state.line;
            const lineStart = state.lineStart;
            const lineIndent = state.lineIndent;
            skipSeparationSpace(state, false, -1);
            if (state.lineIndent >= nodeIndent) {
                hasPendingContent = true;
                ch = state.input.charCodeAt(state.position);
                continue;
            }
            else {
                state.position = captureEnd;
                state.line = line;
                state.lineStart = lineStart;
                state.lineIndent = lineIndent;
                break;
            }
        }
        if (hasPendingContent) {
            captureSegment(state, captureStart, captureEnd, false);
            writeFoldedLines(state, state.line - line);
            captureStart = captureEnd = state.position;
            hasPendingContent = false;
        }
        if (!isWhiteSpace(ch)) {
            captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, captureEnd, false);
    if (state.result) {
        return true;
    }
    state.kind = kind;
    state.result = result;
    return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
    let ch, captureStart, captureEnd;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x27) {
        return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x27) {
            captureSegment(state, captureStart, state.position, true);
            ch = state.input.charCodeAt(++state.position);
            if (ch === 0x27) {
                captureStart = state.position;
                state.position++;
                captureEnd = state.position;
            }
            else {
                return true;
            }
        }
        else if (isEOL(ch)) {
            captureSegment(state, captureStart, captureEnd, true);
            writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
            captureStart = captureEnd = state.position;
        }
        else if (state.position === state.lineStart &&
            testDocumentSeparator(state)) {
            return throwError(state, "unexpected end of the document within a single quoted scalar");
        }
        else {
            state.position++;
            captureEnd = state.position;
        }
    }
    return throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 0x22) {
        return false;
    }
    state.kind = "scalar";
    state.result = "";
    state.position++;
    let captureEnd, captureStart = (captureEnd = state.position);
    let tmp;
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 0x22) {
            captureSegment(state, captureStart, state.position, true);
            state.position++;
            return true;
        }
        if (ch === 0x5c) {
            captureSegment(state, captureStart, state.position, true);
            ch = state.input.charCodeAt(++state.position);
            if (isEOL(ch)) {
                skipSeparationSpace(state, false, nodeIndent);
            }
            else if (ch < 256 && simpleEscapeCheck[ch]) {
                state.result += simpleEscapeMap[ch];
                state.position++;
            }
            else if ((tmp = escapedHexLen(ch)) > 0) {
                let hexLength = tmp;
                let hexResult = 0;
                for (; hexLength > 0; hexLength--) {
                    ch = state.input.charCodeAt(++state.position);
                    if ((tmp = fromHexCode(ch)) >= 0) {
                        hexResult = (hexResult << 4) + tmp;
                    }
                    else {
                        return throwError(state, "expected hexadecimal character");
                    }
                }
                state.result += charFromCodepoint(hexResult);
                state.position++;
            }
            else {
                return throwError(state, "unknown escape sequence");
            }
            captureStart = captureEnd = state.position;
        }
        else if (isEOL(ch)) {
            captureSegment(state, captureStart, captureEnd, true);
            writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
            captureStart = captureEnd = state.position;
        }
        else if (state.position === state.lineStart &&
            testDocumentSeparator(state)) {
            return throwError(state, "unexpected end of the document within a double quoted scalar");
        }
        else {
            state.position++;
            captureEnd = state.position;
        }
    }
    return throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
    let ch = state.input.charCodeAt(state.position);
    let terminator;
    let isMapping = true;
    let result = {};
    if (ch === 0x5b) {
        terminator = 0x5d;
        isMapping = false;
        result = [];
    }
    else if (ch === 0x7b) {
        terminator = 0x7d;
    }
    else {
        return false;
    }
    if (state.anchor !== null &&
        typeof state.anchor != "undefined" &&
        typeof state.anchorMap != "undefined") {
        state.anchorMap[state.anchor] = result;
    }
    ch = state.input.charCodeAt(++state.position);
    const tag = state.tag, anchor = state.anchor;
    let readNext = true;
    let valueNode, keyNode, keyTag = (keyNode = valueNode = null), isExplicitPair, isPair = (isExplicitPair = false);
    let following = 0, line = 0;
    const overridableKeys = {};
    while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
            state.position++;
            state.tag = tag;
            state.anchor = anchor;
            state.kind = isMapping ? "mapping" : "sequence";
            state.result = result;
            return true;
        }
        if (!readNext) {
            return throwError(state, "missed comma between flow collection entries");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 0x3f) {
            following = state.input.charCodeAt(state.position + 1);
            if (isWsOrEol(following)) {
                isPair = isExplicitPair = true;
                state.position++;
                skipSeparationSpace(state, true, nodeIndent);
            }
        }
        line = state.line;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag || null;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === line) && ch === 0x3a) {
            isPair = true;
            ch = state.input.charCodeAt(++state.position);
            skipSeparationSpace(state, true, nodeIndent);
            composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
            valueNode = state.result;
        }
        if (isMapping) {
            storeMappingPair(state, result, overridableKeys, keyTag, keyNode, valueNode);
        }
        else if (isPair) {
            result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
        }
        else {
            result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 0x2c) {
            readNext = true;
            ch = state.input.charCodeAt(++state.position);
        }
        else {
            readNext = false;
        }
    }
    return throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
    let chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false;
    let ch = state.input.charCodeAt(state.position);
    let folding = false;
    if (ch === 0x7c) {
        folding = false;
    }
    else if (ch === 0x3e) {
        folding = true;
    }
    else {
        return false;
    }
    state.kind = "scalar";
    state.result = "";
    let tmp = 0;
    while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 0x2b || ch === 0x2d) {
            if (CHOMPING_CLIP === chomping) {
                chomping = ch === 0x2b ? CHOMPING_KEEP : CHOMPING_STRIP;
            }
            else {
                return throwError(state, "repeat of a chomping mode identifier");
            }
        }
        else if ((tmp = fromDecimalCode(ch)) >= 0) {
            if (tmp === 0) {
                return throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
            }
            else if (!detectedIndent) {
                textIndent = nodeIndent + tmp - 1;
                detectedIndent = true;
            }
            else {
                return throwError(state, "repeat of an indentation width identifier");
            }
        }
        else {
            break;
        }
    }
    if (isWhiteSpace(ch)) {
        do {
            ch = state.input.charCodeAt(++state.position);
        } while (isWhiteSpace(ch));
        if (ch === 0x23) {
            do {
                ch = state.input.charCodeAt(++state.position);
            } while (!isEOL(ch) && ch !== 0);
        }
    }
    while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) &&
            ch === 0x20) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
            textIndent = state.lineIndent;
        }
        if (isEOL(ch)) {
            emptyLines++;
            continue;
        }
        if (state.lineIndent < textIndent) {
            if (chomping === CHOMPING_KEEP) {
                state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
            }
            else if (chomping === CHOMPING_CLIP) {
                if (didReadContent) {
                    state.result += "\n";
                }
            }
            break;
        }
        if (folding) {
            if (isWhiteSpace(ch)) {
                atMoreIndented = true;
                state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
            }
            else if (atMoreIndented) {
                atMoreIndented = false;
                state.result += common.repeat("\n", emptyLines + 1);
            }
            else if (emptyLines === 0) {
                if (didReadContent) {
                    state.result += " ";
                }
            }
            else {
                state.result += common.repeat("\n", emptyLines);
            }
        }
        else {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        const captureStart = state.position;
        while (!isEOL(ch) && ch !== 0) {
            ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
    }
    return true;
}
function readBlockSequence(state, nodeIndent) {
    let line, following, detected = false, ch;
    const tag = state.tag, anchor = state.anchor, result = [];
    if (state.anchor !== null &&
        typeof state.anchor !== "undefined" &&
        typeof state.anchorMap !== "undefined") {
        state.anchorMap[state.anchor] = result;
    }
    ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
        if (ch !== 0x2d) {
            break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!isWsOrEol(following)) {
            break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
            if (state.lineIndent <= nodeIndent) {
                result.push(null);
                ch = state.input.charCodeAt(state.position);
                continue;
            }
        }
        line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === line || state.lineIndent > nodeIndent) && ch !== 0) {
            return throwError(state, "bad indentation of a sequence entry");
        }
        else if (state.lineIndent < nodeIndent) {
            break;
        }
    }
    if (detected) {
        state.tag = tag;
        state.anchor = anchor;
        state.kind = "sequence";
        state.result = result;
        return true;
    }
    return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
    const tag = state.tag, anchor = state.anchor, result = {}, overridableKeys = {};
    let following, allowCompact = false, line, pos, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
    if (state.anchor !== null &&
        typeof state.anchor !== "undefined" &&
        typeof state.anchorMap !== "undefined") {
        state.anchorMap[state.anchor] = result;
    }
    ch = state.input.charCodeAt(state.position);
    while (ch !== 0) {
        following = state.input.charCodeAt(state.position + 1);
        line = state.line;
        pos = state.position;
        if ((ch === 0x3f || ch === 0x3a) && isWsOrEol(following)) {
            if (ch === 0x3f) {
                if (atExplicitKey) {
                    storeMappingPair(state, result, overridableKeys, keyTag, keyNode, null);
                    keyTag = keyNode = valueNode = null;
                }
                detected = true;
                atExplicitKey = true;
                allowCompact = true;
            }
            else if (atExplicitKey) {
                atExplicitKey = false;
                allowCompact = true;
            }
            else {
                return throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
            }
            state.position += 1;
            ch = following;
        }
        else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
            if (state.line === line) {
                ch = state.input.charCodeAt(state.position);
                while (isWhiteSpace(ch)) {
                    ch = state.input.charCodeAt(++state.position);
                }
                if (ch === 0x3a) {
                    ch = state.input.charCodeAt(++state.position);
                    if (!isWsOrEol(ch)) {
                        return throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
                    }
                    if (atExplicitKey) {
                        storeMappingPair(state, result, overridableKeys, keyTag, keyNode, null);
                        keyTag = keyNode = valueNode = null;
                    }
                    detected = true;
                    atExplicitKey = false;
                    allowCompact = false;
                    keyTag = state.tag;
                    keyNode = state.result;
                }
                else if (detected) {
                    return throwError(state, "can not read an implicit mapping pair; a colon is missed");
                }
                else {
                    state.tag = tag;
                    state.anchor = anchor;
                    return true;
                }
            }
            else if (detected) {
                return throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
            }
            else {
                state.tag = tag;
                state.anchor = anchor;
                return true;
            }
        }
        else {
            break;
        }
        if (state.line === line || state.lineIndent > nodeIndent) {
            if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
                if (atExplicitKey) {
                    keyNode = state.result;
                }
                else {
                    valueNode = state.result;
                }
            }
            if (!atExplicitKey) {
                storeMappingPair(state, result, overridableKeys, keyTag, keyNode, valueNode, line, pos);
                keyTag = keyNode = valueNode = null;
            }
            skipSeparationSpace(state, true, -1);
            ch = state.input.charCodeAt(state.position);
        }
        if (state.lineIndent > nodeIndent && ch !== 0) {
            return throwError(state, "bad indentation of a mapping entry");
        }
        else if (state.lineIndent < nodeIndent) {
            break;
        }
    }
    if (atExplicitKey) {
        storeMappingPair(state, result, overridableKeys, keyTag, keyNode, null);
    }
    if (detected) {
        state.tag = tag;
        state.anchor = anchor;
        state.kind = "mapping";
        state.result = result;
    }
    return detected;
}
function readTagProperty(state) {
    let position, isVerbatim = false, isNamed = false, tagHandle = "", tagName, ch;
    ch = state.input.charCodeAt(state.position);
    if (ch !== 0x21)
        return false;
    if (state.tag !== null) {
        return throwError(state, "duplication of a tag property");
    }
    ch = state.input.charCodeAt(++state.position);
    if (ch === 0x3c) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
    }
    else if (ch === 0x21) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
    }
    else {
        tagHandle = "!";
    }
    position = state.position;
    if (isVerbatim) {
        do {
            ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 0x3e);
        if (state.position < state.length) {
            tagName = state.input.slice(position, state.position);
            ch = state.input.charCodeAt(++state.position);
        }
        else {
            return throwError(state, "unexpected end of the stream within a verbatim tag");
        }
    }
    else {
        while (ch !== 0 && !isWsOrEol(ch)) {
            if (ch === 0x21) {
                if (!isNamed) {
                    tagHandle = state.input.slice(position - 1, state.position + 1);
                    if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                        return throwError(state, "named tag handle cannot contain such characters");
                    }
                    isNamed = true;
                    position = state.position + 1;
                }
                else {
                    return throwError(state, "tag suffix cannot contain exclamation marks");
                }
            }
            ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
            return throwError(state, "tag suffix cannot contain flow indicator characters");
        }
    }
    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        return throwError(state, `tag name cannot contain such characters: ${tagName}`);
    }
    if (isVerbatim) {
        state.tag = tagName;
    }
    else if (typeof state.tagMap !== "undefined" &&
        hasOwn(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
    }
    else if (tagHandle === "!") {
        state.tag = `!${tagName}`;
    }
    else if (tagHandle === "!!") {
        state.tag = `tag:yaml.org,2002:${tagName}`;
    }
    else {
        return throwError(state, `undeclared tag handle "${tagHandle}"`);
    }
    return true;
}
function readAnchorProperty(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 0x26)
        return false;
    if (state.anchor !== null) {
        return throwError(state, "duplication of an anchor property");
    }
    ch = state.input.charCodeAt(++state.position);
    const position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === position) {
        return throwError(state, "name of an anchor node must contain at least one character");
    }
    state.anchor = state.input.slice(position, state.position);
    return true;
}
function readAlias(state) {
    let ch = state.input.charCodeAt(state.position);
    if (ch !== 0x2a)
        return false;
    ch = state.input.charCodeAt(++state.position);
    const _position = state.position;
    while (ch !== 0 && !isWsOrEol(ch) && !isFlowIndicator(ch)) {
        ch = state.input.charCodeAt(++state.position);
    }
    if (state.position === _position) {
        return throwError(state, "name of an alias node must contain at least one character");
    }
    const alias = state.input.slice(_position, state.position);
    if (typeof state.anchorMap !== "undefined" &&
        !hasOwn(state.anchorMap, alias)) {
        return throwError(state, `unidentified alias "${alias}"`);
    }
    if (typeof state.anchorMap !== "undefined") {
        state.result = state.anchorMap[alias];
    }
    skipSeparationSpace(state, true, -1);
    return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    let allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, type, flowIndent, blockIndent;
    if (state.listener && state.listener !== null) {
        state.listener("open", state);
    }
    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;
    const allowBlockStyles = (allowBlockScalars = allowBlockCollections =
        CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext);
    if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            if (state.lineIndent > parentIndent) {
                indentStatus = 1;
            }
            else if (state.lineIndent === parentIndent) {
                indentStatus = 0;
            }
            else if (state.lineIndent < parentIndent) {
                indentStatus = -1;
            }
        }
    }
    if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
            if (skipSeparationSpace(state, true, -1)) {
                atNewLine = true;
                allowBlockCollections = allowBlockStyles;
                if (state.lineIndent > parentIndent) {
                    indentStatus = 1;
                }
                else if (state.lineIndent === parentIndent) {
                    indentStatus = 0;
                }
                else if (state.lineIndent < parentIndent) {
                    indentStatus = -1;
                }
            }
            else {
                allowBlockCollections = false;
            }
        }
    }
    if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
    }
    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        const cond = CONTEXT_FLOW_IN === nodeContext ||
            CONTEXT_FLOW_OUT === nodeContext;
        flowIndent = cond ? parentIndent : parentIndent + 1;
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
            if ((allowBlockCollections &&
                (readBlockSequence(state, blockIndent) ||
                    readBlockMapping(state, blockIndent, flowIndent))) ||
                readFlowCollection(state, flowIndent)) {
                hasContent = true;
            }
            else {
                if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
                    readSingleQuotedScalar(state, flowIndent) ||
                    readDoubleQuotedScalar(state, flowIndent)) {
                    hasContent = true;
                }
                else if (readAlias(state)) {
                    hasContent = true;
                    if (state.tag !== null || state.anchor !== null) {
                        return throwError(state, "alias node should not have Any properties");
                    }
                }
                else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
                    hasContent = true;
                    if (state.tag === null) {
                        state.tag = "?";
                    }
                }
                if (state.anchor !== null && typeof state.anchorMap !== "undefined") {
                    state.anchorMap[state.anchor] = state.result;
                }
            }
        }
        else if (indentStatus === 0) {
            hasContent = allowBlockCollections &&
                readBlockSequence(state, blockIndent);
        }
    }
    if (state.tag !== null && state.tag !== "!") {
        if (state.tag === "?") {
            for (let typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex++) {
                type = state.implicitTypes[typeIndex];
                if (type.resolve(state.result)) {
                    state.result = type.construct(state.result);
                    state.tag = type.tag;
                    if (state.anchor !== null && typeof state.anchorMap !== "undefined") {
                        state.anchorMap[state.anchor] = state.result;
                    }
                    break;
                }
            }
        }
        else if (hasOwn(state.typeMap[state.kind || "fallback"], state.tag)) {
            type = state.typeMap[state.kind || "fallback"][state.tag];
            if (state.result !== null && type.kind !== state.kind) {
                return throwError(state, `unacceptable node kind for !<${state.tag}> tag; it should be "${type.kind}", not "${state.kind}"`);
            }
            if (!type.resolve(state.result)) {
                return throwError(state, `cannot resolve a node with !<${state.tag}> explicit tag`);
            }
            else {
                state.result = type.construct(state.result);
                if (state.anchor !== null && typeof state.anchorMap !== "undefined") {
                    state.anchorMap[state.anchor] = state.result;
                }
            }
        }
        else {
            return throwError(state, `unknown tag !<${state.tag}>`);
        }
    }
    if (state.listener && state.listener !== null) {
        state.listener("close", state);
    }
    return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
    const documentStart = state.position;
    let position, directiveName, directiveArgs, hasDirectives = false, ch;
    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = {};
    state.anchorMap = {};
    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 0x25) {
            break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        position = state.position;
        while (ch !== 0 && !isWsOrEol(ch)) {
            ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
            return throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
            while (isWhiteSpace(ch)) {
                ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 0x23) {
                do {
                    ch = state.input.charCodeAt(++state.position);
                } while (ch !== 0 && !isEOL(ch));
                break;
            }
            if (isEOL(ch))
                break;
            position = state.position;
            while (ch !== 0 && !isWsOrEol(ch)) {
                ch = state.input.charCodeAt(++state.position);
            }
            directiveArgs.push(state.input.slice(position, state.position));
        }
        if (ch !== 0)
            readLineBreak(state);
        if (hasOwn(directiveHandlers, directiveName)) {
            directiveHandlers[directiveName](state, directiveName, ...directiveArgs);
        }
        else {
            throwWarning(state, `unknown document directive "${directiveName}"`);
        }
    }
    skipSeparationSpace(state, true, -1);
    if (state.lineIndent === 0 &&
        state.input.charCodeAt(state.position) === 0x2d &&
        state.input.charCodeAt(state.position + 1) === 0x2d &&
        state.input.charCodeAt(state.position + 2) === 0x2d) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
    }
    else if (hasDirectives) {
        return throwError(state, "directives end mark is expected");
    }
    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);
    if (state.checkLineBreaks &&
        PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }
    state.documents.push(state.result);
    if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 0x2e) {
            state.position += 3;
            skipSeparationSpace(state, true, -1);
        }
        return;
    }
    if (state.position < state.length - 1) {
        return throwError(state, "end of the stream or a document separator is expected");
    }
    else {
        return;
    }
}
function loadDocuments(input, options) {
    input = String(input);
    options = options || {};
    if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 0x0a &&
            input.charCodeAt(input.length - 1) !== 0x0d) {
            input += "\n";
        }
        if (input.charCodeAt(0) === 0xfeff) {
            input = input.slice(1);
        }
    }
    const state = new LoaderState(input, options);
    state.input += "\0";
    while (state.input.charCodeAt(state.position) === 0x20) {
        state.lineIndent += 1;
        state.position += 1;
    }
    while (state.position < state.length - 1) {
        readDocument(state);
    }
    return state.documents;
}
function isCbFunction(fn) {
    return typeof fn === "function";
}
export function loadAll(input, iteratorOrOption, options) {
    if (!isCbFunction(iteratorOrOption)) {
        return loadDocuments(input, iteratorOrOption);
    }
    const documents = loadDocuments(input, options);
    const iterator = iteratorOrOption;
    for (let index = 0, length = documents.length; index < length; index++) {
        iterator(documents[index]);
    }
    return void 0;
}
export function load(input, options) {
    const documents = loadDocuments(input, options);
    if (documents.length === 0) {
        return;
    }
    if (documents.length === 1) {
        return documents[0];
    }
    throw new YAMLError("expected a single document in the stream, but found more");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDeEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVsQyxPQUFPLEtBQUssTUFBTSxNQUFNLGFBQWEsQ0FBQztBQUN0QyxPQUFPLEVBQUUsV0FBVyxFQUFrQyxNQUFNLG1CQUFtQixDQUFDO0FBS2hGLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUM7QUFFMUIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDO0FBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTVCLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQztBQUN4QixNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFDekIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDO0FBRXhCLE1BQU0scUJBQXFCLEdBRXpCLHFJQUFxSSxDQUFDO0FBQ3hJLE1BQU0sNkJBQTZCLEdBQUcsb0JBQW9CLENBQUM7QUFDM0QsTUFBTSx1QkFBdUIsR0FBRyxhQUFhLENBQUM7QUFDOUMsTUFBTSxrQkFBa0IsR0FBRyx3QkFBd0IsQ0FBQztBQUNwRCxNQUFNLGVBQWUsR0FDbkIsa0ZBQWtGLENBQUM7QUFFckYsU0FBUyxNQUFNLENBQUMsR0FBWTtJQUMxQixPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRUQsU0FBUyxLQUFLLENBQUMsQ0FBUztJQUN0QixPQUFPLENBQUMsS0FBSyxJQUFJLElBQWEsQ0FBQyxLQUFLLElBQUksQ0FBVTtBQUNwRCxDQUFDO0FBRUQsU0FBUyxZQUFZLENB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O0lBRUQsT0FBTyxLQUFLLENBQVEsQ0FBQztBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLElBQUksQ0FBQyxLQUFhLEVBQUUsT0FBNEI7SUFDOUQsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUVoRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzFCLE9BQU87S0FDUjtJQUNELElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDMUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDckI7SUFDRCxNQUFNLElBQUksU0FBUyxDQUNqQiwwREFBMEQsQ0FDM0QsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQb3J0ZWQgZnJvbSBqcy15YW1sIHYzLjEzLjE6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWNhL2pzLXlhbWwvY29tbWl0LzY2NWFhZGRhNDIzNDlkY2FlODY5ZjEyMDQwZDliMTBlZjE4ZDEyZGFcbi8vIENvcHlyaWdodCAyMDExLTIwMTUgYnkgVml0YWx5IFB1enJpbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG5pbXBvcnQgeyBZQU1MRXJyb3IgfSBmcm9tIFwiLi4vZXJyb3IudHNcIjtcbmltcG9ydCB7IE1hcmsgfSBmcm9tIFwiLi4vbWFyay50c1wiO1xuaW1wb3J0IHR5cGUgeyBUeXBlIH0gZnJvbSBcIi4uL3R5cGUudHNcIjtcbmltcG9ydCAqIGFzIGNvbW1vbiBmcm9tIFwiLi4vdXRpbHMudHNcIjtcbmltcG9ydCB7IExvYWRlclN0YXRlLCBMb2FkZXJTdGF0ZU9wdGlvbnMsIFJlc3VsdFR5cGUgfSBmcm9tIFwiLi9sb2FkZXJfc3RhdGUudHNcIjtcblxudHlwZSBBbnkgPSBjb21tb24uQW55O1xudHlwZSBBcnJheU9iamVjdDxUID0gQW55PiA9IGNvbW1vbi5BcnJheU9iamVjdDxUPjtcblxuY29uc3QgeyBoYXNPd24gfSA9IE9iamVjdDtcblxuY29uc3QgQ09OVEVYVF9GTE9XX0lOID0gMTtcbmNvbnN0IENPTlRFWFRfRkxPV19PVVQgPSAyO1xuY29uc3QgQ09OVEVYVF9CTE9DS19JTiA9IDM7XG5jb25zdCBDT05URVhUX0JMT0NLX09VVCA9IDQ7XG5cbmNvbnN0IENIT01QSU5HX0NMSVAgPSAxO1xuY29uc3QgQ0hPTVBJTkdfU1RSSVAgPSAyO1xuY29uc3QgQ0hPTVBJTkdfS0VFUCA9IDM7XG5cbmNvbnN0IFBBVFRFUk5fTk9OX1BSSU5UQUJMRSA9XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tY29udHJvbC1yZWdleFxuICAvW1xceDAwLVxceDA4XFx4MEJcXHgwQ1xceDBFLVxceDFGXFx4N0YtXFx4ODRcXHg4Ni1cXHg5RlxcdUZGRkVcXHVGRkZGXXxbXFx1RDgwMC1cXHVEQkZGXSg/IVtcXHVEQzAwLVxcdURGRkZdKXwoPzpbXlxcdUQ4MDAtXFx1REJGRl18XilbXFx1REMwMC1cXHVERkZGXS87XG5jb25zdCBQQVRURVJOX05PTl9BU0NJSV9MSU5FX0JSRUFLUyA9IC9bXFx4ODVcXHUyMDI4XFx1MjAyOV0vO1xuY29uc3QgUEFUVEVSTl9GTE9XX0lORElDQVRPUlMgPSAvWyxcXFtcXF1cXHtcXH1dLztcbmNvbnN0IFBBVFRFUk5fVEFHX0hBTkRMRSA9IC9eKD86IXwhIXwhW2EtelxcLV0rISkkL2k7XG5jb25zdCBQQVRURVJOX1RBR19VUkkgPVxuICAvXig/OiF8W14sXFxbXFxdXFx7XFx9XSkoPzolWzAtOWEtZl17Mn18WzAtOWEtelxcLSM7XFwvXFw/OkAmPVxcK1xcJCxfXFwuIX5cXConXFwoXFwpXFxbXFxdXSkqJC9pO1xuXG5mdW5jdGlvbiBfY2xhc3Mob2JqOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xufVxuXG5mdW5jdGlvbiBpc0VPTChjOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGMgPT09IDB4MGEgfHwgLyogTEYgKi8gYyA9PT0gMHgwZCAvKiBDUiAqLztcbn1cblxuZnVuY3Rpb24gaXNXaGl0ZVNwYWNlKGM6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gYyA9PT0gMHgwOSB8fCAvKiBUYWIgKi8gYyA9PT0gMHgyMCAvKiBTcGFjZSAqLztcbn1cblxuZnVuY3Rpb24gaXNXc09yRW9sKGM6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIGMgPT09IDB4MDkgLyogVGFiICovIHx8XG4gICAgYyA9PT0gMHgyMCAvKiBTcGFjZSAqLyB8fFxuICAgIGMgPT09IDB4MGEgLyogTEYgKi8gfHxcbiAgICBjID09PSAweDBkIC8qIENSICovXG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzRmxvd0luZGljYXRvcihjOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICBjID09PSAweDJjIC8qICwgKi8gfHxcbiAgICBjID09PSAweDViIC8qIFsgKi8gfHxcbiAgICBjID09PSAweDVkIC8qIF0gKi8gfHxcbiAgICBjID09PSAweDdiIC8qIHsgKi8gfHxcbiAgICBjID09PSAweDdkIC8qIH0gKi9cbiAgKTtcbn1cblxuZnVuY3Rpb24gZnJvbUhleENvZGUoYzogbnVtYmVyKTogbnVtYmVyIHtcbiAgaWYgKDB4MzAgPD0gLyogMCAqLyBjICYmIGMgPD0gMHgzOSAvKiA5ICovKSB7XG4gICAgcmV0dXJuIGMgLSAweDMwO1xuICB9XG5cbiAgY29uc3QgbGMgPSBjIHwgMHgyMDtcblxuICBpZiAoMHg2MSA8PSAvKiBhICovIGxjICYmIGxjIDw9IDB4NjYgLyogZiAqLykge1xuICAgIHJldHVybiBsYyAtIDB4NjEgKyAxMDtcbiAgfVxuXG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gZXNjYXBlZEhleExlbihjOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAoYyA9PT0gMHg3OCAvKiB4ICovKSB7XG4gICAgcmV0dXJuIDI7XG4gIH1cbiAgaWYgKGMgPT09IDB4NzUgLyogdSAqLykge1xuICAgIHJldHVybiA0O1xuICB9XG4gIGlmIChjID09PSAweDU1IC8qIFUgKi8pIHtcbiAgICByZXR1cm4gODtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gZnJvbURlY2ltYWxDb2RlKGM6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICgweDMwIDw9IC8qIDAgKi8gYyAmJiBjIDw9IDB4MzkgLyogOSAqLykge1xuICAgIHJldHVybiBjIC0gMHgzMDtcbiAgfVxuXG4gIHJldHVybiAtMTtcbn1cblxuZnVuY3Rpb24gc2ltcGxlRXNjYXBlU2VxdWVuY2UoYzogbnVtYmVyKTogc3RyaW5nIHtcbiAgcmV0dXJuIGMgPT09IDB4MzAgLyogMCAqL1xuICAgID8gXCJcXHgwMFwiXG4gICAgOiBjID09PSAweDYxIC8qIGEgKi9cbiAgICA/IFwiXFx4MDdcIlxuICAgIDogYyA9PT0gMHg2MiAvKiBiICovXG4gICAgPyBcIlxceDA4XCJcbiAgICA6IGMgPT09IDB4NzQgLyogdCAqL1xuICAgID8gXCJcXHgwOVwiXG4gICAgOiBjID09PSAweDA5IC8qIFRhYiAqL1xuICAgID8gXCJcXHgwOVwiXG4gICAgOiBjID09PSAweDZlIC8qIG4gKi9cbiAgICA/IFwiXFx4MEFcIlxuICAgIDogYyA9PT0gMHg3NiAvKiB2ICovXG4gICAgPyBcIlxceDBCXCJcbiAgICA6IGMgPT09IDB4NjYgLyogZiAqL1xuICAgID8gXCJcXHgwQ1wiXG4gICAgOiBjID09PSAweDcyIC8qIHIgKi9cbiAgICA/IFwiXFx4MERcIlxuICAgIDogYyA9PT0gMHg2NSAvKiBlICovXG4gICAgPyBcIlxceDFCXCJcbiAgICA6IGMgPT09IDB4MjAgLyogU3BhY2UgKi9cbiAgICA/IFwiIFwiXG4gICAgOiBjID09PSAweDIyIC8qIFwiICovXG4gICAgPyBcIlxceDIyXCJcbiAgICA6IGMgPT09IDB4MmYgLyogLyAqL1xuICAgID8gXCIvXCJcbiAgICA6IGMgPT09IDB4NWMgLyogXFwgKi9cbiAgICA/IFwiXFx4NUNcIlxuICAgIDogYyA9PT0gMHg0ZSAvKiBOICovXG4gICAgPyBcIlxceDg1XCJcbiAgICA6IGMgPT09IDB4NWYgLyogXyAqL1xuICAgID8gXCJcXHhBMFwiXG4gICAgOiBjID09PSAweDRjIC8qIEwgKi9cbiAgICA/IFwiXFx1MjAyOFwiXG4gICAgOiBjID09PSAweDUwIC8qIFAgKi9cbiAgICA/IFwiXFx1MjAyOVwiXG4gICAgOiBcIlwiO1xufVxuXG5mdW5jdGlvbiBjaGFyRnJvbUNvZGVwb2ludChjOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAoYyA8PSAweGZmZmYpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjKTtcbiAgfVxuICAvLyBFbmNvZGUgVVRGLTE2IHN1cnJvZ2F0ZSBwYWlyXG4gIC8vIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1VURi0xNiNDb2RlX3BvaW50c19VLjJCMDEwMDAwX3RvX1UuMkIxMEZGRkZcbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoXG4gICAgKChjIC0gMHgwMTAwMDApID4+IDEwKSArIDB4ZDgwMCxcbiAgICAoKGMgLSAweDAxMDAwMCkgJiAweDAzZmYpICsgMHhkYzAwLFxuICApO1xufVxuXG5jb25zdCBzaW1wbGVFc2NhcGVDaGVjayA9IEFycmF5LmZyb208bnVtYmVyPih7IGxlbmd0aDogMjU2IH0pOyAvLyBpbnRlZ2VyLCBmb3IgZmFzdCBhY2Nlc3NcbmNvbnN0IHNpbXBsZUVzY2FwZU1hcCA9IEFycmF5LmZyb208c3RyaW5nPih7IGxlbmd0aDogMjU2IH0pO1xuZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7IGkrKykge1xuICBzaW1wbGVFc2NhcGVDaGVja1tpXSA9IHNpbXBsZUVzY2FwZVNlcXVlbmNlKGkpID8gMSA6IDA7XG4gIHNpbXBsZUVzY2FwZU1hcFtpXSA9IHNpbXBsZUVzY2FwZVNlcXVlbmNlKGkpO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUVycm9yKHN0YXRlOiBMb2FkZXJTdGF0ZSwgbWVzc2FnZTogc3RyaW5nKTogWUFNTEVycm9yIHtcbiAgcmV0dXJuIG5ldyBZQU1MRXJyb3IoXG4gICAgbWVzc2FnZSxcbiAgICBuZXcgTWFyayhcbiAgICAgIHN0YXRlLmZpbGVuYW1lIGFzIHN0cmluZyxcbiAgICAgIHN0YXRlLmlucHV0LFxuICAgICAgc3RhdGUucG9zaXRpb24sXG4gICAgICBzdGF0ZS5saW5lLFxuICAgICAgc3RhdGUucG9zaXRpb24gLSBzdGF0ZS5saW5lU3RhcnQsXG4gICAgKSxcbiAgKTtcbn1cblxuZnVuY3Rpb24gdGhyb3dFcnJvcihzdGF0ZTogTG9hZGVyU3RhdGUsIG1lc3NhZ2U6IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgZ2VuZXJhdGVFcnJvcihzdGF0ZSwgbWVzc2FnZSk7XG59XG5cbmZ1bmN0aW9uIHRocm93V2FybmluZyhzdGF0ZTogTG9hZGVyU3RhdGUsIG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoc3RhdGUub25XYXJuaW5nKSB7XG4gICAgc3RhdGUub25XYXJuaW5nLmNhbGwobnVsbCwgZ2VuZXJhdGVFcnJvcihzdGF0ZSwgbWVzc2FnZSkpO1xuICB9XG59XG5cbmludGVyZmFjZSBEaXJlY3RpdmVIYW5kbGVycyB7XG4gIFtkaXJlY3RpdmU6IHN0cmluZ106IChcbiAgICBzdGF0ZTogTG9hZGVyU3RhdGUsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIC4uLmFyZ3M6IHN0cmluZ1tdXG4gICkgPT4gdm9pZDtcbn1cblxuY29uc3QgZGlyZWN0aXZlSGFuZGxlcnM6IERpcmVjdGl2ZUhhbmRsZXJzID0ge1xuICBZQU1MKHN0YXRlLCBfbmFtZSwgLi4uYXJnczogc3RyaW5nW10pIHtcbiAgICBpZiAoc3RhdGUudmVyc2lvbiAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwiZHVwbGljYXRpb24gb2YgJVlBTUwgZGlyZWN0aXZlXCIpO1xuICAgIH1cblxuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwiWUFNTCBkaXJlY3RpdmUgYWNjZXB0cyBleGFjdGx5IG9uZSBhcmd1bWVudFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaCA9IC9eKFswLTldKylcXC4oWzAtOV0rKSQvLmV4ZWMoYXJnc1swXSk7XG4gICAgaWYgKG1hdGNoID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihzdGF0ZSwgXCJpbGwtZm9ybWVkIGFyZ3VtZW50IG9mIHRoZSBZQU1MIGRpcmVjdGl2ZVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBtYWpvciA9IHBhcnNlSW50KG1hdGNoWzFdLCAxMCk7XG4gICAgY29uc3QgbWlub3IgPSBwYXJzZUludChtYXRjaFsyXSwgMTApO1xuICAgIGlmIChtYWpvciAhPT0gMSkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwidW5hY2NlcHRhYmxlIFlBTUwgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnRcIik7XG4gICAgfVxuXG4gICAgc3RhdGUudmVyc2lvbiA9IGFyZ3NbMF07XG4gICAgc3RhdGUuY2hlY2tMaW5lQnJlYWtzID0gbWlub3IgPCAyO1xuICAgIGlmIChtaW5vciAhPT0gMSAmJiBtaW5vciAhPT0gMikge1xuICAgICAgcmV0dXJuIHRocm93V2FybmluZyhzdGF0ZSwgXCJ1bnN1cHBvcnRlZCBZQU1MIHZlcnNpb24gb2YgdGhlIGRvY3VtZW50XCIpO1xuICAgIH1cbiAgfSxcblxuICBUQUcoc3RhdGUsIF9uYW1lLCAuLi5hcmdzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMikge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwiVEFHIGRpcmVjdGl2ZSBhY2NlcHRzIGV4YWN0bHkgdHdvIGFyZ3VtZW50c1wiKTtcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGUgPSBhcmdzWzBdO1xuICAgIGNvbnN0IHByZWZpeCA9IGFyZ3NbMV07XG5cbiAgICBpZiAoIVBBVFRFUk5fVEFHX0hBTkRMRS50ZXN0KGhhbmRsZSkpIHtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgXCJpbGwtZm9ybWVkIHRhZyBoYW5kbGUgKGZpcnN0IGFyZ3VtZW50KSBvZiB0aGUgVEFHIGRpcmVjdGl2ZVwiLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUudGFnTWFwICYmIGhhc093bihzdGF0ZS50YWdNYXAsIGhhbmRsZSkpIHtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgYHRoZXJlIGlzIGEgcHJldmlvdXNseSBkZWNsYXJlZCBzdWZmaXggZm9yIFwiJHtoYW5kbGV9XCIgdGFnIGhhbmRsZWAsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghUEFUVEVSTl9UQUdfVVJJLnRlc3QocHJlZml4KSkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICAgIHN0YXRlLFxuICAgICAgICBcImlsbC1mb3JtZWQgdGFnIHByZWZpeCAoc2Vjb25kIGFyZ3VtZW50KSBvZiB0aGUgVEFHIGRpcmVjdGl2ZVwiLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHN0YXRlLnRhZ01hcCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgc3RhdGUudGFnTWFwID0ge307XG4gICAgfVxuICAgIHN0YXRlLnRhZ01hcFtoYW5kbGVdID0gcHJlZml4O1xuICB9LFxufTtcblxuZnVuY3Rpb24gY2FwdHVyZVNlZ21lbnQoXG4gIHN0YXRlOiBMb2FkZXJTdGF0ZSxcbiAgc3RhcnQ6IG51bWJlcixcbiAgZW5kOiBudW1iZXIsXG4gIGNoZWNrSnNvbjogYm9vbGVhbixcbik6IHZvaWQge1xuICBsZXQgcmVzdWx0OiBzdHJpbmc7XG4gIGlmIChzdGFydCA8IGVuZCkge1xuICAgIHJlc3VsdCA9IHN0YXRlLmlucHV0LnNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgaWYgKGNoZWNrSnNvbikge1xuICAgICAgZm9yIChcbiAgICAgICAgbGV0IHBvc2l0aW9uID0gMCwgbGVuZ3RoID0gcmVzdWx0Lmxlbmd0aDtcbiAgICAgICAgcG9zaXRpb24gPCBsZW5ndGg7XG4gICAgICAgIHBvc2l0aW9uKytcbiAgICAgICkge1xuICAgICAgICBjb25zdCBjaGFyYWN0ZXIgPSByZXN1bHQuY2hhckNvZGVBdChwb3NpdGlvbik7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAhKGNoYXJhY3RlciA9PT0gMHgwOSB8fCAoMHgyMCA8PSBjaGFyYWN0ZXIgJiYgY2hhcmFjdGVyIDw9IDB4MTBmZmZmKSlcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwiZXhwZWN0ZWQgdmFsaWQgSlNPTiBjaGFyYWN0ZXJcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFBBVFRFUk5fTk9OX1BSSU5UQUJMRS50ZXN0KHJlc3VsdCkpIHtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKHN0YXRlLCBcInRoZSBzdHJlYW0gY29udGFpbnMgbm9uLXByaW50YWJsZSBjaGFyYWN0ZXJzXCIpO1xuICAgIH1cblxuICAgIHN0YXRlLnJlc3VsdCArPSByZXN1bHQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VNYXBwaW5ncyhcbiAgc3RhdGU6IExvYWRlclN0YXRlLFxuICBkZXN0aW5hdGlvbjogQXJyYXlPYmplY3QsXG4gIHNvdXJjZTogQXJyYXlPYmplY3QsXG4gIG92ZXJyaWRhYmxlS2V5czogQXJyYXlPYmplY3Q8Ym9vbGVhbj4sXG4pOiB2b2lkIHtcbiAgaWYgKCFjb21tb24uaXNPYmplY3Qoc291cmNlKSkge1xuICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgc3RhdGUsXG4gICAgICBcImNhbm5vdCBtZXJnZSBtYXBwaW5nczsgdGhlIHByb3ZpZGVkIHNvdXJjZSBvYmplY3QgaXMgdW5hY2NlcHRhYmxlXCIsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuICBmb3IgKGxldCBpID0gMCwgbGVuID0ga2V5cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGtleXNbaV07XG4gICAgaWYgKCFoYXNPd24oZGVzdGluYXRpb24sIGtleSkpIHtcbiAgICAgIGRlc3RpbmF0aW9uW2tleV0gPSAoc291cmNlIGFzIEFycmF5T2JqZWN0KVtrZXldO1xuICAgICAgb3ZlcnJpZGFibGVLZXlzW2tleV0gPSB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9yZU1hcHBpbmdQYWlyKFxuICBzdGF0ZTogTG9hZGVyU3RhdGUsXG4gIHJlc3VsdDogQXJyYXlPYmplY3QgfCBudWxsLFxuICBvdmVycmlkYWJsZUtleXM6IEFycmF5T2JqZWN0PGJvb2xlYW4+LFxuICBrZXlUYWc6IHN0cmluZyB8IG51bGwsXG4gIGtleU5vZGU6IEFueSxcbiAgdmFsdWVOb2RlOiB1bmtub3duLFxuICBzdGFydExpbmU/OiBudW1iZXIsXG4gIHN0YXJ0UG9zPzogbnVtYmVyLFxuKTogQXJyYXlPYmplY3Qge1xuICAvLyBUaGUgb3V0cHV0IGlzIGEgcGxhaW4gb2JqZWN0IGhlcmUsIHNvIGtleXMgY2FuIG9ubHkgYmUgc3RyaW5ncy5cbiAgLy8gV2UgbmVlZCB0byBjb252ZXJ0IGtleU5vZGUgdG8gYSBzdHJpbmcsIGJ1dCBkb2luZyBzbyBjYW4gaGFuZyB0aGUgcHJvY2Vzc1xuICAvLyAoZGVlcGx5IG5lc3RlZCBhcnJheXMgdGhhdCBleHBsb2RlIGV4cG9uZW50aWFsbHkgdXNpbmcgYWxpYXNlcykuXG4gIGlmIChBcnJheS5pc0FycmF5KGtleU5vZGUpKSB7XG4gICAga2V5Tm9kZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGtleU5vZGUpO1xuXG4gICAgZm9yIChsZXQgaW5kZXggPSAwLCBxdWFudGl0eSA9IGtleU5vZGUubGVuZ3RoOyBpbmRleCA8IHF1YW50aXR5OyBpbmRleCsrKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShrZXlOb2RlW2luZGV4XSkpIHtcbiAgICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwibmVzdGVkIGFycmF5cyBhcmUgbm90IHN1cHBvcnRlZCBpbnNpZGUga2V5c1wiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2Yga2V5Tm9kZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICBfY2xhc3Moa2V5Tm9kZVtpbmRleF0pID09PSBcIltvYmplY3QgT2JqZWN0XVwiXG4gICAgICApIHtcbiAgICAgICAga2V5Tm9kZVtpbmRleF0gPSBcIltvYmplY3QgT2JqZWN0XVwiO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEF2b2lkIGNvZGUgZXhlY3V0aW9uIGluIGxvYWQoKSB2aWEgdG9TdHJpbmcgcHJvcGVydHlcbiAgLy8gKHN0aWxsIHVzZSBpdHMgb3duIHRvU3RyaW5nIGZvciBhcnJheXMsIHRpbWVzdGFtcHMsXG4gIC8vIGFuZCB3aGF0ZXZlciB1c2VyIHNjaGVtYSBleHRlbnNpb25zIGhhcHBlbiB0byBoYXZlIEBAdG9TdHJpbmdUYWcpXG4gIGlmICh0eXBlb2Yga2V5Tm9kZSA9PT0gXCJvYmplY3RcIiAmJiBfY2xhc3Moa2V5Tm9kZSkgPT09IFwiW29iamVjdCBPYmplY3RdXCIpIHtcbiAgICBrZXlOb2RlID0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIGtleU5vZGUgPSBTdHJpbmcoa2V5Tm9kZSk7XG5cbiAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgIHJlc3VsdCA9IHt9O1xuICB9XG5cbiAgaWYgKGtleVRhZyA9PT0gXCJ0YWc6eWFtbC5vcmcsMjAwMjptZXJnZVwiKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWVOb2RlKSkge1xuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGluZGV4ID0gMCwgcXVhbnRpdHkgPSB2YWx1ZU5vZGUubGVuZ3RoO1xuICAgICAgICBpbmRleCA8IHF1YW50aXR5O1xuICAgICAgICBpbmRleCsrXG4gICAgICApIHtcbiAgICAgICAgbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgcmVzdWx0LCB2YWx1ZU5vZGVbaW5kZXhdLCBvdmVycmlkYWJsZUtleXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtZXJnZU1hcHBpbmdzKHN0YXRlLCByZXN1bHQsIHZhbHVlTm9kZSBhcyBBcnJheU9iamVjdCwgb3ZlcnJpZGFibGVLZXlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKFxuICAgICAgIXN0YXRlLmpzb24gJiZcbiAgICAgICFoYXNPd24ob3ZlcnJpZGFibGVLZXlzLCBrZXlOb2RlKSAmJlxuICAgICAgaGFzT3duKHJlc3VsdCwga2V5Tm9kZSlcbiAgICApIHtcbiAgICAgIHN0YXRlLmxpbmUgPSBzdGFydExpbmUgfHwgc3RhdGUubGluZTtcbiAgICAgIHN0YXRlLnBvc2l0aW9uID0gc3RhcnRQb3MgfHwgc3RhdGUucG9zaXRpb247XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihzdGF0ZSwgXCJkdXBsaWNhdGVkIG1hcHBpbmcga2V5XCIpO1xuICAgIH1cbiAgICByZXN1bHRba2V5Tm9kZV0gPSB2YWx1ZU5vZGU7XG4gICAgZGVsZXRlIG92ZXJyaWRhYmxlS2V5c1trZXlOb2RlXTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHJlYWRMaW5lQnJlYWsoc3RhdGU6IExvYWRlclN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDBhIC8qIExGICovKSB7XG4gICAgc3RhdGUucG9zaXRpb24rKztcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHgwZCAvKiBDUiAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgaWYgKHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pID09PSAweDBhIC8qIExGICovKSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdGhyb3dFcnJvcihzdGF0ZSwgXCJhIGxpbmUgYnJlYWsgaXMgZXhwZWN0ZWRcIik7XG4gIH1cblxuICBzdGF0ZS5saW5lICs9IDE7XG4gIHN0YXRlLmxpbmVTdGFydCA9IHN0YXRlLnBvc2l0aW9uO1xufVxuXG5mdW5jdGlvbiBza2lwU2VwYXJhdGlvblNwYWNlKFxuICBzdGF0ZTogTG9hZGVyU3RhdGUsXG4gIGFsbG93Q29tbWVudHM6IGJvb2xlYW4sXG4gIGNoZWNrSW5kZW50OiBudW1iZXIsXG4pOiBudW1iZXIge1xuICBsZXQgbGluZUJyZWFrcyA9IDAsXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICB3aGlsZSAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGlmIChhbGxvd0NvbW1lbnRzICYmIGNoID09PSAweDIzIC8qICMgKi8pIHtcbiAgICAgIGRvIHtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgICAgfSB3aGlsZSAoY2ggIT09IDB4MGEgJiYgLyogTEYgKi8gY2ggIT09IDB4MGQgJiYgLyogQ1IgKi8gY2ggIT09IDApO1xuICAgIH1cblxuICAgIGlmIChpc0VPTChjaCkpIHtcbiAgICAgIHJlYWRMaW5lQnJlYWsoc3RhdGUpO1xuXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuICAgICAgbGluZUJyZWFrcysrO1xuICAgICAgc3RhdGUubGluZUluZGVudCA9IDA7XG5cbiAgICAgIHdoaWxlIChjaCA9PT0gMHgyMCAvKiBTcGFjZSAqLykge1xuICAgICAgICBzdGF0ZS5saW5lSW5kZW50Kys7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKFxuICAgIGNoZWNrSW5kZW50ICE9PSAtMSAmJlxuICAgIGxpbmVCcmVha3MgIT09IDAgJiZcbiAgICBzdGF0ZS5saW5lSW5kZW50IDwgY2hlY2tJbmRlbnRcbiAgKSB7XG4gICAgdGhyb3dXYXJuaW5nKHN0YXRlLCBcImRlZmljaWVudCBpbmRlbnRhdGlvblwiKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lQnJlYWtzO1xufVxuXG5mdW5jdGlvbiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGU6IExvYWRlclN0YXRlKTogYm9vbGVhbiB7XG4gIGxldCBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcbiAgbGV0IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24pO1xuXG4gIC8vIENvbmRpdGlvbiBzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0IGlzIHRlc3RlZFxuICAvLyBpbiBwYXJlbnQgb24gZWFjaCBjYWxsLCBmb3IgZWZmaWNpZW5jeS4gTm8gbmVlZHMgdG8gdGVzdCBoZXJlIGFnYWluLlxuICBpZiAoXG4gICAgKGNoID09PSAweDJkIHx8IC8qIC0gKi8gY2ggPT09IDB4MmUpIC8qIC4gKi8gJiZcbiAgICBjaCA9PT0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24gKyAxKSAmJlxuICAgIGNoID09PSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbiArIDIpXG4gICkge1xuICAgIF9wb3NpdGlvbiArPSAzO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IDAgfHwgaXNXc09yRW9sKGNoKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiB3cml0ZUZvbGRlZExpbmVzKHN0YXRlOiBMb2FkZXJTdGF0ZSwgY291bnQ6IG51bWJlcik6IHZvaWQge1xuICBpZiAoY291bnQgPT09IDEpIHtcbiAgICBzdGF0ZS5yZXN1bHQgKz0gXCIgXCI7XG4gIH0gZWxzZSBpZiAoY291bnQgPiAxKSB7XG4gICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoXCJcXG5cIiwgY291bnQgLSAxKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkUGxhaW5TY2FsYXIoXG4gIHN0YXRlOiBMb2FkZXJTdGF0ZSxcbiAgbm9kZUluZGVudDogbnVtYmVyLFxuICB3aXRoaW5GbG93Q29sbGVjdGlvbjogYm9vbGVhbixcbik6IGJvb2xlYW4ge1xuICBjb25zdCBraW5kID0gc3RhdGUua2luZDtcbiAgY29uc3QgcmVzdWx0ID0gc3RhdGUucmVzdWx0O1xuICBsZXQgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoXG4gICAgaXNXc09yRW9sKGNoKSB8fFxuICAgIGlzRmxvd0luZGljYXRvcihjaCkgfHxcbiAgICBjaCA9PT0gMHgyMyAvKiAjICovIHx8XG4gICAgY2ggPT09IDB4MjYgLyogJiAqLyB8fFxuICAgIGNoID09PSAweDJhIC8qICogKi8gfHxcbiAgICBjaCA9PT0gMHgyMSAvKiAhICovIHx8XG4gICAgY2ggPT09IDB4N2MgLyogfCAqLyB8fFxuICAgIGNoID09PSAweDNlIC8qID4gKi8gfHxcbiAgICBjaCA9PT0gMHgyNyAvKiAnICovIHx8XG4gICAgY2ggPT09IDB4MjIgLyogXCIgKi8gfHxcbiAgICBjaCA9PT0gMHgyNSAvKiAlICovIHx8XG4gICAgY2ggPT09IDB4NDAgLyogQCAqLyB8fFxuICAgIGNoID09PSAweDYwIC8qIGAgKi9cbiAgKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbGV0IGZvbGxvd2luZzogbnVtYmVyO1xuICBpZiAoY2ggPT09IDB4M2YgfHwgLyogPyAqLyBjaCA9PT0gMHgyZCAvKiAtICovKSB7XG4gICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgaWYgKFxuICAgICAgaXNXc09yRW9sKGZvbGxvd2luZykgfHxcbiAgICAgICh3aXRoaW5GbG93Q29sbGVjdGlvbiAmJiBpc0Zsb3dJbmRpY2F0b3IoZm9sbG93aW5nKSlcbiAgICApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS5raW5kID0gXCJzY2FsYXJcIjtcbiAgc3RhdGUucmVzdWx0ID0gXCJcIjtcbiAgbGV0IGNhcHR1cmVFbmQ6IG51bWJlcixcbiAgICBjYXB0dXJlU3RhcnQgPSAoY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uKTtcbiAgbGV0IGhhc1BlbmRpbmdDb250ZW50ID0gZmFsc2U7XG4gIGxldCBsaW5lID0gMDtcbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgaWYgKGNoID09PSAweDNhIC8qIDogKi8pIHtcbiAgICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgICAgaWYgKFxuICAgICAgICBpc1dzT3JFb2woZm9sbG93aW5nKSB8fFxuICAgICAgICAod2l0aGluRmxvd0NvbGxlY3Rpb24gJiYgaXNGbG93SW5kaWNhdG9yKGZvbGxvd2luZykpXG4gICAgICApIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjaCA9PT0gMHgyMyAvKiAjICovKSB7XG4gICAgICBjb25zdCBwcmVjZWRpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uIC0gMSk7XG5cbiAgICAgIGlmIChpc1dzT3JFb2wocHJlY2VkaW5nKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkgfHxcbiAgICAgICh3aXRoaW5GbG93Q29sbGVjdGlvbiAmJiBpc0Zsb3dJbmRpY2F0b3IoY2gpKVxuICAgICkge1xuICAgICAgYnJlYWs7XG4gICAgfSBlbHNlIGlmIChpc0VPTChjaCkpIHtcbiAgICAgIGxpbmUgPSBzdGF0ZS5saW5lO1xuICAgICAgY29uc3QgbGluZVN0YXJ0ID0gc3RhdGUubGluZVN0YXJ0O1xuICAgICAgY29uc3QgbGluZUluZGVudCA9IHN0YXRlLmxpbmVJbmRlbnQ7XG4gICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgLTEpO1xuXG4gICAgICBpZiAoc3RhdGUubGluZUluZGVudCA+PSBub2RlSW5kZW50KSB7XG4gICAgICAgIGhhc1BlbmRpbmdDb250ZW50ID0gdHJ1ZTtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbiA9IGNhcHR1cmVFbmQ7XG4gICAgICAgIHN0YXRlLmxpbmUgPSBsaW5lO1xuICAgICAgICBzdGF0ZS5saW5lU3RhcnQgPSBsaW5lU3RhcnQ7XG4gICAgICAgIHN0YXRlLmxpbmVJbmRlbnQgPSBsaW5lSW5kZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFzUGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIGZhbHNlKTtcbiAgICAgIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIHN0YXRlLmxpbmUgLSBsaW5lKTtcbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICAgIGhhc1BlbmRpbmdDb250ZW50ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFpc1doaXRlU3BhY2UoY2gpKSB7XG4gICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb24gKyAxO1xuICAgIH1cblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgfVxuXG4gIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIGZhbHNlKTtcblxuICBpZiAoc3RhdGUucmVzdWx0KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzdGF0ZS5raW5kID0ga2luZDtcbiAgc3RhdGUucmVzdWx0ID0gcmVzdWx0O1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlYWRTaW5nbGVRdW90ZWRTY2FsYXIoXG4gIHN0YXRlOiBMb2FkZXJTdGF0ZSxcbiAgbm9kZUluZGVudDogbnVtYmVyLFxuKTogYm9vbGVhbiB7XG4gIGxldCBjaCwgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDI3IC8qICcgKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gXCJzY2FsYXJcIjtcbiAgc3RhdGUucmVzdWx0ID0gXCJcIjtcbiAgc3RhdGUucG9zaXRpb24rKztcbiAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlICgoY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSkgIT09IDApIHtcbiAgICBpZiAoY2ggPT09IDB4MjcgLyogJyAqLykge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIHRydWUpO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICBpZiAoY2ggPT09IDB4MjcgLyogJyAqLykge1xuICAgICAgICBjYXB0dXJlU3RhcnQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgICAgY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc0VPTChjaCkpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIHRydWUpO1xuICAgICAgd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIG5vZGVJbmRlbnQpKTtcbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCAmJlxuICAgICAgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKVxuICAgICkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICAgIHN0YXRlLFxuICAgICAgICBcInVuZXhwZWN0ZWQgZW5kIG9mIHRoZSBkb2N1bWVudCB3aXRoaW4gYSBzaW5nbGUgcXVvdGVkIHNjYWxhclwiLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICBzdGF0ZSxcbiAgICBcInVuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgc2luZ2xlIHF1b3RlZCBzY2FsYXJcIixcbiAgKTtcbn1cblxuZnVuY3Rpb24gcmVhZERvdWJsZVF1b3RlZFNjYWxhcihcbiAgc3RhdGU6IExvYWRlclN0YXRlLFxuICBub2RlSW5kZW50OiBudW1iZXIsXG4pOiBib29sZWFuIHtcbiAgbGV0IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDIyIC8qIFwiICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3RhdGUua2luZCA9IFwic2NhbGFyXCI7XG4gIHN0YXRlLnJlc3VsdCA9IFwiXCI7XG4gIHN0YXRlLnBvc2l0aW9uKys7XG4gIGxldCBjYXB0dXJlRW5kOiBudW1iZXIsXG4gICAgY2FwdHVyZVN0YXJ0ID0gKGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbik7XG4gIGxldCB0bXA6IG51bWJlcjtcbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIGlmIChjaCA9PT0gMHgyMiAvKiBcIiAqLykge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIHRydWUpO1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoY2ggPT09IDB4NWMgLyogXFwgKi8pIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIHN0YXRlLnBvc2l0aW9uLCB0cnVlKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgaWYgKGlzRU9MKGNoKSkge1xuICAgICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgbm9kZUluZGVudCk7XG5cbiAgICAgICAgLy8gVE9ETyhiYXJ0bG9taWVqdSk6IHJld29yayB0byBpbmxpbmUgZm4gd2l0aCBubyB0eXBlIGNhc3Q/XG4gICAgICB9IGVsc2UgaWYgKGNoIDwgMjU2ICYmIHNpbXBsZUVzY2FwZUNoZWNrW2NoXSkge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gc2ltcGxlRXNjYXBlTWFwW2NoXTtcbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIH0gZWxzZSBpZiAoKHRtcCA9IGVzY2FwZWRIZXhMZW4oY2gpKSA+IDApIHtcbiAgICAgICAgbGV0IGhleExlbmd0aCA9IHRtcDtcbiAgICAgICAgbGV0IGhleFJlc3VsdCA9IDA7XG5cbiAgICAgICAgZm9yICg7IGhleExlbmd0aCA+IDA7IGhleExlbmd0aC0tKSB7XG4gICAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICAgICAgaWYgKCh0bXAgPSBmcm9tSGV4Q29kZShjaCkpID49IDApIHtcbiAgICAgICAgICAgIGhleFJlc3VsdCA9IChoZXhSZXN1bHQgPDwgNCkgKyB0bXA7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aHJvd0Vycm9yKHN0YXRlLCBcImV4cGVjdGVkIGhleGFkZWNpbWFsIGNoYXJhY3RlclwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY2hhckZyb21Db2RlcG9pbnQoaGV4UmVzdWx0KTtcblxuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwidW5rbm93biBlc2NhcGUgc2VxdWVuY2VcIik7XG4gICAgICB9XG5cbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICB9IGVsc2UgaWYgKGlzRU9MKGNoKSkge1xuICAgICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgY2FwdHVyZUVuZCwgdHJ1ZSk7XG4gICAgICB3cml0ZUZvbGRlZExpbmVzKHN0YXRlLCBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgbm9kZUluZGVudCkpO1xuICAgICAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBzdGF0ZS5wb3NpdGlvbiA9PT0gc3RhdGUubGluZVN0YXJ0ICYmXG4gICAgICB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpXG4gICAgKSB7XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgICAgc3RhdGUsXG4gICAgICAgIFwidW5leHBlY3RlZCBlbmQgb2YgdGhlIGRvY3VtZW50IHdpdGhpbiBhIGRvdWJsZSBxdW90ZWQgc2NhbGFyXCIsXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aHJvd0Vycm9yKFxuICAgIHN0YXRlLFxuICAgIFwidW5leHBlY3RlZCBlbmQgb2YgdGhlIHN0cmVhbSB3aXRoaW4gYSBkb3VibGUgcXVvdGVkIHNjYWxhclwiLFxuICApO1xufVxuXG5mdW5jdGlvbiByZWFkRmxvd0NvbGxlY3Rpb24oc3RhdGU6IExvYWRlclN0YXRlLCBub2RlSW5kZW50OiBudW1iZXIpOiBib29sZWFuIHtcbiAgbGV0IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gIGxldCB0ZXJtaW5hdG9yOiBudW1iZXI7XG4gIGxldCBpc01hcHBpbmcgPSB0cnVlO1xuICBsZXQgcmVzdWx0OiBSZXN1bHRUeXBlID0ge307XG4gIGlmIChjaCA9PT0gMHg1YiAvKiBbICovKSB7XG4gICAgdGVybWluYXRvciA9IDB4NWQ7IC8qIF0gKi9cbiAgICBpc01hcHBpbmcgPSBmYWxzZTtcbiAgICByZXN1bHQgPSBbXTtcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHg3YiAvKiB7ICovKSB7XG4gICAgdGVybWluYXRvciA9IDB4N2Q7IC8qIH0gKi9cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoXG4gICAgc3RhdGUuYW5jaG9yICE9PSBudWxsICYmXG4gICAgdHlwZW9mIHN0YXRlLmFuY2hvciAhPSBcInVuZGVmaW5lZFwiICYmXG4gICAgdHlwZW9mIHN0YXRlLmFuY2hvck1hcCAhPSBcInVuZGVmaW5lZFwiXG4gICkge1xuICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gcmVzdWx0O1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIGNvbnN0IHRhZyA9IHN0YXRlLnRhZyxcbiAgICBhbmNob3IgPSBzdGF0ZS5hbmNob3I7XG4gIGxldCByZWFkTmV4dCA9IHRydWU7XG4gIGxldCB2YWx1ZU5vZGUsXG4gICAga2V5Tm9kZSxcbiAgICBrZXlUYWc6IHN0cmluZyB8IG51bGwgPSAoa2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGwpLFxuICAgIGlzRXhwbGljaXRQYWlyOiBib29sZWFuLFxuICAgIGlzUGFpciA9IChpc0V4cGxpY2l0UGFpciA9IGZhbHNlKTtcbiAgbGV0IGZvbGxvd2luZyA9IDAsXG4gICAgbGluZSA9IDA7XG4gIGNvbnN0IG92ZXJyaWRhYmxlS2V5czogQXJyYXlPYmplY3Q8Ym9vbGVhbj4gPSB7fTtcbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSB0ZXJtaW5hdG9yKSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgc3RhdGUudGFnID0gdGFnO1xuICAgICAgc3RhdGUuYW5jaG9yID0gYW5jaG9yO1xuICAgICAgc3RhdGUua2luZCA9IGlzTWFwcGluZyA/IFwibWFwcGluZ1wiIDogXCJzZXF1ZW5jZVwiO1xuICAgICAgc3RhdGUucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghcmVhZE5leHQpIHtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKHN0YXRlLCBcIm1pc3NlZCBjb21tYSBiZXR3ZWVuIGZsb3cgY29sbGVjdGlvbiBlbnRyaWVzXCIpO1xuICAgIH1cblxuICAgIGtleVRhZyA9IGtleU5vZGUgPSB2YWx1ZU5vZGUgPSBudWxsO1xuICAgIGlzUGFpciA9IGlzRXhwbGljaXRQYWlyID0gZmFsc2U7XG5cbiAgICBpZiAoY2ggPT09IDB4M2YgLyogPyAqLykge1xuICAgICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICBpZiAoaXNXc09yRW9sKGZvbGxvd2luZykpIHtcbiAgICAgICAgaXNQYWlyID0gaXNFeHBsaWNpdFBhaXIgPSB0cnVlO1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsaW5lID0gc3RhdGUubGluZTtcbiAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9GTE9XX0lOLCBmYWxzZSwgdHJ1ZSk7XG4gICAga2V5VGFnID0gc3RhdGUudGFnIHx8IG51bGw7XG4gICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoKGlzRXhwbGljaXRQYWlyIHx8IHN0YXRlLmxpbmUgPT09IGxpbmUpICYmIGNoID09PSAweDNhIC8qIDogKi8pIHtcbiAgICAgIGlzUGFpciA9IHRydWU7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcbiAgICAgIGNvbXBvc2VOb2RlKHN0YXRlLCBub2RlSW5kZW50LCBDT05URVhUX0ZMT1dfSU4sIGZhbHNlLCB0cnVlKTtcbiAgICAgIHZhbHVlTm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICB9XG5cbiAgICBpZiAoaXNNYXBwaW5nKSB7XG4gICAgICBzdG9yZU1hcHBpbmdQYWlyKFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgcmVzdWx0LFxuICAgICAgICBvdmVycmlkYWJsZUtleXMsXG4gICAgICAgIGtleVRhZyxcbiAgICAgICAga2V5Tm9kZSxcbiAgICAgICAgdmFsdWVOb2RlLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGlzUGFpcikge1xuICAgICAgKHJlc3VsdCBhcyBBcnJheU9iamVjdFtdKS5wdXNoKFxuICAgICAgICBzdG9yZU1hcHBpbmdQYWlyKFxuICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgIG51bGwsXG4gICAgICAgICAgb3ZlcnJpZGFibGVLZXlzLFxuICAgICAgICAgIGtleVRhZyxcbiAgICAgICAgICBrZXlOb2RlLFxuICAgICAgICAgIHZhbHVlTm9kZSxcbiAgICAgICAgKSxcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIChyZXN1bHQgYXMgUmVzdWx0VHlwZVtdKS5wdXNoKGtleU5vZGUgYXMgUmVzdWx0VHlwZSk7XG4gICAgfVxuXG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSAweDJjIC8qICwgKi8pIHtcbiAgICAgIHJlYWROZXh0ID0gdHJ1ZTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZE5leHQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICBzdGF0ZSxcbiAgICBcInVuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgZmxvdyBjb2xsZWN0aW9uXCIsXG4gICk7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja1NjYWxhcihzdGF0ZTogTG9hZGVyU3RhdGUsIG5vZGVJbmRlbnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICBsZXQgY2hvbXBpbmcgPSBDSE9NUElOR19DTElQLFxuICAgIGRpZFJlYWRDb250ZW50ID0gZmFsc2UsXG4gICAgZGV0ZWN0ZWRJbmRlbnQgPSBmYWxzZSxcbiAgICB0ZXh0SW5kZW50ID0gbm9kZUluZGVudCxcbiAgICBlbXB0eUxpbmVzID0gMCxcbiAgICBhdE1vcmVJbmRlbnRlZCA9IGZhbHNlO1xuXG4gIGxldCBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGxldCBmb2xkaW5nID0gZmFsc2U7XG4gIGlmIChjaCA9PT0gMHg3YyAvKiB8ICovKSB7XG4gICAgZm9sZGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGNoID09PSAweDNlIC8qID4gKi8pIHtcbiAgICBmb2xkaW5nID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gXCJzY2FsYXJcIjtcbiAgc3RhdGUucmVzdWx0ID0gXCJcIjtcblxuICBsZXQgdG1wID0gMDtcbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSAweDJiIHx8IC8qICsgKi8gY2ggPT09IDB4MmQgLyogLSAqLykge1xuICAgICAgaWYgKENIT01QSU5HX0NMSVAgPT09IGNob21waW5nKSB7XG4gICAgICAgIGNob21waW5nID0gY2ggPT09IDB4MmIgLyogKyAqLyA/IENIT01QSU5HX0tFRVAgOiBDSE9NUElOR19TVFJJUDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKHN0YXRlLCBcInJlcGVhdCBvZiBhIGNob21waW5nIG1vZGUgaWRlbnRpZmllclwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCh0bXAgPSBmcm9tRGVjaW1hbENvZGUoY2gpKSA+PSAwKSB7XG4gICAgICBpZiAodG1wID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgIFwiYmFkIGV4cGxpY2l0IGluZGVudGF0aW9uIHdpZHRoIG9mIGEgYmxvY2sgc2NhbGFyOyBpdCBjYW5ub3QgYmUgbGVzcyB0aGFuIG9uZVwiLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmICghZGV0ZWN0ZWRJbmRlbnQpIHtcbiAgICAgICAgdGV4dEluZGVudCA9IG5vZGVJbmRlbnQgKyB0bXAgLSAxO1xuICAgICAgICBkZXRlY3RlZEluZGVudCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihzdGF0ZSwgXCJyZXBlYXQgb2YgYW4gaW5kZW50YXRpb24gd2lkdGggaWRlbnRpZmllclwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICBkbyB7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSB3aGlsZSAoaXNXaGl0ZVNwYWNlKGNoKSk7XG5cbiAgICBpZiAoY2ggPT09IDB4MjMgLyogIyAqLykge1xuICAgICAgZG8ge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9IHdoaWxlICghaXNFT0woY2gpICYmIGNoICE9PSAwKTtcbiAgICB9XG4gIH1cblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICByZWFkTGluZUJyZWFrKHN0YXRlKTtcbiAgICBzdGF0ZS5saW5lSW5kZW50ID0gMDtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICB3aGlsZSAoXG4gICAgICAoIWRldGVjdGVkSW5kZW50IHx8IHN0YXRlLmxpbmVJbmRlbnQgPCB0ZXh0SW5kZW50KSAmJlxuICAgICAgY2ggPT09IDB4MjAgLyogU3BhY2UgKi9cbiAgICApIHtcbiAgICAgIHN0YXRlLmxpbmVJbmRlbnQrKztcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoIWRldGVjdGVkSW5kZW50ICYmIHN0YXRlLmxpbmVJbmRlbnQgPiB0ZXh0SW5kZW50KSB7XG4gICAgICB0ZXh0SW5kZW50ID0gc3RhdGUubGluZUluZGVudDtcbiAgICB9XG5cbiAgICBpZiAoaXNFT0woY2gpKSB7XG4gICAgICBlbXB0eUxpbmVzKys7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBFbmQgb2YgdGhlIHNjYWxhci5cbiAgICBpZiAoc3RhdGUubGluZUluZGVudCA8IHRleHRJbmRlbnQpIHtcbiAgICAgIC8vIFBlcmZvcm0gdGhlIGNob21waW5nLlxuICAgICAgaWYgKGNob21waW5nID09PSBDSE9NUElOR19LRUVQKSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KFxuICAgICAgICAgIFwiXFxuXCIsXG4gICAgICAgICAgZGlkUmVhZENvbnRlbnQgPyAxICsgZW1wdHlMaW5lcyA6IGVtcHR5TGluZXMsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGNob21waW5nID09PSBDSE9NUElOR19DTElQKSB7XG4gICAgICAgIGlmIChkaWRSZWFkQ29udGVudCkge1xuICAgICAgICAgIC8vIGkuZS4gb25seSBpZiB0aGUgc2NhbGFyIGlzIG5vdCBlbXB0eS5cbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gXCJcXG5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCcmVhayB0aGlzIGB3aGlsZWAgY3ljbGUgYW5kIGdvIHRvIHRoZSBmdW5jdGlvbidzIGVwaWxvZ3VlLlxuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gRm9sZGVkIHN0eWxlOiB1c2UgZmFuY3kgcnVsZXMgdG8gaGFuZGxlIGxpbmUgYnJlYWtzLlxuICAgIGlmIChmb2xkaW5nKSB7XG4gICAgICAvLyBMaW5lcyBzdGFydGluZyB3aXRoIHdoaXRlIHNwYWNlIGNoYXJhY3RlcnMgKG1vcmUtaW5kZW50ZWQgbGluZXMpIGFyZSBub3QgZm9sZGVkLlxuICAgICAgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgYXRNb3JlSW5kZW50ZWQgPSB0cnVlO1xuICAgICAgICAvLyBleGNlcHQgZm9yIHRoZSBmaXJzdCBjb250ZW50IGxpbmUgKGNmLiBFeGFtcGxlIDguMSlcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoXG4gICAgICAgICAgXCJcXG5cIixcbiAgICAgICAgICBkaWRSZWFkQ29udGVudCA/IDEgKyBlbXB0eUxpbmVzIDogZW1wdHlMaW5lcyxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBFbmQgb2YgbW9yZS1pbmRlbnRlZCBibG9jay5cbiAgICAgIH0gZWxzZSBpZiAoYXRNb3JlSW5kZW50ZWQpIHtcbiAgICAgICAgYXRNb3JlSW5kZW50ZWQgPSBmYWxzZTtcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoXCJcXG5cIiwgZW1wdHlMaW5lcyArIDEpO1xuXG4gICAgICAgIC8vIEp1c3Qgb25lIGxpbmUgYnJlYWsgLSBwZXJjZWl2ZSBhcyB0aGUgc2FtZSBsaW5lLlxuICAgICAgfSBlbHNlIGlmIChlbXB0eUxpbmVzID09PSAwKSB7XG4gICAgICAgIGlmIChkaWRSZWFkQ29udGVudCkge1xuICAgICAgICAgIC8vIGkuZS4gb25seSBpZiB3ZSBoYXZlIGFscmVhZHkgcmVhZCBzb21lIHNjYWxhciBjb250ZW50LlxuICAgICAgICAgIHN0YXRlLnJlc3VsdCArPSBcIiBcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldmVyYWwgbGluZSBicmVha3MgLSBwZXJjZWl2ZSBhcyBkaWZmZXJlbnQgbGluZXMuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdChcIlxcblwiLCBlbXB0eUxpbmVzKTtcbiAgICAgIH1cblxuICAgICAgLy8gTGl0ZXJhbCBzdHlsZToganVzdCBhZGQgZXhhY3QgbnVtYmVyIG9mIGxpbmUgYnJlYWtzIGJldHdlZW4gY29udGVudCBsaW5lcy5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gS2VlcCBhbGwgbGluZSBicmVha3MgZXhjZXB0IHRoZSBoZWFkZXIgbGluZSBicmVhay5cbiAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KFxuICAgICAgICBcIlxcblwiLFxuICAgICAgICBkaWRSZWFkQ29udGVudCA/IDEgKyBlbXB0eUxpbmVzIDogZW1wdHlMaW5lcyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZGlkUmVhZENvbnRlbnQgPSB0cnVlO1xuICAgIGRldGVjdGVkSW5kZW50ID0gdHJ1ZTtcbiAgICBlbXB0eUxpbmVzID0gMDtcbiAgICBjb25zdCBjYXB0dXJlU3RhcnQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIHdoaWxlICghaXNFT0woY2gpICYmIGNoICE9PSAwKSB7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgY2FwdHVyZVNlZ21lbnQoc3RhdGUsIGNhcHR1cmVTdGFydCwgc3RhdGUucG9zaXRpb24sIGZhbHNlKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZWFkQmxvY2tTZXF1ZW5jZShzdGF0ZTogTG9hZGVyU3RhdGUsIG5vZGVJbmRlbnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICBsZXQgbGluZTogbnVtYmVyLFxuICAgIGZvbGxvd2luZzogbnVtYmVyLFxuICAgIGRldGVjdGVkID0gZmFsc2UsXG4gICAgY2g6IG51bWJlcjtcbiAgY29uc3QgdGFnID0gc3RhdGUudGFnLFxuICAgIGFuY2hvciA9IHN0YXRlLmFuY2hvcixcbiAgICByZXN1bHQ6IHVua25vd25bXSA9IFtdO1xuXG4gIGlmIChcbiAgICBzdGF0ZS5hbmNob3IgIT09IG51bGwgJiZcbiAgICB0eXBlb2Ygc3RhdGUuYW5jaG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgdHlwZW9mIHN0YXRlLmFuY2hvck1hcCAhPT0gXCJ1bmRlZmluZWRcIlxuICApIHtcbiAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHJlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgaWYgKGNoICE9PSAweDJkIC8qIC0gKi8pIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgIGlmICghaXNXc09yRW9sKGZvbGxvd2luZykpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGRldGVjdGVkID0gdHJ1ZTtcbiAgICBzdGF0ZS5wb3NpdGlvbisrO1xuXG4gICAgaWYgKHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKSkge1xuICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPD0gbm9kZUluZGVudCkge1xuICAgICAgICByZXN1bHQucHVzaChudWxsKTtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGluZSA9IHN0YXRlLmxpbmU7XG4gICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfQkxPQ0tfSU4sIGZhbHNlLCB0cnVlKTtcbiAgICByZXN1bHQucHVzaChzdGF0ZS5yZXN1bHQpO1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoKHN0YXRlLmxpbmUgPT09IGxpbmUgfHwgc3RhdGUubGluZUluZGVudCA+IG5vZGVJbmRlbnQpICYmIGNoICE9PSAwKSB7XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihzdGF0ZSwgXCJiYWQgaW5kZW50YXRpb24gb2YgYSBzZXF1ZW5jZSBlbnRyeVwiKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBub2RlSW5kZW50KSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoZGV0ZWN0ZWQpIHtcbiAgICBzdGF0ZS50YWcgPSB0YWc7XG4gICAgc3RhdGUuYW5jaG9yID0gYW5jaG9yO1xuICAgIHN0YXRlLmtpbmQgPSBcInNlcXVlbmNlXCI7XG4gICAgc3RhdGUucmVzdWx0ID0gcmVzdWx0O1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVhZEJsb2NrTWFwcGluZyhcbiAgc3RhdGU6IExvYWRlclN0YXRlLFxuICBub2RlSW5kZW50OiBudW1iZXIsXG4gIGZsb3dJbmRlbnQ6IG51bWJlcixcbik6IGJvb2xlYW4ge1xuICBjb25zdCB0YWcgPSBzdGF0ZS50YWcsXG4gICAgYW5jaG9yID0gc3RhdGUuYW5jaG9yLFxuICAgIHJlc3VsdCA9IHt9LFxuICAgIG92ZXJyaWRhYmxlS2V5cyA9IHt9O1xuICBsZXQgZm9sbG93aW5nOiBudW1iZXIsXG4gICAgYWxsb3dDb21wYWN0ID0gZmFsc2UsXG4gICAgbGluZTogbnVtYmVyLFxuICAgIHBvczogbnVtYmVyLFxuICAgIGtleVRhZyA9IG51bGwsXG4gICAga2V5Tm9kZSA9IG51bGwsXG4gICAgdmFsdWVOb2RlID0gbnVsbCxcbiAgICBhdEV4cGxpY2l0S2V5ID0gZmFsc2UsXG4gICAgZGV0ZWN0ZWQgPSBmYWxzZSxcbiAgICBjaDogbnVtYmVyO1xuXG4gIGlmIChcbiAgICBzdGF0ZS5hbmNob3IgIT09IG51bGwgJiZcbiAgICB0eXBlb2Ygc3RhdGUuYW5jaG9yICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgdHlwZW9mIHN0YXRlLmFuY2hvck1hcCAhPT0gXCJ1bmRlZmluZWRcIlxuICApIHtcbiAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHJlc3VsdDtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgZm9sbG93aW5nID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpO1xuICAgIGxpbmUgPSBzdGF0ZS5saW5lOyAvLyBTYXZlIHRoZSBjdXJyZW50IGxpbmUuXG4gICAgcG9zID0gc3RhdGUucG9zaXRpb247XG5cbiAgICAvL1xuICAgIC8vIEV4cGxpY2l0IG5vdGF0aW9uIGNhc2UuIFRoZXJlIGFyZSB0d28gc2VwYXJhdGUgYmxvY2tzOlxuICAgIC8vIGZpcnN0IGZvciB0aGUga2V5IChkZW5vdGVkIGJ5IFwiP1wiKSBhbmQgc2Vjb25kIGZvciB0aGUgdmFsdWUgKGRlbm90ZWQgYnkgXCI6XCIpXG4gICAgLy9cbiAgICBpZiAoKGNoID09PSAweDNmIHx8IC8qID8gKi8gY2ggPT09IDB4M2EpICYmIC8qIDogKi8gaXNXc09yRW9sKGZvbGxvd2luZykpIHtcbiAgICAgIGlmIChjaCA9PT0gMHgzZiAvKiA/ICovKSB7XG4gICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgb3ZlcnJpZGFibGVLZXlzLFxuICAgICAgICAgICAga2V5VGFnIGFzIHN0cmluZyxcbiAgICAgICAgICAgIGtleU5vZGUsXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICk7XG4gICAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBkZXRlY3RlZCA9IHRydWU7XG4gICAgICAgIGF0RXhwbGljaXRLZXkgPSB0cnVlO1xuICAgICAgICBhbGxvd0NvbXBhY3QgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIC8vIGkuZS4gMHgzQS8qIDogKi8gPT09IGNoYXJhY3RlciBhZnRlciB0aGUgZXhwbGljaXQga2V5LlxuICAgICAgICBhdEV4cGxpY2l0S2V5ID0gZmFsc2U7XG4gICAgICAgIGFsbG93Q29tcGFjdCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICBcImluY29tcGxldGUgZXhwbGljaXQgbWFwcGluZyBwYWlyOyBhIGtleSBub2RlIGlzIG1pc3NlZDsgb3IgZm9sbG93ZWQgYnkgYSBub24tdGFidWxhdGVkIGVtcHR5IGxpbmVcIixcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgc3RhdGUucG9zaXRpb24gKz0gMTtcbiAgICAgIGNoID0gZm9sbG93aW5nO1xuXG4gICAgICAvL1xuICAgICAgLy8gSW1wbGljaXQgbm90YXRpb24gY2FzZS4gRmxvdy1zdHlsZSBub2RlIGFzIHRoZSBrZXkgZmlyc3QsIHRoZW4gXCI6XCIsIGFuZCB0aGUgdmFsdWUuXG4gICAgICAvL1xuICAgIH0gZWxzZSBpZiAoY29tcG9zZU5vZGUoc3RhdGUsIGZsb3dJbmRlbnQsIENPTlRFWFRfRkxPV19PVVQsIGZhbHNlLCB0cnVlKSkge1xuICAgICAgaWYgKHN0YXRlLmxpbmUgPT09IGxpbmUpIHtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgICB3aGlsZSAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gMHgzYSAvKiA6ICovKSB7XG4gICAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICAgICAgaWYgKCFpc1dzT3JFb2woY2gpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICAgIFwiYSB3aGl0ZXNwYWNlIGNoYXJhY3RlciBpcyBleHBlY3RlZCBhZnRlciB0aGUga2V5LXZhbHVlIHNlcGFyYXRvciB3aXRoaW4gYSBibG9jayBtYXBwaW5nXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAgICBzdG9yZU1hcHBpbmdQYWlyKFxuICAgICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgICBvdmVycmlkYWJsZUtleXMsXG4gICAgICAgICAgICAgIGtleVRhZyBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgIGtleU5vZGUsXG4gICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIGF0RXhwbGljaXRLZXkgPSBmYWxzZTtcbiAgICAgICAgICBhbGxvd0NvbXBhY3QgPSBmYWxzZTtcbiAgICAgICAgICBrZXlUYWcgPSBzdGF0ZS50YWc7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfSBlbHNlIGlmIChkZXRlY3RlZCkge1xuICAgICAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBcImNhbiBub3QgcmVhZCBhbiBpbXBsaWNpdCBtYXBwaW5nIHBhaXI7IGEgY29sb24gaXMgbWlzc2VkXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS50YWcgPSB0YWc7XG4gICAgICAgICAgc3RhdGUuYW5jaG9yID0gYW5jaG9yO1xuICAgICAgICAgIHJldHVybiB0cnVlOyAvLyBLZWVwIHRoZSByZXN1bHQgb2YgYGNvbXBvc2VOb2RlYC5cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChkZXRlY3RlZCkge1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICBcImNhbiBub3QgcmVhZCBhIGJsb2NrIG1hcHBpbmcgZW50cnk7IGEgbXVsdGlsaW5lIGtleSBtYXkgbm90IGJlIGFuIGltcGxpY2l0IGtleVwiLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUudGFnID0gdGFnO1xuICAgICAgICBzdGF0ZS5hbmNob3IgPSBhbmNob3I7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBLZWVwIHRoZSByZXN1bHQgb2YgYGNvbXBvc2VOb2RlYC5cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7IC8vIFJlYWRpbmcgaXMgZG9uZS4gR28gdG8gdGhlIGVwaWxvZ3VlLlxuICAgIH1cblxuICAgIC8vXG4gICAgLy8gQ29tbW9uIHJlYWRpbmcgY29kZSBmb3IgYm90aCBleHBsaWNpdCBhbmQgaW1wbGljaXQgbm90YXRpb25zLlxuICAgIC8vXG4gICAgaWYgKHN0YXRlLmxpbmUgPT09IGxpbmUgfHwgc3RhdGUubGluZUluZGVudCA+IG5vZGVJbmRlbnQpIHtcbiAgICAgIGlmIChcbiAgICAgICAgY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfQkxPQ0tfT1VULCB0cnVlLCBhbGxvd0NvbXBhY3QpXG4gICAgICApIHtcbiAgICAgICAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgICBrZXlOb2RlID0gc3RhdGUucmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlTm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIWF0RXhwbGljaXRLZXkpIHtcbiAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihcbiAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICByZXN1bHQsXG4gICAgICAgICAgb3ZlcnJpZGFibGVLZXlzLFxuICAgICAgICAgIGtleVRhZyBhcyBzdHJpbmcsXG4gICAgICAgICAga2V5Tm9kZSxcbiAgICAgICAgICB2YWx1ZU5vZGUsXG4gICAgICAgICAgbGluZSxcbiAgICAgICAgICBwb3MsXG4gICAgICAgICk7XG4gICAgICAgIGtleVRhZyA9IGtleU5vZGUgPSB2YWx1ZU5vZGUgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gbm9kZUluZGVudCAmJiBjaCAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwiYmFkIGluZGVudGF0aW9uIG9mIGEgbWFwcGluZyBlbnRyeVwiKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBub2RlSW5kZW50KSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvL1xuICAvLyBFcGlsb2d1ZS5cbiAgLy9cblxuICAvLyBTcGVjaWFsIGNhc2U6IGxhc3QgbWFwcGluZydzIG5vZGUgY29udGFpbnMgb25seSB0aGUga2V5IGluIGV4cGxpY2l0IG5vdGF0aW9uLlxuICBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgIHN0b3JlTWFwcGluZ1BhaXIoXG4gICAgICBzdGF0ZSxcbiAgICAgIHJlc3VsdCxcbiAgICAgIG92ZXJyaWRhYmxlS2V5cyxcbiAgICAgIGtleVRhZyBhcyBzdHJpbmcsXG4gICAgICBrZXlOb2RlLFxuICAgICAgbnVsbCxcbiAgICApO1xuICB9XG5cbiAgLy8gRXhwb3NlIHRoZSByZXN1bHRpbmcgbWFwcGluZy5cbiAgaWYgKGRldGVjdGVkKSB7XG4gICAgc3RhdGUudGFnID0gdGFnO1xuICAgIHN0YXRlLmFuY2hvciA9IGFuY2hvcjtcbiAgICBzdGF0ZS5raW5kID0gXCJtYXBwaW5nXCI7XG4gICAgc3RhdGUucmVzdWx0ID0gcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIGRldGVjdGVkO1xufVxuXG5mdW5jdGlvbiByZWFkVGFnUHJvcGVydHkoc3RhdGU6IExvYWRlclN0YXRlKTogYm9vbGVhbiB7XG4gIGxldCBwb3NpdGlvbjogbnVtYmVyLFxuICAgIGlzVmVyYmF0aW0gPSBmYWxzZSxcbiAgICBpc05hbWVkID0gZmFsc2UsXG4gICAgdGFnSGFuZGxlID0gXCJcIixcbiAgICB0YWdOYW1lOiBzdHJpbmcsXG4gICAgY2g6IG51bWJlcjtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyMSAvKiAhICovKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLnRhZyAhPT0gbnVsbCkge1xuICAgIHJldHVybiB0aHJvd0Vycm9yKHN0YXRlLCBcImR1cGxpY2F0aW9uIG9mIGEgdGFnIHByb3BlcnR5XCIpO1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCA9PT0gMHgzYyAvKiA8ICovKSB7XG4gICAgaXNWZXJiYXRpbSA9IHRydWU7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICB9IGVsc2UgaWYgKGNoID09PSAweDIxIC8qICEgKi8pIHtcbiAgICBpc05hbWVkID0gdHJ1ZTtcbiAgICB0YWdIYW5kbGUgPSBcIiEhXCI7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICB9IGVsc2Uge1xuICAgIHRhZ0hhbmRsZSA9IFwiIVwiO1xuICB9XG5cbiAgcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcblxuICBpZiAoaXNWZXJiYXRpbSkge1xuICAgIGRvIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9IHdoaWxlIChjaCAhPT0gMCAmJiBjaCAhPT0gMHgzZSAvKiA+ICovKTtcblxuICAgIGlmIChzdGF0ZS5wb3NpdGlvbiA8IHN0YXRlLmxlbmd0aCkge1xuICAgICAgdGFnTmFtZSA9IHN0YXRlLmlucHV0LnNsaWNlKHBvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgXCJ1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIHZlcmJhdGltIHRhZ1wiLFxuICAgICAgKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgd2hpbGUgKGNoICE9PSAwICYmICFpc1dzT3JFb2woY2gpKSB7XG4gICAgICBpZiAoY2ggPT09IDB4MjEgLyogISAqLykge1xuICAgICAgICBpZiAoIWlzTmFtZWQpIHtcbiAgICAgICAgICB0YWdIYW5kbGUgPSBzdGF0ZS5pbnB1dC5zbGljZShwb3NpdGlvbiAtIDEsIHN0YXRlLnBvc2l0aW9uICsgMSk7XG5cbiAgICAgICAgICBpZiAoIVBBVFRFUk5fVEFHX0hBTkRMRS50ZXN0KHRhZ0hhbmRsZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgICAgXCJuYW1lZCB0YWcgaGFuZGxlIGNhbm5vdCBjb250YWluIHN1Y2ggY2hhcmFjdGVyc1wiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpc05hbWVkID0gdHJ1ZTtcbiAgICAgICAgICBwb3NpdGlvbiA9IHN0YXRlLnBvc2l0aW9uICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgXCJ0YWcgc3VmZml4IGNhbm5vdCBjb250YWluIGV4Y2xhbWF0aW9uIG1hcmtzXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgdGFnTmFtZSA9IHN0YXRlLmlucHV0LnNsaWNlKHBvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoUEFUVEVSTl9GTE9XX0lORElDQVRPUlMudGVzdCh0YWdOYW1lKSkge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICAgIHN0YXRlLFxuICAgICAgICBcInRhZyBzdWZmaXggY2Fubm90IGNvbnRhaW4gZmxvdyBpbmRpY2F0b3IgY2hhcmFjdGVyc1wiLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGFnTmFtZSAmJiAhUEFUVEVSTl9UQUdfVVJJLnRlc3QodGFnTmFtZSkpIHtcbiAgICByZXR1cm4gdGhyb3dFcnJvcihcbiAgICAgIHN0YXRlLFxuICAgICAgYHRhZyBuYW1lIGNhbm5vdCBjb250YWluIHN1Y2ggY2hhcmFjdGVyczogJHt0YWdOYW1lfWAsXG4gICAgKTtcbiAgfVxuXG4gIGlmIChpc1ZlcmJhdGltKSB7XG4gICAgc3RhdGUudGFnID0gdGFnTmFtZTtcbiAgfSBlbHNlIGlmIChcbiAgICB0eXBlb2Ygc3RhdGUudGFnTWFwICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgaGFzT3duKHN0YXRlLnRhZ01hcCwgdGFnSGFuZGxlKVxuICApIHtcbiAgICBzdGF0ZS50YWcgPSBzdGF0ZS50YWdNYXBbdGFnSGFuZGxlXSArIHRhZ05hbWU7XG4gIH0gZWxzZSBpZiAodGFnSGFuZGxlID09PSBcIiFcIikge1xuICAgIHN0YXRlLnRhZyA9IGAhJHt0YWdOYW1lfWA7XG4gIH0gZWxzZSBpZiAodGFnSGFuZGxlID09PSBcIiEhXCIpIHtcbiAgICBzdGF0ZS50YWcgPSBgdGFnOnlhbWwub3JnLDIwMDI6JHt0YWdOYW1lfWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIGB1bmRlY2xhcmVkIHRhZyBoYW5kbGUgXCIke3RhZ0hhbmRsZX1cImApO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbmNob3JQcm9wZXJ0eShzdGF0ZTogTG9hZGVyU3RhdGUpOiBib29sZWFuIHtcbiAgbGV0IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gIGlmIChjaCAhPT0gMHgyNiAvKiAmICovKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHJldHVybiB0aHJvd0Vycm9yKHN0YXRlLCBcImR1cGxpY2F0aW9uIG9mIGFuIGFuY2hvciBwcm9wZXJ0eVwiKTtcbiAgfVxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgY29uc3QgcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc1dzT3JFb2woY2gpICYmICFpc0Zsb3dJbmRpY2F0b3IoY2gpKSB7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICB9XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBwb3NpdGlvbikge1xuICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgc3RhdGUsXG4gICAgICBcIm5hbWUgb2YgYW4gYW5jaG9yIG5vZGUgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBjaGFyYWN0ZXJcIixcbiAgICApO1xuICB9XG5cbiAgc3RhdGUuYW5jaG9yID0gc3RhdGUuaW5wdXQuc2xpY2UocG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbGlhcyhzdGF0ZTogTG9hZGVyU3RhdGUpOiBib29sZWFuIHtcbiAgbGV0IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDJhIC8qICogKi8pIHJldHVybiBmYWxzZTtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIGNvbnN0IF9wb3NpdGlvbiA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNXc09yRW9sKGNoKSAmJiAhaXNGbG93SW5kaWNhdG9yKGNoKSkge1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgfVxuXG4gIGlmIChzdGF0ZS5wb3NpdGlvbiA9PT0gX3Bvc2l0aW9uKSB7XG4gICAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICBzdGF0ZSxcbiAgICAgIFwibmFtZSBvZiBhbiBhbGlhcyBub2RlIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyXCIsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IGFsaWFzID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gIGlmIChcbiAgICB0eXBlb2Ygc3RhdGUuYW5jaG9yTWFwICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgIWhhc093bihzdGF0ZS5hbmNob3JNYXAsIGFsaWFzKVxuICApIHtcbiAgICByZXR1cm4gdGhyb3dFcnJvcihzdGF0ZSwgYHVuaWRlbnRpZmllZCBhbGlhcyBcIiR7YWxpYXN9XCJgKTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygc3RhdGUuYW5jaG9yTWFwICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgc3RhdGUucmVzdWx0ID0gc3RhdGUuYW5jaG9yTWFwW2FsaWFzXTtcbiAgfVxuICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb21wb3NlTm9kZShcbiAgc3RhdGU6IExvYWRlclN0YXRlLFxuICBwYXJlbnRJbmRlbnQ6IG51bWJlcixcbiAgbm9kZUNvbnRleHQ6IG51bWJlcixcbiAgYWxsb3dUb1NlZWs6IGJvb2xlYW4sXG4gIGFsbG93Q29tcGFjdDogYm9vbGVhbixcbik6IGJvb2xlYW4ge1xuICBsZXQgYWxsb3dCbG9ja1NjYWxhcnM6IGJvb2xlYW4sXG4gICAgYWxsb3dCbG9ja0NvbGxlY3Rpb25zOiBib29sZWFuLFxuICAgIGluZGVudFN0YXR1cyA9IDEsIC8vIDE6IHRoaXM+cGFyZW50LCAwOiB0aGlzPXBhcmVudCwgLTE6IHRoaXM8cGFyZW50XG4gICAgYXROZXdMaW5lID0gZmFsc2UsXG4gICAgaGFzQ29udGVudCA9IGZhbHNlLFxuICAgIHR5cGU6IFR5cGUsXG4gICAgZmxvd0luZGVudDogbnVtYmVyLFxuICAgIGJsb2NrSW5kZW50OiBudW1iZXI7XG5cbiAgaWYgKHN0YXRlLmxpc3RlbmVyICYmIHN0YXRlLmxpc3RlbmVyICE9PSBudWxsKSB7XG4gICAgc3RhdGUubGlzdGVuZXIoXCJvcGVuXCIsIHN0YXRlKTtcbiAgfVxuXG4gIHN0YXRlLnRhZyA9IG51bGw7XG4gIHN0YXRlLmFuY2hvciA9IG51bGw7XG4gIHN0YXRlLmtpbmQgPSBudWxsO1xuICBzdGF0ZS5yZXN1bHQgPSBudWxsO1xuXG4gIGNvbnN0IGFsbG93QmxvY2tTdHlsZXMgPVxuICAgIChhbGxvd0Jsb2NrU2NhbGFycyA9IGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9XG4gICAgICBDT05URVhUX0JMT0NLX09VVCA9PT0gbm9kZUNvbnRleHQgfHwgQ09OVEVYVF9CTE9DS19JTiA9PT0gbm9kZUNvbnRleHQpO1xuXG4gIGlmIChhbGxvd1RvU2Vlaykge1xuICAgIGlmIChza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSkpIHtcbiAgICAgIGF0TmV3TGluZSA9IHRydWU7XG5cbiAgICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gcGFyZW50SW5kZW50KSB7XG4gICAgICAgIGluZGVudFN0YXR1cyA9IDE7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPT09IHBhcmVudEluZGVudCkge1xuICAgICAgICBpbmRlbnRTdGF0dXMgPSAwO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgcGFyZW50SW5kZW50KSB7XG4gICAgICAgIGluZGVudFN0YXR1cyA9IC0xO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChpbmRlbnRTdGF0dXMgPT09IDEpIHtcbiAgICB3aGlsZSAocmVhZFRhZ1Byb3BlcnR5KHN0YXRlKSB8fCByZWFkQW5jaG9yUHJvcGVydHkoc3RhdGUpKSB7XG4gICAgICBpZiAoc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpKSB7XG4gICAgICAgIGF0TmV3TGluZSA9IHRydWU7XG4gICAgICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9IGFsbG93QmxvY2tTdHlsZXM7XG5cbiAgICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPiBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgICBpbmRlbnRTdGF0dXMgPSAxO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPT09IHBhcmVudEluZGVudCkge1xuICAgICAgICAgIGluZGVudFN0YXR1cyA9IDA7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA8IHBhcmVudEluZGVudCkge1xuICAgICAgICAgIGluZGVudFN0YXR1cyA9IC0xO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoYWxsb3dCbG9ja0NvbGxlY3Rpb25zKSB7XG4gICAgYWxsb3dCbG9ja0NvbGxlY3Rpb25zID0gYXROZXdMaW5lIHx8IGFsbG93Q29tcGFjdDtcbiAgfVxuXG4gIGlmIChpbmRlbnRTdGF0dXMgPT09IDEgfHwgQ09OVEVYVF9CTE9DS19PVVQgPT09IG5vZGVDb250ZXh0KSB7XG4gICAgY29uc3QgY29uZCA9IENPTlRFWFRfRkxPV19JTiA9PT0gbm9kZUNvbnRleHQgfHxcbiAgICAgIENPTlRFWFRfRkxPV19PVVQgPT09IG5vZGVDb250ZXh0O1xuICAgIGZsb3dJbmRlbnQgPSBjb25kID8gcGFyZW50SW5kZW50IDogcGFyZW50SW5kZW50ICsgMTtcblxuICAgIGJsb2NrSW5kZW50ID0gc3RhdGUucG9zaXRpb24gLSBzdGF0ZS5saW5lU3RhcnQ7XG5cbiAgICBpZiAoaW5kZW50U3RhdHVzID09PSAxKSB7XG4gICAgICBpZiAoXG4gICAgICAgIChhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgJiZcbiAgICAgICAgICAocmVhZEJsb2NrU2VxdWVuY2Uoc3RhdGUsIGJsb2NrSW5kZW50KSB8fFxuICAgICAgICAgICAgcmVhZEJsb2NrTWFwcGluZyhzdGF0ZSwgYmxvY2tJbmRlbnQsIGZsb3dJbmRlbnQpKSkgfHxcbiAgICAgICAgcmVhZEZsb3dDb2xsZWN0aW9uKHN0YXRlLCBmbG93SW5kZW50KVxuICAgICAgKSB7XG4gICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIChhbGxvd0Jsb2NrU2NhbGFycyAmJiByZWFkQmxvY2tTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpKSB8fFxuICAgICAgICAgIHJlYWRTaW5nbGVRdW90ZWRTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpIHx8XG4gICAgICAgICAgcmVhZERvdWJsZVF1b3RlZFNjYWxhcihzdGF0ZSwgZmxvd0luZGVudClcbiAgICAgICAgKSB7XG4gICAgICAgICAgaGFzQ29udGVudCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAocmVhZEFsaWFzKHN0YXRlKSkge1xuICAgICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHN0YXRlLnRhZyAhPT0gbnVsbCB8fCBzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgICAgXCJhbGlhcyBub2RlIHNob3VsZCBub3QgaGF2ZSBBbnkgcHJvcGVydGllc1wiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgcmVhZFBsYWluU2NhbGFyKHN0YXRlLCBmbG93SW5kZW50LCBDT05URVhUX0ZMT1dfSU4gPT09IG5vZGVDb250ZXh0KVxuICAgICAgICApIHtcbiAgICAgICAgICBoYXNDb250ZW50ID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChzdGF0ZS50YWcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0YXRlLnRhZyA9IFwiP1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwgJiYgdHlwZW9mIHN0YXRlLmFuY2hvck1hcCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gc3RhdGUucmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpbmRlbnRTdGF0dXMgPT09IDApIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZTogYmxvY2sgc2VxdWVuY2VzIGFyZSBhbGxvd2VkIHRvIGhhdmUgc2FtZSBpbmRlbnRhdGlvbiBsZXZlbCBhcyB0aGUgcGFyZW50LlxuICAgICAgLy8gaHR0cDovL3d3dy55YW1sLm9yZy9zcGVjLzEuMi9zcGVjLmh0bWwjaWQyNzk5Nzg0XG4gICAgICBoYXNDb250ZW50ID0gYWxsb3dCbG9ja0NvbGxlY3Rpb25zICYmXG4gICAgICAgIHJlYWRCbG9ja1NlcXVlbmNlKHN0YXRlLCBibG9ja0luZGVudCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09IFwiIVwiKSB7XG4gICAgaWYgKHN0YXRlLnRhZyA9PT0gXCI/XCIpIHtcbiAgICAgIGZvciAoXG4gICAgICAgIGxldCB0eXBlSW5kZXggPSAwLCB0eXBlUXVhbnRpdHkgPSBzdGF0ZS5pbXBsaWNpdFR5cGVzLmxlbmd0aDtcbiAgICAgICAgdHlwZUluZGV4IDwgdHlwZVF1YW50aXR5O1xuICAgICAgICB0eXBlSW5kZXgrK1xuICAgICAgKSB7XG4gICAgICAgIHR5cGUgPSBzdGF0ZS5pbXBsaWNpdFR5cGVzW3R5cGVJbmRleF07XG5cbiAgICAgICAgLy8gSW1wbGljaXQgcmVzb2x2aW5nIGlzIG5vdCBhbGxvd2VkIGZvciBub24tc2NhbGFyIHR5cGVzLCBhbmQgJz8nXG4gICAgICAgIC8vIG5vbi1zcGVjaWZpYyB0YWcgaXMgb25seSBhc3NpZ25lZCB0byBwbGFpbiBzY2FsYXJzLiBTbywgaXQgaXNuJ3RcbiAgICAgICAgLy8gbmVlZGVkIHRvIGNoZWNrIGZvciAna2luZCcgY29uZm9ybWl0eS5cblxuICAgICAgICBpZiAodHlwZS5yZXNvbHZlKHN0YXRlLnJlc3VsdCkpIHtcbiAgICAgICAgICAvLyBgc3RhdGUucmVzdWx0YCB1cGRhdGVkIGluIHJlc29sdmVyIGlmIG1hdGNoZWRcbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgPSB0eXBlLmNvbnN0cnVjdChzdGF0ZS5yZXN1bHQpO1xuICAgICAgICAgIHN0YXRlLnRhZyA9IHR5cGUudGFnO1xuICAgICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwgJiYgdHlwZW9mIHN0YXRlLmFuY2hvck1hcCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGhhc093bihzdGF0ZS50eXBlTWFwW3N0YXRlLmtpbmQgfHwgXCJmYWxsYmFja1wiXSwgc3RhdGUudGFnKVxuICAgICkge1xuICAgICAgdHlwZSA9IHN0YXRlLnR5cGVNYXBbc3RhdGUua2luZCB8fCBcImZhbGxiYWNrXCJdW3N0YXRlLnRhZ107XG5cbiAgICAgIGlmIChzdGF0ZS5yZXN1bHQgIT09IG51bGwgJiYgdHlwZS5raW5kICE9PSBzdGF0ZS5raW5kKSB7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgIGB1bmFjY2VwdGFibGUgbm9kZSBraW5kIGZvciAhPCR7c3RhdGUudGFnfT4gdGFnOyBpdCBzaG91bGQgYmUgXCIke3R5cGUua2luZH1cIiwgbm90IFwiJHtzdGF0ZS5raW5kfVwiYCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0eXBlLnJlc29sdmUoc3RhdGUucmVzdWx0KSkge1xuICAgICAgICAvLyBgc3RhdGUucmVzdWx0YCB1cGRhdGVkIGluIHJlc29sdmVyIGlmIG1hdGNoZWRcbiAgICAgICAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgYGNhbm5vdCByZXNvbHZlIGEgbm9kZSB3aXRoICE8JHtzdGF0ZS50YWd9PiBleHBsaWNpdCB0YWdgLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucmVzdWx0ID0gdHlwZS5jb25zdHJ1Y3Qoc3RhdGUucmVzdWx0KTtcbiAgICAgICAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCAmJiB0eXBlb2Ygc3RhdGUuYW5jaG9yTWFwICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIGB1bmtub3duIHRhZyAhPCR7c3RhdGUudGFnfT5gKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RhdGUubGlzdGVuZXIgJiYgc3RhdGUubGlzdGVuZXIgIT09IG51bGwpIHtcbiAgICBzdGF0ZS5saXN0ZW5lcihcImNsb3NlXCIsIHN0YXRlKTtcbiAgfVxuICByZXR1cm4gc3RhdGUudGFnICE9PSBudWxsIHx8IHN0YXRlLmFuY2hvciAhPT0gbnVsbCB8fCBoYXNDb250ZW50O1xufVxuXG5mdW5jdGlvbiByZWFkRG9jdW1lbnQoc3RhdGU6IExvYWRlclN0YXRlKTogdm9pZCB7XG4gIGNvbnN0IGRvY3VtZW50U3RhcnQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgbGV0IHBvc2l0aW9uOiBudW1iZXIsXG4gICAgZGlyZWN0aXZlTmFtZTogc3RyaW5nLFxuICAgIGRpcmVjdGl2ZUFyZ3M6IHN0cmluZ1tdLFxuICAgIGhhc0RpcmVjdGl2ZXMgPSBmYWxzZSxcbiAgICBjaDogbnVtYmVyO1xuXG4gIHN0YXRlLnZlcnNpb24gPSBudWxsO1xuICBzdGF0ZS5jaGVja0xpbmVCcmVha3MgPSBzdGF0ZS5sZWdhY3k7XG4gIHN0YXRlLnRhZ01hcCA9IHt9O1xuICBzdGF0ZS5hbmNob3JNYXAgPSB7fTtcblxuICB3aGlsZSAoKGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikpICE9PSAwKSB7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChzdGF0ZS5saW5lSW5kZW50ID4gMCB8fCBjaCAhPT0gMHgyNSAvKiAlICovKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNXc09yRW9sKGNoKSkge1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGRpcmVjdGl2ZU5hbWUgPSBzdGF0ZS5pbnB1dC5zbGljZShwb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pO1xuICAgIGRpcmVjdGl2ZUFyZ3MgPSBbXTtcblxuICAgIGlmIChkaXJlY3RpdmVOYW1lLmxlbmd0aCA8IDEpIHtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgXCJkaXJlY3RpdmUgbmFtZSBtdXN0IG5vdCBiZSBsZXNzIHRoYW4gb25lIGNoYXJhY3RlciBpbiBsZW5ndGhcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgICB3aGlsZSAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaCA9PT0gMHgyMyAvKiAjICovKSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICAgIH0gd2hpbGUgKGNoICE9PSAwICYmICFpc0VPTChjaCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRU9MKGNoKSkgYnJlYWs7XG5cbiAgICAgIHBvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNXc09yRW9sKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGRpcmVjdGl2ZUFyZ3MucHVzaChzdGF0ZS5pbnB1dC5zbGljZShwb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pKTtcbiAgICB9XG5cbiAgICBpZiAoY2ggIT09IDApIHJlYWRMaW5lQnJlYWsoc3RhdGUpO1xuXG4gICAgaWYgKGhhc093bihkaXJlY3RpdmVIYW5kbGVycywgZGlyZWN0aXZlTmFtZSkpIHtcbiAgICAgIGRpcmVjdGl2ZUhhbmRsZXJzW2RpcmVjdGl2ZU5hbWVdKHN0YXRlLCBkaXJlY3RpdmVOYW1lLCAuLi5kaXJlY3RpdmVBcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3dXYXJuaW5nKHN0YXRlLCBgdW5rbm93biBkb2N1bWVudCBkaXJlY3RpdmUgXCIke2RpcmVjdGl2ZU5hbWV9XCJgKTtcbiAgICB9XG4gIH1cblxuICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSk7XG5cbiAgaWYgKFxuICAgIHN0YXRlLmxpbmVJbmRlbnQgPT09IDAgJiZcbiAgICBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyZCAvKiAtICovICYmXG4gICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpID09PSAweDJkIC8qIC0gKi8gJiZcbiAgICBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMikgPT09IDB4MmQgLyogLSAqL1xuICApIHtcbiAgICBzdGF0ZS5wb3NpdGlvbiArPSAzO1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgfSBlbHNlIGlmIChoYXNEaXJlY3RpdmVzKSB7XG4gICAgcmV0dXJuIHRocm93RXJyb3Ioc3RhdGUsIFwiZGlyZWN0aXZlcyBlbmQgbWFyayBpcyBleHBlY3RlZFwiKTtcbiAgfVxuXG4gIGNvbXBvc2VOb2RlKHN0YXRlLCBzdGF0ZS5saW5lSW5kZW50IC0gMSwgQ09OVEVYVF9CTE9DS19PVVQsIGZhbHNlLCB0cnVlKTtcbiAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gIGlmIChcbiAgICBzdGF0ZS5jaGVja0xpbmVCcmVha3MgJiZcbiAgICBQQVRURVJOX05PTl9BU0NJSV9MSU5FX0JSRUFLUy50ZXN0KFxuICAgICAgc3RhdGUuaW5wdXQuc2xpY2UoZG9jdW1lbnRTdGFydCwgc3RhdGUucG9zaXRpb24pLFxuICAgIClcbiAgKSB7XG4gICAgdGhyb3dXYXJuaW5nKHN0YXRlLCBcIm5vbi1BU0NJSSBsaW5lIGJyZWFrcyBhcmUgaW50ZXJwcmV0ZWQgYXMgY29udGVudFwiKTtcbiAgfVxuXG4gIHN0YXRlLmRvY3VtZW50cy5wdXNoKHN0YXRlLnJlc3VsdCk7XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkge1xuICAgIGlmIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyZSAvKiAuICovKSB7XG4gICAgICBzdGF0ZS5wb3NpdGlvbiArPSAzO1xuICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPCBzdGF0ZS5sZW5ndGggLSAxKSB7XG4gICAgcmV0dXJuIHRocm93RXJyb3IoXG4gICAgICBzdGF0ZSxcbiAgICAgIFwiZW5kIG9mIHRoZSBzdHJlYW0gb3IgYSBkb2N1bWVudCBzZXBhcmF0b3IgaXMgZXhwZWN0ZWRcIixcbiAgICApO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2FkRG9jdW1lbnRzKGlucHV0OiBzdHJpbmcsIG9wdGlvbnM/OiBMb2FkZXJTdGF0ZU9wdGlvbnMpOiB1bmtub3duW10ge1xuICBpbnB1dCA9IFN0cmluZyhpbnB1dCk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmIChpbnB1dC5sZW5ndGggIT09IDApIHtcbiAgICAvLyBBZGQgdGFpbGluZyBgXFxuYCBpZiBub3QgZXhpc3RzXG4gICAgaWYgKFxuICAgICAgaW5wdXQuY2hhckNvZGVBdChpbnB1dC5sZW5ndGggLSAxKSAhPT0gMHgwYSAvKiBMRiAqLyAmJlxuICAgICAgaW5wdXQuY2hhckNvZGVBdChpbnB1dC5sZW5ndGggLSAxKSAhPT0gMHgwZCAvKiBDUiAqL1xuICAgICkge1xuICAgICAgaW5wdXQgKz0gXCJcXG5cIjtcbiAgICB9XG5cbiAgICAvLyBTdHJpcCBCT01cbiAgICBpZiAoaW5wdXQuY2hhckNvZGVBdCgwKSA9PT0gMHhmZWZmKSB7XG4gICAgICBpbnB1dCA9IGlucHV0LnNsaWNlKDEpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHN0YXRlID0gbmV3IExvYWRlclN0YXRlKGlucHV0LCBvcHRpb25zKTtcblxuICAvLyBVc2UgMCBhcyBzdHJpbmcgdGVybWluYXRvci4gVGhhdCBzaWduaWZpY2FudGx5IHNpbXBsaWZpZXMgYm91bmRzIGNoZWNrLlxuICBzdGF0ZS5pbnB1dCArPSBcIlxcMFwiO1xuXG4gIHdoaWxlIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyMCAvKiBTcGFjZSAqLykge1xuICAgIHN0YXRlLmxpbmVJbmRlbnQgKz0gMTtcbiAgICBzdGF0ZS5wb3NpdGlvbiArPSAxO1xuICB9XG5cbiAgd2hpbGUgKHN0YXRlLnBvc2l0aW9uIDwgc3RhdGUubGVuZ3RoIC0gMSkge1xuICAgIHJlYWREb2N1bWVudChzdGF0ZSk7XG4gIH1cblxuICByZXR1cm4gc3RhdGUuZG9jdW1lbnRzO1xufVxuXG5leHBvcnQgdHlwZSBDYkZ1bmN0aW9uID0gKGRvYzogdW5rbm93bikgPT4gdm9pZDtcbmZ1bmN0aW9uIGlzQ2JGdW5jdGlvbihmbjogdW5rbm93bik6IGZuIGlzIENiRnVuY3Rpb24ge1xuICByZXR1cm4gdHlwZW9mIGZuID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQWxsPFQgZXh0ZW5kcyBDYkZ1bmN0aW9uIHwgTG9hZGVyU3RhdGVPcHRpb25zPihcbiAgaW5wdXQ6IHN0cmluZyxcbiAgaXRlcmF0b3JPck9wdGlvbj86IFQsXG4gIG9wdGlvbnM/OiBMb2FkZXJTdGF0ZU9wdGlvbnMsXG4pOiBUIGV4dGVuZHMgQ2JGdW5jdGlvbiA/IHZvaWQgOiB1bmtub3duW10ge1xuICBpZiAoIWlzQ2JGdW5jdGlvbihpdGVyYXRvck9yT3B0aW9uKSkge1xuICAgIHJldHVybiBsb2FkRG9jdW1lbnRzKGlucHV0LCBpdGVyYXRvck9yT3B0aW9uIGFzIExvYWRlclN0YXRlT3B0aW9ucykgYXMgQW55O1xuICB9XG5cbiAgY29uc3QgZG9jdW1lbnRzID0gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucyk7XG4gIGNvbnN0IGl0ZXJhdG9yID0gaXRlcmF0b3JPck9wdGlvbjtcbiAgZm9yIChsZXQgaW5kZXggPSAwLCBsZW5ndGggPSBkb2N1bWVudHMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgIGl0ZXJhdG9yKGRvY3VtZW50c1tpbmRleF0pO1xuICB9XG5cbiAgcmV0dXJuIHZvaWQgMCBhcyBBbnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKGlucHV0OiBzdHJpbmcsIG9wdGlvbnM/OiBMb2FkZXJTdGF0ZU9wdGlvbnMpOiB1bmtub3duIHtcbiAgY29uc3QgZG9jdW1lbnRzID0gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucyk7XG5cbiAgaWYgKGRvY3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGRvY3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRzWzBdO1xuICB9XG4gIHRocm93IG5ldyBZQU1MRXJyb3IoXG4gICAgXCJleHBlY3RlZCBhIHNpbmdsZSBkb2N1bWVudCBpbiB0aGUgc3RyZWFtLCBidXQgZm91bmQgbW9yZVwiLFxuICApO1xufVxuIl19