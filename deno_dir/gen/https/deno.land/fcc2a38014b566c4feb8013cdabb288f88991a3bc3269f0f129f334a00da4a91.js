import { template } from "./utils/template.ts";
import mapObject from "./utils/map-obj.js";
import { isObject } from "./utils/object.ts";
export async function parseObject(step, ctx, options) {
    const { keys: rawKeys } = options || {};
    const keys = rawKeys || Object.keys(step);
    for (const key of keys) {
        if ((key in step)) {
            const parsed = await parseTopValue(step[key], ctx);
            step[key] = parsed;
        }
    }
    return step;
}
async function parseTopValue(step, ctx) {
    try {
        if (typeof step === "string") {
            const parsed = await template(step, {
                ctx: ctx.public,
            });
            return parsed;
        }
        else if (Array.isArray(step)) {
            const finalArray = [];
            for (let i = 0; i < step.length; i++) {
                const item = step[i];
                finalArray.push(await parseTopValue(item, ctx));
            }
            return finalArray;
        }
        else if (isObject(step)) {
            const returned = await mapObject(step, async (sourceKey, sourceValue) => {
                if (typeof sourceValue === "string") {
                    const parsed = await template(sourceValue, {
                        ctx: ctx.public,
                    });
                    return [sourceKey, parsed, {
                            shouldRecurse: false,
                        }];
                }
                else {
                    if (Array.isArray(sourceValue)) {
                        const finalArray = [];
                        for (let i = 0; i < sourceValue.length; i++) {
                            const item = sourceValue[i];
                            if (typeof item === "string") {
                                const parsed = await template(item, {
                                    ctx: ctx.public,
                                });
                                finalArray.push(parsed);
                            }
                            else {
                                finalArray.push(item);
                            }
                        }
                        return [
                            sourceKey,
                            finalArray,
                        ];
                    }
                    else {
                        return [sourceKey, sourceValue];
                    }
                }
            }, {
                deep: true,
            });
            return returned;
        }
        else {
            return step;
        }
    }
    catch (e) {
        const isReferenced = e instanceof ReferenceError;
        if (isReferenced) {
            e.message = `${e.message} , Did you forget \`ctx.\` ?`;
        }
        throw e;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2Utb2JqZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2Utb2JqZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLFNBQVMsTUFBTSxvQkFBb0IsQ0FBQztBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFJN0MsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQy9CLElBQTZELEVBQzdELEdBQVksRUFDWixPQUE0QjtJQUU1QixNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDeEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHMUMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7UUFDdEIsSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRTtZQUNqQixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FDL0IsSUFBZ0MsQ0FBQyxHQUFHLENBQUMsRUFDdEMsR0FBRyxDQUNKLENBQUM7WUFDRCxJQUFnQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztTQUNqRDtLQUNGO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsS0FBSyxVQUFVLGFBQWEsQ0FDMUIsSUFBYSxFQUNiLEdBQVk7SUFFWixJQUFJO1FBQ0YsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7WUFDNUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFO2dCQUNsQyxHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU07YUFDaEIsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxNQUFNLENBQUM7U0FDZjthQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM5QixNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDdEIsS0FDRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQ1QsQ0FBQyxHQUFJLElBQWtCLENBQUMsTUFBTSxFQUM5QixDQUFDLEVBQUUsRUFDSDtnQkFDQSxNQUFNLElBQUksR0FBSSxJQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVwQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sYUFBYSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ2pEO1lBQ0QsT0FBTyxVQUFVLENBQUM7U0FDbkI7YUFBTSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6QixNQUFNLFFBQVEsR0FBRyxNQUFNLFNBQVMsQ0FDOUIsSUFBSSxFQUNKLEtBQUssRUFBRSxTQUFpQixFQUFFLFdBQW9CLEVBQUUsRUFBRTtnQkFDaEQsSUFBSSxPQUFPLFdBQVcsS0FBSyxRQUFRLEVBQUU7b0JBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLFdBQVcsRUFBRTt3QkFDekMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNO3FCQUNoQixDQUFDLENBQUM7b0JBRUgsT0FBTyxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUU7NEJBQ3pCLGFBQWEsRUFBRSxLQUFLO3lCQUNyQixDQUFDLENBQUM7aUJBQ0o7cUJBQU07b0JBQ0wsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFO3dCQUM5QixNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7d0JBQ3RCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFOzRCQUMzQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBRTVCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO2dDQUM1QixNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUU7b0NBQ2xDLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTTtpQ0FDaEIsQ0FBQyxDQUFDO2dDQUNILFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7NkJBQ3pCO2lDQUFNO2dDQUNMLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NkJBQ3ZCO3lCQUNGO3dCQUNELE9BQU87NEJBQ0wsU0FBUzs0QkFDVCxVQUFVO3lCQUNYLENBQUM7cUJBQ0g7eUJBQU07d0JBQ0wsT0FBTyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztxQkFDakM7aUJBQ0Y7WUFDSCxDQUFDLEVBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLElBQUk7YUFDWCxDQUNGLENBQUM7WUFDRixPQUFPLFFBQVEsQ0FBQztTQUNqQjthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUM7U0FDYjtLQUNGO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixNQUFNLFlBQVksR0FBRyxDQUFDLFlBQVksY0FBYyxDQUFDO1FBRWpELElBQUksWUFBWSxFQUFFO1lBQ2hCLENBQUMsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyw4QkFBOEIsQ0FBQztTQUN4RDtRQUNELE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RlcE9wdGlvbnMsIFdvcmtmbG93T3B0aW9ucyB9IGZyb20gXCIuL2ludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgQ29udGV4dCB9IGZyb20gXCIuL2ludGVybmFsLWludGVyZmFjZS50c1wiO1xuaW1wb3J0IHsgdGVtcGxhdGUgfSBmcm9tIFwiLi91dGlscy90ZW1wbGF0ZS50c1wiO1xuaW1wb3J0IG1hcE9iamVjdCBmcm9tIFwiLi91dGlscy9tYXAtb2JqLmpzXCI7XG5pbXBvcnQgeyBpc09iamVjdCB9IGZyb20gXCIuL3V0aWxzL29iamVjdC50c1wiO1xuaW50ZXJmYWNlIE9iamVjdHBhcnNlT3B0aW9ucyB7XG4gIGtleXM/OiBzdHJpbmdbXTtcbn1cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwYXJzZU9iamVjdChcbiAgc3RlcDogU3RlcE9wdGlvbnMgfCBXb3JrZmxvd09wdGlvbnMgfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBDb250ZXh0LFxuICBvcHRpb25zPzogT2JqZWN0cGFyc2VPcHRpb25zLFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IHsga2V5czogcmF3S2V5cyB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgY29uc3Qga2V5cyA9IHJhd0tleXMgfHwgT2JqZWN0LmtleXMoc3RlcCk7XG4gIC8vIGlmIGtleXMgcHJvdmlkZWQsIGNoZWNrIGlzIGluY2x1ZGUga2V5c1xuXG4gIGZvciAoY29uc3Qga2V5IG9mIGtleXMpIHtcbiAgICBpZiAoKGtleSBpbiBzdGVwKSkge1xuICAgICAgY29uc3QgcGFyc2VkID0gYXdhaXQgcGFyc2VUb3BWYWx1ZShcbiAgICAgICAgKHN0ZXAgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2tleV0sXG4gICAgICAgIGN0eCxcbiAgICAgICk7XG4gICAgICAoc3RlcCBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilba2V5XSA9IHBhcnNlZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc3RlcDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcGFyc2VUb3BWYWx1ZShcbiAgc3RlcDogdW5rbm93bixcbiAgY3R4OiBDb250ZXh0LFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiBzdGVwID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSBhd2FpdCB0ZW1wbGF0ZShzdGVwLCB7XG4gICAgICAgIGN0eDogY3R4LnB1YmxpYyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBhcnNlZDtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoc3RlcCkpIHtcbiAgICAgIGNvbnN0IGZpbmFsQXJyYXkgPSBbXTtcbiAgICAgIGZvciAoXG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgaSA8IChzdGVwIGFzIHVua25vd25bXSkubGVuZ3RoO1xuICAgICAgICBpKytcbiAgICAgICkge1xuICAgICAgICBjb25zdCBpdGVtID0gKHN0ZXAgYXMgdW5rbm93bltdKVtpXTtcblxuICAgICAgICBmaW5hbEFycmF5LnB1c2goYXdhaXQgcGFyc2VUb3BWYWx1ZShpdGVtLCBjdHgpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmaW5hbEFycmF5O1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qoc3RlcCkpIHtcbiAgICAgIGNvbnN0IHJldHVybmVkID0gYXdhaXQgbWFwT2JqZWN0KFxuICAgICAgICBzdGVwLFxuICAgICAgICBhc3luYyAoc291cmNlS2V5OiBzdHJpbmcsIHNvdXJjZVZhbHVlOiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VWYWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gYXdhaXQgdGVtcGxhdGUoc291cmNlVmFsdWUsIHtcbiAgICAgICAgICAgICAgY3R4OiBjdHgucHVibGljLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBbc291cmNlS2V5LCBwYXJzZWQsIHtcbiAgICAgICAgICAgICAgc2hvdWxkUmVjdXJzZTogZmFsc2UsXG4gICAgICAgICAgICB9XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlVmFsdWUpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGZpbmFsQXJyYXkgPSBbXTtcbiAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzb3VyY2VWYWx1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBzb3VyY2VWYWx1ZVtpXTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gYXdhaXQgdGVtcGxhdGUoaXRlbSwge1xuICAgICAgICAgICAgICAgICAgICBjdHg6IGN0eC5wdWJsaWMsXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIGZpbmFsQXJyYXkucHVzaChwYXJzZWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEFycmF5LnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgc291cmNlS2V5LFxuICAgICAgICAgICAgICAgIGZpbmFsQXJyYXksXG4gICAgICAgICAgICAgIF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gW3NvdXJjZUtleSwgc291cmNlVmFsdWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGRlZXA6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgICAgcmV0dXJuIHJldHVybmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3RlcDtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zdCBpc1JlZmVyZW5jZWQgPSBlIGluc3RhbmNlb2YgUmVmZXJlbmNlRXJyb3I7XG5cbiAgICBpZiAoaXNSZWZlcmVuY2VkKSB7XG4gICAgICBlLm1lc3NhZ2UgPSBgJHtlLm1lc3NhZ2V9ICwgRGlkIHlvdSBmb3JnZXQgXFxgY3R4LlxcYCA/YDtcbiAgICB9XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuIl19