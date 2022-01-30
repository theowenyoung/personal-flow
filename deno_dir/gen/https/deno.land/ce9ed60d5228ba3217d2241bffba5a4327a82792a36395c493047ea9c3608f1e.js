import { SlashFields } from "../types/fields/mod.ts";
export const resolveSlashField = (name) => {
    const result = {
        name,
        isHandled: true,
        isArray: false,
        isInt: false,
        isFloat: false,
        isDate: false,
    };
    switch (name) {
        case SlashFields.Comments:
            result.isInt = true;
            break;
        default:
            result.isHandled = false;
            break;
    }
    return result;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xhc2hfcmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodHRwczovL2Rlbm8ubGFuZC94L3Jzc0AwLjUuNS9zcmMvcmVzb2x2ZXJzL3NsYXNoX3Jlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVyRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxDQUMvQixJQUFZLEVBQ0ksRUFBRTtJQUNsQixNQUFNLE1BQU0sR0FBRztRQUNiLElBQUk7UUFDSixTQUFTLEVBQUUsSUFBSTtRQUNmLE9BQU8sRUFBRSxLQUFLO1FBQ2QsS0FBSyxFQUFFLEtBQUs7UUFDWixPQUFPLEVBQUUsS0FBSztRQUNkLE1BQU0sRUFBRSxLQUFLO0tBQ0ksQ0FBQztJQUVwQixRQUFRLElBQUksRUFBRTtRQUNaLEtBQUssV0FBVyxDQUFDLFFBQVE7WUFDdkIsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7WUFDcEIsTUFBTTtRQUNSO1lBQ0UsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDekIsTUFBTTtLQUNUO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBSZXNvbHZlclJlc3VsdCB9IGZyb20gXCIuL3R5cGVzL3Jlc29sdmVyX3Jlc3VsdC50c1wiO1xuaW1wb3J0IHsgU2xhc2hGaWVsZHMgfSBmcm9tIFwiLi4vdHlwZXMvZmllbGRzL21vZC50c1wiO1xuXG5leHBvcnQgY29uc3QgcmVzb2x2ZVNsYXNoRmllbGQgPSAoXG4gIG5hbWU6IHN0cmluZyxcbik6IFJlc29sdmVyUmVzdWx0ID0+IHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIG5hbWUsXG4gICAgaXNIYW5kbGVkOiB0cnVlLFxuICAgIGlzQXJyYXk6IGZhbHNlLFxuICAgIGlzSW50OiBmYWxzZSxcbiAgICBpc0Zsb2F0OiBmYWxzZSxcbiAgICBpc0RhdGU6IGZhbHNlLFxuICB9IGFzIFJlc29sdmVyUmVzdWx0O1xuXG4gIHN3aXRjaCAobmFtZSkge1xuICAgIGNhc2UgU2xhc2hGaWVsZHMuQ29tbWVudHM6XG4gICAgICByZXN1bHQuaXNJbnQgPSB0cnVlO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJlc3VsdC5pc0hhbmRsZWQgPSBmYWxzZTtcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iXX0=