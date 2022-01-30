import { getSourceItemUniqueKey } from "./get-source-items-from-result.ts";
import { runScript } from "./utils/run-script.ts";
import { getFrom } from "./get-from.ts";
export async function filterSourceItems(ctx, sourceOptions) {
    const reporter = sourceOptions.reporter;
    let finalItems = ctx.public.items;
    if (Array.isArray(ctx.public.items)) {
        if (sourceOptions.filter) {
            finalItems = [];
            for (let i = 0; i < ctx.public.items.length; i++) {
                const item = ctx.public.items[i];
                try {
                    const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
                    const scriptResult = await runScript(sourceOptions.filter, {
                        ctx: {
                            ...ctx.public,
                            itemIndex: i,
                            itemKey: key,
                            item: item,
                        },
                    });
                    if (scriptResult.result) {
                        finalItems.push(item);
                        reporter.debug(`filter item ${key} to ctx.items`);
                    }
                    ctx.public.state = scriptResult.ctx.state;
                }
                catch (e) {
                    reporter.error(`Failed to run filter script`);
                    throw new Error(e);
                }
            }
        }
        else if (sourceOptions.filterFrom) {
            finalItems = [];
            const lib = await getFrom(ctx, sourceOptions.filterFrom, reporter);
            if (lib && lib.default) {
                for (let i = 0; i < ctx.public.items.length; i++) {
                    const item = ctx.public.items[i];
                    try {
                        const key = getSourceItemUniqueKey(item, ctx.public.sourceIndex, sourceOptions);
                        const scriptResult = await lib.default({
                            ...ctx.public,
                            itemIndex: i,
                            itemKey: key,
                            item: item,
                        });
                        if (scriptResult) {
                            finalItems.push(item);
                            reporter.debug(`filter item ${key} to ctx.items`);
                        }
                    }
                    catch (e) {
                        reporter.error(`Failed to run filterFrom script`);
                        throw new Error(e);
                    }
                }
            }
        }
        else if (sourceOptions.filterItems) {
            const filterItems = sourceOptions.filterItems;
            try {
                const scriptResult = await runScript(filterItems, {
                    ctx: {
                        ...ctx.public,
                    },
                });
                if (Array.isArray(scriptResult.result) &&
                    scriptResult.result.length === ctx.public.items.length) {
                    finalItems = ctx.public.items.filter((_item, index) => {
                        return scriptResult.result[index];
                    });
                    reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                }
                else {
                    throw new Error("Invalid filterItems script code, result must be array , boolean[], which items length must be equal to ctx.items length");
                }
                ctx.public.state = scriptResult.ctx.state;
            }
            catch (e) {
                reporter.error(`Failed to run filterItems script`);
                throw new Error(e);
            }
        }
        else if (sourceOptions.filterItemsFrom) {
            const lib = await getFrom(ctx, sourceOptions.filterItemsFrom, reporter);
            if (lib && lib.default) {
                try {
                    const scriptResult = await lib.default({
                        ...ctx.public,
                    });
                    if (Array.isArray(scriptResult.result) &&
                        scriptResult.result.length === ctx.public.items.length) {
                        finalItems = ctx.public.items.filter((_item, index) => {
                            return scriptResult.result[index];
                        });
                        reporter.debug(`filter ${finalItems.length} items to ctx.items`);
                    }
                    else {
                        throw new Error("Invalid filterItems script, result must be array , boolean[], which items length must be equal to ctx.items length");
                    }
                }
                catch (e) {
                    reporter.error(`Failed to run filterItemsFrom script`);
                    throw new Error(e);
                }
            }
        }
        const limit = sourceOptions?.limit;
        if (limit !== undefined && finalItems.length > limit) {
            finalItems = finalItems.slice(0, limit);
        }
    }
    ctx.public.items = finalItems;
    ctx.public.result = finalItems;
    return ctx;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyLXNvdXJjZS1pdGVtcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbHRlci1zb3VyY2UtaXRlbXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWxELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFNeEMsTUFBTSxDQUFDLEtBQUssVUFBVSxpQkFBaUIsQ0FDckMsR0FBWSxFQUNaLGFBQXNDO0lBRXRDLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7SUFDeEMsSUFBSSxVQUFVLEdBQWMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDN0MsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDbkMsSUFBSSxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3hCLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDaEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDaEQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUk7b0JBQ0YsTUFBTSxHQUFHLEdBQUcsc0JBQXNCLENBQ2hDLElBQUksRUFDSixHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVksRUFDdkIsYUFBYSxDQUNkLENBQUM7b0JBQ0YsTUFBTSxZQUFZLEdBQUcsTUFBTSxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTt3QkFDekQsR0FBRyxFQUFFOzRCQUNILEdBQUcsR0FBRyxDQUFDLE1BQU07NEJBQ2IsU0FBUyxF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Q3JILENBQUM7cUJBQ0g7aUJBQ0Y7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsUUFBUSxDQUFDLEtBQUssQ0FDWixzQ0FBc0MsQ0FDdkMsQ0FBQztvQkFDRixNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNwQjthQUNGO1NBQ0Y7UUFHRCxNQUFNLEtBQUssR0FBRyxhQUFhLEVBQUUsS0FBSyxDQUFDO1FBQ25DLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLEtBQUssRUFBRTtZQUNwRCxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDekM7S0FDRjtJQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQztJQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUM7SUFDL0IsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgZ2V0U291cmNlSXRlbVVuaXF1ZUtleSB9IGZyb20gXCIuL2dldC1zb3VyY2UtaXRlbXMtZnJvbS1yZXN1bHQudHNcIjtcbmltcG9ydCB7IHJ1blNjcmlwdCB9IGZyb20gXCIuL3V0aWxzL3J1bi1zY3JpcHQudHNcIjtcbmltcG9ydCB7IGxvZyB9IGZyb20gXCIuLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBnZXRGcm9tIH0gZnJvbSBcIi4vZ2V0LWZyb20udHNcIjtcbmltcG9ydCB7IFB1YmxpY0NvbnRleHQsIFNvdXJjZU9wdGlvbnMgfSBmcm9tIFwiLi9pbnRlcmZhY2UudHNcIjtcbnR5cGUgRmlsdGVyRnVuY3Rpb24gPSAoY3R4OiBQdWJsaWNDb250ZXh0KSA9PiBib29sZWFuO1xuaW50ZXJmYWNlIEZpbHRlclNvdXJjZUl0ZW1zT3B0aW9uIGV4dGVuZHMgU291cmNlT3B0aW9ucyB7XG4gIHJlcG9ydGVyOiBsb2cuTG9nZ2VyO1xufVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbHRlclNvdXJjZUl0ZW1zKFxuICBjdHg6IENvbnRleHQsXG4gIHNvdXJjZU9wdGlvbnM6IEZpbHRlclNvdXJjZUl0ZW1zT3B0aW9uLFxuKTogUHJvbWlzZTxDb250ZXh0PiB7XG4gIGNvbnN0IHJlcG9ydGVyID0gc291cmNlT3B0aW9ucy5yZXBvcnRlcjtcbiAgbGV0IGZpbmFsSXRlbXM6IHVua25vd25bXSA9IGN0eC5wdWJsaWMuaXRlbXM7XG4gIGlmIChBcnJheS5pc0FycmF5KGN0eC5wdWJsaWMuaXRlbXMpKSB7XG4gICAgaWYgKHNvdXJjZU9wdGlvbnMuZmlsdGVyKSB7XG4gICAgICBmaW5hbEl0ZW1zID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGN0eC5wdWJsaWMuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgaXRlbSA9IGN0eC5wdWJsaWMuaXRlbXNbaV07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qga2V5ID0gZ2V0U291cmNlSXRlbVVuaXF1ZUtleShcbiAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgICAgICBjdHgucHVibGljLnNvdXJjZUluZGV4ISxcbiAgICAgICAgICAgIHNvdXJjZU9wdGlvbnMsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBjb25zdCBzY3JpcHRSZXN1bHQgPSBhd2FpdCBydW5TY3JpcHQoc291cmNlT3B0aW9ucy5maWx0ZXIsIHtcbiAgICAgICAgICAgIGN0eDoge1xuICAgICAgICAgICAgICAuLi5jdHgucHVibGljLFxuICAgICAgICAgICAgICBpdGVtSW5kZXg6IGksXG4gICAgICAgICAgICAgIGl0ZW1LZXk6IGtleSxcbiAgICAgICAgICAgICAgaXRlbTogaXRlbSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoc2NyaXB0UmVzdWx0LnJlc3VsdCkge1xuICAgICAgICAgICAgZmluYWxJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgcmVwb3J0ZXIuZGVidWcoYGZpbHRlciBpdGVtICR7a2V5fSB0byBjdHguaXRlbXNgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY3R4LnB1YmxpYy5zdGF0ZSA9IHNjcmlwdFJlc3VsdC5jdHguc3RhdGU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXBvcnRlci5lcnJvcihcbiAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlciBzY3JpcHRgLFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzb3VyY2VPcHRpb25zLmZpbHRlckZyb20pIHtcbiAgICAgIGZpbmFsSXRlbXMgPSBbXTtcbiAgICAgIGNvbnN0IGxpYiA9IGF3YWl0IGdldEZyb20oY3R4LCBzb3VyY2VPcHRpb25zLmZpbHRlckZyb20sIHJlcG9ydGVyKTtcbiAgICAgIGlmIChsaWIgJiYgKGxpYiBhcyBSZWNvcmQ8c3RyaW5nLCBGaWx0ZXJGdW5jdGlvbj4pLmRlZmF1bHQpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdHgucHVibGljLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IGN0eC5wdWJsaWMuaXRlbXNbaV07XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGdldFNvdXJjZUl0ZW1VbmlxdWVLZXkoXG4gICAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgICAgICAgIGN0eC5wdWJsaWMuc291cmNlSW5kZXghLFxuICAgICAgICAgICAgICBzb3VyY2VPcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IHNjcmlwdFJlc3VsdCA9IGF3YWl0IGxpYi5kZWZhdWx0KHtcbiAgICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICAgICAgaXRlbUluZGV4OiBpLFxuICAgICAgICAgICAgICBpdGVtS2V5OiBrZXksXG4gICAgICAgICAgICAgIGl0ZW06IGl0ZW0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNjcmlwdFJlc3VsdCkge1xuICAgICAgICAgICAgICBmaW5hbEl0ZW1zLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgIHJlcG9ydGVyLmRlYnVnKGBmaWx0ZXIgaXRlbSAke2tleX0gdG8gY3R4Lml0ZW1zYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gcnVuIGZpbHRlckZyb20gc2NyaXB0YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzb3VyY2VPcHRpb25zLmZpbHRlckl0ZW1zKSB7XG4gICAgICBjb25zdCBmaWx0ZXJJdGVtcyA9IHNvdXJjZU9wdGlvbnMuZmlsdGVySXRlbXM7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNjcmlwdFJlc3VsdCA9IGF3YWl0IHJ1blNjcmlwdChmaWx0ZXJJdGVtcywge1xuICAgICAgICAgIGN0eDoge1xuICAgICAgICAgICAgLi4uY3R4LnB1YmxpYyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgQXJyYXkuaXNBcnJheShzY3JpcHRSZXN1bHQucmVzdWx0KSAmJlxuICAgICAgICAgIHNjcmlwdFJlc3VsdC5yZXN1bHQubGVuZ3RoID09PSBjdHgucHVibGljLml0ZW1zLmxlbmd0aFxuICAgICAgICApIHtcbiAgICAgICAgICBmaW5hbEl0ZW1zID0gY3R4LnB1YmxpYy5pdGVtcy5maWx0ZXIoKF9pdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHNjcmlwdFJlc3VsdC5yZXN1bHRbaW5kZXhdO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlcG9ydGVyLmRlYnVnKGBmaWx0ZXIgJHtmaW5hbEl0ZW1zLmxlbmd0aH0gaXRlbXMgdG8gY3R4Lml0ZW1zYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gaW52YWxpZCByZXN1bHRcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIkludmFsaWQgZmlsdGVySXRlbXMgc2NyaXB0IGNvZGUsIHJlc3VsdCBtdXN0IGJlIGFycmF5ICwgYm9vbGVhbltdLCB3aGljaCBpdGVtcyBsZW5ndGggbXVzdCBiZSBlcXVhbCB0byBjdHguaXRlbXMgbGVuZ3RoXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBjdHgucHVibGljLnN0YXRlID0gc2NyaXB0UmVzdWx0LmN0eC5zdGF0ZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgYEZhaWxlZCB0byBydW4gZmlsdGVySXRlbXMgc2NyaXB0YCxcbiAgICAgICAgKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc291cmNlT3B0aW9ucy5maWx0ZXJJdGVtc0Zyb20pIHtcbiAgICAgIGNvbnN0IGxpYiA9IGF3YWl0IGdldEZyb20oY3R4LCBzb3VyY2VPcHRpb25zLmZpbHRlckl0ZW1zRnJvbSwgcmVwb3J0ZXIpO1xuICAgICAgaWYgKGxpYiAmJiAobGliIGFzIFJlY29yZDxzdHJpbmcsIEZpbHRlckZ1bmN0aW9uPikuZGVmYXVsdCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHNjcmlwdFJlc3VsdCA9IGF3YWl0IGxpYi5kZWZhdWx0KHtcbiAgICAgICAgICAgIC4uLmN0eC5wdWJsaWMsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KHNjcmlwdFJlc3VsdC5yZXN1bHQpICYmXG4gICAgICAgICAgICBzY3JpcHRSZXN1bHQucmVzdWx0Lmxlbmd0aCA9PT0gY3R4LnB1YmxpYy5pdGVtcy5sZW5ndGhcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIGZpbmFsSXRlbXMgPSBjdHgucHVibGljLml0ZW1zLmZpbHRlcigoX2l0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBzY3JpcHRSZXN1bHQucmVzdWx0W2luZGV4XTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVwb3J0ZXIuZGVidWcoYGZpbHRlciAke2ZpbmFsSXRlbXMubGVuZ3RofSBpdGVtcyB0byBjdHguaXRlbXNgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaW52YWxpZCByZXN1bHRcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgXCJJbnZhbGlkIGZpbHRlckl0ZW1zIHNjcmlwdCwgcmVzdWx0IG11c3QgYmUgYXJyYXkgLCBib29sZWFuW10sIHdoaWNoIGl0ZW1zIGxlbmd0aCBtdXN0IGJlIGVxdWFsIHRvIGN0eC5pdGVtcyBsZW5ndGhcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVwb3J0ZXIuZXJyb3IoXG4gICAgICAgICAgICBgRmFpbGVkIHRvIHJ1biBmaWx0ZXJJdGVtc0Zyb20gc2NyaXB0YCxcbiAgICAgICAgICApO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGZpbHRlciBsaW1pdFxuICAgIGNvbnN0IGxpbWl0ID0gc291cmNlT3B0aW9ucz8ubGltaXQ7XG4gICAgaWYgKGxpbWl0ICE9PSB1bmRlZmluZWQgJiYgZmluYWxJdGVtcy5sZW5ndGggPiBsaW1pdCkge1xuICAgICAgZmluYWxJdGVtcyA9IGZpbmFsSXRlbXMuc2xpY2UoMCwgbGltaXQpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5wdWJsaWMuaXRlbXMgPSBmaW5hbEl0ZW1zO1xuICBjdHgucHVibGljLnJlc3VsdCA9IGZpbmFsSXRlbXM7XG4gIHJldHVybiBjdHg7XG59XG4iXX0=