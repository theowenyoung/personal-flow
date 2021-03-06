import { Type } from "../type.ts";
const REGEXP = /^\/(?<regexp>[\s\S]+)\/(?<modifiers>[gismuy]*)$/;
export const regexp = new Type("tag:yaml.org,2002:js/regexp", {
    kind: "scalar",
    resolve(data) {
        if ((data === null) || (!data.length)) {
            return false;
        }
        const regexp = `${data}`;
        if (regexp.charAt(0) === "/") {
            if (!REGEXP.test(data)) {
                return false;
            }
            const modifiers = [...(regexp.match(REGEXP)?.groups?.modifiers ?? "")];
            if (new Set(modifiers).size < modifiers.length) {
                return false;
            }
        }
        return true;
    },
    construct(data) {
        const { regexp = `${data}`, modifiers = "" } = `${data}`.match(REGEXP)?.groups ?? {};
        return new RegExp(regexp, modifiers);
    },
    predicate(object) {
        return object instanceof RegExp;
    },
    represent(object) {
        return object.toString();
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnZXhwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVnZXhwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFHbEMsTUFBTSxNQUFNLEdBQUcsaURBQWlELENBQUM7QUFFakUsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLDZCQUE2QixFQUFFO0lBQzVELElBQUksRUFBRSxRQUFRO0lBQ2QsT0FBTyxDQUFDLElBQVM7UUFDZixJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDckMsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELE1BQU0sTUFBTSxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUM7UUFDekIsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtZQUU1QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdEIsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUU7Z0JBQzlDLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7U0FDRjtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELFNBQVMsQ0FBQyxJQUFZO1FBQ3BCLE1BQU0sRUFBRSxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsRUFBRSxTQUFTLEdBQUcsRUFBRSxFQUFFLEdBQzFDLEdBQUcsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUM7UUFDeEMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUNELFNBQVMsQ0FBQyxNQUFlO1FBQ3ZCLE9BQU8sTUFBTSxZQUFZLE1BQU0sQ0FBQztJQUNsQyxDQUFDO0lBQ0QsU0FBUyxDQUFDLE1BQWM7UUFDdEIsT0FBTyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDM0IsQ0FBQztDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBvcnRlZCBhbmQgYWRhcHRlZCBmcm9tIGpzLXlhbWwtanMtdHlwZXMgdjEuMC4wOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sLWpzLXR5cGVzL3RyZWUvYWM1MzdlN2JiZGQzYzJjYmJkOTg4MmNhMzkxOWM1MjBjMmRjMDIyYlxuLy8gQ29weXJpZ2h0IDIwMTEtMjAxNSBieSBWaXRhbHkgUHV6cmluLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmltcG9ydCB7IFR5cGUgfSBmcm9tIFwiLi4vdHlwZS50c1wiO1xuaW1wb3J0IHR5cGUgeyBBbnkgfSBmcm9tIFwiLi4vdXRpbHMudHNcIjtcblxuY29uc3QgUkVHRVhQID0gL15cXC8oPzxyZWdleHA+W1xcc1xcU10rKVxcLyg/PG1vZGlmaWVycz5bZ2lzbXV5XSopJC87XG5cbmV4cG9ydCBjb25zdCByZWdleHAgPSBuZXcgVHlwZShcInRhZzp5YW1sLm9yZywyMDAyOmpzL3JlZ2V4cFwiLCB7XG4gIGtpbmQ6IFwic2NhbGFyXCIsXG4gIHJlc29sdmUoZGF0YTogQW55KSB7XG4gICAgaWYgKChkYXRhID09PSBudWxsKSB8fCAoIWRhdGEubGVuZ3RoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlZ2V4cCA9IGAke2RhdGF9YDtcbiAgICBpZiAocmVnZXhwLmNoYXJBdCgwKSA9PT0gXCIvXCIpIHtcbiAgICAgIC8vIEVuc3VyZSByZWdleCBpcyBwcm9wZXJseSB0ZXJtaW5hdGVkXG4gICAgICBpZiAoIVJFR0VYUC50ZXN0KGRhdGEpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIG5vIGR1cGxpY2F0ZSBtb2RpZmllcnNcbiAgICAgIGNvbnN0IG1vZGlmaWVycyA9IFsuLi4ocmVnZXhwLm1hdGNoKFJFR0VYUCk/Lmdyb3Vwcz8ubW9kaWZpZXJzID8/IFwiXCIpXTtcbiAgICAgIGlmIChuZXcgU2V0KG1vZGlmaWVycykuc2l6ZSA8IG1vZGlmaWVycy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBjb25zdHJ1Y3QoZGF0YTogc3RyaW5nKSB7XG4gICAgY29uc3QgeyByZWdleHAgPSBgJHtkYXRhfWAsIG1vZGlmaWVycyA9IFwiXCIgfSA9XG4gICAgICBgJHtkYXRhfWAubWF0Y2goUkVHRVhQKT8uZ3JvdXBzID8/IHt9O1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4cCwgbW9kaWZpZXJzKTtcbiAgfSxcbiAgcHJlZGljYXRlKG9iamVjdDogdW5rbm93bikge1xuICAgIHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBSZWdFeHA7XG4gIH0sXG4gIHJlcHJlc2VudChvYmplY3Q6IFJlZ0V4cCkge1xuICAgIHJldHVybiBvYmplY3QudG9TdHJpbmcoKTtcbiAgfSxcbn0pO1xuIl19