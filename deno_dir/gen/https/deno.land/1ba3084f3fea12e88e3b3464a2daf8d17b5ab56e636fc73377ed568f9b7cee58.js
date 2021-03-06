const decoder = new TextDecoder();
export async function getStdinBuffer(options = {}) {
    const bytes = [];
    while (true) {
        const buffer = new Uint8Array(1);
        const readStatus = await Deno.stdin.read(buffer);
        if (readStatus === null || readStatus === 0) {
            break;
        }
        const byte = buffer[0];
        if (byte === 10 && options.exitOnEnter !== false) {
            break;
        }
        bytes.push(byte);
    }
    return Uint8Array.from(bytes);
}
export async function getStdin(options = {}) {
    const buffer = await getStdinBuffer(options);
    return decoder.decode(buffer);
}
export function getStdinBufferSync(options = {}) {
    const bytes = [];
    while (true) {
        const buffer = new Uint8Array(1);
        const readStatus = Deno.stdin.readSync(buffer);
        if (readStatus === null || readStatus === 0) {
            break;
        }
        const byte = buffer[0];
        if (byte === 10 && options.exitOnEnter !== false) {
            break;
        }
        bytes.push(byte);
    }
    return Uint8Array.from(bytes);
}
export function getStdinSync(options = {}) {
    const buffer = getStdinBufferSync(options);
    return decoder.decode(buffer);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUFhbEMsTUFBTSxDQUFDLEtBQUssVUFBVSxjQUFjLENBQ2xDLFVBQTJCLEVBQUU7SUFFN0IsTUFBTSxLQUFLLEdBQWEsRUFBRSxDQUFDO0lBRTNCLE9BQU8sSUFBSSxFQUFFO1FBRVgsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxVQUFVLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUdqRCxJQUFJLFVBQVUsS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRTtZQUMzQyxNQUFNO1NBQ1A7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFHdkIsSUFBSSxJQUFJLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssS0FBSyxFQUFFO1lBQ2hELE1BQU07U0FDUDtRQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDbEI7SUFFRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUtELE1BQU0sQ0FBQyxLQUFLLFVBQVUsUUFBUSxDQUFDLFVBQTJCLEVBQUU7SUFDMUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFN0MsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFLRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsVUFBMkIsRUFBRTtJQUM5RCxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7SUFFM0IsT0FBTyxJQUFJLEVBQUU7UUFFWCxNQUFNLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUcvQyxJQUFJLFVBQVUsS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRTtZQUMzQyxNQUFNO1NBQ1A7UUFFRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFHdkIsSUFBSSxJQUFJLEtBQUssRUFBRSxJQUFJLE9BQU8sQ0FBQyxXQUFXLEtBQUssS0FBSyxFQUFFO1lBQ2hELE1BQU07U0FDUDtRQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDbEI7SUFFRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUtELE1BQU0sVUFBVSxZQUFZLENBQUMsVUFBMkIsRUFBRTtJQUN4RCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUzQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDaEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKTtcblxuZXhwb3J0IGludGVyZmFjZSBHZXRTdGRpbk9wdGlvbnMge1xuICAvKipcbiAgICogSWYgYHRydWVgLCBzdG9wIHJlYWRpbmcgdGhlIHN0ZGluIG9uY2UgYSBuZXdsaW5lIGNoYXIgaXMgcmVhY2hlZFxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBleGl0T25FbnRlcj86IGJvb2xlYW47XG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBVaW50OEFycmF5IGZyb20gc3RhbmRhcmQgaW5wdXRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFN0ZGluQnVmZmVyKFxuICBvcHRpb25zOiBHZXRTdGRpbk9wdGlvbnMgPSB7fVxuKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IGJ5dGVzOiBudW1iZXJbXSA9IFtdO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgLy8gUmVhZCBieXRlcyBvbmUgYnkgb25lXG4gICAgY29uc3QgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoMSk7XG4gICAgY29uc3QgcmVhZFN0YXR1cyA9IGF3YWl0IERlbm8uc3RkaW4ucmVhZChidWZmZXIpO1xuXG4gICAgLy8gRm91bmQgRU9MXG4gICAgaWYgKHJlYWRTdGF0dXMgPT09IG51bGwgfHwgcmVhZFN0YXR1cyA9PT0gMCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgY29uc3QgYnl0ZSA9IGJ1ZmZlclswXTtcblxuICAgIC8vIE9uIEVudGVyLCBleGl0IGlmIHdlIGFyZSBzdXBwb3NlZCB0b1xuICAgIGlmIChieXRlID09PSAxMCAmJiBvcHRpb25zLmV4aXRPbkVudGVyICE9PSBmYWxzZSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgYnl0ZXMucHVzaChieXRlKTtcbiAgfVxuXG4gIHJldHVybiBVaW50OEFycmF5LmZyb20oYnl0ZXMpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBzdHJpbmcgZnJvbSBzdGFuZGFyZCBpbnB1dFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0U3RkaW4ob3B0aW9uczogR2V0U3RkaW5PcHRpb25zID0ge30pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBidWZmZXIgPSBhd2FpdCBnZXRTdGRpbkJ1ZmZlcihvcHRpb25zKTtcblxuICByZXR1cm4gZGVjb2Rlci5kZWNvZGUoYnVmZmVyKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGFuIFVpbnQ4QXJyYXkgZnJvbSBzdGFuZGFyZCBpbnB1dCBpbiBzeW5jIG1vZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN0ZGluQnVmZmVyU3luYyhvcHRpb25zOiBHZXRTdGRpbk9wdGlvbnMgPSB7fSk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBieXRlczogbnVtYmVyW10gPSBbXTtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIC8vIFJlYWQgYnl0ZXMgb25lIGJ5IG9uZVxuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBVaW50OEFycmF5KDEpO1xuICAgIGNvbnN0IHJlYWRTdGF0dXMgPSBEZW5vLnN0ZGluLnJlYWRTeW5jKGJ1ZmZlcik7XG5cbiAgICAvLyBGb3VuZCBFT0xcbiAgICBpZiAocmVhZFN0YXR1cyA9PT0gbnVsbCB8fCByZWFkU3RhdHVzID09PSAwKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjb25zdCBieXRlID0gYnVmZmVyWzBdO1xuXG4gICAgLy8gT24gRW50ZXIsIGV4aXQgaWYgd2UgYXJlIHN1cHBvc2VkIHRvXG4gICAgaWYgKGJ5dGUgPT09IDEwICYmIG9wdGlvbnMuZXhpdE9uRW50ZXIgIT09IGZhbHNlKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBieXRlcy5wdXNoKGJ5dGUpO1xuICB9XG5cbiAgcmV0dXJuIFVpbnQ4QXJyYXkuZnJvbShieXRlcyk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIHN0cmluZyBmcm9tIHN0YW5kYXJkIGlucHV0IGluIHN5bmMgbW9kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RkaW5TeW5jKG9wdGlvbnM6IEdldFN0ZGluT3B0aW9ucyA9IHt9KTogc3RyaW5nIHtcbiAgY29uc3QgYnVmZmVyID0gZ2V0U3RkaW5CdWZmZXJTeW5jKG9wdGlvbnMpO1xuXG4gIHJldHVybiBkZWNvZGVyLmRlY29kZShidWZmZXIpO1xufVxuIl19