import { YAMLError } from "../error.ts";
import * as common from "../utils.ts";
import { DumperState } from "./dumper_state.ts";
const _toString = Object.prototype.toString;
const { hasOwn } = Object;
const CHAR_TAB = 0x09;
const CHAR_LINE_FEED = 0x0a;
const CHAR_SPACE = 0x20;
const CHAR_EXCLAMATION = 0x21;
const CHAR_DOUBLE_QUOTE = 0x22;
const CHAR_SHARP = 0x23;
const CHAR_PERCENT = 0x25;
const CHAR_AMPERSAND = 0x26;
const CHAR_SINGLE_QUOTE = 0x27;
const CHAR_ASTERISK = 0x2a;
const CHAR_COMMA = 0x2c;
const CHAR_MINUS = 0x2d;
const CHAR_COLON = 0x3a;
const CHAR_GREATER_THAN = 0x3e;
const CHAR_QUESTION = 0x3f;
const CHAR_COMMERCIAL_AT = 0x40;
const CHAR_LEFT_SQUARE_BRACKET = 0x5b;
const CHAR_RIGHT_SQUARE_BRACKET = 0x5d;
const CHAR_GRAVE_ACCENT = 0x60;
const CHAR_LEFT_CURLY_BRACKET = 0x7b;
const CHAR_VERTICAL_LINE = 0x7c;
const CHAR_RIGHT_CURLY_BRACKET = 0x7d;
const ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0x00] = "\\0";
ESCAPE_SEQUENCES[0x07] = "\\a";
ESCAPE_SEQUENCES[0x08] = "\\b";
ESCAPE_SEQUENCES[0x09] = "\\t";
ESCAPE_SEQUENCES[0x0a] = "\\n";
ESCAPE_SEQUENCES[0x0b] = "\\v";
ESCAPE_SEQUENCES[0x0c] = "\\f";
ESCAPE_SEQUENCES[0x0d] = "\\r";
ESCAPE_SEQUENCES[0x1b] = "\\e";
ESCAPE_SEQUENCES[0x22] = '\\"';
ESCAPE_SEQUENCES[0x5c] = "\\\\";
ESCAPE_SEQUENCES[0x85] = "\\N";
ESCAPE_SEQUENCES[0xa0] = "\\_";
ESCAPE_SEQUENCES[0x2028] = "\\L";
ESCAPE_SEQUENCES[0x2029] = "\\P";
const DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF",
];
function encodeHex(character) {
    const string = character.toString(16).toUpperCase();
    let handle;
    let length;
    if (character <= 0xff) {
        handle = "x";
        length = 2;
    }
    else if (character <= 0xffff) {
        handle = "u";
        length = 4;
    }
    else if (character <= 0xffffffff) {
        handle = "U";
        length = 8;
    }
    else {
        throw new YAMLError("code point within a string may not be greater than 0xFFFFFFFF");
    }
    return `\\${handle}${common.repeat("0", length - string.length)}${string}`;
}
function indentString(string, spaces) {
    const ind = common.repeat(" ", spaces), length = string.length;
    let position = 0, next = -1, result = "", line;
    while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
            line = string.slice(position);
            position = length;
        }
        else {
            line = string.slice(position, next + 1);
            position = next + 1;
        }
        if (line.length && line !== "\n")
            result += ind;
        result += line;
    }
    return result;
}
function generateNextLine(state, level) {
    return `\n${common.repeat(" ", state.indent * level)}`;
}
function testImplicitResolving(state, str) {
    let type;
    for (let index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
            return true;
        }
    }
    return false;
}
function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
    return ((0x00020 <= c && c <= 0x00007e) ||
        (0x000a1 <= c && c <= 0x00d7ff && c !== 0x2028 && c !== 0x2029) ||
        (0x0e000 <= c && c <= 0x00fffd && c !== 0xfeff) ||
        (0x10000 <= c && c <= 0x10ffff));
}
function isPlainSafe(c) {
    return (isPrintable(c) &&
        c !== 0xfeff &&
        c !== CHAR_COMMA &&
        c !== CHAR_LEFT_SQUARE_BRACKET &&
        c !== CHAR_RIGHT_SQUARE_BRACKET &&
        c !== CHAR_LEFT_CURLY_BRACKET &&
        c !== CHAR_RIGHT_CURLY_BRACKET &&
        c !== CHAR_COLON &&
        c !== CHAR_SHARP);
}
function isPlainSafeFirst(c) {
    return (isPrintable(c) &&
        c !== 0xfeff &&
        !isWhitespace(c) &&
        c !== CHAR_MINUS &&
        c !== CHAR_QUESTION &&
        c !== CHAR_COLON &&
        c !== CHAR_COMMA &&
        c !== CHAR_LEFT_SQUARE_BRACKET &&
        c !== CHAR_RIGHT_SQUARE_BRACKET &&
        c !== CHAR_LEFT_CURLY_BRACKET &&
        c !== CHAR_RIGHT_CURLY_BRACKET &&
        c !== CHAR_SHARP &&
        c !== CHAR_AMPERSAND &&
        c !== CHAR_ASTERISK &&
        c !== CHAR_EXCLAMATION &&
        c !== CHAR_VERTICAL_LINE &&
        c !== CHAR_GREATER_THAN &&
        c !== CHAR_SINGLE_QUOTE &&
        c !== CHAR_DOUBLE_QUOTE &&
        c !== CHAR_PERCENT &&
        c !== CHAR_COMMERCIAL_AT &&
        c !== CHAR_GRAVE_ACCENT);
}
function needIndentIndicator(string) {
    const leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
}
const STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
    const shouldTrackWidth = lineWidth !== -1;
    let hasLineBreak = false, hasFoldableLine = false, previousLineBreak = -1, plain = isPlainSafeFirst(string.charCodeAt(0)) &&
        !isWhitespace(string.charCodeAt(string.length - 1));
    let char, i;
    if (singleLineOnly) {
        for (i = 0; i < string.length; i++) {
            char = string.charCodeAt(i);
            if (!isPrintable(char)) {
                return STYLE_DOUBLE;
            }
            plain = plain && isPlainSafe(char);
        }
    }
    else {
        for (i = 0; i < string.length; i++) {
            char = string.charCodeAt(i);
            if (char === CHAR_LINE_FEED) {
                hasLineBreak = true;
                if (shouldTrackWidth) {
                    hasFoldableLine = hasFoldableLine ||
                        (i - previousLineBreak - 1 > lineWidth &&
                            string[previousLineBreak + 1] !== " ");
                    previousLineBreak = i;
                }
            }
            else if (!isPrintable(char)) {
                return STYLE_DOUBLE;
            }
            plain = plain && isPlainSafe(char);
        }
        hasFoldableLine = hasFoldableLine ||
            (shouldTrackWidth &&
                i - previousLineBreak - 1 > lineWidth &&
                string[previousLineBreak + 1] !== " ");
    }
    if (!hasLineBreak && !hasFoldableLine) {
        return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
    }
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
    }
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
}
function foldLine(line, width) {
    if (line === "" || line[0] === " ")
        return line;
    const breakRe = / [^ ]/g;
    let match;
    let start = 0, end, curr = 0, next = 0;
    let result = "";
    while ((match = breakRe.exec(line))) {
        next = match.index;
        if (next - start > width) {
            end = curr > start ? curr : next;
            result += `\n${line.slice(start, end)}`;
            start = end + 1;
        }
        curr = next;
    }
    result += "\n";
    if (line.length - start > width && curr > start) {
        result += `${line.slice(start, curr)}\n${line.slice(curr + 1)}`;
    }
    else {
        result += line.slice(start);
    }
    return result.slice(1);
}
function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
    const lineRe = /(\n+)([^\n]*)/g;
    let result = (() => {
        let nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
    })();
    let prevMoreIndented = string[0] === "\n" || string[0] === " ";
    let moreIndented;
    let match;
    while ((match = lineRe.exec(string))) {
        const prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix +
            (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") +
            foldLine(line, width);
        prevMoreIndented = moreIndented;
    }
    return result;
}
function escapeString(string) {
    let result = "";
    let char, nextChar;
    let escapeSeq;
    for (let i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        if (char >= 0xd800 && char <= 0xdbff) {
            nextChar = string.charCodeAt(i + 1);
            if (nextChar >= 0xdc00 && nextChar <= 0xdfff) {
                result += encodeHex((char - 0xd800) * 0x400 + nextChar - 0xdc00 + 0x10000);
                i++;
                continue;
            }
        }
        escapeSeq = ESCAPE_SEQUENCES[char];
        result += !escapeSeq && isPrintable(char)
            ? string[i]
            : escapeSeq || encodeHex(char);
    }
    return result;
}
function blockHeader(string, indentPerLevel) {
    const indentIndicator = needIndentIndicator(string)
        ? String(indentPerLevel)
        : "";
    const clip = string[string.length - 1] === "\n";
    const keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    const chomp = keep ? "+" : clip ? "" : "-";
    return `${indentIndicator}${chomp}\n`;
}
function writeScalar(state, string, level, iskey) {
    state.dump = (() => {
        if (string.length === 0) {
            return "''";
        }
        if (!state.noCompatMode &&
            DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
            return `'${string}'`;
        }
        const indent = state.indent * Math.max(1, level);
        const lineWidth = state.lineWidth === -1
            ? -1
            : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        const singleLineOnly = iskey ||
            (state.flowLevel > -1 && level >= state.flowLevel);
        function testAmbiguity(str) {
            return testImplicitResolving(state, str);
        }
        switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
            case STYLE_PLAIN:
                return string;
            case STYLE_SINGLE:
                return `'${string.replace(/'/g, "''")}'`;
            case STYLE_LITERAL:
                return `|${blockHeader(string, state.indent)}${dropEndingNewline(indentString(string, indent))}`;
            case STYLE_FOLDED:
                return `>${blockHeader(string, state.indent)}${dropEndingNewline(indentString(foldString(string, lineWidth), indent))}`;
            case STYLE_DOUBLE:
                return `"${escapeString(string)}"`;
            default:
                throw new YAMLError("impossible error: invalid scalar style");
        }
    })();
}
function writeFlowSequence(state, level, object) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length; index < length; index += 1) {
        if (writeNode(state, level, object[index], false, false)) {
            if (index !== 0)
                _result += `,${!state.condenseFlow ? " " : ""}`;
            _result += state.dump;
        }
    }
    state.tag = _tag;
    state.dump = `[${_result}]`;
}
function writeBlockSequence(state, level, object, compact = false) {
    let _result = "";
    const _tag = state.tag;
    for (let index = 0, length = object.length; index < length; index += 1) {
        if (writeNode(state, level + 1, object[index], true, true)) {
            if (!compact || index !== 0) {
                _result += generateNextLine(state, level);
            }
            if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
                _result += "-";
            }
            else {
                _result += "- ";
            }
            _result += state.dump;
        }
    }
    state.tag = _tag;
    state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
    let _result = "";
    const _tag = state.tag, objectKeyList = Object.keys(object);
    let pairBuffer, objectKey, objectValue;
    for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = state.condenseFlow ? '"' : "";
        if (index !== 0)
            pairBuffer += ", ";
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state, level, objectKey, false, false)) {
            continue;
        }
        if (state.dump.length > 1024)
            pairBuffer += "? ";
        pairBuffer += `${state.dump}${state.condenseFlow ? '"' : ""}:${state.condenseFlow ? "" : " "}`;
        if (!writeNode(state, level, objectValue, false, false)) {
            continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = `{${_result}}`;
}
function writeBlockMapping(state, level, object, compact = false) {
    const _tag = state.tag, objectKeyList = Object.keys(object);
    let _result = "";
    if (state.sortKeys === true) {
        objectKeyList.sort();
    }
    else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
    }
    else if (state.sortKeys) {
        throw new YAMLError("sortKeys must be a boolean or a function");
    }
    let pairBuffer = "", objectKey, objectValue, explicitPair;
    for (let index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (!compact || index !== 0) {
            pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
            continue;
        }
        explicitPair = (state.tag !== null && state.tag !== "?") ||
            (state.dump && state.dump.length > 1024);
        if (explicitPair) {
            if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
                pairBuffer += "?";
            }
            else {
                pairBuffer += "? ";
            }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
            pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
            continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += ":";
        }
        else {
            pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
    }
    state.tag = _tag;
    state.dump = _result || "{}";
}
function detectType(state, object, explicit = false) {
    const typeList = explicit ? state.explicitTypes : state.implicitTypes;
    let type;
    let style;
    let _result;
    for (let index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) &&
            (!type.instanceOf ||
                (typeof object === "object" && object instanceof type.instanceOf)) &&
            (!type.predicate || type.predicate(object))) {
            state.tag = explicit ? type.tag : "?";
            if (type.represent) {
                style = state.styleMap[type.tag] || type.defaultStyle;
                if (_toString.call(type.represent) === "[object Function]") {
                    _result = type.represent(object, style);
                }
                else if (hasOwn(type.represent, style)) {
                    _result = type.represent[style](object, style);
                }
                else {
                    throw new YAMLError(`!<${type.tag}> tag resolver accepts not "${style}" style`);
                }
                state.dump = _result;
            }
            return true;
        }
    }
    return false;
}
function writeNode(state, level, object, block, compact, iskey = false) {
    state.tag = null;
    state.dump = object;
    if (!detectType(state, object, false)) {
        detectType(state, object, true);
    }
    const type = _toString.call(state.dump);
    if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
    }
    const objectOrArray = type === "[object Object]" || type === "[object Array]";
    let duplicateIndex = -1;
    let duplicate = false;
    if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
    }
    if ((state.tag !== null && state.tag !== "?") ||
        duplicate ||
        (state.indent !== 2 && level > 0)) {
        compact = false;
    }
    if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = `*ref_${duplicateIndex}`;
    }
    else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
            state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
            if (block && Object.keys(state.dump).length !== 0) {
                writeBlockMapping(state, level, state.dump, compact);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex}${state.dump}`;
                }
            }
            else {
                writeFlowMapping(state, level, state.dump);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex} ${state.dump}`;
                }
            }
        }
        else if (type === "[object Array]") {
            const arrayLevel = state.noArrayIndent && level > 0 ? level - 1 : level;
            if (block && state.dump.length !== 0) {
                writeBlockSequence(state, arrayLevel, state.dump, compact);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex}${state.dump}`;
                }
            }
            else {
                writeFlowSequence(state, arrayLevel, state.dump);
                if (duplicate) {
                    state.dump = `&ref_${duplicateIndex} ${state.dump}`;
                }
            }
        }
        else if (type === "[object String]") {
            if (state.tag !== "?") {
                writeScalar(state, state.dump, level, iskey);
            }
        }
        else {
            if (state.skipInvalid)
                return false;
            throw new YAMLError(`unacceptable kind of an object to dump ${type}`);
        }
        if (state.tag !== null && state.tag !== "?") {
            state.dump = `!<${state.tag}> ${state.dump}`;
        }
    }
    return true;
}
function inspectNode(object, objects, duplicatesIndexes) {
    if (object !== null && typeof object === "object") {
        const index = objects.indexOf(object);
        if (index !== -1) {
            if (duplicatesIndexes.indexOf(index) === -1) {
                duplicatesIndexes.push(index);
            }
        }
        else {
            objects.push(object);
            if (Array.isArray(object)) {
                for (let idx = 0, length = object.length; idx < length; idx += 1) {
                    inspectNode(object[idx], objects, duplicatesIndexes);
                }
            }
            else {
                const objectKeyList = Object.keys(object);
                for (let idx = 0, length = objectKeyList.length; idx < length; idx += 1) {
                    inspectNode(object[objectKeyList[idx]], objects, duplicatesIndexes);
                }
            }
        }
    }
}
function getDuplicateReferences(object, state) {
    const objects = [], duplicatesIndexes = [];
    inspectNode(object, objects, duplicatesIndexes);
    const length = duplicatesIndexes.length;
    for (let index = 0; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = Array.from({ length });
}
export function dump(input, options) {
    options = options || {};
    const state = new DumperState(options);
    if (!state.noRefs)
        getDuplicateReferences(input, state);
    if (writeNode(state, 0, input, true, true))
        return `${state.dump}\n`;
    return "";
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHVtcGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHVtcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFeEMsT0FBTyxLQUFLLE1BQU0sTUFBTSxhQUFhLENBQUM7QUFDdEMsT0FBTyxFQUFFLFdBQVcsRUFBc0IsTUFBTSxtQkFBbUIsQ0FBQztBQUtwRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztBQUM1QyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDO0FBRTFCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztBQUN0QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDO0FBQ3hCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0FBQzlCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDO0FBQy9CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQztBQUN4QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDMUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDO0FBQzVCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDO0FBQy9CLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQztBQUMzQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDeEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDO0FBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQztBQUN4QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQztBQUMvQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUM7QUFDM0IsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUM7QUFDaEMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUM7QUFDdEMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUM7QUFDdkMsTUFBTSxpQkFBaUIsR0FB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QUU7UUFDOUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUMxRDtJQUNELEtBQUssQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVELE1BQU0sVUFBVSxJQUFJLENBQUMsS0FBVSxFQUFFLE9BQTRCO0lBQzNELE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0lBRXhCLE1BQU0sS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXZDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtRQUFFLHNCQUFzQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUV4RCxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQUUsT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQztJQUVyRSxPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQb3J0ZWQgZnJvbSBqcy15YW1sIHYzLjEzLjE6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWNhL2pzLXlhbWwvY29tbWl0LzY2NWFhZGRhNDIzNDlkY2FlODY5ZjEyMDQwZDliMTBlZjE4ZDEyZGFcbi8vIENvcHlyaWdodCAyMDExLTIwMTUgYnkgVml0YWx5IFB1enJpbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG5pbXBvcnQgeyBZQU1MRXJyb3IgfSBmcm9tIFwiLi4vZXJyb3IudHNcIjtcbmltcG9ydCB0eXBlIHsgUmVwcmVzZW50Rm4sIFN0eWxlVmFyaWFudCwgVHlwZSB9IGZyb20gXCIuLi90eXBlLnRzXCI7XG5pbXBvcnQgKiBhcyBjb21tb24gZnJvbSBcIi4uL3V0aWxzLnRzXCI7XG5pbXBvcnQgeyBEdW1wZXJTdGF0ZSwgRHVtcGVyU3RhdGVPcHRpb25zIH0gZnJvbSBcIi4vZHVtcGVyX3N0YXRlLnRzXCI7XG5cbnR5cGUgQW55ID0gY29tbW9uLkFueTtcbnR5cGUgQXJyYXlPYmplY3Q8VCA9IEFueT4gPSBjb21tb24uQXJyYXlPYmplY3Q8VD47XG5cbmNvbnN0IF90b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5jb25zdCB7IGhhc093biB9ID0gT2JqZWN0O1xuXG5jb25zdCBDSEFSX1RBQiA9IDB4MDk7IC8qIFRhYiAqL1xuY29uc3QgQ0hBUl9MSU5FX0ZFRUQgPSAweDBhOyAvKiBMRiAqL1xuY29uc3QgQ0hBUl9TUEFDRSA9IDB4MjA7IC8qIFNwYWNlICovXG5jb25zdCBDSEFSX0VYQ0xBTUFUSU9OID0gMHgyMTsgLyogISAqL1xuY29uc3QgQ0hBUl9ET1VCTEVfUVVPVEUgPSAweDIyOyAvKiBcIiAqL1xuY29uc3QgQ0hBUl9TSEFSUCA9IDB4MjM7IC8qICMgKi9cbmNvbnN0IENIQVJfUEVSQ0VOVCA9IDB4MjU7IC8qICUgKi9cbmNvbnN0IENIQVJfQU1QRVJTQU5EID0gMHgyNjsgLyogJiAqL1xuY29uc3QgQ0hBUl9TSU5HTEVfUVVPVEUgPSAweDI3OyAvKiAnICovXG5jb25zdCBDSEFSX0FTVEVSSVNLID0gMHgyYTsgLyogKiAqL1xuY29uc3QgQ0hBUl9DT01NQSA9IDB4MmM7IC8qICwgKi9cbmNvbnN0IENIQVJfTUlOVVMgPSAweDJkOyAvKiAtICovXG5jb25zdCBDSEFSX0NPTE9OID0gMHgzYTsgLyogOiAqL1xuY29uc3QgQ0hBUl9HUkVBVEVSX1RIQU4gPSAweDNlOyAvKiA+ICovXG5jb25zdCBDSEFSX1FVRVNUSU9OID0gMHgzZjsgLyogPyAqL1xuY29uc3QgQ0hBUl9DT01NRVJDSUFMX0FUID0gMHg0MDsgLyogQCAqL1xuY29uc3QgQ0hBUl9MRUZUX1NRVUFSRV9CUkFDS0VUID0gMHg1YjsgLyogWyAqL1xuY29uc3QgQ0hBUl9SSUdIVF9TUVVBUkVfQlJBQ0tFVCA9IDB4NWQ7IC8qIF0gKi9cbmNvbnN0IENIQVJfR1JBVkVfQUNDRU5UID0gMHg2MDsgLyogYCAqL1xuY29uc3QgQ0hBUl9MRUZUX0NVUkxZX0JSQUNLRVQgPSAweDdiOyAvKiB7ICovXG5jb25zdCBDSEFSX1ZFUlRJQ0FMX0xJTkUgPSAweDdjOyAvKiB8ICovXG5jb25zdCBDSEFSX1JJR0hUX0NVUkxZX0JSQUNLRVQgPSAweDdkOyAvKiB9ICovXG5cbmNvbnN0IEVTQ0FQRV9TRVFVRU5DRVM6IHsgW2NoYXI6IG51bWJlcl06IHN0cmluZyB9ID0ge307XG5cbkVTQ0FQRV9TRVFVRU5DRVNbMHgwMF0gPSBcIlxcXFwwXCI7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MDddID0gXCJcXFxcYVwiO1xuRVNDQVBFX1NFUVVFTkNFU1sweDA4XSA9IFwiXFxcXGJcIjtcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwOV0gPSBcIlxcXFx0XCI7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MGFdID0gXCJcXFxcblwiO1xuRVNDQVBFX1NFUVVFTkNFU1sweDBiXSA9IFwiXFxcXHZcIjtcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwY10gPSBcIlxcXFxmXCI7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MGRdID0gXCJcXFxcclwiO1xuRVNDQVBFX1NFUVVFTkNFU1sweDFiXSA9IFwiXFxcXGVcIjtcbkVTQ0FQRV9TRVFVRU5DRVNbMHgyMl0gPSAnXFxcXFwiJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHg1Y10gPSBcIlxcXFxcXFxcXCI7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4ODVdID0gXCJcXFxcTlwiO1xuRVNDQVBFX1NFUVVFTkNFU1sweGEwXSA9IFwiXFxcXF9cIjtcbkVTQ0FQRV9TRVFVRU5DRVNbMHgyMDI4XSA9IFwiXFxcXExcIjtcbkVTQ0FQRV9TRVFVRU5DRVNbMHgyMDI5XSA9IFwiXFxcXFBcIjtcblxuY29uc3QgREVQUkVDQVRFRF9CT09MRUFOU19TWU5UQVggPSBbXG4gIFwieVwiLFxuICBcIllcIixcbiAgXCJ5ZXNcIixcbiAgXCJZZXNcIixcbiAgXCJZRVNcIixcbiAgXCJvblwiLFxuICBcIk9uXCIsXG4gIFwiT05cIixcbiAgXCJuXCIsXG4gIFwiTlwiLFxuICBcIm5vXCIsXG4gIFwiTm9cIixcbiAgXCJOT1wiLFxuICBcIm9mZlwiLFxuICBcIk9mZlwiLFxuICBcIk9GRlwiLFxuXTtcblxuZnVuY3Rpb24gZW5jb2RlSGV4KGNoYXJhY3RlcjogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3Qgc3RyaW5nID0gY2hhcmFjdGVyLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpO1xuXG4gIGxldCBoYW5kbGU6IHN0cmluZztcbiAgbGV0IGxlbmd0aDogbnVtYmVyO1xuICBpZiAoY2hhcmFjdGVyIDw9IDB4ZmYpIHtcbiAgICBoYW5kbGUgPSBcInhcIjtcbiAgICBsZW5ndGggPSAyO1xuICB9IGVsc2UgaWYgKGNoYXJhY3RlciA8PSAweGZmZmYpIHtcbiAgICBoYW5kbGUgPSBcInVcIjtcbiAgICBsZW5ndGggPSA0O1xuICB9IGVsc2UgaWYgKGNoYXJhY3RlciA8PSAweGZmZmZmZmZmKSB7XG4gICAgaGFuZGxlID0gXCJVXCI7XG4gICAgbGVuZ3RoID0gODtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgWUFNTEVycm9yKFxuICAgICAgXCJjb2RlIHBvaW50IHdpdGhpbiBhIHN0cmluZyBtYXkgbm90IGJlIGdyZWF0ZXIgdGhhbiAweEZGRkZGRkZGXCIsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBgXFxcXCR7aGFuZGxlfSR7Y29tbW9uLnJlcGVhdChcIjBcIiwgbGVuZ3RoIC0gc3RyaW5nLmxlbmd0aCl9JHtzdHJpbmd9YDtcbn1cblxuLy8gSW5kZW50cyBldmVyeSBsaW5lIGluIGEgc3RyaW5nLiBFbXB0eSBsaW5lcyAoXFxuIG9ubHkpIGFyZSBub3QgaW5kZW50ZWQuXG5mdW5jdGlvbiBpbmRlbnRTdHJpbmcoc3RyaW5nOiBzdHJpbmcsIHNwYWNlczogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kID0gY29tbW9uLnJlcGVhdChcIiBcIiwgc3BhY2VzKSxcbiAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICBsZXQgcG9zaXRpb24gPSAwLFxuICAgIG5leHQgPSAtMSxcbiAgICByZXN1bHQgPSBcIlwiLFxuICAgIGxpbmU6IHN0cmluZztcblxuICB3aGlsZSAocG9zaXRpb24gPCBsZW5ndGgpIHtcbiAgICBuZXh0ID0gc3RyaW5nLmluZGV4T2YoXCJcXG5cIiwgcG9zaXRpb24pO1xuICAgIGlmIChuZXh0ID09PSAtMSkge1xuICAgICAgbGluZSA9IHN0cmluZy5zbGljZShwb3NpdGlvbik7XG4gICAgICBwb3NpdGlvbiA9IGxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGluZSA9IHN0cmluZy5zbGljZShwb3NpdGlvbiwgbmV4dCArIDEpO1xuICAgICAgcG9zaXRpb24gPSBuZXh0ICsgMTtcbiAgICB9XG5cbiAgICBpZiAobGluZS5sZW5ndGggJiYgbGluZSAhPT0gXCJcXG5cIikgcmVzdWx0ICs9IGluZDtcblxuICAgIHJlc3VsdCArPSBsaW5lO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZTogRHVtcGVyU3RhdGUsIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcbiR7Y29tbW9uLnJlcGVhdChcIiBcIiwgc3RhdGUuaW5kZW50ICogbGV2ZWwpfWA7XG59XG5cbmZ1bmN0aW9uIHRlc3RJbXBsaWNpdFJlc29sdmluZyhzdGF0ZTogRHVtcGVyU3RhdGUsIHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGxldCB0eXBlOiBUeXBlO1xuICBmb3IgKFxuICAgIGxldCBpbmRleCA9IDAsIGxlbmd0aCA9IHN0YXRlLmltcGxpY2l0VHlwZXMubGVuZ3RoO1xuICAgIGluZGV4IDwgbGVuZ3RoO1xuICAgIGluZGV4ICs9IDFcbiAgKSB7XG4gICAgdHlwZSA9IHN0YXRlLmltcGxpY2l0VHlwZXNbaW5kZXhdO1xuXG4gICAgaWYgKHR5cGUucmVzb2x2ZShzdHIpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIFszM10gcy13aGl0ZSA6Oj0gcy1zcGFjZSB8IHMtdGFiXG5mdW5jdGlvbiBpc1doaXRlc3BhY2UoYzogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBjID09PSBDSEFSX1NQQUNFIHx8IGMgPT09IENIQVJfVEFCO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGNoYXJhY3RlciBjYW4gYmUgcHJpbnRlZCB3aXRob3V0IGVzY2FwaW5nLlxuLy8gRnJvbSBZQU1MIDEuMjogXCJhbnkgYWxsb3dlZCBjaGFyYWN0ZXJzIGtub3duIHRvIGJlIG5vbi1wcmludGFibGVcbi8vIHNob3VsZCBhbHNvIGJlIGVzY2FwZWQuIFtIb3dldmVyLF0gVGhpcyBpc27igJl0IG1hbmRhdG9yeVwiXG4vLyBEZXJpdmVkIGZyb20gbmItY2hhciAtIFxcdCAtICN4ODUgLSAjeEEwIC0gI3gyMDI4IC0gI3gyMDI5LlxuZnVuY3Rpb24gaXNQcmludGFibGUoYzogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgKDB4MDAwMjAgPD0gYyAmJiBjIDw9IDB4MDAwMDdlKSB8fFxuICAgICgweDAwMGExIDw9IGMgJiYgYyA8PSAweDAwZDdmZiAmJiBjICE9PSAweDIwMjggJiYgYyAhPT0gMHgyMDI5KSB8fFxuICAgICgweDBlMDAwIDw9IGMgJiYgYyA8PSAweDAwZmZmZCAmJiBjICE9PSAweGZlZmYpIC8qIEJPTSAqLyB8fFxuICAgICgweDEwMDAwIDw9IGMgJiYgYyA8PSAweDEwZmZmZilcbiAgKTtcbn1cblxuLy8gU2ltcGxpZmllZCB0ZXN0IGZvciB2YWx1ZXMgYWxsb3dlZCBhZnRlciB0aGUgZmlyc3QgY2hhcmFjdGVyIGluIHBsYWluIHN0eWxlLlxuZnVuY3Rpb24gaXNQbGFpblNhZmUoYzogbnVtYmVyKTogYm9vbGVhbiB7XG4gIC8vIFVzZXMgYSBzdWJzZXQgb2YgbmItY2hhciAtIGMtZmxvdy1pbmRpY2F0b3IgLSBcIjpcIiAtIFwiI1wiXG4gIC8vIHdoZXJlIG5iLWNoYXIgOjo9IGMtcHJpbnRhYmxlIC0gYi1jaGFyIC0gYy1ieXRlLW9yZGVyLW1hcmsuXG4gIHJldHVybiAoXG4gICAgaXNQcmludGFibGUoYykgJiZcbiAgICBjICE9PSAweGZlZmYgJiZcbiAgICAvLyAtIGMtZmxvdy1pbmRpY2F0b3JcbiAgICBjICE9PSBDSEFSX0NPTU1BICYmXG4gICAgYyAhPT0gQ0hBUl9MRUZUX1NRVUFSRV9CUkFDS0VUICYmXG4gICAgYyAhPT0gQ0hBUl9SSUdIVF9TUVVBUkVfQlJBQ0tFVCAmJlxuICAgIGMgIT09IENIQVJfTEVGVF9DVVJMWV9CUkFDS0VUICYmXG4gICAgYyAhPT0gQ0hBUl9SSUdIVF9DVVJMWV9CUkFDS0VUICYmXG4gICAgLy8gLSBcIjpcIiAtIFwiI1wiXG4gICAgYyAhPT0gQ0hBUl9DT0xPTiAmJlxuICAgIGMgIT09IENIQVJfU0hBUlBcbiAgKTtcbn1cblxuLy8gU2ltcGxpZmllZCB0ZXN0IGZvciB2YWx1ZXMgYWxsb3dlZCBhcyB0aGUgZmlyc3QgY2hhcmFjdGVyIGluIHBsYWluIHN0eWxlLlxuZnVuY3Rpb24gaXNQbGFpblNhZmVGaXJzdChjOiBudW1iZXIpOiBib29sZWFuIHtcbiAgLy8gVXNlcyBhIHN1YnNldCBvZiBucy1jaGFyIC0gYy1pbmRpY2F0b3JcbiAgLy8gd2hlcmUgbnMtY2hhciA9IG5iLWNoYXIgLSBzLXdoaXRlLlxuICByZXR1cm4gKFxuICAgIGlzUHJpbnRhYmxlKGMpICYmXG4gICAgYyAhPT0gMHhmZWZmICYmXG4gICAgIWlzV2hpdGVzcGFjZShjKSAmJiAvLyAtIHMtd2hpdGVcbiAgICAvLyAtIChjLWluZGljYXRvciA6Oj1cbiAgICAvLyDigJwt4oCdIHwg4oCcP+KAnSB8IOKAnDrigJ0gfCDigJws4oCdIHwg4oCcW+KAnSB8IOKAnF3igJ0gfCDigJx74oCdIHwg4oCcfeKAnVxuICAgIGMgIT09IENIQVJfTUlOVVMgJiZcbiAgICBjICE9PSBDSEFSX1FVRVNUSU9OICYmXG4gICAgYyAhPT0gQ0hBUl9DT0xPTiAmJlxuICAgIGMgIT09IENIQVJfQ09NTUEgJiZcbiAgICBjICE9PSBDSEFSX0xFRlRfU1FVQVJFX0JSQUNLRVQgJiZcbiAgICBjICE9PSBDSEFSX1JJR0hUX1NRVUFSRV9CUkFDS0VUICYmXG4gICAgYyAhPT0gQ0hBUl9MRUZUX0NVUkxZX0JSQUNLRVQgJiZcbiAgICBjICE9PSBDSEFSX1JJR0hUX0NVUkxZX0JSQUNLRVQgJiZcbiAgICAvLyB8IOKAnCPigJ0gfCDigJwm4oCdIHwg4oCcKuKAnSB8IOKAnCHigJ0gfCDigJx84oCdIHwg4oCcPuKAnSB8IOKAnCfigJ0gfCDigJxcIuKAnVxuICAgIGMgIT09IENIQVJfU0hBUlAgJiZcbiAgICBjICE9PSBDSEFSX0FNUEVSU0FORCAmJlxuICAgIGMgIT09IENIQVJfQVNURVJJU0sgJiZcbiAgICBjICE9PSBDSEFSX0VYQ0xBTUFUSU9OICYmXG4gICAgYyAhPT0gQ0hBUl9WRVJUSUNBTF9MSU5FICYmXG4gICAgYyAhPT0gQ0hBUl9HUkVBVEVSX1RIQU4gJiZcbiAgICBjICE9PSBDSEFSX1NJTkdMRV9RVU9URSAmJlxuICAgIGMgIT09IENIQVJfRE9VQkxFX1FVT1RFICYmXG4gICAgLy8gfCDigJwl4oCdIHwg4oCcQOKAnSB8IOKAnGDigJ0pXG4gICAgYyAhPT0gQ0hBUl9QRVJDRU5UICYmXG4gICAgYyAhPT0gQ0hBUl9DT01NRVJDSUFMX0FUICYmXG4gICAgYyAhPT0gQ0hBUl9HUkFWRV9BQ0NFTlRcbiAgKTtcbn1cblxuLy8gRGV0ZXJtaW5lcyB3aGV0aGVyIGJsb2NrIGluZGVudGF0aW9uIGluZGljYXRvciBpcyByZXF1aXJlZC5cbmZ1bmN0aW9uIG5lZWRJbmRlbnRJbmRpY2F0b3Ioc3RyaW5nOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgbGVhZGluZ1NwYWNlUmUgPSAvXlxcbiogLztcbiAgcmV0dXJuIGxlYWRpbmdTcGFjZVJlLnRlc3Qoc3RyaW5nKTtcbn1cblxuY29uc3QgU1RZTEVfUExBSU4gPSAxLFxuICBTVFlMRV9TSU5HTEUgPSAyLFxuICBTVFlMRV9MSVRFUkFMID0gMyxcbiAgU1RZTEVfRk9MREVEID0gNCxcbiAgU1RZTEVfRE9VQkxFID0gNTtcblxuLy8gRGV0ZXJtaW5lcyB3aGljaCBzY2FsYXIgc3R5bGVzIGFyZSBwb3NzaWJsZSBhbmQgcmV0dXJucyB0aGUgcHJlZmVycmVkIHN0eWxlLlxuLy8gbGluZVdpZHRoID0gLTEgPT4gbm8gbGltaXQuXG4vLyBQcmUtY29uZGl0aW9uczogc3RyLmxlbmd0aCA+IDAuXG4vLyBQb3N0LWNvbmRpdGlvbnM6XG4vLyAgU1RZTEVfUExBSU4gb3IgU1RZTEVfU0lOR0xFID0+IG5vIFxcbiBhcmUgaW4gdGhlIHN0cmluZy5cbi8vICBTVFlMRV9MSVRFUkFMID0+IG5vIGxpbmVzIGFyZSBzdWl0YWJsZSBmb3IgZm9sZGluZyAob3IgbGluZVdpZHRoIGlzIC0xKS5cbi8vICBTVFlMRV9GT0xERUQgPT4gYSBsaW5lID4gbGluZVdpZHRoIGFuZCBjYW4gYmUgZm9sZGVkIChhbmQgbGluZVdpZHRoICE9IC0xKS5cbmZ1bmN0aW9uIGNob29zZVNjYWxhclN0eWxlKFxuICBzdHJpbmc6IHN0cmluZyxcbiAgc2luZ2xlTGluZU9ubHk6IGJvb2xlYW4sXG4gIGluZGVudFBlckxldmVsOiBudW1iZXIsXG4gIGxpbmVXaWR0aDogbnVtYmVyLFxuICB0ZXN0QW1iaWd1b3VzVHlwZTogKC4uLmFyZ3M6IEFueVtdKSA9PiBBbnksXG4pOiBudW1iZXIge1xuICBjb25zdCBzaG91bGRUcmFja1dpZHRoID0gbGluZVdpZHRoICE9PSAtMTtcbiAgbGV0IGhhc0xpbmVCcmVhayA9IGZhbHNlLFxuICAgIGhhc0ZvbGRhYmxlTGluZSA9IGZhbHNlLCAvLyBvbmx5IGNoZWNrZWQgaWYgc2hvdWxkVHJhY2tXaWR0aFxuICAgIHByZXZpb3VzTGluZUJyZWFrID0gLTEsIC8vIGNvdW50IHRoZSBmaXJzdCBsaW5lIGNvcnJlY3RseVxuICAgIHBsYWluID0gaXNQbGFpblNhZmVGaXJzdChzdHJpbmcuY2hhckNvZGVBdCgwKSkgJiZcbiAgICAgICFpc1doaXRlc3BhY2Uoc3RyaW5nLmNoYXJDb2RlQXQoc3RyaW5nLmxlbmd0aCAtIDEpKTtcblxuICBsZXQgY2hhcjogbnVtYmVyLCBpOiBudW1iZXI7XG4gIGlmIChzaW5nbGVMaW5lT25seSkge1xuICAgIC8vIENhc2U6IG5vIGJsb2NrIHN0eWxlcy5cbiAgICAvLyBDaGVjayBmb3IgZGlzYWxsb3dlZCBjaGFyYWN0ZXJzIHRvIHJ1bGUgb3V0IHBsYWluIGFuZCBzaW5nbGUuXG4gICAgZm9yIChpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhciA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKCFpc1ByaW50YWJsZShjaGFyKSkge1xuICAgICAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICAgICAgfVxuICAgICAgcGxhaW4gPSBwbGFpbiAmJiBpc1BsYWluU2FmZShjaGFyKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gQ2FzZTogYmxvY2sgc3R5bGVzIHBlcm1pdHRlZC5cbiAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoY2hhciA9PT0gQ0hBUl9MSU5FX0ZFRUQpIHtcbiAgICAgICAgaGFzTGluZUJyZWFrID0gdHJ1ZTtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYW55IGxpbmUgY2FuIGJlIGZvbGRlZC5cbiAgICAgICAgaWYgKHNob3VsZFRyYWNrV2lkdGgpIHtcbiAgICAgICAgICBoYXNGb2xkYWJsZUxpbmUgPSBoYXNGb2xkYWJsZUxpbmUgfHxcbiAgICAgICAgICAgIC8vIEZvbGRhYmxlIGxpbmUgPSB0b28gbG9uZywgYW5kIG5vdCBtb3JlLWluZGVudGVkLlxuICAgICAgICAgICAgKGkgLSBwcmV2aW91c0xpbmVCcmVhayAtIDEgPiBsaW5lV2lkdGggJiZcbiAgICAgICAgICAgICAgc3RyaW5nW3ByZXZpb3VzTGluZUJyZWFrICsgMV0gIT09IFwiIFwiKTtcbiAgICAgICAgICBwcmV2aW91c0xpbmVCcmVhayA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIWlzUHJpbnRhYmxlKGNoYXIpKSB7XG4gICAgICAgIHJldHVybiBTVFlMRV9ET1VCTEU7XG4gICAgICB9XG4gICAgICBwbGFpbiA9IHBsYWluICYmIGlzUGxhaW5TYWZlKGNoYXIpO1xuICAgIH1cbiAgICAvLyBpbiBjYXNlIHRoZSBlbmQgaXMgbWlzc2luZyBhIFxcblxuICAgIGhhc0ZvbGRhYmxlTGluZSA9IGhhc0ZvbGRhYmxlTGluZSB8fFxuICAgICAgKHNob3VsZFRyYWNrV2lkdGggJiZcbiAgICAgICAgaSAtIHByZXZpb3VzTGluZUJyZWFrIC0gMSA+IGxpbmVXaWR0aCAmJlxuICAgICAgICBzdHJpbmdbcHJldmlvdXNMaW5lQnJlYWsgKyAxXSAhPT0gXCIgXCIpO1xuICB9XG4gIC8vIEFsdGhvdWdoIGV2ZXJ5IHN0eWxlIGNhbiByZXByZXNlbnQgXFxuIHdpdGhvdXQgZXNjYXBpbmcsIHByZWZlciBibG9jayBzdHlsZXNcbiAgLy8gZm9yIG11bHRpbGluZSwgc2luY2UgdGhleSdyZSBtb3JlIHJlYWRhYmxlIGFuZCB0aGV5IGRvbid0IGFkZCBlbXB0eSBsaW5lcy5cbiAgLy8gQWxzbyBwcmVmZXIgZm9sZGluZyBhIHN1cGVyLWxvbmcgbGluZS5cbiAgaWYgKCFoYXNMaW5lQnJlYWsgJiYgIWhhc0ZvbGRhYmxlTGluZSkge1xuICAgIC8vIFN0cmluZ3MgaW50ZXJwcmV0YWJsZSBhcyBhbm90aGVyIHR5cGUgaGF2ZSB0byBiZSBxdW90ZWQ7XG4gICAgLy8gZS5nLiB0aGUgc3RyaW5nICd0cnVlJyB2cy4gdGhlIGJvb2xlYW4gdHJ1ZS5cbiAgICByZXR1cm4gcGxhaW4gJiYgIXRlc3RBbWJpZ3VvdXNUeXBlKHN0cmluZykgPyBTVFlMRV9QTEFJTiA6IFNUWUxFX1NJTkdMRTtcbiAgfVxuICAvLyBFZGdlIGNhc2U6IGJsb2NrIGluZGVudGF0aW9uIGluZGljYXRvciBjYW4gb25seSBoYXZlIG9uZSBkaWdpdC5cbiAgaWYgKGluZGVudFBlckxldmVsID4gOSAmJiBuZWVkSW5kZW50SW5kaWNhdG9yKHN0cmluZykpIHtcbiAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICB9XG4gIC8vIEF0IHRoaXMgcG9pbnQgd2Uga25vdyBibG9jayBzdHlsZXMgYXJlIHZhbGlkLlxuICAvLyBQcmVmZXIgbGl0ZXJhbCBzdHlsZSB1bmxlc3Mgd2Ugd2FudCB0byBmb2xkLlxuICByZXR1cm4gaGFzRm9sZGFibGVMaW5lID8gU1RZTEVfRk9MREVEIDogU1RZTEVfTElURVJBTDtcbn1cblxuLy8gR3JlZWR5IGxpbmUgYnJlYWtpbmcuXG4vLyBQaWNrcyB0aGUgbG9uZ2VzdCBsaW5lIHVuZGVyIHRoZSBsaW1pdCBlYWNoIHRpbWUsXG4vLyBvdGhlcndpc2Ugc2V0dGxlcyBmb3IgdGhlIHNob3J0ZXN0IGxpbmUgb3ZlciB0aGUgbGltaXQuXG4vLyBOQi4gTW9yZS1pbmRlbnRlZCBsaW5lcyAqY2Fubm90KiBiZSBmb2xkZWQsIGFzIHRoYXQgd291bGQgYWRkIGFuIGV4dHJhIFxcbi5cbmZ1bmN0aW9uIGZvbGRMaW5lKGxpbmU6IHN0cmluZywgd2lkdGg6IG51bWJlcik6IHN0cmluZyB7XG4gIGlmIChsaW5lID09PSBcIlwiIHx8IGxpbmVbMF0gPT09IFwiIFwiKSByZXR1cm4gbGluZTtcblxuICAvLyBTaW5jZSBhIG1vcmUtaW5kZW50ZWQgbGluZSBhZGRzIGEgXFxuLCBicmVha3MgY2FuJ3QgYmUgZm9sbG93ZWQgYnkgYSBzcGFjZS5cbiAgY29uc3QgYnJlYWtSZSA9IC8gW14gXS9nOyAvLyBub3RlOiB0aGUgbWF0Y2ggaW5kZXggd2lsbCBhbHdheXMgYmUgPD0gbGVuZ3RoLTIuXG4gIGxldCBtYXRjaDtcbiAgLy8gc3RhcnQgaXMgYW4gaW5jbHVzaXZlIGluZGV4LiBlbmQsIGN1cnIsIGFuZCBuZXh0IGFyZSBleGNsdXNpdmUuXG4gIGxldCBzdGFydCA9IDAsXG4gICAgZW5kLFxuICAgIGN1cnIgPSAwLFxuICAgIG5leHQgPSAwO1xuICBsZXQgcmVzdWx0ID0gXCJcIjtcblxuICAvLyBJbnZhcmlhbnRzOiAwIDw9IHN0YXJ0IDw9IGxlbmd0aC0xLlxuICAvLyAgIDAgPD0gY3VyciA8PSBuZXh0IDw9IG1heCgwLCBsZW5ndGgtMikuIGN1cnIgLSBzdGFydCA8PSB3aWR0aC5cbiAgLy8gSW5zaWRlIHRoZSBsb29wOlxuICAvLyAgIEEgbWF0Y2ggaW1wbGllcyBsZW5ndGggPj0gMiwgc28gY3VyciBhbmQgbmV4dCBhcmUgPD0gbGVuZ3RoLTIuXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25kaXRpb25hbC1hc3NpZ25tZW50XG4gIHdoaWxlICgobWF0Y2ggPSBicmVha1JlLmV4ZWMobGluZSkpKSB7XG4gICAgbmV4dCA9IG1hdGNoLmluZGV4O1xuICAgIC8vIG1haW50YWluIGludmFyaWFudDogY3VyciAtIHN0YXJ0IDw9IHdpZHRoXG4gICAgaWYgKG5leHQgLSBzdGFydCA+IHdpZHRoKSB7XG4gICAgICBlbmQgPSBjdXJyID4gc3RhcnQgPyBjdXJyIDogbmV4dDsgLy8gZGVyaXZlIGVuZCA8PSBsZW5ndGgtMlxuICAgICAgcmVzdWx0ICs9IGBcXG4ke2xpbmUuc2xpY2Uoc3RhcnQsIGVuZCl9YDtcbiAgICAgIC8vIHNraXAgdGhlIHNwYWNlIHRoYXQgd2FzIG91dHB1dCBhcyBcXG5cbiAgICAgIHN0YXJ0ID0gZW5kICsgMTsgLy8gZGVyaXZlIHN0YXJ0IDw9IGxlbmd0aC0xXG4gICAgfVxuICAgIGN1cnIgPSBuZXh0O1xuICB9XG5cbiAgLy8gQnkgdGhlIGludmFyaWFudHMsIHN0YXJ0IDw9IGxlbmd0aC0xLCBzbyB0aGVyZSBpcyBzb21ldGhpbmcgbGVmdCBvdmVyLlxuICAvLyBJdCBpcyBlaXRoZXIgdGhlIHdob2xlIHN0cmluZyBvciBhIHBhcnQgc3RhcnRpbmcgZnJvbSBub24td2hpdGVzcGFjZS5cbiAgcmVzdWx0ICs9IFwiXFxuXCI7XG4gIC8vIEluc2VydCBhIGJyZWFrIGlmIHRoZSByZW1haW5kZXIgaXMgdG9vIGxvbmcgYW5kIHRoZXJlIGlzIGEgYnJlYWsgYXZhaWxhYmxlLlxuICBpZiAobGluZS5sZW5ndGggLSBzdGFydCA+IHdpZHRoICYmIGN1cnIgPiBzdGFydCkge1xuICAgIHJlc3VsdCArPSBgJHtsaW5lLnNsaWNlKHN0YXJ0LCBjdXJyKX1cXG4ke2xpbmUuc2xpY2UoY3VyciArIDEpfWA7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ICs9IGxpbmUuc2xpY2Uoc3RhcnQpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5zbGljZSgxKTsgLy8gZHJvcCBleHRyYSBcXG4gam9pbmVyXG59XG5cbi8vIChTZWUgdGhlIG5vdGUgZm9yIHdyaXRlU2NhbGFyLilcbmZ1bmN0aW9uIGRyb3BFbmRpbmdOZXdsaW5lKHN0cmluZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0cmluZ1tzdHJpbmcubGVuZ3RoIC0gMV0gPT09IFwiXFxuXCIgPyBzdHJpbmcuc2xpY2UoMCwgLTEpIDogc3RyaW5nO1xufVxuXG4vLyBOb3RlOiBhIGxvbmcgbGluZSB3aXRob3V0IGEgc3VpdGFibGUgYnJlYWsgcG9pbnQgd2lsbCBleGNlZWQgdGhlIHdpZHRoIGxpbWl0LlxuLy8gUHJlLWNvbmRpdGlvbnM6IGV2ZXJ5IGNoYXIgaW4gc3RyIGlzUHJpbnRhYmxlLCBzdHIubGVuZ3RoID4gMCwgd2lkdGggPiAwLlxuZnVuY3Rpb24gZm9sZFN0cmluZyhzdHJpbmc6IHN0cmluZywgd2lkdGg6IG51bWJlcik6IHN0cmluZyB7XG4gIC8vIEluIGZvbGRlZCBzdHlsZSwgJGskIGNvbnNlY3V0aXZlIG5ld2xpbmVzIG91dHB1dCBhcyAkaysxJCBuZXdsaW5lc+KAlFxuICAvLyB1bmxlc3MgdGhleSdyZSBiZWZvcmUgb3IgYWZ0ZXIgYSBtb3JlLWluZGVudGVkIGxpbmUsIG9yIGF0IHRoZSB2ZXJ5XG4gIC8vIGJlZ2lubmluZyBvciBlbmQsIGluIHdoaWNoIGNhc2UgJGskIG1hcHMgdG8gJGskLlxuICAvLyBUaGVyZWZvcmUsIHBhcnNlIGVhY2ggY2h1bmsgYXMgbmV3bGluZShzKSBmb2xsb3dlZCBieSBhIGNvbnRlbnQgbGluZS5cbiAgY29uc3QgbGluZVJlID0gLyhcXG4rKShbXlxcbl0qKS9nO1xuXG4gIC8vIGZpcnN0IGxpbmUgKHBvc3NpYmx5IGFuIGVtcHR5IGxpbmUpXG4gIGxldCByZXN1bHQgPSAoKCk6IHN0cmluZyA9PiB7XG4gICAgbGV0IG5leHRMRiA9IHN0cmluZy5pbmRleE9mKFwiXFxuXCIpO1xuICAgIG5leHRMRiA9IG5leHRMRiAhPT0gLTEgPyBuZXh0TEYgOiBzdHJpbmcubGVuZ3RoO1xuICAgIGxpbmVSZS5sYXN0SW5kZXggPSBuZXh0TEY7XG4gICAgcmV0dXJuIGZvbGRMaW5lKHN0cmluZy5zbGljZSgwLCBuZXh0TEYpLCB3aWR0aCk7XG4gIH0pKCk7XG4gIC8vIElmIHdlIGhhdmVuJ3QgcmVhY2hlZCB0aGUgZmlyc3QgY29udGVudCBsaW5lIHlldCwgZG9uJ3QgYWRkIGFuIGV4dHJhIFxcbi5cbiAgbGV0IHByZXZNb3JlSW5kZW50ZWQgPSBzdHJpbmdbMF0gPT09IFwiXFxuXCIgfHwgc3RyaW5nWzBdID09PSBcIiBcIjtcbiAgbGV0IG1vcmVJbmRlbnRlZDtcblxuICAvLyByZXN0IG9mIHRoZSBsaW5lc1xuICBsZXQgbWF0Y2g7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25kaXRpb25hbC1hc3NpZ25tZW50XG4gIHdoaWxlICgobWF0Y2ggPSBsaW5lUmUuZXhlYyhzdHJpbmcpKSkge1xuICAgIGNvbnN0IHByZWZpeCA9IG1hdGNoWzFdLFxuICAgICAgbGluZSA9IG1hdGNoWzJdO1xuICAgIG1vcmVJbmRlbnRlZCA9IGxpbmVbMF0gPT09IFwiIFwiO1xuICAgIHJlc3VsdCArPSBwcmVmaXggK1xuICAgICAgKCFwcmV2TW9yZUluZGVudGVkICYmICFtb3JlSW5kZW50ZWQgJiYgbGluZSAhPT0gXCJcIiA/IFwiXFxuXCIgOiBcIlwiKSArXG4gICAgICBmb2xkTGluZShsaW5lLCB3aWR0aCk7XG4gICAgcHJldk1vcmVJbmRlbnRlZCA9IG1vcmVJbmRlbnRlZDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEVzY2FwZXMgYSBkb3VibGUtcXVvdGVkIHN0cmluZy5cbmZ1bmN0aW9uIGVzY2FwZVN0cmluZyhzdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCByZXN1bHQgPSBcIlwiO1xuICBsZXQgY2hhciwgbmV4dENoYXI7XG4gIGxldCBlc2NhcGVTZXE7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICBjaGFyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgLy8gQ2hlY2sgZm9yIHN1cnJvZ2F0ZSBwYWlycyAocmVmZXJlbmNlIFVuaWNvZGUgMy4wIHNlY3Rpb24gXCIzLjcgU3Vycm9nYXRlc1wiKS5cbiAgICBpZiAoY2hhciA+PSAweGQ4MDAgJiYgY2hhciA8PSAweGRiZmYgLyogaGlnaCBzdXJyb2dhdGUgKi8pIHtcbiAgICAgIG5leHRDaGFyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSArIDEpO1xuICAgICAgaWYgKG5leHRDaGFyID49IDB4ZGMwMCAmJiBuZXh0Q2hhciA8PSAweGRmZmYgLyogbG93IHN1cnJvZ2F0ZSAqLykge1xuICAgICAgICAvLyBDb21iaW5lIHRoZSBzdXJyb2dhdGUgcGFpciBhbmQgc3RvcmUgaXQgZXNjYXBlZC5cbiAgICAgICAgcmVzdWx0ICs9IGVuY29kZUhleChcbiAgICAgICAgICAoY2hhciAtIDB4ZDgwMCkgKiAweDQwMCArIG5leHRDaGFyIC0gMHhkYzAwICsgMHgxMDAwMCxcbiAgICAgICAgKTtcbiAgICAgICAgLy8gQWR2YW5jZSBpbmRleCBvbmUgZXh0cmEgc2luY2Ugd2UgYWxyZWFkeSB1c2VkIHRoYXQgY2hhciBoZXJlLlxuICAgICAgICBpKys7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBlc2NhcGVTZXEgPSBFU0NBUEVfU0VRVUVOQ0VTW2NoYXJdO1xuICAgIHJlc3VsdCArPSAhZXNjYXBlU2VxICYmIGlzUHJpbnRhYmxlKGNoYXIpXG4gICAgICA/IHN0cmluZ1tpXVxuICAgICAgOiBlc2NhcGVTZXEgfHwgZW5jb2RlSGV4KGNoYXIpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gUHJlLWNvbmRpdGlvbnM6IHN0cmluZyBpcyB2YWxpZCBmb3IgYSBibG9jayBzY2FsYXIsIDEgPD0gaW5kZW50UGVyTGV2ZWwgPD0gOS5cbmZ1bmN0aW9uIGJsb2NrSGVhZGVyKHN0cmluZzogc3RyaW5nLCBpbmRlbnRQZXJMZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3QgaW5kZW50SW5kaWNhdG9yID0gbmVlZEluZGVudEluZGljYXRvcihzdHJpbmcpXG4gICAgPyBTdHJpbmcoaW5kZW50UGVyTGV2ZWwpXG4gICAgOiBcIlwiO1xuXG4gIC8vIG5vdGUgdGhlIHNwZWNpYWwgY2FzZTogdGhlIHN0cmluZyAnXFxuJyBjb3VudHMgYXMgYSBcInRyYWlsaW5nXCIgZW1wdHkgbGluZS5cbiAgY29uc3QgY2xpcCA9IHN0cmluZ1tzdHJpbmcubGVuZ3RoIC0gMV0gPT09IFwiXFxuXCI7XG4gIGNvbnN0IGtlZXAgPSBjbGlwICYmIChzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDJdID09PSBcIlxcblwiIHx8IHN0cmluZyA9PT0gXCJcXG5cIik7XG4gIGNvbnN0IGNob21wID0ga2VlcCA/IFwiK1wiIDogY2xpcCA/IFwiXCIgOiBcIi1cIjtcblxuICByZXR1cm4gYCR7aW5kZW50SW5kaWNhdG9yfSR7Y2hvbXB9XFxuYDtcbn1cblxuLy8gTm90ZTogbGluZSBicmVha2luZy9mb2xkaW5nIGlzIGltcGxlbWVudGVkIGZvciBvbmx5IHRoZSBmb2xkZWQgc3R5bGUuXG4vLyBOQi4gV2UgZHJvcCB0aGUgbGFzdCB0cmFpbGluZyBuZXdsaW5lIChpZiBhbnkpIG9mIGEgcmV0dXJuZWQgYmxvY2sgc2NhbGFyXG4vLyAgc2luY2UgdGhlIGR1bXBlciBhZGRzIGl0cyBvd24gbmV3bGluZS4gVGhpcyBhbHdheXMgd29ya3M6XG4vLyAgICDigKIgTm8gZW5kaW5nIG5ld2xpbmUgPT4gdW5hZmZlY3RlZDsgYWxyZWFkeSB1c2luZyBzdHJpcCBcIi1cIiBjaG9tcGluZy5cbi8vICAgIOKAoiBFbmRpbmcgbmV3bGluZSAgICA9PiByZW1vdmVkIHRoZW4gcmVzdG9yZWQuXG4vLyAgSW1wb3J0YW50bHksIHRoaXMga2VlcHMgdGhlIFwiK1wiIGNob21wIGluZGljYXRvciBmcm9tIGdhaW5pbmcgYW4gZXh0cmEgbGluZS5cbmZ1bmN0aW9uIHdyaXRlU2NhbGFyKFxuICBzdGF0ZTogRHVtcGVyU3RhdGUsXG4gIHN0cmluZzogc3RyaW5nLFxuICBsZXZlbDogbnVtYmVyLFxuICBpc2tleTogYm9vbGVhbixcbik6IHZvaWQge1xuICBzdGF0ZS5kdW1wID0gKCgpOiBzdHJpbmcgPT4ge1xuICAgIGlmIChzdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gXCInJ1wiO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICAhc3RhdGUubm9Db21wYXRNb2RlICYmXG4gICAgICBERVBSRUNBVEVEX0JPT0xFQU5TX1NZTlRBWC5pbmRleE9mKHN0cmluZykgIT09IC0xXG4gICAgKSB7XG4gICAgICByZXR1cm4gYCcke3N0cmluZ30nYDtcbiAgICB9XG5cbiAgICBjb25zdCBpbmRlbnQgPSBzdGF0ZS5pbmRlbnQgKiBNYXRoLm1heCgxLCBsZXZlbCk7IC8vIG5vIDAtaW5kZW50IHNjYWxhcnNcbiAgICAvLyBBcyBpbmRlbnRhdGlvbiBnZXRzIGRlZXBlciwgbGV0IHRoZSB3aWR0aCBkZWNyZWFzZSBtb25vdG9uaWNhbGx5XG4gICAgLy8gdG8gdGhlIGxvd2VyIGJvdW5kIG1pbihzdGF0ZS5saW5lV2lkdGgsIDQwKS5cbiAgICAvLyBOb3RlIHRoYXQgdGhpcyBpbXBsaWVzXG4gICAgLy8gIHN0YXRlLmxpbmVXaWR0aCDiiaQgNDAgKyBzdGF0ZS5pbmRlbnQ6IHdpZHRoIGlzIGZpeGVkIGF0IHRoZSBsb3dlciBib3VuZC5cbiAgICAvLyAgc3RhdGUubGluZVdpZHRoID4gNDAgKyBzdGF0ZS5pbmRlbnQ6IHdpZHRoIGRlY3JlYXNlcyB1bnRpbCB0aGUgbG93ZXJcbiAgICAvLyAgYm91bmQuXG4gICAgLy8gVGhpcyBiZWhhdmVzIGJldHRlciB0aGFuIGEgY29uc3RhbnQgbWluaW11bSB3aWR0aCB3aGljaCBkaXNhbGxvd3NcbiAgICAvLyBuYXJyb3dlciBvcHRpb25zLCBvciBhbiBpbmRlbnQgdGhyZXNob2xkIHdoaWNoIGNhdXNlcyB0aGUgd2lkdGhcbiAgICAvLyB0byBzdWRkZW5seSBpbmNyZWFzZS5cbiAgICBjb25zdCBsaW5lV2lkdGggPSBzdGF0ZS5saW5lV2lkdGggPT09IC0xXG4gICAgICA/IC0xXG4gICAgICA6IE1hdGgubWF4KE1hdGgubWluKHN0YXRlLmxpbmVXaWR0aCwgNDApLCBzdGF0ZS5saW5lV2lkdGggLSBpbmRlbnQpO1xuXG4gICAgLy8gV2l0aG91dCBrbm93aW5nIGlmIGtleXMgYXJlIGltcGxpY2l0L2V4cGxpY2l0LFxuICAgIC8vIGFzc3VtZSBpbXBsaWNpdCBmb3Igc2FmZXR5LlxuICAgIGNvbnN0IHNpbmdsZUxpbmVPbmx5ID0gaXNrZXkgfHxcbiAgICAgIC8vIE5vIGJsb2NrIHN0eWxlcyBpbiBmbG93IG1vZGUuXG4gICAgICAoc3RhdGUuZmxvd0xldmVsID4gLTEgJiYgbGV2ZWwgPj0gc3RhdGUuZmxvd0xldmVsKTtcbiAgICBmdW5jdGlvbiB0ZXN0QW1iaWd1aXR5KHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gdGVzdEltcGxpY2l0UmVzb2x2aW5nKHN0YXRlLCBzdHIpO1xuICAgIH1cblxuICAgIHN3aXRjaCAoXG4gICAgICBjaG9vc2VTY2FsYXJTdHlsZShcbiAgICAgICAgc3RyaW5nLFxuICAgICAgICBzaW5nbGVMaW5lT25seSxcbiAgICAgICAgc3RhdGUuaW5kZW50LFxuICAgICAgICBsaW5lV2lkdGgsXG4gICAgICAgIHRlc3RBbWJpZ3VpdHksXG4gICAgICApXG4gICAgKSB7XG4gICAgICBjYXNlIFNUWUxFX1BMQUlOOlxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgY2FzZSBTVFlMRV9TSU5HTEU6XG4gICAgICAgIHJldHVybiBgJyR7c3RyaW5nLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nYDtcbiAgICAgIGNhc2UgU1RZTEVfTElURVJBTDpcbiAgICAgICAgcmV0dXJuIGB8JHtibG9ja0hlYWRlcihzdHJpbmcsIHN0YXRlLmluZGVudCl9JHtcbiAgICAgICAgICBkcm9wRW5kaW5nTmV3bGluZShcbiAgICAgICAgICAgIGluZGVudFN0cmluZyhzdHJpbmcsIGluZGVudCksXG4gICAgICAgICAgKVxuICAgICAgICB9YDtcbiAgICAgIGNhc2UgU1RZTEVfRk9MREVEOlxuICAgICAgICByZXR1cm4gYD4ke2Jsb2NrSGVhZGVyKHN0cmluZywgc3RhdGUuaW5kZW50KX0ke1xuICAgICAgICAgIGRyb3BFbmRpbmdOZXdsaW5lKFxuICAgICAgICAgICAgaW5kZW50U3RyaW5nKGZvbGRTdHJpbmcoc3RyaW5nLCBsaW5lV2lkdGgpLCBpbmRlbnQpLFxuICAgICAgICAgIClcbiAgICAgICAgfWA7XG4gICAgICBjYXNlIFNUWUxFX0RPVUJMRTpcbiAgICAgICAgcmV0dXJuIGBcIiR7ZXNjYXBlU3RyaW5nKHN0cmluZyl9XCJgO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFlBTUxFcnJvcihcImltcG9zc2libGUgZXJyb3I6IGludmFsaWQgc2NhbGFyIHN0eWxlXCIpO1xuICAgIH1cbiAgfSkoKTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG93U2VxdWVuY2UoXG4gIHN0YXRlOiBEdW1wZXJTdGF0ZSxcbiAgbGV2ZWw6IG51bWJlcixcbiAgb2JqZWN0OiBBbnksXG4pOiB2b2lkIHtcbiAgbGV0IF9yZXN1bHQgPSBcIlwiO1xuICBjb25zdCBfdGFnID0gc3RhdGUudGFnO1xuXG4gIGZvciAobGV0IGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAvLyBXcml0ZSBvbmx5IHZhbGlkIGVsZW1lbnRzLlxuICAgIGlmICh3cml0ZU5vZGUoc3RhdGUsIGxldmVsLCBvYmplY3RbaW5kZXhdLCBmYWxzZSwgZmFsc2UpKSB7XG4gICAgICBpZiAoaW5kZXggIT09IDApIF9yZXN1bHQgKz0gYCwkeyFzdGF0ZS5jb25kZW5zZUZsb3cgPyBcIiBcIiA6IFwiXCJ9YDtcbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gYFske19yZXN1bHR9XWA7XG59XG5cbmZ1bmN0aW9uIHdyaXRlQmxvY2tTZXF1ZW5jZShcbiAgc3RhdGU6IER1bXBlclN0YXRlLFxuICBsZXZlbDogbnVtYmVyLFxuICBvYmplY3Q6IEFueSxcbiAgY29tcGFjdCA9IGZhbHNlLFxuKTogdm9pZCB7XG4gIGxldCBfcmVzdWx0ID0gXCJcIjtcbiAgY29uc3QgX3RhZyA9IHN0YXRlLnRhZztcblxuICBmb3IgKGxldCBpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgLy8gV3JpdGUgb25seSB2YWxpZCBlbGVtZW50cy5cbiAgICBpZiAod3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG9iamVjdFtpbmRleF0sIHRydWUsIHRydWUpKSB7XG4gICAgICBpZiAoIWNvbXBhY3QgfHwgaW5kZXggIT09IDApIHtcbiAgICAgICAgX3Jlc3VsdCArPSBnZW5lcmF0ZU5leHRMaW5lKHN0YXRlLCBsZXZlbCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgX3Jlc3VsdCArPSBcIi1cIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIF9yZXN1bHQgKz0gXCItIFwiO1xuICAgICAgfVxuXG4gICAgICBfcmVzdWx0ICs9IHN0YXRlLmR1bXA7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9IF9yZXN1bHQgfHwgXCJbXVwiOyAvLyBFbXB0eSBzZXF1ZW5jZSBpZiBubyB2YWxpZCB2YWx1ZXMuXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvd01hcHBpbmcoXG4gIHN0YXRlOiBEdW1wZXJTdGF0ZSxcbiAgbGV2ZWw6IG51bWJlcixcbiAgb2JqZWN0OiBBbnksXG4pOiB2b2lkIHtcbiAgbGV0IF9yZXN1bHQgPSBcIlwiO1xuICBjb25zdCBfdGFnID0gc3RhdGUudGFnLFxuICAgIG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuXG4gIGxldCBwYWlyQnVmZmVyOiBzdHJpbmcsIG9iamVjdEtleTogc3RyaW5nLCBvYmplY3RWYWx1ZTogQW55O1xuICBmb3IgKFxuICAgIGxldCBpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdEtleUxpc3QubGVuZ3RoO1xuICAgIGluZGV4IDwgbGVuZ3RoO1xuICAgIGluZGV4ICs9IDFcbiAgKSB7XG4gICAgcGFpckJ1ZmZlciA9IHN0YXRlLmNvbmRlbnNlRmxvdyA/ICdcIicgOiBcIlwiO1xuXG4gICAgaWYgKGluZGV4ICE9PSAwKSBwYWlyQnVmZmVyICs9IFwiLCBcIjtcblxuICAgIG9iamVjdEtleSA9IG9iamVjdEtleUxpc3RbaW5kZXhdO1xuICAgIG9iamVjdFZhbHVlID0gb2JqZWN0W29iamVjdEtleV07XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdEtleSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmR1bXAubGVuZ3RoID4gMTAyNCkgcGFpckJ1ZmZlciArPSBcIj8gXCI7XG5cbiAgICBwYWlyQnVmZmVyICs9IGAke3N0YXRlLmR1bXB9JHtzdGF0ZS5jb25kZW5zZUZsb3cgPyAnXCInIDogXCJcIn06JHtcbiAgICAgIHN0YXRlLmNvbmRlbnNlRmxvdyA/IFwiXCIgOiBcIiBcIlxuICAgIH1gO1xuXG4gICAgaWYgKCF3cml0ZU5vZGUoc3RhdGUsIGxldmVsLCBvYmplY3RWYWx1ZSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCB2YWx1ZS5cbiAgICB9XG5cbiAgICBwYWlyQnVmZmVyICs9IHN0YXRlLmR1bXA7XG5cbiAgICAvLyBCb3RoIGtleSBhbmQgdmFsdWUgYXJlIHZhbGlkLlxuICAgIF9yZXN1bHQgKz0gcGFpckJ1ZmZlcjtcbiAgfVxuXG4gIHN0YXRlLnRhZyA9IF90YWc7XG4gIHN0YXRlLmR1bXAgPSBgeyR7X3Jlc3VsdH19YDtcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9ja01hcHBpbmcoXG4gIHN0YXRlOiBEdW1wZXJTdGF0ZSxcbiAgbGV2ZWw6IG51bWJlcixcbiAgb2JqZWN0OiBBbnksXG4gIGNvbXBhY3QgPSBmYWxzZSxcbik6IHZvaWQge1xuICBjb25zdCBfdGFnID0gc3RhdGUudGFnLFxuICAgIG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuICBsZXQgX3Jlc3VsdCA9IFwiXCI7XG5cbiAgLy8gQWxsb3cgc29ydGluZyBrZXlzIHNvIHRoYXQgdGhlIG91dHB1dCBmaWxlIGlzIGRldGVybWluaXN0aWNcbiAgaWYgKHN0YXRlLnNvcnRLZXlzID09PSB0cnVlKSB7XG4gICAgLy8gRGVmYXVsdCBzb3J0aW5nXG4gICAgb2JqZWN0S2V5TGlzdC5zb3J0KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHN0YXRlLnNvcnRLZXlzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAvLyBDdXN0b20gc29ydCBmdW5jdGlvblxuICAgIG9iamVjdEtleUxpc3Quc29ydChzdGF0ZS5zb3J0S2V5cyk7XG4gIH0gZWxzZSBpZiAoc3RhdGUuc29ydEtleXMpIHtcbiAgICAvLyBTb21ldGhpbmcgaXMgd3JvbmdcbiAgICB0aHJvdyBuZXcgWUFNTEVycm9yKFwic29ydEtleXMgbXVzdCBiZSBhIGJvb2xlYW4gb3IgYSBmdW5jdGlvblwiKTtcbiAgfVxuXG4gIGxldCBwYWlyQnVmZmVyID0gXCJcIixcbiAgICBvYmplY3RLZXk6IHN0cmluZyxcbiAgICBvYmplY3RWYWx1ZTogQW55LFxuICAgIGV4cGxpY2l0UGFpcjogYm9vbGVhbjtcbiAgZm9yIChcbiAgICBsZXQgaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDtcbiAgICBpbmRleCA8IGxlbmd0aDtcbiAgICBpbmRleCArPSAxXG4gICkge1xuICAgIHBhaXJCdWZmZXIgPSBcIlwiO1xuXG4gICAgaWYgKCFjb21wYWN0IHx8IGluZGV4ICE9PSAwKSB7XG4gICAgICBwYWlyQnVmZmVyICs9IGdlbmVyYXRlTmV4dExpbmUoc3RhdGUsIGxldmVsKTtcbiAgICB9XG5cbiAgICBvYmplY3RLZXkgPSBvYmplY3RLZXlMaXN0W2luZGV4XTtcbiAgICBvYmplY3RWYWx1ZSA9IG9iamVjdFtvYmplY3RLZXldO1xuXG4gICAgaWYgKCF3cml0ZU5vZGUoc3RhdGUsIGxldmVsICsgMSwgb2JqZWN0S2V5LCB0cnVlLCB0cnVlLCB0cnVlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXkuXG4gICAgfVxuXG4gICAgZXhwbGljaXRQYWlyID0gKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09IFwiP1wiKSB8fFxuICAgICAgKHN0YXRlLmR1bXAgJiYgc3RhdGUuZHVtcC5sZW5ndGggPiAxMDI0KTtcblxuICAgIGlmIChleHBsaWNpdFBhaXIpIHtcbiAgICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgcGFpckJ1ZmZlciArPSBcIj9cIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhaXJCdWZmZXIgKz0gXCI/IFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIGlmIChleHBsaWNpdFBhaXIpIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpO1xuICAgIH1cblxuICAgIGlmICghd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG9iamVjdFZhbHVlLCB0cnVlLCBleHBsaWNpdFBhaXIpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIHZhbHVlLlxuICAgIH1cblxuICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gXCI6XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gXCI6IFwiO1xuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIC8vIEJvdGgga2V5IGFuZCB2YWx1ZSBhcmUgdmFsaWQuXG4gICAgX3Jlc3VsdCArPSBwYWlyQnVmZmVyO1xuICB9XG5cbiAgc3RhdGUudGFnID0gX3RhZztcbiAgc3RhdGUuZHVtcCA9IF9yZXN1bHQgfHwgXCJ7fVwiOyAvLyBFbXB0eSBtYXBwaW5nIGlmIG5vIHZhbGlkIHBhaXJzLlxufVxuXG5mdW5jdGlvbiBkZXRlY3RUeXBlKFxuICBzdGF0ZTogRHVtcGVyU3RhdGUsXG4gIG9iamVjdDogQW55LFxuICBleHBsaWNpdCA9IGZhbHNlLFxuKTogYm9vbGVhbiB7XG4gIGNvbnN0IHR5cGVMaXN0ID0gZXhwbGljaXQgPyBzdGF0ZS5leHBsaWNpdFR5cGVzIDogc3RhdGUuaW1wbGljaXRUeXBlcztcblxuICBsZXQgdHlwZTogVHlwZTtcbiAgbGV0IHN0eWxlOiBTdHlsZVZhcmlhbnQ7XG4gIGxldCBfcmVzdWx0OiBzdHJpbmc7XG4gIGZvciAobGV0IGluZGV4ID0gMCwgbGVuZ3RoID0gdHlwZUxpc3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHR5cGUgPSB0eXBlTGlzdFtpbmRleF07XG5cbiAgICBpZiAoXG4gICAgICAodHlwZS5pbnN0YW5jZU9mIHx8IHR5cGUucHJlZGljYXRlKSAmJlxuICAgICAgKCF0eXBlLmluc3RhbmNlT2YgfHxcbiAgICAgICAgKHR5cGVvZiBvYmplY3QgPT09IFwib2JqZWN0XCIgJiYgb2JqZWN0IGluc3RhbmNlb2YgdHlwZS5pbnN0YW5jZU9mKSkgJiZcbiAgICAgICghdHlwZS5wcmVkaWNhdGUgfHwgdHlwZS5wcmVkaWNhdGUob2JqZWN0KSlcbiAgICApIHtcbiAgICAgIHN0YXRlLnRhZyA9IGV4cGxpY2l0ID8gdHlwZS50YWcgOiBcIj9cIjtcblxuICAgICAgaWYgKHR5cGUucmVwcmVzZW50KSB7XG4gICAgICAgIHN0eWxlID0gc3RhdGUuc3R5bGVNYXBbdHlwZS50YWddIHx8IHR5cGUuZGVmYXVsdFN0eWxlO1xuXG4gICAgICAgIGlmIChfdG9TdHJpbmcuY2FsbCh0eXBlLnJlcHJlc2VudCkgPT09IFwiW29iamVjdCBGdW5jdGlvbl1cIikge1xuICAgICAgICAgIF9yZXN1bHQgPSAodHlwZS5yZXByZXNlbnQgYXMgUmVwcmVzZW50Rm4pKG9iamVjdCwgc3R5bGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGhhc093bih0eXBlLnJlcHJlc2VudCwgc3R5bGUpKSB7XG4gICAgICAgICAgX3Jlc3VsdCA9ICh0eXBlLnJlcHJlc2VudCBhcyBBcnJheU9iamVjdDxSZXByZXNlbnRGbj4pW3N0eWxlXShcbiAgICAgICAgICAgIG9iamVjdCxcbiAgICAgICAgICAgIHN0eWxlLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFlBTUxFcnJvcihcbiAgICAgICAgICAgIGAhPCR7dHlwZS50YWd9PiB0YWcgcmVzb2x2ZXIgYWNjZXB0cyBub3QgXCIke3N0eWxlfVwiIHN0eWxlYCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuZHVtcCA9IF9yZXN1bHQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gU2VyaWFsaXplcyBgb2JqZWN0YCBhbmQgd3JpdGVzIGl0IHRvIGdsb2JhbCBgcmVzdWx0YC5cbi8vIFJldHVybnMgdHJ1ZSBvbiBzdWNjZXNzLCBvciBmYWxzZSBvbiBpbnZhbGlkIG9iamVjdC5cbi8vXG5mdW5jdGlvbiB3cml0ZU5vZGUoXG4gIHN0YXRlOiBEdW1wZXJTdGF0ZSxcbiAgbGV2ZWw6IG51bWJlcixcbiAgb2JqZWN0OiBBbnksXG4gIGJsb2NrOiBib29sZWFuLFxuICBjb21wYWN0OiBib29sZWFuLFxuICBpc2tleSA9IGZhbHNlLFxuKTogYm9vbGVhbiB7XG4gIHN0YXRlLnRhZyA9IG51bGw7XG4gIHN0YXRlLmR1bXAgPSBvYmplY3Q7XG5cbiAgaWYgKCFkZXRlY3RUeXBlKHN0YXRlLCBvYmplY3QsIGZhbHNlKSkge1xuICAgIGRldGVjdFR5cGUoc3RhdGUsIG9iamVjdCwgdHJ1ZSk7XG4gIH1cblxuICBjb25zdCB0eXBlID0gX3RvU3RyaW5nLmNhbGwoc3RhdGUuZHVtcCk7XG5cbiAgaWYgKGJsb2NrKSB7XG4gICAgYmxvY2sgPSBzdGF0ZS5mbG93TGV2ZWwgPCAwIHx8IHN0YXRlLmZsb3dMZXZlbCA+IGxldmVsO1xuICB9XG5cbiAgY29uc3Qgb2JqZWN0T3JBcnJheSA9IHR5cGUgPT09IFwiW29iamVjdCBPYmplY3RdXCIgfHwgdHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuXG4gIGxldCBkdXBsaWNhdGVJbmRleCA9IC0xO1xuICBsZXQgZHVwbGljYXRlID0gZmFsc2U7XG4gIGlmIChvYmplY3RPckFycmF5KSB7XG4gICAgZHVwbGljYXRlSW5kZXggPSBzdGF0ZS5kdXBsaWNhdGVzLmluZGV4T2Yob2JqZWN0KTtcbiAgICBkdXBsaWNhdGUgPSBkdXBsaWNhdGVJbmRleCAhPT0gLTE7XG4gIH1cblxuICBpZiAoXG4gICAgKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09IFwiP1wiKSB8fFxuICAgIGR1cGxpY2F0ZSB8fFxuICAgIChzdGF0ZS5pbmRlbnQgIT09IDIgJiYgbGV2ZWwgPiAwKVxuICApIHtcbiAgICBjb21wYWN0ID0gZmFsc2U7XG4gIH1cblxuICBpZiAoZHVwbGljYXRlICYmIHN0YXRlLnVzZWREdXBsaWNhdGVzW2R1cGxpY2F0ZUluZGV4XSkge1xuICAgIHN0YXRlLmR1bXAgPSBgKnJlZl8ke2R1cGxpY2F0ZUluZGV4fWA7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG9iamVjdE9yQXJyYXkgJiYgZHVwbGljYXRlICYmICFzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0pIHtcbiAgICAgIHN0YXRlLnVzZWREdXBsaWNhdGVzW2R1cGxpY2F0ZUluZGV4XSA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSBcIltvYmplY3QgT2JqZWN0XVwiKSB7XG4gICAgICBpZiAoYmxvY2sgJiYgT2JqZWN0LmtleXMoc3RhdGUuZHVtcCkubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIHdyaXRlQmxvY2tNYXBwaW5nKHN0YXRlLCBsZXZlbCwgc3RhdGUuZHVtcCwgY29tcGFjdCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICBzdGF0ZS5kdW1wID0gYCZyZWZfJHtkdXBsaWNhdGVJbmRleH0ke3N0YXRlLmR1bXB9YDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd3JpdGVGbG93TWFwcGluZyhzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXApO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9IGAmcmVmXyR7ZHVwbGljYXRlSW5kZXh9ICR7c3RhdGUuZHVtcH1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICAgIGNvbnN0IGFycmF5TGV2ZWwgPSBzdGF0ZS5ub0FycmF5SW5kZW50ICYmIGxldmVsID4gMCA/IGxldmVsIC0gMSA6IGxldmVsO1xuICAgICAgaWYgKGJsb2NrICYmIHN0YXRlLmR1bXAubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgIHdyaXRlQmxvY2tTZXF1ZW5jZShzdGF0ZSwgYXJyYXlMZXZlbCwgc3RhdGUuZHVtcCwgY29tcGFjdCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICBzdGF0ZS5kdW1wID0gYCZyZWZfJHtkdXBsaWNhdGVJbmRleH0ke3N0YXRlLmR1bXB9YDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd3JpdGVGbG93U2VxdWVuY2Uoc3RhdGUsIGFycmF5TGV2ZWwsIHN0YXRlLmR1bXApO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9IGAmcmVmXyR7ZHVwbGljYXRlSW5kZXh9ICR7c3RhdGUuZHVtcH1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBcIltvYmplY3QgU3RyaW5nXVwiKSB7XG4gICAgICBpZiAoc3RhdGUudGFnICE9PSBcIj9cIikge1xuICAgICAgICB3cml0ZVNjYWxhcihzdGF0ZSwgc3RhdGUuZHVtcCwgbGV2ZWwsIGlza2V5KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLnNraXBJbnZhbGlkKSByZXR1cm4gZmFsc2U7XG4gICAgICB0aHJvdyBuZXcgWUFNTEVycm9yKGB1bmFjY2VwdGFibGUga2luZCBvZiBhbiBvYmplY3QgdG8gZHVtcCAke3R5cGV9YCk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09IFwiP1wiKSB7XG4gICAgICBzdGF0ZS5kdW1wID0gYCE8JHtzdGF0ZS50YWd9PiAke3N0YXRlLmR1bXB9YDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gaW5zcGVjdE5vZGUoXG4gIG9iamVjdDogQW55LFxuICBvYmplY3RzOiBBbnlbXSxcbiAgZHVwbGljYXRlc0luZGV4ZXM6IG51bWJlcltdLFxuKTogdm9pZCB7XG4gIGlmIChvYmplY3QgIT09IG51bGwgJiYgdHlwZW9mIG9iamVjdCA9PT0gXCJvYmplY3RcIikge1xuICAgIGNvbnN0IGluZGV4ID0gb2JqZWN0cy5pbmRleE9mKG9iamVjdCk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgaWYgKGR1cGxpY2F0ZXNJbmRleGVzLmluZGV4T2YoaW5kZXgpID09PSAtMSkge1xuICAgICAgICBkdXBsaWNhdGVzSW5kZXhlcy5wdXNoKGluZGV4KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cy5wdXNoKG9iamVjdCk7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICAgICAgZm9yIChsZXQgaWR4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaWR4IDwgbGVuZ3RoOyBpZHggKz0gMSkge1xuICAgICAgICAgIGluc3BlY3ROb2RlKG9iamVjdFtpZHhdLCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuXG4gICAgICAgIGZvciAoXG4gICAgICAgICAgbGV0IGlkeCA9IDAsIGxlbmd0aCA9IG9iamVjdEtleUxpc3QubGVuZ3RoO1xuICAgICAgICAgIGlkeCA8IGxlbmd0aDtcbiAgICAgICAgICBpZHggKz0gMVxuICAgICAgICApIHtcbiAgICAgICAgICBpbnNwZWN0Tm9kZShvYmplY3Rbb2JqZWN0S2V5TGlzdFtpZHhdXSwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldER1cGxpY2F0ZVJlZmVyZW5jZXMoXG4gIG9iamVjdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIHN0YXRlOiBEdW1wZXJTdGF0ZSxcbik6IHZvaWQge1xuICBjb25zdCBvYmplY3RzOiBBbnlbXSA9IFtdLFxuICAgIGR1cGxpY2F0ZXNJbmRleGVzOiBudW1iZXJbXSA9IFtdO1xuXG4gIGluc3BlY3ROb2RlKG9iamVjdCwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpO1xuXG4gIGNvbnN0IGxlbmd0aCA9IGR1cGxpY2F0ZXNJbmRleGVzLmxlbmd0aDtcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHN0YXRlLmR1cGxpY2F0ZXMucHVzaChvYmplY3RzW2R1cGxpY2F0ZXNJbmRleGVzW2luZGV4XV0pO1xuICB9XG4gIHN0YXRlLnVzZWREdXBsaWNhdGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXAoaW5wdXQ6IEFueSwgb3B0aW9ucz86IER1bXBlclN0YXRlT3B0aW9ucyk6IHN0cmluZyB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGNvbnN0IHN0YXRlID0gbmV3IER1bXBlclN0YXRlKG9wdGlvbnMpO1xuXG4gIGlmICghc3RhdGUubm9SZWZzKSBnZXREdXBsaWNhdGVSZWZlcmVuY2VzKGlucHV0LCBzdGF0ZSk7XG5cbiAgaWYgKHdyaXRlTm9kZShzdGF0ZSwgMCwgaW5wdXQsIHRydWUsIHRydWUpKSByZXR1cm4gYCR7c3RhdGUuZHVtcH1cXG5gO1xuXG4gIHJldHVybiBcIlwiO1xufVxuIl19