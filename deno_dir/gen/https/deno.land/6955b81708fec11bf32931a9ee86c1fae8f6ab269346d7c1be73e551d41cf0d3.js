export async function runScript(expression, locals) {
    let declare = "";
    if (!locals.ctx) {
        locals.ctx = {};
    }
    for (const key in locals) {
        if (Object.prototype.hasOwnProperty.call(locals, key)) {
            declare += "const " + key + "=locals['" + key + "'];";
        }
    }
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    return await (AsyncFunction("locals", `${declare}
    let scriptResult =  await (async function main() {
      ${expression}
    })();
    return {
      result:scriptResult,
      ctx: ctx,
    };
    `))(locals);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuLXNjcmlwdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bi1zY3JpcHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLEtBQUssVUFBVSxTQUFTLENBQzdCLFVBQWtCLEVBQ2xCLE1BQStCO0lBRS9CLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0sQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0tBQ2pCO0lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUU7UUFDeEIsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3JELE9BQU8sSUFBSSxRQUFRLEdBQUcsR0FBRyxHQUFHLFdBQVcsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDO1NBQ3ZEO0tBQ0Y7SUFFRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssZUFBYyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7SUFDOUUsT0FBTyxNQUFNLENBQUMsYUFBYSxDQUN6QixRQUFRLEVBQ1IsR0FBRyxPQUFPOztRQUVOLFVBQVU7Ozs7OztLQU1iLENBQ0YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TY3JpcHQoXG4gIGV4cHJlc3Npb246IHN0cmluZyxcbiAgbG9jYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbikge1xuICBsZXQgZGVjbGFyZSA9IFwiXCI7XG4gIGlmICghbG9jYWxzLmN0eCkge1xuICAgIGxvY2Fscy5jdHggPSB7fTtcbiAgfVxuICBmb3IgKGNvbnN0IGtleSBpbiBsb2NhbHMpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGxvY2Fscywga2V5KSkge1xuICAgICAgZGVjbGFyZSArPSBcImNvbnN0IFwiICsga2V5ICsgXCI9bG9jYWxzWydcIiArIGtleSArIFwiJ107XCI7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgQXN5bmNGdW5jdGlvbiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhc3luYyBmdW5jdGlvbiAoKSB7fSkuY29uc3RydWN0b3I7XG4gIHJldHVybiBhd2FpdCAoQXN5bmNGdW5jdGlvbihcbiAgICBcImxvY2Fsc1wiLFxuICAgIGAke2RlY2xhcmV9XG4gICAgbGV0IHNjcmlwdFJlc3VsdCA9ICBhd2FpdCAoYXN5bmMgZnVuY3Rpb24gbWFpbigpIHtcbiAgICAgICR7ZXhwcmVzc2lvbn1cbiAgICB9KSgpO1xuICAgIHJldHVybiB7XG4gICAgICByZXN1bHQ6c2NyaXB0UmVzdWx0LFxuICAgICAgY3R4OiBjdHgsXG4gICAgfTtcbiAgICBgLFxuICApKShsb2NhbHMpO1xufVxuIl19