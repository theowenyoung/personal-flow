import { parseFeed } from "https://deno.land/x/rss@0.5.5/mod.ts";
export default async function (url, options) {
    const feedResult = await fetch(url, options);
    const xml = await feedResult.text();
    const feed = await parseFeed(xml);
    return feed.entries;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHR0cHM6Ly9kZW5vLmxhbmQveC9kZW5vZmxvd0AwLjAuMTkvc291cmNlcy9yc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxXQUNsQixHQUFXLEVBQ1gsT0FBb0I7SUFFcEIsTUFBTSxVQUFVLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLE1BQU0sR0FBRyxHQUFHLE1BQU0sVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUN0QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFyc2VGZWVkIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3gvcnNzQDAuNS41L21vZC50c1wiO1xuaW1wb3J0IHR5cGUgeyBGZWVkRW50cnkgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQveC9yc3NAMC41LjUvc3JjL3R5cGVzL2ZlZWQudHNcIjtcbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIChcbiAgdXJsOiBzdHJpbmcsXG4gIG9wdGlvbnM6IFJlcXVlc3RJbml0LFxuKTogUHJvbWlzZTxGZWVkRW50cnlbXT4ge1xuICBjb25zdCBmZWVkUmVzdWx0ID0gYXdhaXQgZmV0Y2godXJsLCBvcHRpb25zKTtcbiAgY29uc3QgeG1sID0gYXdhaXQgZmVlZFJlc3VsdC50ZXh0KCk7XG4gIGNvbnN0IGZlZWQgPSBhd2FpdCBwYXJzZUZlZWQoeG1sKTtcbiAgcmV0dXJuIGZlZWQuZW50cmllcztcbn1cbiJdfQ==