import { Type } from "../type.ts";
const YAML_DATE_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])" +
    "-([0-9][0-9])" +
    "-([0-9][0-9])$");
const YAML_TIMESTAMP_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])" +
    "-([0-9][0-9]?)" +
    "-([0-9][0-9]?)" +
    "(?:[Tt]|[ \\t]+)" +
    "([0-9][0-9]?)" +
    ":([0-9][0-9])" +
    ":([0-9][0-9])" +
    "(?:\\.([0-9]*))?" +
    "(?:[ \\t]*(Z|([-+])([0-9][0-9]?)" +
    "(?::([0-9][0-9]))?))?$");
function resolveYamlTimestamp(data) {
    if (data === null)
        return false;
    if (YAML_DATE_REGEXP.exec(data) !== null)
        return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null)
        return true;
    return false;
}
function constructYamlTimestamp(data) {
    let match = YAML_DATE_REGEXP.exec(data);
    if (match === null)
        match = YAML_TIMESTAMP_REGEXP.exec(data);
    if (match === null)
        throw new Error("Date resolve error");
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
    }
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    let fraction = 0;
    if (match[7]) {
        let partFraction = match[7].slice(0, 3);
        while (partFraction.length < 3) {
            partFraction += "0";
        }
        fraction = +partFraction;
    }
    let delta = null;
    if (match[9]) {
        const tzHour = +match[10];
        const tzMinute = +(match[11] || 0);
        delta = (tzHour * 60 + tzMinute) * 60000;
        if (match[9] === "-")
            delta = -delta;
    }
    const date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
    if (delta)
        date.setTime(date.getTime() - delta);
    return date;
}
function representYamlTimestamp(date) {
    return date.toISOString();
}
export const timestamp = new Type("tag:yaml.org,2002:timestamp", {
    construct: constructYamlTimestamp,
    instanceOf: Date,
    kind: "scalar",
    represent: representYamlTimestamp,
    resolve: resolveYamlTimestamp,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXN0YW1wLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGltZXN0YW1wLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFbEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FDakMseUJBQXlCO0lBQ3ZCLGVBQWU7SUFDZixnQkFBZ0IsQ0FDbkIsQ0FBQztBQUVGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQ3RDLHlCQUF5QjtJQUN2QixnQkFBZ0I7SUFDaEIsZ0JBQWdCO0lBQ2hCLGtCQUFrQjtJQUNsQixlQUFlO0lBQ2YsZUFBZTtJQUNmLGVBQWU7SUFDZixrQkFBa0I7SUFDbEIsa0NBQWtDO0lBQ2xDLHdCQUF3QixDQUMzQixDQUFDO0FBRUYsU0FBUyxvQkFBb0IsQ0FBQyxJQUFZO0lBQ3hDLElBQUksSUFBSSxLQUFLLElBQUk7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUNoQyxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDdEQsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQzNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsSUFBWTtJQUMxQyxJQUFJLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsSUFBSSxLQUFLLEtBQUssSUFBSTtRQUFFLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFN0QsSUFBSSxLQUFLLEtBQUssSUFBSTtRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUkxRCxNQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixNQUFNLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUViLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDN0M7SUFJRCxNQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2QixNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6QixNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV6QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDakIsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDWixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxPQUFPLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBRTlCLFlBQVksSUFBSSxHQUFHLENBQUM7U0FDckI7UUFDRCxRQUFRLEdBQUcsQ0FBQyxZQUFZLENBQUM7S0FDMUI7SUFJRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDakIsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDWixNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25DLEtBQUssR0FBRyxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQ3pDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7WUFBRSxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUM7S0FDdEM7SUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksQ0FDbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FDM0QsQ0FBQztJQUVGLElBQUksS0FBSztRQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBRWhELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsSUFBVTtJQUN4QyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLDZCQUE2QixFQUFFO0lBQy9ELFNBQVMsRUFBRSxzQkFBc0I7SUFDakMsVUFBVSxFQUFFLElBQUk7SUFDaEIsSUFBSSxFQUFFLFFBQVE7SUFDZCxTQUFTLEVBQUUsc0JBQXNCO0lBQ2pDLE9BQU8sRUFBRSxvQkFBb0I7Q0FDOUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUG9ydGVkIGZyb20ganMteWFtbCB2My4xMy4xOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhXG4vLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgVHlwZSB9IGZyb20gXCIuLi90eXBlLnRzXCI7XG5cbmNvbnN0IFlBTUxfREFURV9SRUdFWFAgPSBuZXcgUmVnRXhwKFxuICBcIl4oWzAtOV1bMC05XVswLTldWzAtOV0pXCIgKyAvLyBbMV0geWVhclxuICAgIFwiLShbMC05XVswLTldKVwiICsgLy8gWzJdIG1vbnRoXG4gICAgXCItKFswLTldWzAtOV0pJFwiLCAvLyBbM10gZGF5XG4pO1xuXG5jb25zdCBZQU1MX1RJTUVTVEFNUF9SRUdFWFAgPSBuZXcgUmVnRXhwKFxuICBcIl4oWzAtOV1bMC05XVswLTldWzAtOV0pXCIgKyAvLyBbMV0geWVhclxuICAgIFwiLShbMC05XVswLTldPylcIiArIC8vIFsyXSBtb250aFxuICAgIFwiLShbMC05XVswLTldPylcIiArIC8vIFszXSBkYXlcbiAgICBcIig/OltUdF18WyBcXFxcdF0rKVwiICsgLy8gLi4uXG4gICAgXCIoWzAtOV1bMC05XT8pXCIgKyAvLyBbNF0gaG91clxuICAgIFwiOihbMC05XVswLTldKVwiICsgLy8gWzVdIG1pbnV0ZVxuICAgIFwiOihbMC05XVswLTldKVwiICsgLy8gWzZdIHNlY29uZFxuICAgIFwiKD86XFxcXC4oWzAtOV0qKSk/XCIgKyAvLyBbN10gZnJhY3Rpb25cbiAgICBcIig/OlsgXFxcXHRdKihafChbLStdKShbMC05XVswLTldPylcIiArIC8vIFs4XSB0eiBbOV0gdHpfc2lnbiBbMTBdIHR6X2hvdXJcbiAgICBcIig/OjooWzAtOV1bMC05XSkpPykpPyRcIiwgLy8gWzExXSB0el9taW51dGVcbik7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sVGltZXN0YW1wKGRhdGE6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoWUFNTF9EQVRFX1JFR0VYUC5leGVjKGRhdGEpICE9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKFlBTUxfVElNRVNUQU1QX1JFR0VYUC5leGVjKGRhdGEpICE9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sVGltZXN0YW1wKGRhdGE6IHN0cmluZyk6IERhdGUge1xuICBsZXQgbWF0Y2ggPSBZQU1MX0RBVEVfUkVHRVhQLmV4ZWMoZGF0YSk7XG4gIGlmIChtYXRjaCA9PT0gbnVsbCkgbWF0Y2ggPSBZQU1MX1RJTUVTVEFNUF9SRUdFWFAuZXhlYyhkYXRhKTtcblxuICBpZiAobWF0Y2ggPT09IG51bGwpIHRocm93IG5ldyBFcnJvcihcIkRhdGUgcmVzb2x2ZSBlcnJvclwiKTtcblxuICAvLyBtYXRjaDogWzFdIHllYXIgWzJdIG1vbnRoIFszXSBkYXlcblxuICBjb25zdCB5ZWFyID0gK21hdGNoWzFdO1xuICBjb25zdCBtb250aCA9ICttYXRjaFsyXSAtIDE7IC8vIEpTIG1vbnRoIHN0YXJ0cyB3aXRoIDBcbiAgY29uc3QgZGF5ID0gK21hdGNoWzNdO1xuXG4gIGlmICghbWF0Y2hbNF0pIHtcbiAgICAvLyBubyBob3VyXG4gICAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKHllYXIsIG1vbnRoLCBkYXkpKTtcbiAgfVxuXG4gIC8vIG1hdGNoOiBbNF0gaG91ciBbNV0gbWludXRlIFs2XSBzZWNvbmQgWzddIGZyYWN0aW9uXG5cbiAgY29uc3QgaG91ciA9ICttYXRjaFs0XTtcbiAgY29uc3QgbWludXRlID0gK21hdGNoWzVdO1xuICBjb25zdCBzZWNvbmQgPSArbWF0Y2hbNl07XG5cbiAgbGV0IGZyYWN0aW9uID0gMDtcbiAgaWYgKG1hdGNoWzddKSB7XG4gICAgbGV0IHBhcnRGcmFjdGlvbiA9IG1hdGNoWzddLnNsaWNlKDAsIDMpO1xuICAgIHdoaWxlIChwYXJ0RnJhY3Rpb24ubGVuZ3RoIDwgMykge1xuICAgICAgLy8gbWlsbGktc2Vjb25kc1xuICAgICAgcGFydEZyYWN0aW9uICs9IFwiMFwiO1xuICAgIH1cbiAgICBmcmFjdGlvbiA9ICtwYXJ0RnJhY3Rpb247XG4gIH1cblxuICAvLyBtYXRjaDogWzhdIHR6IFs5XSB0el9zaWduIFsxMF0gdHpfaG91ciBbMTFdIHR6X21pbnV0ZVxuXG4gIGxldCBkZWx0YSA9IG51bGw7XG4gIGlmIChtYXRjaFs5XSkge1xuICAgIGNvbnN0IHR6SG91ciA9ICttYXRjaFsxMF07XG4gICAgY29uc3QgdHpNaW51dGUgPSArKG1hdGNoWzExXSB8fCAwKTtcbiAgICBkZWx0YSA9ICh0ekhvdXIgKiA2MCArIHR6TWludXRlKSAqIDYwMDAwOyAvLyBkZWx0YSBpbiBtaWxsaS1zZWNvbmRzXG4gICAgaWYgKG1hdGNoWzldID09PSBcIi1cIikgZGVsdGEgPSAtZGVsdGE7XG4gIH1cblxuICBjb25zdCBkYXRlID0gbmV3IERhdGUoXG4gICAgRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIGZyYWN0aW9uKSxcbiAgKTtcblxuICBpZiAoZGVsdGEpIGRhdGUuc2V0VGltZShkYXRlLmdldFRpbWUoKSAtIGRlbHRhKTtcblxuICByZXR1cm4gZGF0ZTtcbn1cblxuZnVuY3Rpb24gcmVwcmVzZW50WWFtbFRpbWVzdGFtcChkYXRlOiBEYXRlKTogc3RyaW5nIHtcbiAgcmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKTtcbn1cblxuZXhwb3J0IGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBUeXBlKFwidGFnOnlhbWwub3JnLDIwMDI6dGltZXN0YW1wXCIsIHtcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sVGltZXN0YW1wLFxuICBpbnN0YW5jZU9mOiBEYXRlLFxuICBraW5kOiBcInNjYWxhclwiLFxuICByZXByZXNlbnQ6IHJlcHJlc2VudFlhbWxUaW1lc3RhbXAsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sVGltZXN0YW1wLFxufSk7XG4iXX0=