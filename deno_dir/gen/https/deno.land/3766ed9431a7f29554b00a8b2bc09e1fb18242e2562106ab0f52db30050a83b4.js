import { State } from "../state.ts";
export class LoaderState extends State {
    input;
    documents = [];
    length;
    lineIndent = 0;
    lineStart = 0;
    position = 0;
    line = 0;
    filename;
    onWarning;
    legacy;
    json;
    listener;
    implicitTypes;
    typeMap;
    version;
    checkLineBreaks;
    tagMap;
    anchorMap;
    tag;
    anchor;
    kind;
    result = "";
    constructor(input, { filename, schema, onWarning, legacy = false, json = false, listener = null, }) {
        super(schema);
        this.input = input;
        this.filename = filename;
        this.onWarning = onWarning;
        this.legacy = legacy;
        this.json = json;
        this.listener = listener;
        this.implicitTypes = this.schema.compiledImplicit;
        this.typeMap = this.schema.compiledTypeMap;
        this.length = input.length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVyX3N0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZGVyX3N0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFvQnBDLE1BQU0sT0FBTyxXQUFZLFNBQVEsS0FBSztJQXlCM0I7SUF4QkYsU0FBUyxHQUFVLEVBQUUsQ0FBQztJQUN0QixNQUFNLENBQVM7SUFDZixVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNkLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDYixJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ1QsUUFBUSxDQUFVO0lBQ2xCLFNBQVMsQ0FBNEI7SUFDckMsTUFBTSxDQUFVO0lBQ2hCLElBQUksQ0FBVTtJQUNkLFFBQVEsQ0FBcUM7SUFDN0MsYUFBYSxDQUFTO0lBQ3RCLE9BQU8sQ0FBVTtJQUVqQixPQUFPLENBQWlCO0lBQ3hCLGVBQWUsQ0FBVztJQUMxQixNQUFNLENBQWU7SUFDckIsU0FBUyxDQUFlO0lBQ3hCLEdBQUcsQ0FBaUI7SUFDcEIsTUFBTSxDQUFpQjtJQUN2QixJQUFJLENBQWlCO0lBQ3JCLE1BQU0sR0FBc0IsRUFBRSxDQUFDO0lBRXRDLFlBQ1MsS0FBYSxFQUNwQixFQUNFLFFBQVEsRUFDUixNQUFNLEVBQ04sU0FBUyxFQUNULE1BQU0sR0FBRyxLQUFLLEVBQ2QsSUFBSSxHQUFHLEtBQUssRUFDWixRQUFRLEdBQUcsSUFBSSxHQUNJO1FBRXJCLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQVZQLFVBQUssR0FBTCxLQUFLLENBQVE7UUFXcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFekIsSUFBSSxDQUFDLGFBQWEsR0FBSSxJQUFJLENBQUMsTUFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQztRQUM5RCxJQUFJLENBQUMsT0FBTyxHQUFJLElBQUksQ0FBQyxNQUFpQixDQUFDLGVBQWUsQ0FBQztRQUV2RCxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDN0IsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUG9ydGVkIGZyb20ganMteWFtbCB2My4xMy4xOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2NvbW1pdC82NjVhYWRkYTQyMzQ5ZGNhZTg2OWYxMjA0MGQ5YjEwZWYxOGQxMmRhXG4vLyBDb3B5cmlnaHQgMjAxMS0yMDE1IGJ5IFZpdGFseSBQdXpyaW4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHR5cGUgeyBZQU1MRXJyb3IgfSBmcm9tIFwiLi4vZXJyb3IudHNcIjtcbmltcG9ydCB0eXBlIHsgU2NoZW1hLCBTY2hlbWFEZWZpbml0aW9uLCBUeXBlTWFwIH0gZnJvbSBcIi4uL3NjaGVtYS50c1wiO1xuaW1wb3J0IHsgU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUudHNcIjtcbmltcG9ydCB0eXBlIHsgVHlwZSB9IGZyb20gXCIuLi90eXBlLnRzXCI7XG5pbXBvcnQgdHlwZSB7IEFueSwgQXJyYXlPYmplY3QgfSBmcm9tIFwiLi4vdXRpbHMudHNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBMb2FkZXJTdGF0ZU9wdGlvbnMge1xuICBsZWdhY3k/OiBib29sZWFuO1xuICBsaXN0ZW5lcj86ICgoLi4uYXJnczogQW55W10pID0+IHZvaWQpIHwgbnVsbDtcbiAgLyoqIHN0cmluZyB0byBiZSB1c2VkIGFzIGEgZmlsZSBwYXRoIGluIGVycm9yL3dhcm5pbmcgbWVzc2FnZXMuICovXG4gIGZpbGVuYW1lPzogc3RyaW5nO1xuICAvKiogc3BlY2lmaWVzIGEgc2NoZW1hIHRvIHVzZS4gKi9cbiAgc2NoZW1hPzogU2NoZW1hRGVmaW5pdGlvbjtcbiAgLyoqIGNvbXBhdGliaWxpdHkgd2l0aCBKU09OLnBhcnNlIGJlaGF2aW91ci4gKi9cbiAganNvbj86IGJvb2xlYW47XG4gIC8qKiBmdW5jdGlvbiB0byBjYWxsIG9uIHdhcm5pbmcgbWVzc2FnZXMuICovXG4gIG9uV2FybmluZz8odGhpczogbnVsbCwgZT86IFlBTUxFcnJvcik6IHZvaWQ7XG59XG5cbi8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG5leHBvcnQgdHlwZSBSZXN1bHRUeXBlID0gYW55W10gfCBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgc3RyaW5nO1xuXG5leHBvcnQgY2xhc3MgTG9hZGVyU3RhdGUgZXh0ZW5kcyBTdGF0ZSB7XG4gIHB1YmxpYyBkb2N1bWVudHM6IEFueVtdID0gW107XG4gIHB1YmxpYyBsZW5ndGg6IG51bWJlcjtcbiAgcHVibGljIGxpbmVJbmRlbnQgPSAwO1xuICBwdWJsaWMgbGluZVN0YXJ0ID0gMDtcbiAgcHVibGljIHBvc2l0aW9uID0gMDtcbiAgcHVibGljIGxpbmUgPSAwO1xuICBwdWJsaWMgZmlsZW5hbWU/OiBzdHJpbmc7XG4gIHB1YmxpYyBvbldhcm5pbmc/OiAoLi4uYXJnczogQW55W10pID0+IHZvaWQ7XG4gIHB1YmxpYyBsZWdhY3k6IGJvb2xlYW47XG4gIHB1YmxpYyBqc29uOiBib29sZWFuO1xuICBwdWJsaWMgbGlzdGVuZXI/OiAoKC4uLmFyZ3M6IEFueVtdKSA9PiB2b2lkKSB8IG51bGw7XG4gIHB1YmxpYyBpbXBsaWNpdFR5cGVzOiBUeXBlW107XG4gIHB1YmxpYyB0eXBlTWFwOiBUeXBlTWFwO1xuXG4gIHB1YmxpYyB2ZXJzaW9uPzogc3RyaW5nIHwgbnVsbDtcbiAgcHVibGljIGNoZWNrTGluZUJyZWFrcz86IGJvb2xlYW47XG4gIHB1YmxpYyB0YWdNYXA/OiBBcnJheU9iamVjdDtcbiAgcHVibGljIGFuY2hvck1hcD86IEFycmF5T2JqZWN0O1xuICBwdWJsaWMgdGFnPzogc3RyaW5nIHwgbnVsbDtcbiAgcHVibGljIGFuY2hvcj86IHN0cmluZyB8IG51bGw7XG4gIHB1YmxpYyBraW5kPzogc3RyaW5nIHwgbnVsbDtcbiAgcHVibGljIHJlc3VsdDogUmVzdWx0VHlwZSB8IG51bGwgPSBcIlwiO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBpbnB1dDogc3RyaW5nLFxuICAgIHtcbiAgICAgIGZpbGVuYW1lLFxuICAgICAgc2NoZW1hLFxuICAgICAgb25XYXJuaW5nLFxuICAgICAgbGVnYWN5ID0gZmFsc2UsXG4gICAgICBqc29uID0gZmFsc2UsXG4gICAgICBsaXN0ZW5lciA9IG51bGwsXG4gICAgfTogTG9hZGVyU3RhdGVPcHRpb25zLFxuICApIHtcbiAgICBzdXBlcihzY2hlbWEpO1xuICAgIHRoaXMuZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgICB0aGlzLm9uV2FybmluZyA9IG9uV2FybmluZztcbiAgICB0aGlzLmxlZ2FjeSA9IGxlZ2FjeTtcbiAgICB0aGlzLmpzb24gPSBqc29uO1xuICAgIHRoaXMubGlzdGVuZXIgPSBsaXN0ZW5lcjtcblxuICAgIHRoaXMuaW1wbGljaXRUeXBlcyA9ICh0aGlzLnNjaGVtYSBhcyBTY2hlbWEpLmNvbXBpbGVkSW1wbGljaXQ7XG4gICAgdGhpcy50eXBlTWFwID0gKHRoaXMuc2NoZW1hIGFzIFNjaGVtYSkuY29tcGlsZWRUeXBlTWFwO1xuXG4gICAgdGhpcy5sZW5ndGggPSBpbnB1dC5sZW5ndGg7XG4gIH1cbn1cbiJdfQ==