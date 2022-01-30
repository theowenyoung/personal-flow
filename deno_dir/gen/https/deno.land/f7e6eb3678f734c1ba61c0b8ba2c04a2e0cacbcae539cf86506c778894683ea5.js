import { Rss1Fields } from "../types/fields/mod.ts";
import { resolveDublinCoreField } from "./dublin_core_resolver.ts";
import { resolveSlashField } from "./slash_resolver.ts";
export const resolveRss1Field = (name) => {
    const result = {
        name,
        isHandled: true,
        isArray: false,
        isInt: false,
        isFloat: false,
        isDate: false,
    };
    switch (name) {
        case Rss1Fields.TextInput:
            result.name = "textInput";
            break;
        case Rss1Fields.Item:
            result.isArray = true;
            break;
        case Rss1Fields.About:
            result.name = "about";
            break;
        case Rss1Fields.Resource:
            result.name = "resource";
            break;
        default:
            const subNamespaceResolvers = [resolveDublinCoreField, resolveSlashField];
            for (let i = 0; i < subNamespaceResolvers.length; i++) {
                const resolverResult = subNamespaceResolvers[i](name);
                if (resolverResult.isHandled) {
                    if (resolverResult.isArray) {
                        result.isArray = true;
                    }
                    if (resolverResult.isDate) {
                        result.isDate = true;
                    }
                    if (resolverResult.isInt) {
                        result.isInt = true;
                    }
                    if (resolverResult.isFloat) {
                        result.isFloat = true;
                    }
                    result.name = resolverResult.name;
                    break;
                }
            }
            break;
    }
    return result;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnNzMV9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcnNzQDAuNS41L3NyYy9yZXNvbHZlcnMvcnNzMV9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFeEQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDOUIsSUFBWSxFQUNJLEVBQUU7SUFDbEIsTUFBTSxNQUFNLEdBQUc7UUFDYixJQUFJO1FBQ0osU0FBUyxFQUFFLElBQUk7UUFDZixPQUFPLEVBQUUsS0FBSztRQUNkLEtBQUssRUFBRSxLQUFLO1FBQ1osT0FBTyxFQUFFLEtBQUs7UUFDZCxNQUFNLEVBQUUsS0FBSztLQUNJLENBQUM7SUFFcEIsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLFVBQVUsQ0FBQyxTQUFTO1lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDO1lBQzFCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxJQUFJO1lBQ2xCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxLQUFLO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQ3RCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxRQUFRO1lBQ3RCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQ3pCLE1BQU07UUFDUjtZQUNFLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQzFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUU7b0JBQzVCLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRTt3QkFDMUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7cUJBQ3ZCO29CQUVELElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRTt3QkFDekIsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7cUJBQ3RCO29CQUVELElBQUksY0FBYyxDQUFDLEtBQUssRUFBRTt3QkFDeEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ3JCO29CQUVELElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRTt3QkFDMUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7cUJBQ3ZCO29CQUVELE1BQU0sQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQztvQkFDbEMsTUFBTTtpQkFDUDthQUNGO1lBQ0QsTUFBTTtLQUNUO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBSZXNvbHZlclJlc3VsdCB9IGZyb20gXCIuL3R5cGVzL3Jlc29sdmVyX3Jlc3VsdC50c1wiO1xuaW1wb3J0IHsgUnNzMUZpZWxkcyB9IGZyb20gXCIuLi90eXBlcy9maWVsZHMvbW9kLnRzXCI7XG5pbXBvcnQgeyByZXNvbHZlRHVibGluQ29yZUZpZWxkIH0gZnJvbSBcIi4vZHVibGluX2NvcmVfcmVzb2x2ZXIudHNcIjtcbmltcG9ydCB7IHJlc29sdmVTbGFzaEZpZWxkIH0gZnJvbSBcIi4vc2xhc2hfcmVzb2x2ZXIudHNcIjtcblxuZXhwb3J0IGNvbnN0IHJlc29sdmVSc3MxRmllbGQgPSAoXG4gIG5hbWU6IHN0cmluZyxcbik6IFJlc29sdmVyUmVzdWx0ID0+IHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIG5hbWUsXG4gICAgaXNIYW5kbGVkOiB0cnVlLFxuICAgIGlzQXJyYXk6IGZhbHNlLFxuICAgIGlzSW50OiBmYWxzZSxcbiAgICBpc0Zsb2F0OiBmYWxzZSxcbiAgICBpc0RhdGU6IGZhbHNlLFxuICB9IGFzIFJlc29sdmVyUmVzdWx0O1xuXG4gIHN3aXRjaCAobmFtZSkge1xuICAgIGNhc2UgUnNzMUZpZWxkcy5UZXh0SW5wdXQ6XG4gICAgICByZXN1bHQubmFtZSA9IFwidGV4dElucHV0XCI7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczFGaWVsZHMuSXRlbTpcbiAgICAgIHJlc3VsdC5pc0FycmF5ID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUnNzMUZpZWxkcy5BYm91dDpcbiAgICAgIHJlc3VsdC5uYW1lID0gXCJhYm91dFwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBSc3MxRmllbGRzLlJlc291cmNlOlxuICAgICAgcmVzdWx0Lm5hbWUgPSBcInJlc291cmNlXCI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY29uc3Qgc3ViTmFtZXNwYWNlUmVzb2x2ZXJzID0gW3Jlc29sdmVEdWJsaW5Db3JlRmllbGQsIHJlc29sdmVTbGFzaEZpZWxkXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3ViTmFtZXNwYWNlUmVzb2x2ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVyUmVzdWx0ID0gc3ViTmFtZXNwYWNlUmVzb2x2ZXJzW2ldKG5hbWUpO1xuICAgICAgICBpZiAocmVzb2x2ZXJSZXN1bHQuaXNIYW5kbGVkKSB7XG4gICAgICAgICAgaWYgKHJlc29sdmVyUmVzdWx0LmlzQXJyYXkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5pc0FycmF5ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocmVzb2x2ZXJSZXN1bHQuaXNEYXRlKSB7XG4gICAgICAgICAgICByZXN1bHQuaXNEYXRlID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocmVzb2x2ZXJSZXN1bHQuaXNJbnQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5pc0ludCA9IHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHJlc29sdmVyUmVzdWx0LmlzRmxvYXQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5pc0Zsb2F0ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXN1bHQubmFtZSA9IHJlc29sdmVyUmVzdWx0Lm5hbWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iXX0=