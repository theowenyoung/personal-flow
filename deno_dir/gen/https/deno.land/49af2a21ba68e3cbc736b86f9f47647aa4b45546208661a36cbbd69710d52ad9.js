import * as path from "../path/mod.ts";
import { ensureDir, ensureDirSync } from "./ensure_dir.ts";
import { exists, existsSync } from "./exists.ts";
import { getFileInfoType } from "./_util.ts";
import { isWindows } from "../_util/os.ts";
export async function ensureSymlink(src, dest) {
    const srcStatInfo = await Deno.lstat(src);
    const srcFilePathType = getFileInfoType(srcStatInfo);
    if (await exists(dest)) {
        const destStatInfo = await Deno.lstat(dest);
        const destFilePathType = getFileInfoType(destStatInfo);
        if (destFilePathType !== "symlink") {
            throw new Error(`Ensure path exists, expected 'symlink', got '${destFilePathType}'`);
        }
        return;
    }
    await ensureDir(path.dirname(dest));
    const options = isWindows
        ? {
            type: srcFilePathType === "dir" ? "dir" : "file",
        }
        : undefined;
    await Deno.symlink(src, dest, options);
}
export function ensureSymlinkSync(src, dest) {
    const srcStatInfo = Deno.lstatSync(src);
    const srcFilePathType = getFileInfoType(srcStatInfo);
    if (existsSync(dest)) {
        const destStatInfo = Deno.lstatSync(dest);
        const destFilePathType = getFileInfoType(destStatInfo);
        if (destFilePathType !== "symlink") {
            throw new Error(`Ensure path exists, expected 'symlink', got '${destFilePathType}'`);
        }
        return;
    }
    ensureDirSync(path.dirname(dest));
    const options = isWindows
        ? {
            type: srcFilePathType === "dir" ? "dir" : "file",
        }
        : undefined;
    Deno.symlinkSync(src, dest, options);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5zdXJlX3N5bWxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbnN1cmVfc3ltbGluay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEtBQUssSUFBSSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFTM0MsTUFBTSxDQUFDLEtBQUssVUFBVSxhQUFhLENBQUMsR0FBVyxFQUFFLElBQVk7SUFDM0QsTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUVyRCxJQUFJLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3RCLE1BQU0sWUFBWSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxJQUFJLGdCQUFnQixLQUFLLFNBQVMsRUFBRTtZQUNsQyxNQUFNLElBQUksS0FBSyxDQUNiLGdEQUFnRCxnQkFBZ0IsR0FBRyxDQUNwRSxDQUFDO1NBQ0g7UUFDRCxPQUFPO0tBQ1I7SUFFRCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFcEMsTUFBTSxPQUFPLEdBQW9DLFNBQVM7UUFDeEQsQ0FBQyxDQUFDO1lBQ0EsSUFBSSxFQUFFLGVBQWUsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTTtTQUNqRDtRQUNELENBQUMsQ0FBQyxTQUFTLENBQUM7SUFFZCxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBU0QsTUFBTSxVQUFVLGlCQUFpQixDQUFDLEdBQVcsRUFBRSxJQUFZO0lBQ3pELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRXJELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3BCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7WUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FDYixnREFBZ0QsZ0JBQWdCLEdBQUcsQ0FDcEUsQ0FBQztTQUNIO1FBQ0QsT0FBTztLQUNSO0lBRUQsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVsQyxNQUFNLE9BQU8sR0FBb0MsU0FBUztRQUN4RCxDQUFDLENBQUM7WUFDQSxJQUFJLEVBQUUsZUFBZSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNO1NBQ2pEO1FBQ0QsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUVkLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcIi4uL3BhdGgvbW9kLnRzXCI7XG5pbXBvcnQgeyBlbnN1cmVEaXIsIGVuc3VyZURpclN5bmMgfSBmcm9tIFwiLi9lbnN1cmVfZGlyLnRzXCI7XG5pbXBvcnQgeyBleGlzdHMsIGV4aXN0c1N5bmMgfSBmcm9tIFwiLi9leGlzdHMudHNcIjtcbmltcG9ydCB7IGdldEZpbGVJbmZvVHlwZSB9IGZyb20gXCIuL191dGlsLnRzXCI7XG5pbXBvcnQgeyBpc1dpbmRvd3MgfSBmcm9tIFwiLi4vX3V0aWwvb3MudHNcIjtcblxuLyoqXG4gKiBFbnN1cmVzIHRoYXQgdGhlIGxpbmsgZXhpc3RzLlxuICogSWYgdGhlIGRpcmVjdG9yeSBzdHJ1Y3R1cmUgZG9lcyBub3QgZXhpc3QsIGl0IGlzIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIHNyYyB0aGUgc291cmNlIGZpbGUgcGF0aFxuICogQHBhcmFtIGRlc3QgdGhlIGRlc3RpbmF0aW9uIGxpbmsgcGF0aFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5zdXJlU3ltbGluayhzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKSB7XG4gIGNvbnN0IHNyY1N0YXRJbmZvID0gYXdhaXQgRGVuby5sc3RhdChzcmMpO1xuICBjb25zdCBzcmNGaWxlUGF0aFR5cGUgPSBnZXRGaWxlSW5mb1R5cGUoc3JjU3RhdEluZm8pO1xuXG4gIGlmIChhd2FpdCBleGlzdHMoZGVzdCkpIHtcbiAgICBjb25zdCBkZXN0U3RhdEluZm8gPSBhd2FpdCBEZW5vLmxzdGF0KGRlc3QpO1xuICAgIGNvbnN0IGRlc3RGaWxlUGF0aFR5cGUgPSBnZXRGaWxlSW5mb1R5cGUoZGVzdFN0YXRJbmZvKTtcbiAgICBpZiAoZGVzdEZpbGVQYXRoVHlwZSAhPT0gXCJzeW1saW5rXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEVuc3VyZSBwYXRoIGV4aXN0cywgZXhwZWN0ZWQgJ3N5bWxpbmsnLCBnb3QgJyR7ZGVzdEZpbGVQYXRoVHlwZX0nYCxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGF3YWl0IGVuc3VyZURpcihwYXRoLmRpcm5hbWUoZGVzdCkpO1xuXG4gIGNvbnN0IG9wdGlvbnM6IERlbm8uU3ltbGlua09wdGlvbnMgfCB1bmRlZmluZWQgPSBpc1dpbmRvd3NcbiAgICA/IHtcbiAgICAgIHR5cGU6IHNyY0ZpbGVQYXRoVHlwZSA9PT0gXCJkaXJcIiA/IFwiZGlyXCIgOiBcImZpbGVcIixcbiAgICB9XG4gICAgOiB1bmRlZmluZWQ7XG5cbiAgYXdhaXQgRGVuby5zeW1saW5rKHNyYywgZGVzdCwgb3B0aW9ucyk7XG59XG5cbi8qKlxuICogRW5zdXJlcyB0aGF0IHRoZSBsaW5rIGV4aXN0cy5cbiAqIElmIHRoZSBkaXJlY3Rvcnkgc3RydWN0dXJlIGRvZXMgbm90IGV4aXN0LCBpdCBpcyBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBzcmMgdGhlIHNvdXJjZSBmaWxlIHBhdGhcbiAqIEBwYXJhbSBkZXN0IHRoZSBkZXN0aW5hdGlvbiBsaW5rIHBhdGhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZVN5bWxpbmtTeW5jKHNyYzogc3RyaW5nLCBkZXN0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3Qgc3JjU3RhdEluZm8gPSBEZW5vLmxzdGF0U3luYyhzcmMpO1xuICBjb25zdCBzcmNGaWxlUGF0aFR5cGUgPSBnZXRGaWxlSW5mb1R5cGUoc3JjU3RhdEluZm8pO1xuXG4gIGlmIChleGlzdHNTeW5jKGRlc3QpKSB7XG4gICAgY29uc3QgZGVzdFN0YXRJbmZvID0gRGVuby5sc3RhdFN5bmMoZGVzdCk7XG4gICAgY29uc3QgZGVzdEZpbGVQYXRoVHlwZSA9IGdldEZpbGVJbmZvVHlwZShkZXN0U3RhdEluZm8pO1xuICAgIGlmIChkZXN0RmlsZVBhdGhUeXBlICE9PSBcInN5bWxpbmtcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRW5zdXJlIHBhdGggZXhpc3RzLCBleHBlY3RlZCAnc3ltbGluaycsIGdvdCAnJHtkZXN0RmlsZVBhdGhUeXBlfSdgLFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZW5zdXJlRGlyU3luYyhwYXRoLmRpcm5hbWUoZGVzdCkpO1xuXG4gIGNvbnN0IG9wdGlvbnM6IERlbm8uU3ltbGlua09wdGlvbnMgfCB1bmRlZmluZWQgPSBpc1dpbmRvd3NcbiAgICA/IHtcbiAgICAgIHR5cGU6IHNyY0ZpbGVQYXRoVHlwZSA9PT0gXCJkaXJcIiA/IFwiZGlyXCIgOiBcImZpbGVcIixcbiAgICB9XG4gICAgOiB1bmRlZmluZWQ7XG5cbiAgRGVuby5zeW1saW5rU3luYyhzcmMsIGRlc3QsIG9wdGlvbnMpO1xufVxuIl19