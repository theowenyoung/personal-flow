import { Type } from "../type.ts";
import { isBoolean } from "../utils.ts";
function resolveYamlBoolean(data) {
    const max = data.length;
    return ((max === 4 && (data === "true" || data === "True" || data === "TRUE")) ||
        (max === 5 && (data === "false" || data === "False" || data === "FALSE")));
}
function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
}
export const bool = new Type("tag:yaml.org,2002:bool", {
    construct: constructYamlBoolean,
    defaultStyle: "lowercase",
    kind: "scalar",
    predicate: isBoolean,
    represent: {
        lowercase(object) {
            return object ? "true" : "false";
        },
        uppercase(object) {
            return object ? "TRUE" : "FALSE";
        },
        camelcase(object) {
            return object ? "True" : "False";
        },
    },
    resolve: resolveYamlBoolean,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNsQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXhDLFNBQVMsa0JBQWtCLENBQUMsSUFBWTtJQUN0QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBRXhCLE9BQU8sQ0FDTCxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksSUFBSSxLQUFLLE9BQU8sSUFBSSxJQUFJLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FDMUUsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLElBQVk7SUFDeEMsT0FBTyxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLE1BQU0sQ0FBQztBQUMvRCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFO0lBQ3JELFNBQVMsRUFBRSxvQkFBb0I7SUFDL0IsWUFBWSxFQUFFLFdBQVc7SUFDekIsSUFBSSxFQUFFLFFBQVE7SUFDZCxTQUFTLEVBQUUsU0FBUztJQUNwQixTQUFTLEVBQUU7UUFDVCxTQUFTLENBQUMsTUFBZTtZQUN2QixPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDbkMsQ0FBQztRQUNELFNBQVMsQ0FBQyxNQUFlO1lBQ3ZCLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUNuQyxDQUFDO1FBQ0QsU0FBUyxDQUFDLE1BQWU7WUFDdkIsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ25DLENBQUM7S0FDRjtJQUNELE9BQU8sRUFBRSxrQkFBa0I7Q0FDNUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUG9ydGVkIGZyb20ganMteWFtbCB2My4xMy4xOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhXG4vLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgVHlwZSB9IGZyb20gXCIuLi90eXBlLnRzXCI7XG5pbXBvcnQgeyBpc0Jvb2xlYW4gfSBmcm9tIFwiLi4vdXRpbHMudHNcIjtcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxCb29sZWFuKGRhdGE6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBtYXggPSBkYXRhLmxlbmd0aDtcblxuICByZXR1cm4gKFxuICAgIChtYXggPT09IDQgJiYgKGRhdGEgPT09IFwidHJ1ZVwiIHx8IGRhdGEgPT09IFwiVHJ1ZVwiIHx8IGRhdGEgPT09IFwiVFJVRVwiKSkgfHxcbiAgICAobWF4ID09PSA1ICYmIChkYXRhID09PSBcImZhbHNlXCIgfHwgZGF0YSA9PT0gXCJGYWxzZVwiIHx8IGRhdGEgPT09IFwiRkFMU0VcIikpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxCb29sZWFuKGRhdGE6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZGF0YSA9PT0gXCJ0cnVlXCIgfHwgZGF0YSA9PT0gXCJUcnVlXCIgfHwgZGF0YSA9PT0gXCJUUlVFXCI7XG59XG5cbmV4cG9ydCBjb25zdCBib29sID0gbmV3IFR5cGUoXCJ0YWc6eWFtbC5vcmcsMjAwMjpib29sXCIsIHtcbiAgY29uc3RydWN0OiBjb25zdHJ1Y3RZYW1sQm9vbGVhbixcbiAgZGVmYXVsdFN0eWxlOiBcImxvd2VyY2FzZVwiLFxuICBraW5kOiBcInNjYWxhclwiLFxuICBwcmVkaWNhdGU6IGlzQm9vbGVhbixcbiAgcmVwcmVzZW50OiB7XG4gICAgbG93ZXJjYXNlKG9iamVjdDogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgICByZXR1cm4gb2JqZWN0ID8gXCJ0cnVlXCIgOiBcImZhbHNlXCI7XG4gICAgfSxcbiAgICB1cHBlcmNhc2Uob2JqZWN0OiBib29sZWFuKTogc3RyaW5nIHtcbiAgICAgIHJldHVybiBvYmplY3QgPyBcIlRSVUVcIiA6IFwiRkFMU0VcIjtcbiAgICB9LFxuICAgIGNhbWVsY2FzZShvYmplY3Q6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgICAgcmV0dXJuIG9iamVjdCA/IFwiVHJ1ZVwiIDogXCJGYWxzZVwiO1xuICAgIH0sXG4gIH0sXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sQm9vbGVhbixcbn0pO1xuIl19