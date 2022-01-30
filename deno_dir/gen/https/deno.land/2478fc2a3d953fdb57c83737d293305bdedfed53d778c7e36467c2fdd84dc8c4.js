import { Rss2Fields } from "../types/fields/mod.ts";
import { resolveDublinCoreField } from "./dublin_core_resolver.ts";
import { resolveMediaRssField } from "./media_rss_resolver.ts";
export const resolveRss2Field = (name) => {
    let result = {
        name,
        isHandled: true,
        isArray: false,
        isInt: false,
        isFloat: false,
        isDate: false,
    };
    switch (name) {
        case Rss2Fields.TextInput:
            result.name = "textInput";
            break;
        case Rss2Fields.SkipHours:
            result.name = "skipHours";
            break;
        case Rss2Fields.SkipDays:
            result.name = "skipDays";
            break;
        case Rss2Fields.PubDate:
            result.name = "pubDate";
            result.isDate = true;
            break;
        case Rss2Fields.ManagingEditor:
            result.name = "managingEditor";
            break;
        case Rss2Fields.WebMaster:
            result.name = "webMaster";
            break;
        case Rss2Fields.LastBuildDate:
            result.name = "lastBuildDate";
            result.isDate = true;
            break;
        case Rss2Fields.Item:
            result.name = "items";
            result.isArray = true;
            break;
        case Rss2Fields.Enclosure:
            result.isArray = true;
            break;
        case Rss2Fields.Category:
            result.name = "categories";
            result.isArray = true;
            break;
        case Rss2Fields.isPermaLink:
            result.name = "isPermaLink";
            break;
        case Rss2Fields.Ttl:
        case Rss2Fields.Length:
        case Rss2Fields.Width:
        case Rss2Fields.Height:
            result.isInt = true;
            break;
        case Rss2Fields.Hour:
            result.isArray = true;
            result.isInt = true;
            break;
        case Rss2Fields.Day:
            result.isArray = true;
            break;
        default:
            const subNamespaceResolvers = [
                resolveDublinCoreField,
                resolveMediaRssField,
            ];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnNzMl9yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcnNzQDAuNS41L3NyYy9yZXNvbHZlcnMvcnNzMl9yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFL0QsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDOUIsSUFBWSxFQUNJLEVBQUU7SUFDbEIsSUFBSSxNQUFNLEdBQUc7UUFDWCxJQUFJO1FBQ0osU0FBUyxFQUFFLElBQUk7UUFDZixPQUFPLEVBQUUsS0FBSztRQUNkLEtBQUssRUFBRSxLQUFLO1FBQ1osT0FBTyxFQUFFLEtBQUs7UUFDZCxNQUFNLEVBQUUsS0FBSztLQUNJLENBQUM7SUFFcEIsUUFBUSxJQUFJLEVBQUU7UUFDWixLQUFLLFVBQVUsQ0FBQyxTQUFTO1lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDO1lBQzFCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxTQUFTO1lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDO1lBQzFCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxRQUFRO1lBQ3RCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQ3pCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxPQUFPO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLE1BQU07UUFDUixLQUFLLFVBQVUsQ0FBQyxjQUFjO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7WUFDL0IsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLFNBQVM7WUFDdkIsTUFBTSxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7WUFDMUIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLGFBQWE7WUFDM0IsTUFBTSxDQUFDLElBQUksR0FBRyxlQUFlLENBQUM7WUFDOUIsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDckIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLElBQUk7WUFDbEIsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7WUFDdEIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLFNBQVM7WUFDdkIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLFFBQVE7WUFDdEIsTUFBTSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUM7WUFDM0IsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLFdBQVc7WUFDekIsTUFBTSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUM7WUFDNUIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLEdBQUcsQ0FBQztRQUNwQixLQUFLLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDdkIsS0FBSyxVQUFVLENBQUMsS0FBSyxDQUFDO1FBQ3RCLEtBQUssVUFBVSxDQUFDLE1BQU07WUFDcEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDcEIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLElBQUk7WUFDbEIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDcEIsTUFBTTtRQUNSLEtBQUssVUFBVSxDQUFDLEdBQUc7WUFDakIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTTtRQUNSO1lBQ0UsTUFBTSxxQkFBcUIsR0FBRztnQkFDNUIsc0JBQXNCO2dCQUN0QixvQkFBb0I7YUFDckIsQ0FBQztZQUNGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUU7b0JBQzVCLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRTt3QkFDMUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7cUJBQ3ZCO29CQUVELElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRTt3QkFDekIsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7cUJBQ3RCO29CQUVELElBQUksY0FBYyxDQUFDLEtBQUssRUFBRTt3QkFDeEIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7cUJBQ3JCO29CQUVELElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRTt3QkFDMUIsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7cUJBQ3ZCO29CQUVELE1BQU0sQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQztvQkFDbEMsTUFBTTtpQkFDUDthQUNGO1lBQ0QsTUFBTTtLQUNUO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBSZXNvbHZlclJlc3VsdCB9IGZyb20gXCIuL3R5cGVzL3Jlc29sdmVyX3Jlc3VsdC50c1wiO1xuaW1wb3J0IHsgUnNzMkZpZWxkcyB9IGZyb20gXCIuLi90eXBlcy9maWVsZHMvbW9kLnRzXCI7XG5pbXBvcnQgeyByZXNvbHZlRHVibGluQ29yZUZpZWxkIH0gZnJvbSBcIi4vZHVibGluX2NvcmVfcmVzb2x2ZXIudHNcIjtcbmltcG9ydCB7IHJlc29sdmVNZWRpYVJzc0ZpZWxkIH0gZnJvbSBcIi4vbWVkaWFfcnNzX3Jlc29sdmVyLnRzXCI7XG5cbmV4cG9ydCBjb25zdCByZXNvbHZlUnNzMkZpZWxkID0gKFxuICBuYW1lOiBzdHJpbmcsXG4pOiBSZXNvbHZlclJlc3VsdCA9PiB7XG4gIGxldCByZXN1bHQgPSB7XG4gICAgbmFtZSxcbiAgICBpc0hhbmRsZWQ6IHRydWUsXG4gICAgaXNBcnJheTogZmFsc2UsXG4gICAgaXNJbnQ6IGZhbHNlLFxuICAgIGlzRmxvYXQ6IGZhbHNlLFxuICAgIGlzRGF0ZTogZmFsc2UsXG4gIH0gYXMgUmVzb2x2ZXJSZXN1bHQ7XG5cbiAgc3dpdGNoIChuYW1lKSB7XG4gICAgY2FzZSBSc3MyRmllbGRzLlRleHRJbnB1dDpcbiAgICAgIHJlc3VsdC5uYW1lID0gXCJ0ZXh0SW5wdXRcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUnNzMkZpZWxkcy5Ta2lwSG91cnM6XG4gICAgICByZXN1bHQubmFtZSA9IFwic2tpcEhvdXJzXCI7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczJGaWVsZHMuU2tpcERheXM6XG4gICAgICByZXN1bHQubmFtZSA9IFwic2tpcERheXNcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUnNzMkZpZWxkcy5QdWJEYXRlOlxuICAgICAgcmVzdWx0Lm5hbWUgPSBcInB1YkRhdGVcIjtcbiAgICAgIHJlc3VsdC5pc0RhdGUgPSB0cnVlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBSc3MyRmllbGRzLk1hbmFnaW5nRWRpdG9yOlxuICAgICAgcmVzdWx0Lm5hbWUgPSBcIm1hbmFnaW5nRWRpdG9yXCI7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczJGaWVsZHMuV2ViTWFzdGVyOlxuICAgICAgcmVzdWx0Lm5hbWUgPSBcIndlYk1hc3RlclwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBSc3MyRmllbGRzLkxhc3RCdWlsZERhdGU6XG4gICAgICByZXN1bHQubmFtZSA9IFwibGFzdEJ1aWxkRGF0ZVwiO1xuICAgICAgcmVzdWx0LmlzRGF0ZSA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczJGaWVsZHMuSXRlbTpcbiAgICAgIHJlc3VsdC5uYW1lID0gXCJpdGVtc1wiO1xuICAgICAgcmVzdWx0LmlzQXJyYXkgPSB0cnVlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBSc3MyRmllbGRzLkVuY2xvc3VyZTpcbiAgICAgIHJlc3VsdC5pc0FycmF5ID0gdHJ1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUnNzMkZpZWxkcy5DYXRlZ29yeTpcbiAgICAgIHJlc3VsdC5uYW1lID0gXCJjYXRlZ29yaWVzXCI7XG4gICAgICByZXN1bHQuaXNBcnJheSA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczJGaWVsZHMuaXNQZXJtYUxpbms6XG4gICAgICByZXN1bHQubmFtZSA9IFwiaXNQZXJtYUxpbmtcIjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgUnNzMkZpZWxkcy5UdGw6XG4gICAgY2FzZSBSc3MyRmllbGRzLkxlbmd0aDpcbiAgICBjYXNlIFJzczJGaWVsZHMuV2lkdGg6XG4gICAgY2FzZSBSc3MyRmllbGRzLkhlaWdodDpcbiAgICAgIHJlc3VsdC5pc0ludCA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczJGaWVsZHMuSG91cjpcbiAgICAgIHJlc3VsdC5pc0FycmF5ID0gdHJ1ZTtcbiAgICAgIHJlc3VsdC5pc0ludCA9IHRydWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFJzczJGaWVsZHMuRGF5OlxuICAgICAgcmVzdWx0LmlzQXJyYXkgPSB0cnVlO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnN0IHN1Yk5hbWVzcGFjZVJlc29sdmVycyA9IFtcbiAgICAgICAgcmVzb2x2ZUR1YmxpbkNvcmVGaWVsZCxcbiAgICAgICAgcmVzb2x2ZU1lZGlhUnNzRmllbGQsXG4gICAgICBdO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdWJOYW1lc3BhY2VSZXNvbHZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgcmVzb2x2ZXJSZXN1bHQgPSBzdWJOYW1lc3BhY2VSZXNvbHZlcnNbaV0obmFtZSk7XG4gICAgICAgIGlmIChyZXNvbHZlclJlc3VsdC5pc0hhbmRsZWQpIHtcbiAgICAgICAgICBpZiAocmVzb2x2ZXJSZXN1bHQuaXNBcnJheSkge1xuICAgICAgICAgICAgcmVzdWx0LmlzQXJyYXkgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChyZXNvbHZlclJlc3VsdC5pc0RhdGUpIHtcbiAgICAgICAgICAgIHJlc3VsdC5pc0RhdGUgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChyZXNvbHZlclJlc3VsdC5pc0ludCkge1xuICAgICAgICAgICAgcmVzdWx0LmlzSW50ID0gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocmVzb2x2ZXJSZXN1bHQuaXNGbG9hdCkge1xuICAgICAgICAgICAgcmVzdWx0LmlzRmxvYXQgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc3VsdC5uYW1lID0gcmVzb2x2ZXJSZXN1bHQubmFtZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcbiJdfQ==