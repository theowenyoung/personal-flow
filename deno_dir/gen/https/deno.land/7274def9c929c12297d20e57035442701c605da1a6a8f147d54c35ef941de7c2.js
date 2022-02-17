import { get } from "./utils/get.ts";
export function getSourceItemUniqueKey(item, sourceIndex, sourceOptions) {
    const defaultKeysFields = [
        "id",
        "guid",
        "_id",
        "objectId",
        "objectID",
        "ID",
        "url",
        "link",
    ];
    const keyFields = sourceOptions.key
        ? [sourceOptions.key].concat(defaultKeysFields)
        : defaultKeysFields;
    let itemKey;
    for (let keyFieldIndex = 0; keyFieldIndex < keyFields.length; keyFieldIndex++) {
        const keyField = keyFields[keyFieldIndex];
        itemKey = get(item, keyField);
        if (typeof itemKey === "string") {
            break;
        }
    }
    const sourcePrefix = sourceOptions.id || sourceIndex;
    if (itemKey) {
        return `${sourcePrefix}${itemKey}`;
    }
    else {
        return undefined;
    }
}
export function getSourceItemsFromResult(ctx, sourceOptions) {
    const { reporter } = sourceOptions;
    const force = sourceOptions?.force;
    let items = ctx.public.result;
    if (sourceOptions.itemsPath) {
        items = get(ctx.public.result, sourceOptions.itemsPath);
    }
    if (!Array.isArray(items)) {
        throw new Error("source result must be an array, but got " + typeof items);
    }
    if (sourceOptions?.reverse) {
        items = items.reverse();
    }
    const limit = sourceOptions?.limit;
    if (limit !== undefined && items.length > limit) {
        items = items.slice(0, limit);
    }
    const finalItems = [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex];
        const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
        if (key === undefined) {
            reporter.warning(`will be directly added to items`, "No unique key");
        }
        if (key !== undefined && ctx.internalState &&
            (ctx.internalState.keys || []).includes(key) &&
            !force) {
            reporter.debug(`${key}, cause it has been processed`, "Skip item");
            continue;
        }
        else if (key !== undefined && ctx.internalState &&
            (ctx.internalState.keys || []).includes(key) && force) {
            reporter.debug(`${key}, cause --force is true`, "Add processed item");
        }
        else if (force) {
            reporter.debug(`${key}`, "add item");
        }
        finalItems.push(item);
    }
    ctx.public.items = finalItems;
    ctx.public.result = finalItems;
    return ctx;
}
export function filterCtxItems(ctx, filterOptions) {
    const { reporter } = filterOptions;
    const limit = filterOptions?.limit;
    const items = ctx.public.items;
    if (!Array.isArray(items)) {
        throw new Error("ctx.items must be an array, but got " + typeof items + ", filter failed");
    }
    reporter.debug(`Input ${items.length} items`);
    const finalItems = [];
    for (let i = 0; i < items.length; i++) {
        if (limit !== undefined && limit > 0 && finalItems.length >= limit) {
            break;
        }
        const item = items[i];
        finalItems.push(item);
    }
    ctx.public.items = finalItems;
    reporter.debug(`Output ${ctx.public.items.length} items`);
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXNvdXJjZS1pdGVtcy1mcm9tLXJlc3VsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1zb3VyY2UtaXRlbXMtZnJvbS1yZXN1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBU3JDLE1BQU0sVUFBVSxzQkFBc0IsQ0FDcEMsSUFBYSxFQUNiLFdBQW1CLEVBQ25CLGFBQTRCO0lBRTVCLE1BQU0saUJBQWlCLEdBQUc7UUFDeEIsSUFBSTtRQUNKLE1BQU07UUFDTixLQUFLO1FBQ0wsVUFBVTtRQUNWLFVBQVU7UUFDVixJQUFJO1FBQ0osS0FBSztRQUNMLE1BQU07S0FDUCxDQUFDO0lBQ0YsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLEdBQUc7UUFDakMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQUMvQyxDQUFDLENBQUMsaUJBQWlCLENBQUM7SUFFdEIsSUFBSSxPQUFPLENBQUM7SUFDWixLQUNFLElBQUksYUFBYSxHQUFHLENBQUMsRUFDckIsYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQ2hDLGFBQWEsRUFBRSxFQUNmO1FBQ0EsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFO1lBQy9CLE1BQU07U0FDUDtLQUNGO0lBQ0QsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLEVBQUUsSUFBSSxXQUFXLENBQUM7SUFDckQsSUFBSSxPQUFPLEVBQUU7UUFDWCxPQUFPLEdBQUcsWUFBWSxHQUFHLE9BQU8sRUFBRSxDQUFDO0tBQ3BDO1NBQU07UUFDTCxPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUFD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RW5DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBRS9CLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQ2Isc0NBQXNDLEdBQUcsT0FBTyxLQUFLLEdBQUcsaUJBQWlCLENBQzFFLENBQUM7S0FDSDtJQUNELFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxLQUFLLENBQUMsTUFBTSxRQUFRLENBQUMsQ0FBQztJQUU5QyxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFFdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFHckMsSUFDRSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQzlEO1lBQ0EsTUFBTTtTQUNQO1FBQ0QsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRCLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDdkI7SUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUM7SUFFOUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7SUFFMUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRmlsdGVyT3B0aW9ucywgU291cmNlT3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgZ2V0IH0gZnJvbSBcIi4vdXRpbHMvZ2V0LnRzXCI7XG5pbXBvcnQgeyBsb2cgfSBmcm9tIFwiLi4vZGVwcy50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW50ZXJmYWNlIEZpbHRlclRyaWdnZXJPcHRpb24gZXh0ZW5kcyBGaWx0ZXJPcHRpb25zIHtcbiAgcmVwb3J0ZXI6IGxvZy5Mb2dnZXI7XG59XG5pbnRlcmZhY2UgU291cmNlVHJpZ2dlck9wdGlvbiBleHRlbmRzIFNvdXJjZU9wdGlvbnMge1xuICByZXBvcnRlcjogbG9nLkxvZ2dlcjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb3VyY2VJdGVtVW5pcXVlS2V5KFxuICBpdGVtOiB1bmtub3duLFxuICBzb3VyY2VJbmRleDogbnVtYmVyLFxuICBzb3VyY2VPcHRpb25zOiBTb3VyY2VPcHRpb25zLFxuKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGVmYXVsdEtleXNGaWVsZHMgPSBbXG4gICAgXCJpZFwiLFxuICAgIFwiZ3VpZFwiLFxuICAgIFwiX2lkXCIsXG4gICAgXCJvYmplY3RJZFwiLFxuICAgIFwib2JqZWN0SURcIixcbiAgICBcIklEXCIsXG4gICAgXCJ1cmxcIixcbiAgICBcImxpbmtcIixcbiAgXTtcbiAgY29uc3Qga2V5RmllbGRzID0gc291cmNlT3B0aW9ucy5rZXlcbiAgICA/IFtzb3VyY2VPcHRpb25zLmtleV0uY29uY2F0KGRlZmF1bHRLZXlzRmllbGRzKVxuICAgIDogZGVmYXVsdEtleXNGaWVsZHM7XG4gIC8vIHVuaXF1ZSBrZXlcbiAgbGV0IGl0ZW1LZXk7XG4gIGZvciAoXG4gICAgbGV0IGtleUZpZWxkSW5kZXggPSAwO1xuICAgIGtleUZpZWxkSW5kZXggPCBrZXlGaWVsZHMubGVuZ3RoO1xuICAgIGtleUZpZWxkSW5kZXgrK1xuICApIHtcbiAgICBjb25zdCBrZXlGaWVsZCA9IGtleUZpZWxkc1trZXlGaWVsZEluZGV4XTtcbiAgICBpdGVtS2V5ID0gZ2V0KGl0ZW0sIGtleUZpZWxkKTtcbiAgICBpZiAodHlwZW9mIGl0ZW1LZXkgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBjb25zdCBzb3VyY2VQcmVmaXggPSBzb3VyY2VPcHRpb25zLmlkIHx8IHNvdXJjZUluZGV4O1xuICBpZiAoaXRlbUtleSkge1xuICAgIHJldHVybiBgJHtzb3VyY2VQcmVmaXh9JHtpdGVtS2V5fWA7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFNvdXJjZUl0ZW1zRnJvbVJlc3VsdChcbiAgY3R4OiBDb250ZXh0LFxuICBzb3VyY2VPcHRpb25zOiBTb3VyY2VUcmlnZ2VyT3B0aW9uLFxuKTogQ29udGV4dCB7XG4gIGNvbnN0IHsgcmVwb3J0ZXIgfSA9IHNvdXJjZU9wdGlvbnM7XG4gIC8vIGZvcm1hdFxuICBjb25zdCBmb3JjZSA9IHNvdXJjZU9wdGlvbnM/LmZvcmNlO1xuXG4gIC8vIGdldCBpdGVtcyBwYXRoLCBnZXQgZGVkdXBsaWNhdGlvbiBrZXlcbiAgbGV0IGl0ZW1zOiB1bmtub3duW10gPSBjdHgucHVibGljLnJlc3VsdCBhcyB1bmtub3duW107XG5cbiAgaWYgKHNvdXJjZU9wdGlvbnMuaXRlbXNQYXRoKSB7XG4gICAgaXRlbXMgPSBnZXQoXG4gICAgICBjdHgucHVibGljLnJlc3VsdCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICAgIHNvdXJjZU9wdGlvbnMuaXRlbXNQYXRoLFxuICAgICkgYXMgdW5rbm93bltdO1xuICB9XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KGl0ZW1zKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInNvdXJjZSByZXN1bHQgbXVzdCBiZSBhbiBhcnJheSwgYnV0IGdvdCBcIiArIHR5cGVvZiBpdGVtcyk7XG4gIH1cblxuICAvLyByZXZlcnNlIHNvdXJjZSBpdGVtc1xuICBpZiAoc291cmNlT3B0aW9ucz8ucmV2ZXJzZSkge1xuICAgIGl0ZW1zID0gaXRlbXMucmV2ZXJzZSgpO1xuICB9XG4gIC8vIGxpbWl0IHNvdXJjZSBpdGVtc1xuICAvLyBmaWx0ZXIgbGltaXRcbiAgY29uc3QgbGltaXQgPSBzb3VyY2VPcHRpb25zPy5saW1pdDtcbiAgaWYgKGxpbWl0ICE9PSB1bmRlZmluZWQgJiYgaXRlbXMubGVuZ3RoID4gbGltaXQpIHtcbiAgICBpdGVtcyA9IGl0ZW1zLnNsaWNlKDAsIGxpbWl0KTtcbiAgfVxuXG4gIGNvbnN0IGZpbmFsSXRlbXMgPSBbXTtcbiAgZm9yIChsZXQgaXRlbUluZGV4ID0gMDsgaXRlbUluZGV4IDwgaXRlbXMubGVuZ3RoOyBpdGVtSW5kZXgrKykge1xuICAgIC8vIHJlYWNoIG1heCBpdGVtc1xuICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpdGVtSW5kZXhdO1xuXG4gICAgY29uc3Qga2V5ID0gZ2V0U291cmNlSXRlbVVuaXF1ZUtleShcbiAgICAgIGl0ZW0sXG4gICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ISxcbiAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgKTtcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlcG9ydGVyLndhcm5pbmcoXG4gICAgICAgIGB3aWxsIGJlIGRpcmVjdGx5IGFkZGVkIHRvIGl0ZW1zYCxcbiAgICAgICAgXCJObyB1bmlxdWUga2V5XCIsXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmIChcbiAgICAgIGtleSAhPT0gdW5kZWZpbmVkICYmIGN0eC5pbnRlcm5hbFN0YXRlICYmXG4gICAgICAoY3R4LmludGVybmFsU3RhdGUua2V5cyB8fCBbXSkuaW5jbHVkZXMoa2V5KSAmJlxuICAgICAgIWZvcmNlXG4gICAgKSB7XG4gICAgICByZXBvcnRlci5kZWJ1ZyhgJHtrZXl9LCBjYXVzZSBpdCBoYXMgYmVlbiBwcm9jZXNzZWRgLCBcIlNraXAgaXRlbVwiKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBrZXkgIT09IHVuZGVmaW5lZCAmJiBjdHguaW50ZXJuYWxTdGF0ZSAmJlxuICAgICAgKGN0eC5pbnRlcm5hbFN0YXRlLmtleXMgfHwgW10pLmluY2x1ZGVzKGtleSkgJiYgZm9yY2VcbiAgICApIHtcbiAgICAgIHJlcG9ydGVyLmRlYnVnKFxuICAgICAgICBgJHtrZXl9LCBjYXVzZSAtLWZvcmNlIGlzIHRydWVgLFxuICAgICAgICBcIkFkZCBwcm9jZXNzZWQgaXRlbVwiLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGZvcmNlKSB7XG4gICAgICByZXBvcnRlci5kZWJ1ZyhgJHtrZXl9YCwgXCJhZGQgaXRlbVwiKTtcbiAgICB9XG5cbiAgICBmaW5hbEl0ZW1zLnB1c2goaXRlbSk7XG4gIH1cbiAgLy8gc2F2ZSBjdXJyZW50IGtleSB0byBkYlxuICBjdHgucHVibGljLml0ZW1zID0gZmluYWxJdGVtcztcbiAgY3R4LnB1YmxpYy5yZXN1bHQgPSBmaW5hbEl0ZW1zO1xuICByZXR1cm4gY3R4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQ3R4SXRlbXMoXG4gIGN0eDogQ29udGV4dCxcbiAgZmlsdGVyT3B0aW9uczogRmlsdGVyVHJpZ2dlck9wdGlvbixcbik6IENvbnRleHQge1xuICBjb25zdCB7IHJlcG9ydGVyIH0gPSBmaWx0ZXJPcHRpb25zO1xuICAvLyBmb3JtYXRcbiAgY29uc3QgbGltaXQgPSBmaWx0ZXJPcHRpb25zPy5saW1pdDtcbiAgLy8gZ2V0IGl0ZW1zIHBhdGgsIGdldCBkZWR1cGxpY2F0aW9uIGtleVxuICBjb25zdCBpdGVtcyA9IGN0eC5wdWJsaWMuaXRlbXM7XG5cbiAgaWYgKCFBcnJheS5pc0FycmF5KGl0ZW1zKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiY3R4Lml0ZW1zIG11c3QgYmUgYW4gYXJyYXksIGJ1dCBnb3QgXCIgKyB0eXBlb2YgaXRlbXMgKyBcIiwgZmlsdGVyIGZhaWxlZFwiLFxuICAgICk7XG4gIH1cbiAgcmVwb3J0ZXIuZGVidWcoYElucHV0ICR7aXRlbXMubGVuZ3RofSBpdGVtc2ApO1xuXG4gIGNvbnN0IGZpbmFsSXRlbXMgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gcmVhY2ggbWF4IGl0ZW1zXG5cbiAgICBpZiAoXG4gICAgICBsaW1pdCAhPT0gdW5kZWZpbmVkICYmIGxpbWl0ID4gMCAmJiBmaW5hbEl0ZW1zLmxlbmd0aCA+PSBsaW1pdFxuICAgICkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IGl0ZW0gPSBpdGVtc1tpXTtcblxuICAgIGZpbmFsSXRlbXMucHVzaChpdGVtKTtcbiAgfVxuICAvLyBzYXZlIGN1cnJlbnQga2V5IHRvIGRiXG4gIGN0eC5wdWJsaWMuaXRlbXMgPSBmaW5hbEl0ZW1zO1xuXG4gIHJlcG9ydGVyLmRlYnVnKGBPdXRwdXQgJHtjdHgucHVibGljLml0ZW1zLmxlbmd0aH0gaXRlbXNgKTtcblxuICByZXR1cm4gY3R4O1xufVxuIl19