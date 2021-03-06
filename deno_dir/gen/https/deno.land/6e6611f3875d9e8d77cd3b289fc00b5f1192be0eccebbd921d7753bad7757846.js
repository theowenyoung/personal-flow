export const isValidURL = (text) => {
    let url;
    try {
        url = new URL(text);
    }
    catch (_) {
        return false;
    }
    return ["https:", "http:", "ftp://", "mailto:", "news://"].includes(url.protocol);
};
export const copyValueFields = (fields, source, target) => {
    fields.forEach((fieldName) => {
        const field = source[fieldName];
        if (field) {
            target[fieldName] = Array.isArray(field)
                ? field.map((x) => (x?.value || x))
                : (field?.value || field);
        }
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvcnNzQDAuNS41L3NyYy91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ3pDLElBQUksR0FBUSxDQUFDO0lBQ2IsSUFBSTtRQUNGLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNyQjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUNELE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUNqRSxHQUFHLENBQUMsUUFBUSxDQUNiLENBQUM7QUFDSixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUFnQixFQUFFLE1BQVcsRUFBRSxNQUFXLEVBQUUsRUFBRTtJQUM1RSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBaUIsRUFBRSxFQUFFO1FBQ25DLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoQyxJQUFJLEtBQUssRUFBRTtZQUNULE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbkMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQztTQUM3QjtJQUNILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGlzVmFsaWRVUkwgPSAodGV4dDogc3RyaW5nKSA9PiB7XG4gIGxldCB1cmw6IFVSTDtcbiAgdHJ5IHtcbiAgICB1cmwgPSBuZXcgVVJMKHRleHQpO1xuICB9IGNhdGNoIChfKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBbXCJodHRwczpcIiwgXCJodHRwOlwiLCBcImZ0cDovL1wiLCBcIm1haWx0bzpcIiwgXCJuZXdzOi8vXCJdLmluY2x1ZGVzKFxuICAgIHVybC5wcm90b2NvbCxcbiAgKTtcbn07XG5cbmV4cG9ydCBjb25zdCBjb3B5VmFsdWVGaWVsZHMgPSAoZmllbGRzOiBzdHJpbmdbXSwgc291cmNlOiBhbnksIHRhcmdldDogYW55KSA9PiB7XG4gIGZpZWxkcy5mb3JFYWNoKChmaWVsZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGZpZWxkID0gc291cmNlW2ZpZWxkTmFtZV07XG4gICAgaWYgKGZpZWxkKSB7XG4gICAgICB0YXJnZXRbZmllbGROYW1lXSA9IEFycmF5LmlzQXJyYXkoZmllbGQpXG4gICAgICAgID8gZmllbGQubWFwKCh4KSA9PiAoeD8udmFsdWUgfHwgeCkpXG4gICAgICAgIDogKGZpZWxkPy52YWx1ZSB8fCBmaWVsZCk7XG4gICAgfVxuICB9KTtcbn07XG4iXX0=