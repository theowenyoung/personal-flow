import { NATIVE_OS } from "./_constants.ts";
import { join, normalize } from "./mod.ts";
import { SEP, SEP_PATTERN } from "./separator.ts";
export function globToRegExp(glob, { extended = true, globstar: globstarOption = true, os = NATIVE_OS } = {}) {
    const sep = os == "windows" ? `(?:\\\\|\\/)+` : `\\/+`;
    const sepMaybe = os == "windows" ? `(?:\\\\|\\/)*` : `\\/*`;
    const seps = os == "windows" ? ["\\", "/"] : ["/"];
    const sepRaw = os == "windows" ? `\\` : `/`;
    const globstar = os == "windows"
        ? `(?:[^\\\\/]*(?:\\\\|\\/|$)+)*`
        : `(?:[^/]*(?:\\/|$)+)*`;
    const wildcard = os == "windows" ? `[^\\\\/]*` : `[^/]*`;
    const extStack = [];
    let inGroup = false;
    let inRange = false;
    let regExpString = "";
    let newLength = glob.length;
    for (; newLength > 0 && seps.includes(glob[newLength - 1]); newLength--)
        ;
    glob = glob.slice(0, newLength);
    let c, n;
    for (let i = 0; i < glob.length; i++) {
        c = glob[i];
        n = glob[i + 1];
        if (seps.includes(c)) {
            regExpString += sep;
            while (seps.includes(glob[i + 1]))
                i++;
            continue;
        }
        if (c == "[") {
            if (inRange && n == ":") {
                i++;
                let value = "";
                while (glob[++i] !== ":")
                    value += glob[i];
                if (value == "alnum")
                    regExpString += "\\w\\d";
                else if (value == "space")
                    regExpString += "\\s";
                else if (value == "digit")
                    regExpString += "\\d";
                i++;
                continue;
            }
            inRange = true;
            regExpString += c;
            continue;
        }
        if (c == "]") {
            inRange = false;
            regExpString += c;
            continue;
        }
        if (c == "!") {
            if (inRange) {
                if (glob[i - 1] == "[") {
                    regExpString += "^";
                    continue;
                }
            }
            else if (extended) {
                if (n == "(") {
                    extStack.push(c);
                    regExpString += "(?!";
                    i++;
                    continue;
                }
                regExpString += `\\${c}`;
                continue;
            }
            else {
                regExpString += `\\${c}`;
                continue;
            }
        }
        if (inRange) {
            if (c == "\\" || c == "^" && glob[i - 1] == "[")
                regExpString += `\\${c}`;
            else
                regExpString += c;
            continue;
        }
        if (["\\", "$", "^", ".", "="].includes(c)) {
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "(") {
            if (extStack.length) {
                regExpString += `${c}?:`;
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == ")") {
            if (extStack.length) {
                regExpString += c;
                const type = extStack.pop();
                if (type == "@") {
                    regExpString += "{1}";
                }
                else if (type == "!") {
                    regExpString += wildcard;
                }
                else {
                    regExpString += type;
                }
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "|") {
            if (extStack.length) {
                regExpString += c;
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "+") {
            if (n == "(" && extended) {
                extStack.push(c);
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "@" && extended) {
            if (n == "(") {
                extStack.push(c);
                continue;
            }
        }
        if (c == "?") {
            if (extended) {
                if (n == "(") {
                    extStack.push(c);
                }
                continue;
            }
            else {
                regExpString += ".";
                continue;
            }
        }
        if (c == "{") {
            inGroup = true;
            regExpString += "(?:";
            continue;
        }
        if (c == "}") {
            inGroup = false;
            regExpString += ")";
            continue;
        }
        if (c == ",") {
            if (inGroup) {
                regExpString += "|";
                continue;
            }
            regExpString += `\\${c}`;
            continue;
        }
        if (c == "*") {
            if (n == "(" && extended) {
                extStack.push(c);
                continue;
            }
            const prevChar = glob[i - 1];
            let starCount = 1;
            while (glob[i + 1] == "*") {
                starCount++;
                i++;
            }
            const nextChar = glob[i + 1];
            const isGlobstar = globstarOption && starCount > 1 &&
                [sepRaw, "/", undefined].includes(prevChar) &&
                [sepRaw, "/", undefined].includes(nextChar);
            if (isGlobstar) {
                regExpString += globstar;
                while (seps.includes(glob[i + 1]))
                    i++;
            }
            else {
                regExpString += wildcard;
            }
            continue;
        }
        regExpString += c;
    }
    regExpString = `^${regExpString}${regExpString != "" ? sepMaybe : ""}$`;
    return new RegExp(regExpString);
}
export function isGlob(str) {
    const chars = { "{": "}", "(": ")", "[": "]" };
    const regex = /\\(.)|(^!|\*|[\].+)]\?|\[[^\\\]]+\]|\{[^\\}]+\}|\(\?[:!=][^\\)]+\)|\([^|]+\|[^\\)]+\))/;
    if (str === "") {
        return false;
    }
    let match;
    while ((match = regex.exec(str))) {
        if (match[2])
            return true;
        let idx = match.index + match[0].length;
        const open = match[1];
        const close = open ? chars[open] : null;
        if (open && close) {
            const n = str.indexOf(close, idx);
            if (n !== -1) {
                idx = n + 1;
            }
        }
        str = str.slice(idx);
    }
    return false;
}
export function normalizeGlob(glob, { globstar = false } = {}) {
    if (glob.match(/\0/g)) {
        throw new Error(`Glob contains invalid characters: "${glob}"`);
    }
    if (!globstar) {
        return normalize(glob);
    }
    const s = SEP_PATTERN.source;
    const badParentPattern = new RegExp(`(?<=(${s}|^)\\*\\*${s})\\.\\.(?=${s}|$)`, "g");
    return normalize(glob.replace(badParentPattern, "\0")).replace(/\0/g, "..");
}
export function joinGlobs(globs, { extended = false, globstar = false } = {}) {
    if (!globstar || globs.length == 0) {
        return join(...globs);
    }
    if (globs.length === 0)
        return ".";
    let joined;
    for (const glob of globs) {
        const path = glob;
        if (path.length > 0) {
            if (!joined)
                joined = path;
            else
                joined += `${SEP}${path}`;
        }
    }
    if (!joined)
        return ".";
    return normalizeGlob(joined, { extended, globstar });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdsb2IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUErQmxELE1BQU0sVUFBVSxZQUFZLENBQzFCLElBQVksRUFDWixFQUFFLFFBQVEsR0FBRyxJQUFJLEVBQUUsUUFBUSxFQUFFLGNBQWMsR0FBRyxJQUFJLEVBQUUsRUFBRSxHQUFHLFNBQVMsS0FDMUMsRUFBRTtJQUUxQixNQUFNLEdBQUcsR0FBRyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUN2RCxNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM1RCxNQUFNLElBQUksR0FBRyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuRCxNQUFNLE1BQU0sR0FBRyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUM1QyxNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksU0FBUztRQUM5QixDQUFDLENBQUMsK0JBQStCO1FBQ2pDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQztJQUMzQixNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUd6RCxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7SUFJcEIsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3BCLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztJQUVwQixJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7SUFHdEIsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUM1QixPQUFPLFNBQVMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFO1FBQUMsQ0FBQztJQUN6RSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFaEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ1QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDcEMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNaLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWhCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwQixZQUFZLElBQUksR0FBRyxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLFNBQVM7U0FDVjtRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtZQUNaLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7Z0JBQ3ZCLENBQUMsRUFBRSxDQUFDO2dCQUNKLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDZixPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUc7b0JBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxLQUFLLElBQUksT0FBTztvQkFBRSxZQUFZLElBQUksUUFBUSxDQUFDO3FCQUMxQyxJQUFJLEtBQUssSUFBSSxPQUFPO29CQUFFLFlBQVksSUFBSSxLQUFLLENBQUM7cUJBQzVDLElBQUksS0FBSyxJQUFJLE9BQU87b0JBQUUsWUFBWSxJQUFJLEtBQUssQ0FBQztnQkFDakQsQ0FBQyxFQUFFLENBQUM7Z0JBQ0osU0FBUzthQUNWO1lBQ0QsT0FBTyxHQUFHLElBQUksQ0FBQztZQUNmLFlBQVksSUFBSSxDQUFDLENBQUM7WUFDbEIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ1osT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNoQixZQUFZLElBQUksQ0FBQyxDQUFDO1lBQ2xCLFNBQVM7U0FDVjtRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtZQUNaLElBQUksT0FBTyxFQUFFO2dCQUNYLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUU7b0JBQ3RCLFlBQVksSUFBSSxHQUFHLENBQUM7b0JBQ3BCLFNBQVM7aUJBQ1Y7YUFDRjtpQkFBTSxJQUFJLFFBQVEsRUFBRTtnQkFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO29CQUNaLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLFlBQVksSUFBSSxLQUFLLENBQUM7b0JBQ3RCLENBQUMsRUFBRSxDQUFDO29CQUNKLFNBQVM7aUJBQ1Y7Z0JBQ0QsWUFBWSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLFNBQVM7YUFDVjtpQkFBTTtnQkFDTCxZQUFZLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsU0FBUzthQUNWO1NBQ0Y7UUFFRCxJQUFJLE9BQU8sRUFBRTtZQUNYLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRztnQkFBRSxZQUFZLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQzs7Z0JBQ3JFLFlBQVksSUFBSSxDQUFDLENBQUM7WUFDdkIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUMsWUFBWSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ1osSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNuQixZQUFZLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDekIsU0FBUzthQUNWO1lBQ0QsWUFBWSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ1osSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNuQixZQUFZLElBQUksQ0FBQyxDQUFDO2dCQUNsQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxFQUFHLENBQUM7Z0JBQzdCLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRTtvQkFDZixZQUFZLElBQUksS0FBSyxDQUFDO2lCQUN2QjtxQkFBTSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUU7b0JBQ3RCLFlBQVksSUFBSSxRQUFRLENBQUM7aUJBQzFCO3FCQUFNO29CQUNMLFlBQVksSUFBSSxJQUFJLENBQUM7aUJBQ3RCO2dCQUNELFNBQVM7YUFDVjtZQUNELFlBQVksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLFNBQVM7U0FDVjtRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtZQUNaLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtnQkFDbkIsWUFBWSxJQUFJLENBQUMsQ0FBQztnQkFDbEIsU0FBUzthQUNWO1lBQ0QsWUFBWSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ1osSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFFBQVEsRUFBRTtnQkFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakIsU0FBUzthQUNWO1lBQ0QsWUFBWSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFFBQVEsRUFBRTtZQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7Z0JBQ1osUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakIsU0FBUzthQUNWO1NBQ0Y7UUFFRCxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7WUFDWixJQUFJLFFBQVEsRUFBRTtnQkFDWixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUU7b0JBQ1osUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbEI7Z0JBQ0QsU0FBUzthQUNWO2lCQUFNO2dCQUNMLFlBQVksSUFBSSxHQUFHLENBQUM7Z0JBQ3BCLFNBQVM7YUFDVjtTQUNGO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ1osT0FBTyxHQUFHLElBQUksQ0FBQztZQUNmLFlBQVksSUFBSSxLQUFLLENBQUM7WUFDdEIsU0FBUztTQUNWO1FBRUQsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFO1lBQ1osT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNoQixZQUFZLElBQUksR0FBRyxDQUFDO1lBQ3BCLFNBQVM7U0FDVjtRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtZQUNaLElBQUksT0FBTyxFQUFFO2dCQUNYLFlBQVksSUFBSSxHQUFHLENBQUM7Z0JBQ3BCLFNBQVM7YUFDVjtZQUNELFlBQVksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLFNBQVM7U0FDVjtRQUVELElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxRQUFRLEVBQUU7Z0JBQ3hCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLFNBQVM7YUFDVjtZQUdELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0IsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUU7Z0JBQ3pCLFNBQVMsRUFBRSxDQUFDO2dCQUNaLENBQUMsRUFBRSxDQUFDO2FBQ0w7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzdCLE1BQU0sVUFBVSxHQUFHLGNBQWMsSUFBSSxTQUFTLEdBQUcsQ0FBQztnQkFFaEQsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBRTNDLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUMsSUFBSSxVQUFVLEVBQUU7Z0JBRWQsWUFBWSxJQUFJLFFBQVEsQ0FBQztnQkFDekIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQUUsQ0FBQyxFQUFFLENBQUM7YUFDeEM7aUJBQU07Z0JBRUwsWUFBWSxJQUFJLFFBQVEsQ0FBQzthQUMxQjtZQUNELFNBQVM7U0FDVjtRQUVELFlBQVksSUFBSSxDQUFDLENBQUM7S0FDbkI7SUFFRCxZQUFZLEdBQUcsSUFBSSxZQUFZLEdBQUcsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztJQUN4RSxPQUFPLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFHRCxNQUFNLFVBQVUsTUFBTSxDQUFDLEdBQVc7SUFDaEMsTUFBTSxLQUFLLEdBQTJCLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUV2RSxNQUFNLEtBQUssR0FDVCx3RkFBd0YsQ0FBQztJQUUzRixJQUFJLEdBQUcsS0FBSyxFQUFFLEVBQUU7UUFDZCxPQUFPLEtBQUssQ0FBQztLQUNkO0lBRUQsSUFBSSxLQUE2QixDQUFDO0lBRWxDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1FBQ2hDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQzFCLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUl4QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUN4QyxJQUFJLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDakIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQ1osR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDYjtTQUNGO1FBRUQsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEI7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFHRCxNQUFNLFVBQVUsYUFBYSxDQUMzQixJQUFZLEVBQ1osRUFBRSxRQUFRLEdBQUcsS0FBSyxLQUFrQixFQUFFO0lBRXRDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0tBQ2hFO0lBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3hCO0lBQ0QsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUM3QixNQUFNLGdCQUFnQixHQUFHLElBQUksTUFBTSxDQUNqQyxRQUFRLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQ3pDLEdBQUcsQ0FDSixDQUFDO0lBQ0YsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUUsQ0FBQztBQUdELE1BQU0sVUFBVSxTQUFTLENBQ3ZCLEtBQWUsRUFDZixFQUFFLFFBQVEsR0FBRyxLQUFLLEVBQUUsUUFBUSxHQUFHLEtBQUssS0FBa0IsRUFBRTtJQUV4RCxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7S0FDdkI7SUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sR0FBRyxDQUFDO0lBQ25DLElBQUksTUFBMEIsQ0FBQztJQUMvQixLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUNuQixJQUFJLENBQUMsTUFBTTtnQkFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDOztnQkFDdEIsTUFBTSxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDO1NBQ2hDO0tBQ0Y7SUFDRCxJQUFJLENBQUMsTUFBTTtRQUFFLE9BQU8sR0FBRyxDQUFDO0lBQ3hCLE9BQU8sYUFBYSxDQUFDLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBnbG9iVG9SZWdFeHAoKSBpcyBvcmlnaW5hbGwgcG9ydGVkIGZyb20gZ2xvYnJleEAwLjEuMi5cbi8vIENvcHlyaWdodCAyMDE4IFRlcmtlbCBHamVydmlnIE5pZWxzZW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMCB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuaW1wb3J0IHsgTkFUSVZFX09TIH0gZnJvbSBcIi4vX2NvbnN0YW50cy50c1wiO1xuaW1wb3J0IHsgam9pbiwgbm9ybWFsaXplIH0gZnJvbSBcIi4vbW9kLnRzXCI7XG5pbXBvcnQgeyBTRVAsIFNFUF9QQVRURVJOIH0gZnJvbSBcIi4vc2VwYXJhdG9yLnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2xvYk9wdGlvbnMge1xuICAvKiogRXh0ZW5kZWQgZ2xvYiBzeW50YXguXG4gICAqIFNlZSBodHRwczovL3d3dy5saW51eGpvdXJuYWwuY29tL2NvbnRlbnQvYmFzaC1leHRlbmRlZC1nbG9iYmluZy4gRGVmYXVsdHNcbiAgICogdG8gdHJ1ZS4gKi9cbiAgZXh0ZW5kZWQ/OiBib29sZWFuO1xuICAvKiogR2xvYnN0YXIgc3ludGF4LlxuICAgKiBTZWUgaHR0cHM6Ly93d3cubGludXhqb3VybmFsLmNvbS9jb250ZW50L2dsb2JzdGFyLW5ldy1iYXNoLWdsb2JiaW5nLW9wdGlvbi5cbiAgICogSWYgZmFsc2UsIGAqKmAgaXMgdHJlYXRlZCBsaWtlIGAqYC4gRGVmYXVsdHMgdG8gdHJ1ZS4gKi9cbiAgZ2xvYnN0YXI/OiBib29sZWFuO1xuICAvKiogT3BlcmF0aW5nIHN5c3RlbS4gRGVmYXVsdHMgdG8gdGhlIG5hdGl2ZSBPUy4gKi9cbiAgb3M/OiB0eXBlb2YgRGVuby5idWlsZC5vcztcbn1cblxuZXhwb3J0IHR5cGUgR2xvYlRvUmVnRXhwT3B0aW9ucyA9IEdsb2JPcHRpb25zO1xuXG4vKiogQ29udmVydCBhIGdsb2Igc3RyaW5nIHRvIGEgcmVndWxhciBleHByZXNzaW9ucy5cbiAqXG4gKiAgICAgIC8vIExvb2tpbmcgZm9yIGFsbCB0aGUgYHRzYCBmaWxlczpcbiAqICAgICAgd2Fsa1N5bmMoXCIuXCIsIHtcbiAqICAgICAgICBtYXRjaDogW2dsb2JUb1JlZ0V4cChcIioudHNcIildXG4gKiAgICAgIH0pO1xuICpcbiAqICAgICAgTG9va2luZyBmb3IgYWxsIHRoZSBgLmpzb25gIGZpbGVzIGluIGFueSBzdWJmb2xkZXI6XG4gKiAgICAgIHdhbGtTeW5jKFwiLlwiLCB7XG4gKiAgICAgICAgbWF0Y2g6IFtnbG9iVG9SZWdFeHAoam9pbihcImFcIiwgXCIqKlwiLCBcIiouanNvblwiKSwge1xuICogICAgICAgICAgZXh0ZW5kZWQ6IHRydWUsXG4gKiAgICAgICAgICBnbG9ic3RhcjogdHJ1ZVxuICogICAgICAgIH0pXVxuICogICAgICB9KTsgKi9cbmV4cG9ydCBmdW5jdGlvbiBnbG9iVG9SZWdFeHAoXG4gIGdsb2I6IHN0cmluZyxcbiAgeyBleHRlbmRlZCA9IHRydWUsIGdsb2JzdGFyOiBnbG9ic3Rhck9wdGlvbiA9IHRydWUsIG9zID0gTkFUSVZFX09TIH06XG4gICAgR2xvYlRvUmVnRXhwT3B0aW9ucyA9IHt9LFxuKTogUmVnRXhwIHtcbiAgY29uc3Qgc2VwID0gb3MgPT0gXCJ3aW5kb3dzXCIgPyBgKD86XFxcXFxcXFx8XFxcXC8pK2AgOiBgXFxcXC8rYDtcbiAgY29uc3Qgc2VwTWF5YmUgPSBvcyA9PSBcIndpbmRvd3NcIiA/IGAoPzpcXFxcXFxcXHxcXFxcLykqYCA6IGBcXFxcLypgO1xuICBjb25zdCBzZXBzID0gb3MgPT0gXCJ3aW5kb3dzXCIgPyBbXCJcXFxcXCIsIFwiL1wiXSA6IFtcIi9cIl07XG4gIGNvbnN0IHNlcFJhdyA9IG9zID09IFwid2luZG93c1wiID8gYFxcXFxgIDogYC9gO1xuICBjb25zdCBnbG9ic3RhciA9IG9zID09IFwid2luZG93c1wiXG4gICAgPyBgKD86W15cXFxcXFxcXC9dKig/OlxcXFxcXFxcfFxcXFwvfCQpKykqYFxuICAgIDogYCg/OlteL10qKD86XFxcXC98JCkrKSpgO1xuICBjb25zdCB3aWxkY2FyZCA9IG9zID09IFwid2luZG93c1wiID8gYFteXFxcXFxcXFwvXSpgIDogYFteL10qYDtcblxuICAvLyBLZWVwIHRyYWNrIG9mIHNjb3BlIGZvciBleHRlbmRlZCBzeW50YXhlcy5cbiAgY29uc3QgZXh0U3RhY2sgPSBbXTtcblxuICAvLyBJZiB3ZSBhcmUgZG9pbmcgZXh0ZW5kZWQgbWF0Y2hpbmcsIHRoaXMgYm9vbGVhbiBpcyB0cnVlIHdoZW4gd2UgYXJlIGluc2lkZVxuICAvLyBhIGdyb3VwIChlZyB7Ki5odG1sLCouanN9KSwgYW5kIGZhbHNlIG90aGVyd2lzZS5cbiAgbGV0IGluR3JvdXAgPSBmYWxzZTtcbiAgbGV0IGluUmFuZ2UgPSBmYWxzZTtcblxuICBsZXQgcmVnRXhwU3RyaW5nID0gXCJcIjtcblxuICAvLyBSZW1vdmUgdHJhaWxpbmcgc2VwYXJhdG9ycy5cbiAgbGV0IG5ld0xlbmd0aCA9IGdsb2IubGVuZ3RoO1xuICBmb3IgKDsgbmV3TGVuZ3RoID4gMCAmJiBzZXBzLmluY2x1ZGVzKGdsb2JbbmV3TGVuZ3RoIC0gMV0pOyBuZXdMZW5ndGgtLSk7XG4gIGdsb2IgPSBnbG9iLnNsaWNlKDAsIG5ld0xlbmd0aCk7XG5cbiAgbGV0IGMsIG47XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZ2xvYi5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBnbG9iW2ldO1xuICAgIG4gPSBnbG9iW2kgKyAxXTtcblxuICAgIGlmIChzZXBzLmluY2x1ZGVzKGMpKSB7XG4gICAgICByZWdFeHBTdHJpbmcgKz0gc2VwO1xuICAgICAgd2hpbGUgKHNlcHMuaW5jbHVkZXMoZ2xvYltpICsgMV0pKSBpKys7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIltcIikge1xuICAgICAgaWYgKGluUmFuZ2UgJiYgbiA9PSBcIjpcIikge1xuICAgICAgICBpKys7IC8vIHNraXAgW1xuICAgICAgICBsZXQgdmFsdWUgPSBcIlwiO1xuICAgICAgICB3aGlsZSAoZ2xvYlsrK2ldICE9PSBcIjpcIikgdmFsdWUgKz0gZ2xvYltpXTtcbiAgICAgICAgaWYgKHZhbHVlID09IFwiYWxudW1cIikgcmVnRXhwU3RyaW5nICs9IFwiXFxcXHdcXFxcZFwiO1xuICAgICAgICBlbHNlIGlmICh2YWx1ZSA9PSBcInNwYWNlXCIpIHJlZ0V4cFN0cmluZyArPSBcIlxcXFxzXCI7XG4gICAgICAgIGVsc2UgaWYgKHZhbHVlID09IFwiZGlnaXRcIikgcmVnRXhwU3RyaW5nICs9IFwiXFxcXGRcIjtcbiAgICAgICAgaSsrOyAvLyBza2lwIGxhc3QgXVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGluUmFuZ2UgPSB0cnVlO1xuICAgICAgcmVnRXhwU3RyaW5nICs9IGM7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIl1cIikge1xuICAgICAgaW5SYW5nZSA9IGZhbHNlO1xuICAgICAgcmVnRXhwU3RyaW5nICs9IGM7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIiFcIikge1xuICAgICAgaWYgKGluUmFuZ2UpIHtcbiAgICAgICAgaWYgKGdsb2JbaSAtIDFdID09IFwiW1wiKSB7XG4gICAgICAgICAgcmVnRXhwU3RyaW5nICs9IFwiXlwiO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGV4dGVuZGVkKSB7XG4gICAgICAgIGlmIChuID09IFwiKFwiKSB7XG4gICAgICAgICAgZXh0U3RhY2sucHVzaChjKTtcbiAgICAgICAgICByZWdFeHBTdHJpbmcgKz0gXCIoPyFcIjtcbiAgICAgICAgICBpKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IGBcXFxcJHtjfWA7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IGBcXFxcJHtjfWA7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpblJhbmdlKSB7XG4gICAgICBpZiAoYyA9PSBcIlxcXFxcIiB8fCBjID09IFwiXlwiICYmIGdsb2JbaSAtIDFdID09IFwiW1wiKSByZWdFeHBTdHJpbmcgKz0gYFxcXFwke2N9YDtcbiAgICAgIGVsc2UgcmVnRXhwU3RyaW5nICs9IGM7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoW1wiXFxcXFwiLCBcIiRcIiwgXCJeXCIsIFwiLlwiLCBcIj1cIl0uaW5jbHVkZXMoYykpIHtcbiAgICAgIHJlZ0V4cFN0cmluZyArPSBgXFxcXCR7Y31gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCIoXCIpIHtcbiAgICAgIGlmIChleHRTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IGAke2N9PzpgO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJlZ0V4cFN0cmluZyArPSBgXFxcXCR7Y31gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCIpXCIpIHtcbiAgICAgIGlmIChleHRTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IGM7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBleHRTdGFjay5wb3AoKSE7XG4gICAgICAgIGlmICh0eXBlID09IFwiQFwiKSB7XG4gICAgICAgICAgcmVnRXhwU3RyaW5nICs9IFwiezF9XCI7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PSBcIiFcIikge1xuICAgICAgICAgIHJlZ0V4cFN0cmluZyArPSB3aWxkY2FyZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZWdFeHBTdHJpbmcgKz0gdHlwZTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJlZ0V4cFN0cmluZyArPSBgXFxcXCR7Y31gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCJ8XCIpIHtcbiAgICAgIGlmIChleHRTdGFjay5sZW5ndGgpIHtcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IGM7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVnRXhwU3RyaW5nICs9IGBcXFxcJHtjfWA7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIitcIikge1xuICAgICAgaWYgKG4gPT0gXCIoXCIgJiYgZXh0ZW5kZWQpIHtcbiAgICAgICAgZXh0U3RhY2sucHVzaChjKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZWdFeHBTdHJpbmcgKz0gYFxcXFwke2N9YDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwiQFwiICYmIGV4dGVuZGVkKSB7XG4gICAgICBpZiAobiA9PSBcIihcIikge1xuICAgICAgICBleHRTdGFjay5wdXNoKGMpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIj9cIikge1xuICAgICAgaWYgKGV4dGVuZGVkKSB7XG4gICAgICAgIGlmIChuID09IFwiKFwiKSB7XG4gICAgICAgICAgZXh0U3RhY2sucHVzaChjKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZ0V4cFN0cmluZyArPSBcIi5cIjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCJ7XCIpIHtcbiAgICAgIGluR3JvdXAgPSB0cnVlO1xuICAgICAgcmVnRXhwU3RyaW5nICs9IFwiKD86XCI7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoYyA9PSBcIn1cIikge1xuICAgICAgaW5Hcm91cCA9IGZhbHNlO1xuICAgICAgcmVnRXhwU3RyaW5nICs9IFwiKVwiO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGMgPT0gXCIsXCIpIHtcbiAgICAgIGlmIChpbkdyb3VwKSB7XG4gICAgICAgIHJlZ0V4cFN0cmluZyArPSBcInxcIjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZWdFeHBTdHJpbmcgKz0gYFxcXFwke2N9YDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjID09IFwiKlwiKSB7XG4gICAgICBpZiAobiA9PSBcIihcIiAmJiBleHRlbmRlZCkge1xuICAgICAgICBleHRTdGFjay5wdXNoKGMpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIE1vdmUgb3ZlciBhbGwgY29uc2VjdXRpdmUgXCIqXCIncy5cbiAgICAgIC8vIEFsc28gc3RvcmUgdGhlIHByZXZpb3VzIGFuZCBuZXh0IGNoYXJhY3RlcnNcbiAgICAgIGNvbnN0IHByZXZDaGFyID0gZ2xvYltpIC0gMV07XG4gICAgICBsZXQgc3RhckNvdW50ID0gMTtcbiAgICAgIHdoaWxlIChnbG9iW2kgKyAxXSA9PSBcIipcIikge1xuICAgICAgICBzdGFyQ291bnQrKztcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV4dENoYXIgPSBnbG9iW2kgKyAxXTtcbiAgICAgIGNvbnN0IGlzR2xvYnN0YXIgPSBnbG9ic3Rhck9wdGlvbiAmJiBzdGFyQ291bnQgPiAxICYmXG4gICAgICAgIC8vIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBzZWdtZW50XG4gICAgICAgIFtzZXBSYXcsIFwiL1wiLCB1bmRlZmluZWRdLmluY2x1ZGVzKHByZXZDaGFyKSAmJlxuICAgICAgICAvLyB0byB0aGUgZW5kIG9mIHRoZSBzZWdtZW50XG4gICAgICAgIFtzZXBSYXcsIFwiL1wiLCB1bmRlZmluZWRdLmluY2x1ZGVzKG5leHRDaGFyKTtcbiAgICAgIGlmIChpc0dsb2JzdGFyKSB7XG4gICAgICAgIC8vIGl0J3MgYSBnbG9ic3Rhciwgc28gbWF0Y2ggemVybyBvciBtb3JlIHBhdGggc2VnbWVudHNcbiAgICAgICAgcmVnRXhwU3RyaW5nICs9IGdsb2JzdGFyO1xuICAgICAgICB3aGlsZSAoc2Vwcy5pbmNsdWRlcyhnbG9iW2kgKyAxXSkpIGkrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGl0J3Mgbm90IGEgZ2xvYnN0YXIsIHNvIG9ubHkgbWF0Y2ggb25lIHBhdGggc2VnbWVudFxuICAgICAgICByZWdFeHBTdHJpbmcgKz0gd2lsZGNhcmQ7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZWdFeHBTdHJpbmcgKz0gYztcbiAgfVxuXG4gIHJlZ0V4cFN0cmluZyA9IGBeJHtyZWdFeHBTdHJpbmd9JHtyZWdFeHBTdHJpbmcgIT0gXCJcIiA/IHNlcE1heWJlIDogXCJcIn0kYDtcbiAgcmV0dXJuIG5ldyBSZWdFeHAocmVnRXhwU3RyaW5nKTtcbn1cblxuLyoqIFRlc3Qgd2hldGhlciB0aGUgZ2l2ZW4gc3RyaW5nIGlzIGEgZ2xvYiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR2xvYihzdHI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBjaGFyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJ7XCI6IFwifVwiLCBcIihcIjogXCIpXCIsIFwiW1wiOiBcIl1cIiB9O1xuICAvKiBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlbiAqL1xuICBjb25zdCByZWdleCA9XG4gICAgL1xcXFwoLil8KF4hfFxcKnxbXFxdLispXVxcP3xcXFtbXlxcXFxcXF1dK1xcXXxcXHtbXlxcXFx9XStcXH18XFwoXFw/WzohPV1bXlxcXFwpXStcXCl8XFwoW158XStcXHxbXlxcXFwpXStcXCkpLztcblxuICBpZiAoc3RyID09PSBcIlwiKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXG4gIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKHN0cikpKSB7XG4gICAgaWYgKG1hdGNoWzJdKSByZXR1cm4gdHJ1ZTtcbiAgICBsZXQgaWR4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cbiAgICAvLyBpZiBhbiBvcGVuIGJyYWNrZXQvYnJhY2UvcGFyZW4gaXMgZXNjYXBlZCxcbiAgICAvLyBzZXQgdGhlIGluZGV4IHRvIHRoZSBuZXh0IGNsb3NpbmcgY2hhcmFjdGVyXG4gICAgY29uc3Qgb3BlbiA9IG1hdGNoWzFdO1xuICAgIGNvbnN0IGNsb3NlID0gb3BlbiA/IGNoYXJzW29wZW5dIDogbnVsbDtcbiAgICBpZiAob3BlbiAmJiBjbG9zZSkge1xuICAgICAgY29uc3QgbiA9IHN0ci5pbmRleE9mKGNsb3NlLCBpZHgpO1xuICAgICAgaWYgKG4gIT09IC0xKSB7XG4gICAgICAgIGlkeCA9IG4gKyAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIHN0ciA9IHN0ci5zbGljZShpZHgpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKiogTGlrZSBub3JtYWxpemUoKSwgYnV0IGRvZXNuJ3QgY29sbGFwc2UgXCIqKlxcLy4uXCIgd2hlbiBgZ2xvYnN0YXJgIGlzIHRydWUuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplR2xvYihcbiAgZ2xvYjogc3RyaW5nLFxuICB7IGdsb2JzdGFyID0gZmFsc2UgfTogR2xvYk9wdGlvbnMgPSB7fSxcbik6IHN0cmluZyB7XG4gIGlmIChnbG9iLm1hdGNoKC9cXDAvZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEdsb2IgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzOiBcIiR7Z2xvYn1cImApO1xuICB9XG4gIGlmICghZ2xvYnN0YXIpIHtcbiAgICByZXR1cm4gbm9ybWFsaXplKGdsb2IpO1xuICB9XG4gIGNvbnN0IHMgPSBTRVBfUEFUVEVSTi5zb3VyY2U7XG4gIGNvbnN0IGJhZFBhcmVudFBhdHRlcm4gPSBuZXcgUmVnRXhwKFxuICAgIGAoPzw9KCR7c318XilcXFxcKlxcXFwqJHtzfSlcXFxcLlxcXFwuKD89JHtzfXwkKWAsXG4gICAgXCJnXCIsXG4gICk7XG4gIHJldHVybiBub3JtYWxpemUoZ2xvYi5yZXBsYWNlKGJhZFBhcmVudFBhdHRlcm4sIFwiXFwwXCIpKS5yZXBsYWNlKC9cXDAvZywgXCIuLlwiKTtcbn1cblxuLyoqIExpa2Ugam9pbigpLCBidXQgZG9lc24ndCBjb2xsYXBzZSBcIioqXFwvLi5cIiB3aGVuIGBnbG9ic3RhcmAgaXMgdHJ1ZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqb2luR2xvYnMoXG4gIGdsb2JzOiBzdHJpbmdbXSxcbiAgeyBleHRlbmRlZCA9IGZhbHNlLCBnbG9ic3RhciA9IGZhbHNlIH06IEdsb2JPcHRpb25zID0ge30sXG4pOiBzdHJpbmcge1xuICBpZiAoIWdsb2JzdGFyIHx8IGdsb2JzLmxlbmd0aCA9PSAwKSB7XG4gICAgcmV0dXJuIGpvaW4oLi4uZ2xvYnMpO1xuICB9XG4gIGlmIChnbG9icy5sZW5ndGggPT09IDApIHJldHVybiBcIi5cIjtcbiAgbGV0IGpvaW5lZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBmb3IgKGNvbnN0IGdsb2Igb2YgZ2xvYnMpIHtcbiAgICBjb25zdCBwYXRoID0gZ2xvYjtcbiAgICBpZiAocGF0aC5sZW5ndGggPiAwKSB7XG4gICAgICBpZiAoIWpvaW5lZCkgam9pbmVkID0gcGF0aDtcbiAgICAgIGVsc2Ugam9pbmVkICs9IGAke1NFUH0ke3BhdGh9YDtcbiAgICB9XG4gIH1cbiAgaWYgKCFqb2luZWQpIHJldHVybiBcIi5cIjtcbiAgcmV0dXJuIG5vcm1hbGl6ZUdsb2Ioam9pbmVkLCB7IGV4dGVuZGVkLCBnbG9ic3RhciB9KTtcbn1cbiJdfQ==