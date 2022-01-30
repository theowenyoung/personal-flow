import { Type } from "../type.ts";
const _toString = Object.prototype.toString;
function resolveYamlPairs(data) {
    const result = Array.from({ length: data.length });
    for (let index = 0; index < data.length; index++) {
        const pair = data[index];
        if (_toString.call(pair) !== "[object Object]")
            return false;
        const keys = Object.keys(pair);
        if (keys.length !== 1)
            return false;
        result[index] = [keys[0], pair[keys[0]]];
    }
    return true;
}
function constructYamlPairs(data) {
    if (data === null)
        return [];
    const result = Array.from({ length: data.length });
    for (let index = 0; index < data.length; index += 1) {
        const pair = data[index];
        const keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
    }
    return result;
}
export const pairs = new Type("tag:yaml.org,2002:pairs", {
    construct: constructYamlPairs,
    kind: "sequence",
    resolve: resolveYamlPairs,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFpcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwYWlycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR2xDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBRTVDLFNBQVMsZ0JBQWdCLENBQUMsSUFBYTtJQUNyQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBRW5ELEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ2hELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV6QixJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssaUJBQWlCO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFN0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUvQixJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRXBDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBUSxDQUFDLENBQUMsQ0FBQztLQUNqRDtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsSUFBWTtJQUN0QyxJQUFJLElBQUksS0FBSyxJQUFJO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFFN0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUVuRCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFO1FBQ25ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUV6QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9CLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBUSxDQUFDLENBQUMsQ0FBQztLQUNqRDtJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUU7SUFDdkQsU0FBUyxFQUFFLGtCQUFrQjtJQUM3QixJQUFJLEVBQUUsVUFBVTtJQUNoQixPQUFPLEVBQUUsZ0JBQWdCO0NBQzFCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBvcnRlZCBmcm9tIGpzLXlhbWwgdjMuMTMuMTpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvanMteWFtbC9jb21taXQvNjY1YWFkZGE0MjM0OWRjYWU4NjlmMTIwNDBkOWIxMGVmMThkMTJkYVxuLy8gQ29weXJpZ2h0IDIwMTEtMjAxNSBieSBWaXRhbHkgUHV6cmluLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIENvcHlyaWdodCAyMDE4LTIwMjEgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmltcG9ydCB7IFR5cGUgfSBmcm9tIFwiLi4vdHlwZS50c1wiO1xuaW1wb3J0IHR5cGUgeyBBbnkgfSBmcm9tIFwiLi4vdXRpbHMudHNcIjtcblxuY29uc3QgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxQYWlycyhkYXRhOiBBbnlbXVtdKTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IEFycmF5LmZyb20oeyBsZW5ndGg6IGRhdGEubGVuZ3RoIH0pO1xuXG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBkYXRhLmxlbmd0aDsgaW5kZXgrKykge1xuICAgIGNvbnN0IHBhaXIgPSBkYXRhW2luZGV4XTtcblxuICAgIGlmIChfdG9TdHJpbmcuY2FsbChwYWlyKSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIikgcmV0dXJuIGZhbHNlO1xuXG4gICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHBhaXIpO1xuXG4gICAgaWYgKGtleXMubGVuZ3RoICE9PSAxKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXN1bHRbaW5kZXhdID0gW2tleXNbMF0sIHBhaXJba2V5c1swXSBhcyBBbnldXTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sUGFpcnMoZGF0YTogc3RyaW5nKTogQW55W10ge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IHJlc3VsdCA9IEFycmF5LmZyb20oeyBsZW5ndGg6IGRhdGEubGVuZ3RoIH0pO1xuXG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBkYXRhLmxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGNvbnN0IHBhaXIgPSBkYXRhW2luZGV4XTtcblxuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhwYWlyKTtcblxuICAgIHJlc3VsdFtpbmRleF0gPSBba2V5c1swXSwgcGFpcltrZXlzWzBdIGFzIEFueV1dO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGNvbnN0IHBhaXJzID0gbmV3IFR5cGUoXCJ0YWc6eWFtbC5vcmcsMjAwMjpwYWlyc1wiLCB7XG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbFBhaXJzLFxuICBraW5kOiBcInNlcXVlbmNlXCIsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sUGFpcnMsXG59KTtcbiJdfQ==