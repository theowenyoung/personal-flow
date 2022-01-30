import { SEP } from "./separator.ts";
export function common(paths, sep = SEP) {
    const [first = "", ...remaining] = paths;
    if (first === "" || remaining.length === 0) {
        return first.substring(0, first.lastIndexOf(sep) + 1);
    }
    const parts = first.split(sep);
    let endOfPrefix = parts.length;
    for (const path of remaining) {
        const compare = path.split(sep);
        for (let i = 0; i < endOfPrefix; i++) {
            if (compare[i] !== parts[i]) {
                endOfPrefix = i;
            }
        }
        if (endOfPrefix === 0) {
            return "";
        }
    }
    const prefix = parts.slice(0, endOfPrefix).join(sep);
    return prefix.endsWith(sep) ? prefix : `${prefix}${sep}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQWNyQyxNQUFNLFVBQVUsTUFBTSxDQUFDLEtBQWUsRUFBRSxHQUFHLEdBQUcsR0FBRztJQUMvQyxNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsRUFBRSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUN6QyxJQUFJLEtBQUssS0FBSyxFQUFFLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDMUMsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3ZEO0lBQ0QsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUUvQixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQy9CLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxFQUFFO1FBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNwQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzNCLFdBQVcsR0FBRyxDQUFDLENBQUM7YUFDakI7U0FDRjtRQUVELElBQUksV0FBVyxLQUFLLENBQUMsRUFBRTtZQUNyQixPQUFPLEVBQUUsQ0FBQztTQUNYO0tBQ0Y7SUFDRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckQsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQzNELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIxIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBTRVAgfSBmcm9tIFwiLi9zZXBhcmF0b3IudHNcIjtcblxuLyoqIERldGVybWluZXMgdGhlIGNvbW1vbiBwYXRoIGZyb20gYSBzZXQgb2YgcGF0aHMsIHVzaW5nIGFuIG9wdGlvbmFsIHNlcGFyYXRvcixcbiAqIHdoaWNoIGRlZmF1bHRzIHRvIHRoZSBPUyBkZWZhdWx0IHNlcGFyYXRvci5cbiAqXG4gKiBgYGB0c1xuICogICAgICAgaW1wb3J0IHsgY29tbW9uIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAkU1REX1ZFUlNJT04vcGF0aC9tb2QudHNcIjtcbiAqICAgICAgIGNvbnN0IHAgPSBjb21tb24oW1xuICogICAgICAgICBcIi4vZGVuby9zdGQvcGF0aC9tb2QudHNcIixcbiAqICAgICAgICAgXCIuL2Rlbm8vc3RkL2ZzL21vZC50c1wiLFxuICogICAgICAgXSk7XG4gKiAgICAgICBjb25zb2xlLmxvZyhwKTsgLy8gXCIuL2Rlbm8vc3RkL1wiXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbW1vbihwYXRoczogc3RyaW5nW10sIHNlcCA9IFNFUCk6IHN0cmluZyB7XG4gIGNvbnN0IFtmaXJzdCA9IFwiXCIsIC4uLnJlbWFpbmluZ10gPSBwYXRocztcbiAgaWYgKGZpcnN0ID09PSBcIlwiIHx8IHJlbWFpbmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZmlyc3Quc3Vic3RyaW5nKDAsIGZpcnN0Lmxhc3RJbmRleE9mKHNlcCkgKyAxKTtcbiAgfVxuICBjb25zdCBwYXJ0cyA9IGZpcnN0LnNwbGl0KHNlcCk7XG5cbiAgbGV0IGVuZE9mUHJlZml4ID0gcGFydHMubGVuZ3RoO1xuICBmb3IgKGNvbnN0IHBhdGggb2YgcmVtYWluaW5nKSB7XG4gICAgY29uc3QgY29tcGFyZSA9IHBhdGguc3BsaXQoc2VwKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVuZE9mUHJlZml4OyBpKyspIHtcbiAgICAgIGlmIChjb21wYXJlW2ldICE9PSBwYXJ0c1tpXSkge1xuICAgICAgICBlbmRPZlByZWZpeCA9IGk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGVuZE9mUHJlZml4ID09PSAwKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gIH1cbiAgY29uc3QgcHJlZml4ID0gcGFydHMuc2xpY2UoMCwgZW5kT2ZQcmVmaXgpLmpvaW4oc2VwKTtcbiAgcmV0dXJuIHByZWZpeC5lbmRzV2l0aChzZXApID8gcHJlZml4IDogYCR7cHJlZml4fSR7c2VwfWA7XG59XG4iXX0=