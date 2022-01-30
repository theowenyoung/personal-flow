import { Buffer } from "../io/buffer.ts";
const DEFAULT_CHUNK_SIZE = 16_640;
const DEFAULT_BUFFER_SIZE = 32 * 1024;
function isCloser(value) {
    return typeof value === "object" && value != null && "close" in value &&
        typeof value["close"] === "function";
}
export function readerFromIterable(iterable) {
    const iterator = iterable[Symbol.asyncIterator]?.() ??
        iterable[Symbol.iterator]?.();
    const buffer = new Buffer();
    return {
        async read(p) {
            if (buffer.length == 0) {
                const result = await iterator.next();
                if (result.done) {
                    return null;
                }
                else {
                    if (result.value.byteLength <= p.byteLength) {
                        p.set(result.value);
                        return result.value.byteLength;
                    }
                    p.set(result.value.subarray(0, p.byteLength));
                    await writeAll(buffer, result.value.subarray(p.byteLength));
                    return p.byteLength;
                }
            }
            else {
                const n = await buffer.read(p);
                if (n == null) {
                    return this.read(p);
                }
                return n;
            }
        },
    };
}
export function writerFromStreamWriter(streamWriter) {
    return {
        async write(p) {
            await streamWriter.ready;
            await streamWriter.write(p);
            return p.length;
        },
    };
}
export function readerFromStreamReader(streamReader) {
    const buffer = new Buffer();
    return {
        async read(p) {
            if (buffer.empty()) {
                const res = await streamReader.read();
                if (res.done) {
                    return null;
                }
                await writeAll(buffer, res.value);
            }
            return buffer.read(p);
        },
    };
}
export function writableStreamFromWriter(writer, options = {}) {
    const { autoClose = true } = options;
    return new WritableStream({
        async write(chunk, controller) {
            try {
                await writeAll(writer, chunk);
            }
            catch (e) {
                controller.error(e);
                if (isCloser(writer) && autoClose) {
                    writer.close();
                }
            }
        },
        close() {
            if (isCloser(writer) && autoClose) {
                writer.close();
            }
        },
        abort() {
            if (isCloser(writer) && autoClose) {
                writer.close();
            }
        },
    });
}
export function readableStreamFromIterable(iterable) {
    const iterator = iterable[Symbol.asyncIterator]?.() ??
        iterable[Symbol.iterator]?.();
    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await iterator.next();
            if (done) {
                controller.close();
            }
            else {
                controller.enqueue(value);
            }
        },
        async cancel(reason) {
            if (typeof iterator.throw == "function") {
                try {
                    await iterator.throw(reason);
                }
                catch { }
            }
        },
    });
}
export function readableStreamFromReader(reader, options = {}) {
    const { autoClose = true, chunkSize = DEFAULT_CHUNK_SIZE, strategy, } = options;
    return new ReadableStream({
        async pull(controller) {
            const chunk = new Uint8Array(chunkSize);
            try {
                const read = await reader.read(chunk);
                if (read === null) {
                    if (isCloser(reader) && autoClose) {
                        reader.close();
                    }
                    controller.close();
                    return;
                }
                controller.enqueue(chunk.subarray(0, read));
            }
            catch (e) {
                controller.error(e);
                if (isCloser(reader)) {
                    reader.close();
                }
            }
        },
        cancel() {
            if (isCloser(reader) && autoClose) {
                reader.close();
            }
        },
    }, strategy);
}
export async function readAll(r) {
    const buf = new Buffer();
    await buf.readFrom(r);
    return buf.bytes();
}
export function readAllSync(r) {
    const buf = new Buffer();
    buf.readFromSync(r);
    return buf.bytes();
}
export async function writeAll(w, arr) {
    let nwritten = 0;
    while (nwritten < arr.length) {
        nwritten += await w.write(arr.subarray(nwritten));
    }
}
export function writeAllSync(w, arr) {
    let nwritten = 0;
    while (nwritten < arr.length) {
        nwritten += w.writeSync(arr.subarray(nwritten));
    }
}
export async function* iterateReader(r, options) {
    const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
    const b = new Uint8Array(bufSize);
    while (true) {
        const result = await r.read(b);
        if (result === null) {
            break;
        }
        yield b.subarray(0, result);
    }
}
export function* iterateReaderSync(r, options) {
    const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
    const b = new Uint8Array(bufSize);
    while (true) {
        const result = r.readSync(b);
        if (result === null) {
            break;
        }
        yield b.subarray(0, result);
    }
}
export async function copy(src, dst, options) {
    let n = 0;
    const bufSize = options?.bufSize ?? DEFAULT_BUFFER_SIZE;
    const b = new Uint8Array(bufSize);
    let gotEOF = false;
    while (gotEOF === false) {
        const result = await src.read(b);
        if (result === null) {
            gotEOF = true;
        }
        else {
            let nwritten = 0;
            while (nwritten < result) {
                nwritten += await dst.write(b.subarray(nwritten, result));
            }
            n += nwritten;
        }
    }
    return n;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVyc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnZlcnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXpDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDO0FBQ2xDLE1BQU0sbUJBQW1CLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUV0QyxTQUFTLFFBQVEsQ0FBQyxLQUFjO0lBQzlCLE9BQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUs7UUFFbkUsT0FBUSxLQUE2QixDQUFDLE9BQU8sQ0FBQyxLQUFLLFVBQVUsQ0FBQztBQUNsRSxDQUFDO0FBdUJELE1BQU0sVUFBVSxrQkFBa0IsQ0FDaEMsUUFBMEQ7SUFFMUQsTUFBTSxRQUFRLEdBQ1gsUUFBc0MsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRTtRQUM5RCxRQUFpQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDNUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUM1QixPQUFPO1FBQ0wsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFhO1lBQ3RCLElBQUksTUFBTSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNyQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUU7b0JBQ2YsT0FBTyxJQUFJLENBQUM7aUJBQ2I7cUJBQU07b0JBQ0wsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFO3dCQUMzQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDcEIsT0FBTyxNQUFNLENBQUMs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Q0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QixJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7WUFDbkIsTUFBTTtTQUNQO1FBRUQsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztLQUM3QjtBQUNILENBQUM7QUFtQkQsTUFBTSxDQUFDLEtBQUssVUFBVSxJQUFJLENBQ3hCLEdBQWdCLEVBQ2hCLEdBQWdCLEVBQ2hCLE9BRUM7SUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDVixNQUFNLE9BQU8sR0FBRyxPQUFPLEVBQUUsT0FBTyxJQUFJLG1CQUFtQixDQUFDO0lBQ3hELE1BQU0sQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNuQixPQUFPLE1BQU0sS0FBSyxLQUFLLEVBQUU7UUFDdkIsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtZQUNuQixNQUFNLEdBQUcsSUFBSSxDQUFDO1NBQ2Y7YUFBTTtZQUNMLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztZQUNqQixPQUFPLFFBQVEsR0FBRyxNQUFNLEVBQUU7Z0JBQ3hCLFFBQVEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzthQUMzRDtZQUNELENBQUMsSUFBSSxRQUFRLENBQUM7U0FDZjtLQUNGO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMSB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSBcIi4uL2lvL2J1ZmZlci50c1wiO1xuXG5jb25zdCBERUZBVUxUX0NIVU5LX1NJWkUgPSAxNl82NDA7XG5jb25zdCBERUZBVUxUX0JVRkZFUl9TSVpFID0gMzIgKiAxMDI0O1xuXG5mdW5jdGlvbiBpc0Nsb3Nlcih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIERlbm8uQ2xvc2VyIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPSBudWxsICYmIFwiY2xvc2VcIiBpbiB2YWx1ZSAmJlxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgdHlwZW9mICh2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KVtcImNsb3NlXCJdID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbi8qKiBDcmVhdGUgYSBgRGVuby5SZWFkZXJgIGZyb20gYW4gaXRlcmFibGUgb2YgYFVpbnQ4QXJyYXlgcy5cbiAqXG4gKiBgYGB0c1xuICogICAgICBpbXBvcnQgeyByZWFkZXJGcm9tSXRlcmFibGUgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKiAgICAgIGltcG9ydCB7IHNlcnZlIH0gZnJvbSBcIi4uL2h0dHAvc2VydmVyX2xlZ2FjeS50c1wiO1xuICpcbiAqICAgICAgZm9yIGF3YWl0IChjb25zdCByZXF1ZXN0IG9mIHNlcnZlKHsgcG9ydDogODAwMCB9KSkge1xuICogICAgICAgIC8vIFNlcnZlci1zZW50IGV2ZW50czogU2VuZCBydW50aW1lIG1ldHJpY3MgdG8gdGhlIGNsaWVudCBldmVyeSBzZWNvbmQuXG4gKiAgICAgICAgcmVxdWVzdC5yZXNwb25kKHtcbiAqICAgICAgICAgIGhlYWRlcnM6IG5ldyBIZWFkZXJzKHsgXCJDb250ZW50LVR5cGVcIjogXCJ0ZXh0L2V2ZW50LXN0cmVhbVwiIH0pLFxuICogICAgICAgICAgYm9keTogcmVhZGVyRnJvbUl0ZXJhYmxlKChhc3luYyBmdW5jdGlvbiogKCkge1xuICogICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICogICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKTtcbiAqICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYGRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoRGVuby5tZXRyaWNzKCkpfVxcblxcbmA7XG4gKiAgICAgICAgICAgICAgeWllbGQgbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKG1lc3NhZ2UpO1xuICogICAgICAgICAgICB9XG4gKiAgICAgICAgICB9KSgpKSxcbiAqICAgICAgICB9KTtcbiAqICAgICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkZXJGcm9tSXRlcmFibGUoXG4gIGl0ZXJhYmxlOiBJdGVyYWJsZTxVaW50OEFycmF5PiB8IEFzeW5jSXRlcmFibGU8VWludDhBcnJheT4sXG4pOiBEZW5vLlJlYWRlciB7XG4gIGNvbnN0IGl0ZXJhdG9yOiBJdGVyYXRvcjxVaW50OEFycmF5PiB8IEFzeW5jSXRlcmF0b3I8VWludDhBcnJheT4gPVxuICAgIChpdGVyYWJsZSBhcyBBc3luY0l0ZXJhYmxlPFVpbnQ4QXJyYXk+KVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0/LigpID8/XG4gICAgICAoaXRlcmFibGUgYXMgSXRlcmFibGU8VWludDhBcnJheT4pW1N5bWJvbC5pdGVyYXRvcl0/LigpO1xuICBjb25zdCBidWZmZXIgPSBuZXcgQnVmZmVyKCk7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgcmVhZChwOiBVaW50OEFycmF5KTogUHJvbWlzZTxudW1iZXIgfCBudWxsPiB7XG4gICAgICBpZiAoYnVmZmVyLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHJlc3VsdC52YWx1ZS5ieXRlTGVuZ3RoIDw9IHAuYnl0ZUxlbmd0aCkge1xuICAgICAgICAgICAgcC5zZXQocmVzdWx0LnZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQudmFsdWUuYnl0ZUxlbmd0aDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcC5zZXQocmVzdWx0LnZhbHVlLnN1YmFycmF5KDAsIHAuYnl0ZUxlbmd0aCkpO1xuICAgICAgICAgIGF3YWl0IHdyaXRlQWxsKGJ1ZmZlciwgcmVzdWx0LnZhbHVlLnN1YmFycmF5KHAuYnl0ZUxlbmd0aCkpO1xuICAgICAgICAgIHJldHVybiBwLmJ5dGVMZW5ndGg7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IG4gPSBhd2FpdCBidWZmZXIucmVhZChwKTtcbiAgICAgICAgaWYgKG4gPT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlYWQocCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG47XG4gICAgICB9XG4gICAgfSxcbiAgfTtcbn1cblxuLyoqIENyZWF0ZSBhIGBXcml0ZXJgIGZyb20gYSBgV3JpdGFibGVTdHJlYW1EZWZhdWx0V3JpdGVyYC4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZXJGcm9tU3RyZWFtV3JpdGVyKFxuICBzdHJlYW1Xcml0ZXI6IFdyaXRhYmxlU3RyZWFtRGVmYXVsdFdyaXRlcjxVaW50OEFycmF5Pixcbik6IERlbm8uV3JpdGVyIHtcbiAgcmV0dXJuIHtcbiAgICBhc3luYyB3cml0ZShwOiBVaW50OEFycmF5KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgIGF3YWl0IHN0cmVhbVdyaXRlci5yZWFkeTtcbiAgICAgIGF3YWl0IHN0cmVhbVdyaXRlci53cml0ZShwKTtcbiAgICAgIHJldHVybiBwLmxlbmd0aDtcbiAgICB9LFxuICB9O1xufVxuXG4vKiogQ3JlYXRlIGEgYFJlYWRlcmAgZnJvbSBhIGBSZWFkYWJsZVN0cmVhbURlZmF1bHRSZWFkZXJgLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRlckZyb21TdHJlYW1SZWFkZXIoXG4gIHN0cmVhbVJlYWRlcjogUmVhZGFibGVTdHJlYW1EZWZhdWx0UmVhZGVyPFVpbnQ4QXJyYXk+LFxuKTogRGVuby5SZWFkZXIge1xuICBjb25zdCBidWZmZXIgPSBuZXcgQnVmZmVyKCk7XG5cbiAgcmV0dXJuIHtcbiAgICBhc3luYyByZWFkKHA6IFVpbnQ4QXJyYXkpOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcbiAgICAgIGlmIChidWZmZXIuZW1wdHkoKSkge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBzdHJlYW1SZWFkZXIucmVhZCgpO1xuICAgICAgICBpZiAocmVzLmRvbmUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDsgLy8gRU9GXG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB3cml0ZUFsbChidWZmZXIsIHJlcy52YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBidWZmZXIucmVhZChwKTtcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdyaXRhYmxlU3RyZWFtRnJvbVdyaXRlck9wdGlvbnMge1xuICAvKipcbiAgICogSWYgdGhlIGB3cml0ZXJgIGlzIGFsc28gYSBgRGVuby5DbG9zZXJgLCBhdXRvbWF0aWNhbGx5IGNsb3NlIHRoZSBgd3JpdGVyYFxuICAgKiB3aGVuIHRoZSBzdHJlYW0gaXMgY2xvc2VkLCBhYm9ydGVkLCBvciBhIHdyaXRlIGVycm9yIG9jY3Vycy5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYHRydWVgLiAqL1xuICBhdXRvQ2xvc2U/OiBib29sZWFuO1xufVxuXG4vKiogQ3JlYXRlIGEgYFdyaXRhYmxlU3RyZWFtYCBmcm9tIGEgYFdyaXRlcmAuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGFibGVTdHJlYW1Gcm9tV3JpdGVyKFxuICB3cml0ZXI6IERlbm8uV3JpdGVyLFxuICBvcHRpb25zOiBXcml0YWJsZVN0cmVhbUZyb21Xcml0ZXJPcHRpb25zID0ge30sXG4pOiBXcml0YWJsZVN0cmVhbTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IHsgYXV0b0Nsb3NlID0gdHJ1ZSB9ID0gb3B0aW9ucztcblxuICByZXR1cm4gbmV3IFdyaXRhYmxlU3RyZWFtKHtcbiAgICBhc3luYyB3cml0ZShjaHVuaywgY29udHJvbGxlcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgd3JpdGVBbGwod3JpdGVyLCBjaHVuayk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnRyb2xsZXIuZXJyb3IoZSk7XG4gICAgICAgIGlmIChpc0Nsb3Nlcih3cml0ZXIpICYmIGF1dG9DbG9zZSkge1xuICAgICAgICAgIHdyaXRlci5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjbG9zZSgpIHtcbiAgICAgIGlmIChpc0Nsb3Nlcih3cml0ZXIpICYmIGF1dG9DbG9zZSkge1xuICAgICAgICB3cml0ZXIuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFib3J0KCkge1xuICAgICAgaWYgKGlzQ2xvc2VyKHdyaXRlcikgJiYgYXV0b0Nsb3NlKSB7XG4gICAgICAgIHdyaXRlci5jbG9zZSgpO1xuICAgICAgfVxuICAgIH0sXG4gIH0pO1xufVxuXG4vKiogQ3JlYXRlIGEgYFJlYWRhYmxlU3RyZWFtYCBmcm9tIGFueSBraW5kIG9mIGl0ZXJhYmxlLlxuICpcbiAqIGBgYHRzXG4gKiAgICAgIGltcG9ydCB7IHJlYWRhYmxlU3RyZWFtRnJvbUl0ZXJhYmxlIH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuICpcbiAqICAgICAgY29uc3QgcjEgPSByZWFkYWJsZVN0cmVhbUZyb21JdGVyYWJsZShbXCJmb28sIGJhciwgYmF6XCJdKTtcbiAqICAgICAgY29uc3QgcjIgPSByZWFkYWJsZVN0cmVhbUZyb21JdGVyYWJsZShhc3luYyBmdW5jdGlvbiogKCkge1xuICogICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKCgocikgPT4gc2V0VGltZW91dChyLCAxMDAwKSkpO1xuICogICAgICAgIHlpZWxkIFwiZm9vXCI7XG4gKiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKChyKSA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKSk7XG4gKiAgICAgICAgeWllbGQgXCJiYXJcIjtcbiAqICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgoKHIpID0+IHNldFRpbWVvdXQociwgMTAwMCkpKTtcbiAqICAgICAgICB5aWVsZCBcImJhelwiO1xuICogICAgICB9KCkpO1xuICogYGBgXG4gKlxuICogSWYgdGhlIHByb2R1Y2VkIGl0ZXJhdG9yIChgaXRlcmFibGVbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKClgIG9yXG4gKiBgaXRlcmFibGVbU3ltYm9sLml0ZXJhdG9yXSgpYCkgaXMgYSBnZW5lcmF0b3IsIG9yIG1vcmUgc3BlY2lmaWNhbGx5IGlzIGZvdW5kXG4gKiB0byBoYXZlIGEgYC50aHJvdygpYCBtZXRob2Qgb24gaXQsIHRoYXQgd2lsbCBiZSBjYWxsZWQgdXBvblxuICogYHJlYWRhYmxlU3RyZWFtLmNhbmNlbCgpYC4gVGhpcyBpcyB0aGUgY2FzZSBmb3IgdGhlIHNlY29uZCBpbnB1dCB0eXBlIGFib3ZlOlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyByZWFkYWJsZVN0cmVhbUZyb21JdGVyYWJsZSB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcbiAqXG4gKiBjb25zdCByMyA9IHJlYWRhYmxlU3RyZWFtRnJvbUl0ZXJhYmxlKGFzeW5jIGZ1bmN0aW9uKiAoKSB7XG4gKiAgIHRyeSB7XG4gKiAgICAgeWllbGQgXCJmb29cIjtcbiAqICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmxvZyhlcnJvcik7IC8vIEVycm9yOiBDYW5jZWxsZWQgYnkgY29uc3VtZXIuXG4gKiAgIH1cbiAqIH0oKSk7XG4gKiBjb25zdCByZWFkZXIgPSByMy5nZXRSZWFkZXIoKTtcbiAqIGNvbnNvbGUubG9nKGF3YWl0IHJlYWRlci5yZWFkKCkpOyAvLyB7IHZhbHVlOiBcImZvb1wiLCBkb25lOiBmYWxzZSB9XG4gKiBhd2FpdCByZWFkZXIuY2FuY2VsKG5ldyBFcnJvcihcIkNhbmNlbGxlZCBieSBjb25zdW1lci5cIikpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkYWJsZVN0cmVhbUZyb21JdGVyYWJsZTxUPihcbiAgaXRlcmFibGU6IEl0ZXJhYmxlPFQ+IHwgQXN5bmNJdGVyYWJsZTxUPixcbik6IFJlYWRhYmxlU3RyZWFtPFQ+IHtcbiAgY29uc3QgaXRlcmF0b3I6IEl0ZXJhdG9yPFQ+IHwgQXN5bmNJdGVyYXRvcjxUPiA9XG4gICAgKGl0ZXJhYmxlIGFzIEFzeW5jSXRlcmFibGU8VD4pW1N5bWJvbC5hc3luY0l0ZXJhdG9yXT8uKCkgPz9cbiAgICAgIChpdGVyYWJsZSBhcyBJdGVyYWJsZTxUPilbU3ltYm9sLml0ZXJhdG9yXT8uKCk7XG4gIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikge1xuICAgICAgY29uc3QgeyB2YWx1ZSwgZG9uZSB9ID0gYXdhaXQgaXRlcmF0b3IubmV4dCgpO1xuICAgICAgaWYgKGRvbmUpIHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFzeW5jIGNhbmNlbChyZWFzb24pIHtcbiAgICAgIGlmICh0eXBlb2YgaXRlcmF0b3IudGhyb3cgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgaXRlcmF0b3IudGhyb3cocmVhc29uKTtcbiAgICAgICAgfSBjYXRjaCB7IC8qIGBpdGVyYXRvci50aHJvdygpYCBhbHdheXMgdGhyb3dzIG9uIHNpdGUuIFdlIGNhdGNoIGl0LiAqLyB9XG4gICAgICB9XG4gICAgfSxcbiAgfSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVhZGFibGVTdHJlYW1Gcm9tUmVhZGVyT3B0aW9ucyB7XG4gIC8qKiBJZiB0aGUgYHJlYWRlcmAgaXMgYWxzbyBhIGBEZW5vLkNsb3NlcmAsIGF1dG9tYXRpY2FsbHkgY2xvc2UgdGhlIGByZWFkZXJgXG4gICAqIHdoZW4gYEVPRmAgaXMgZW5jb3VudGVyZWQsIG9yIGEgcmVhZCBlcnJvciBvY2N1cnMuXG4gICAqXG4gICAqIERlZmF1bHRzIHRvIGB0cnVlYC4gKi9cbiAgYXV0b0Nsb3NlPzogYm9vbGVhbjtcblxuICAvKiogVGhlIHNpemUgb2YgY2h1bmtzIHRvIGFsbG9jYXRlIHRvIHJlYWQsIHRoZSBkZWZhdWx0IGlzIH4xNktpQiwgd2hpY2ggaXNcbiAgICogdGhlIG1heGltdW0gc2l6ZSB0aGF0IERlbm8gb3BlcmF0aW9ucyBjYW4gY3VycmVudGx5IHN1cHBvcnQuICovXG4gIGNodW5rU2l6ZT86IG51bWJlcjtcblxuICAvKiogVGhlIHF1ZXVpbmcgc3RyYXRlZ3kgdG8gY3JlYXRlIHRoZSBgUmVhZGFibGVTdHJlYW1gIHdpdGguICovXG4gIHN0cmF0ZWd5PzogeyBoaWdoV2F0ZXJNYXJrPzogbnVtYmVyIHwgdW5kZWZpbmVkOyBzaXplPzogdW5kZWZpbmVkIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgYFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+YCBmcm9tIGZyb20gYSBgRGVuby5SZWFkZXJgLlxuICpcbiAqIFdoZW4gdGhlIHB1bGwgYWxnb3JpdGhtIGlzIGNhbGxlZCBvbiB0aGUgc3RyZWFtLCBhIGNodW5rIGZyb20gdGhlIHJlYWRlclxuICogd2lsbCBiZSByZWFkLiAgV2hlbiBgbnVsbGAgaXMgcmV0dXJuZWQgZnJvbSB0aGUgcmVhZGVyLCB0aGUgc3RyZWFtIHdpbGwgYmVcbiAqIGNsb3NlZCBhbG9uZyB3aXRoIHRoZSByZWFkZXIgKGlmIGl0IGlzIGFsc28gYSBgRGVuby5DbG9zZXJgKS5cbiAqXG4gKiBBbiBleGFtcGxlIGNvbnZlcnRpbmcgYSBgRGVuby5GaWxlYCBpbnRvIGEgcmVhZGFibGUgc3RyZWFtOlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyByZWFkYWJsZVN0cmVhbUZyb21SZWFkZXIgfSBmcm9tIFwiLi9tb2QudHNcIjtcbiAqXG4gKiBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5vcGVuKFwiLi9maWxlLnR4dFwiLCB7IHJlYWQ6IHRydWUgfSk7XG4gKiBjb25zdCBmaWxlU3RyZWFtID0gcmVhZGFibGVTdHJlYW1Gcm9tUmVhZGVyKGZpbGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkYWJsZVN0cmVhbUZyb21SZWFkZXIoXG4gIHJlYWRlcjogRGVuby5SZWFkZXIgfCAoRGVuby5SZWFkZXIgJiBEZW5vLkNsb3NlciksXG4gIG9wdGlvbnM6IFJlYWRhYmxlU3RyZWFtRnJvbVJlYWRlck9wdGlvbnMgPSB7fSxcbik6IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3Qge1xuICAgIGF1dG9DbG9zZSA9IHRydWUsXG4gICAgY2h1bmtTaXplID0gREVGQVVMVF9DSFVOS19TSVpFLFxuICAgIHN0cmF0ZWd5LFxuICB9ID0gb3B0aW9ucztcblxuICByZXR1cm4gbmV3IFJlYWRhYmxlU3RyZWFtKHtcbiAgICBhc3luYyBwdWxsKGNvbnRyb2xsZXIpIHtcbiAgICAgIGNvbnN0IGNodW5rID0gbmV3IFVpbnQ4QXJyYXkoY2h1bmtTaXplKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlYWQgPSBhd2FpdCByZWFkZXIucmVhZChjaHVuayk7XG4gICAgICAgIGlmIChyZWFkID09PSBudWxsKSB7XG4gICAgICAgICAgaWYgKGlzQ2xvc2VyKHJlYWRlcikgJiYgYXV0b0Nsb3NlKSB7XG4gICAgICAgICAgICByZWFkZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoY2h1bmsuc3ViYXJyYXkoMCwgcmVhZCkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb250cm9sbGVyLmVycm9yKGUpO1xuICAgICAgICBpZiAoaXNDbG9zZXIocmVhZGVyKSkge1xuICAgICAgICAgIHJlYWRlci5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBjYW5jZWwoKSB7XG4gICAgICBpZiAoaXNDbG9zZXIocmVhZGVyKSAmJiBhdXRvQ2xvc2UpIHtcbiAgICAgICAgcmVhZGVyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgfSxcbiAgfSwgc3RyYXRlZ3kpO1xufVxuXG4vKiogUmVhZCBSZWFkZXIgYHJgIHVudGlsIEVPRiAoYG51bGxgKSBhbmQgcmVzb2x2ZSB0byB0aGUgY29udGVudCBhc1xuICogVWludDhBcnJheWAuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEJ1ZmZlciB9IGZyb20gXCIuLi9pby9idWZmZXIudHNcIjtcbiAqIGltcG9ydCB7IHJlYWRBbGwgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIHN0ZGluXG4gKiBjb25zdCBzdGRpbkNvbnRlbnQgPSBhd2FpdCByZWFkQWxsKERlbm8uc3RkaW4pO1xuICpcbiAqIC8vIEV4YW1wbGUgZnJvbSBmaWxlXG4gKiBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5vcGVuKFwibXlfZmlsZS50eHRcIiwge3JlYWQ6IHRydWV9KTtcbiAqIGNvbnN0IG15RmlsZUNvbnRlbnQgPSBhd2FpdCByZWFkQWxsKGZpbGUpO1xuICogRGVuby5jbG9zZShmaWxlLnJpZCk7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIGJ1ZmZlclxuICogY29uc3QgbXlEYXRhID0gbmV3IFVpbnQ4QXJyYXkoMTAwKTtcbiAqIC8vIC4uLiBmaWxsIG15RGF0YSBhcnJheSB3aXRoIGRhdGFcbiAqIGNvbnN0IHJlYWRlciA9IG5ldyBCdWZmZXIobXlEYXRhLmJ1ZmZlcik7XG4gKiBjb25zdCBidWZmZXJDb250ZW50ID0gYXdhaXQgcmVhZEFsbChyZWFkZXIpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkQWxsKHI6IERlbm8uUmVhZGVyKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IGJ1ZiA9IG5ldyBCdWZmZXIoKTtcbiAgYXdhaXQgYnVmLnJlYWRGcm9tKHIpO1xuICByZXR1cm4gYnVmLmJ5dGVzKCk7XG59XG5cbi8qKiBTeW5jaHJvbm91c2x5IHJlYWRzIFJlYWRlciBgcmAgdW50aWwgRU9GIChgbnVsbGApIGFuZCByZXR1cm5zIHRoZSBjb250ZW50XG4gKiBhcyBgVWludDhBcnJheWAuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEJ1ZmZlciB9IGZyb20gXCIuLi9pby9idWZmZXIudHNcIjtcbiAqIGltcG9ydCB7IHJlYWRBbGxTeW5jIH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuICpcbiAqIC8vIEV4YW1wbGUgZnJvbSBzdGRpblxuICogY29uc3Qgc3RkaW5Db250ZW50ID0gcmVhZEFsbFN5bmMoRGVuby5zdGRpbik7XG4gKlxuICogLy8gRXhhbXBsZSBmcm9tIGZpbGVcbiAqIGNvbnN0IGZpbGUgPSBEZW5vLm9wZW5TeW5jKFwibXlfZmlsZS50eHRcIiwge3JlYWQ6IHRydWV9KTtcbiAqIGNvbnN0IG15RmlsZUNvbnRlbnQgPSByZWFkQWxsU3luYyhmaWxlKTtcbiAqIERlbm8uY2xvc2UoZmlsZS5yaWQpO1xuICpcbiAqIC8vIEV4YW1wbGUgZnJvbSBidWZmZXJcbiAqIGNvbnN0IG15RGF0YSA9IG5ldyBVaW50OEFycmF5KDEwMCk7XG4gKiAvLyAuLi4gZmlsbCBteURhdGEgYXJyYXkgd2l0aCBkYXRhXG4gKiBjb25zdCByZWFkZXIgPSBuZXcgQnVmZmVyKG15RGF0YS5idWZmZXIpO1xuICogY29uc3QgYnVmZmVyQ29udGVudCA9IHJlYWRBbGxTeW5jKHJlYWRlcik7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRBbGxTeW5jKHI6IERlbm8uUmVhZGVyU3luYyk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBidWYgPSBuZXcgQnVmZmVyKCk7XG4gIGJ1Zi5yZWFkRnJvbVN5bmMocik7XG4gIHJldHVybiBidWYuYnl0ZXMoKTtcbn1cblxuLyoqIFdyaXRlIGFsbCB0aGUgY29udGVudCBvZiB0aGUgYXJyYXkgYnVmZmVyIChgYXJyYCkgdG8gdGhlIHdyaXRlciAoYHdgKS5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSBcIi4uL2lvL2J1ZmZlci50c1wiO1xuICogaW1wb3J0IHsgd3JpdGVBbGwgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG5cbiAqIC8vIEV4YW1wbGUgd3JpdGluZyB0byBzdGRvdXRcbiAqIGxldCBjb250ZW50Qnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJIZWxsbyBXb3JsZFwiKTtcbiAqIGF3YWl0IHdyaXRlQWxsKERlbm8uc3Rkb3V0LCBjb250ZW50Qnl0ZXMpO1xuICpcbiAqIC8vIEV4YW1wbGUgd3JpdGluZyB0byBmaWxlXG4gKiBjb250ZW50Qnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJIZWxsbyBXb3JsZFwiKTtcbiAqIGNvbnN0IGZpbGUgPSBhd2FpdCBEZW5vLm9wZW4oJ3Rlc3QuZmlsZScsIHt3cml0ZTogdHJ1ZX0pO1xuICogYXdhaXQgd3JpdGVBbGwoZmlsZSwgY29udGVudEJ5dGVzKTtcbiAqIERlbm8uY2xvc2UoZmlsZS5yaWQpO1xuICpcbiAqIC8vIEV4YW1wbGUgd3JpdGluZyB0byBidWZmZXJcbiAqIGNvbnRlbnRCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcIkhlbGxvIFdvcmxkXCIpO1xuICogY29uc3Qgd3JpdGVyID0gbmV3IEJ1ZmZlcigpO1xuICogYXdhaXQgd3JpdGVBbGwod3JpdGVyLCBjb250ZW50Qnl0ZXMpO1xuICogY29uc29sZS5sb2cod3JpdGVyLmJ5dGVzKCkubGVuZ3RoKTsgIC8vIDExXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlQWxsKHc6IERlbm8uV3JpdGVyLCBhcnI6IFVpbnQ4QXJyYXkpIHtcbiAgbGV0IG53cml0dGVuID0gMDtcbiAgd2hpbGUgKG53cml0dGVuIDwgYXJyLmxlbmd0aCkge1xuICAgIG53cml0dGVuICs9IGF3YWl0IHcud3JpdGUoYXJyLnN1YmFycmF5KG53cml0dGVuKSk7XG4gIH1cbn1cblxuLyoqIFN5bmNocm9ub3VzbHkgd3JpdGUgYWxsIHRoZSBjb250ZW50IG9mIHRoZSBhcnJheSBidWZmZXIgKGBhcnJgKSB0byB0aGVcbiAqIHdyaXRlciAoYHdgKS5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQnVmZmVyIH0gZnJvbSBcIi4uL2lvL2J1ZmZlci50c1wiO1xuICogaW1wb3J0IHsgd3JpdGVBbGxTeW5jIH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuICpcbiAqIC8vIEV4YW1wbGUgd3JpdGluZyB0byBzdGRvdXRcbiAqIGxldCBjb250ZW50Qnl0ZXMgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJIZWxsbyBXb3JsZFwiKTtcbiAqIHdyaXRlQWxsU3luYyhEZW5vLnN0ZG91dCwgY29udGVudEJ5dGVzKTtcbiAqXG4gKiAvLyBFeGFtcGxlIHdyaXRpbmcgdG8gZmlsZVxuICogY29udGVudEJ5dGVzID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKFwiSGVsbG8gV29ybGRcIik7XG4gKiBjb25zdCBmaWxlID0gRGVuby5vcGVuU3luYygndGVzdC5maWxlJywge3dyaXRlOiB0cnVlfSk7XG4gKiB3cml0ZUFsbFN5bmMoZmlsZSwgY29udGVudEJ5dGVzKTtcbiAqIERlbm8uY2xvc2UoZmlsZS5yaWQpO1xuICpcbiAqIC8vIEV4YW1wbGUgd3JpdGluZyB0byBidWZmZXJcbiAqIGNvbnRlbnRCeXRlcyA9IG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShcIkhlbGxvIFdvcmxkXCIpO1xuICogY29uc3Qgd3JpdGVyID0gbmV3IEJ1ZmZlcigpO1xuICogd3JpdGVBbGxTeW5jKHdyaXRlciwgY29udGVudEJ5dGVzKTtcbiAqIGNvbnNvbGUubG9nKHdyaXRlci5ieXRlcygpLmxlbmd0aCk7ICAvLyAxMVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUFsbFN5bmModzogRGVuby5Xcml0ZXJTeW5jLCBhcnI6IFVpbnQ4QXJyYXkpOiB2b2lkIHtcbiAgbGV0IG53cml0dGVuID0gMDtcbiAgd2hpbGUgKG53cml0dGVuIDwgYXJyLmxlbmd0aCkge1xuICAgIG53cml0dGVuICs9IHcud3JpdGVTeW5jKGFyci5zdWJhcnJheShud3JpdHRlbikpO1xuICB9XG59XG5cbi8qKiBUdXJucyBhIFJlYWRlciwgYHJgLCBpbnRvIGFuIGFzeW5jIGl0ZXJhdG9yLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBpdGVyYXRlUmVhZGVyIH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuICpcbiAqIGxldCBmID0gYXdhaXQgRGVuby5vcGVuKFwiL2V0Yy9wYXNzd2RcIik7XG4gKiBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIGl0ZXJhdGVSZWFkZXIoZikpIHtcbiAqICAgY29uc29sZS5sb2coY2h1bmspO1xuICogfVxuICogZi5jbG9zZSgpO1xuICogYGBgXG4gKlxuICogU2Vjb25kIGFyZ3VtZW50IGNhbiBiZSB1c2VkIHRvIHR1bmUgc2l6ZSBvZiBhIGJ1ZmZlci5cbiAqIERlZmF1bHQgc2l6ZSBvZiB0aGUgYnVmZmVyIGlzIDMya0IuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IGl0ZXJhdGVSZWFkZXIgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogbGV0IGYgPSBhd2FpdCBEZW5vLm9wZW4oXCIvZXRjL3Bhc3N3ZFwiKTtcbiAqIGNvbnN0IGl0ID0gaXRlcmF0ZVJlYWRlcihmLCB7XG4gKiAgIGJ1ZlNpemU6IDEwMjQgKiAxMDI0XG4gKiB9KTtcbiAqIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgaXQpIHtcbiAqICAgY29uc29sZS5sb2coY2h1bmspO1xuICogfVxuICogZi5jbG9zZSgpO1xuICogYGBgXG4gKlxuICogSXRlcmF0b3IgdXNlcyBhbiBpbnRlcm5hbCBidWZmZXIgb2YgZml4ZWQgc2l6ZSBmb3IgZWZmaWNpZW5jeTsgaXQgcmV0dXJuc1xuICogYSB2aWV3IG9uIHRoYXQgYnVmZmVyIG9uIGVhY2ggaXRlcmF0aW9uLiBJdCBpcyB0aGVyZWZvcmUgY2FsbGVyJ3NcbiAqIHJlc3BvbnNpYmlsaXR5IHRvIGNvcHkgY29udGVudHMgb2YgdGhlIGJ1ZmZlciBpZiBuZWVkZWQ7IG90aGVyd2lzZSB0aGVcbiAqIG5leHQgaXRlcmF0aW9uIHdpbGwgb3ZlcndyaXRlIGNvbnRlbnRzIG9mIHByZXZpb3VzbHkgcmV0dXJuZWQgY2h1bmsuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogaXRlcmF0ZVJlYWRlcihcbiAgcjogRGVuby5SZWFkZXIsXG4gIG9wdGlvbnM/OiB7XG4gICAgYnVmU2l6ZT86IG51bWJlcjtcbiAgfSxcbik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxVaW50OEFycmF5PiB7XG4gIGNvbnN0IGJ1ZlNpemUgPSBvcHRpb25zPy5idWZTaXplID8/IERFRkFVTFRfQlVGRkVSX1NJWkU7XG4gIGNvbnN0IGIgPSBuZXcgVWludDhBcnJheShidWZTaXplKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByLnJlYWQoYik7XG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgeWllbGQgYi5zdWJhcnJheSgwLCByZXN1bHQpO1xuICB9XG59XG5cbi8qKiBUdXJucyBhIFJlYWRlclN5bmMsIGByYCwgaW50byBhbiBpdGVyYXRvci5cbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaXRlcmF0ZVJlYWRlclN5bmMgfSBmcm9tIFwiLi9jb252ZXJzaW9uLnRzXCI7XG4gKlxuICogbGV0IGYgPSBEZW5vLm9wZW5TeW5jKFwiL2V0Yy9wYXNzd2RcIik7XG4gKiBmb3IgKGNvbnN0IGNodW5rIG9mIGl0ZXJhdGVSZWFkZXJTeW5jKGYpKSB7XG4gKiAgIGNvbnNvbGUubG9nKGNodW5rKTtcbiAqIH1cbiAqIGYuY2xvc2UoKTtcbiAqIGBgYFxuICpcbiAqIFNlY29uZCBhcmd1bWVudCBjYW4gYmUgdXNlZCB0byB0dW5lIHNpemUgb2YgYSBidWZmZXIuXG4gKiBEZWZhdWx0IHNpemUgb2YgdGhlIGJ1ZmZlciBpcyAzMmtCLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBpdGVyYXRlUmVhZGVyU3luYyB9IGZyb20gXCIuL2NvbnZlcnNpb24udHNcIjtcblxuICogbGV0IGYgPSBhd2FpdCBEZW5vLm9wZW4oXCIvZXRjL3Bhc3N3ZFwiKTtcbiAqIGNvbnN0IGl0ZXIgPSBpdGVyYXRlUmVhZGVyU3luYyhmLCB7XG4gKiAgIGJ1ZlNpemU6IDEwMjQgKiAxMDI0XG4gKiB9KTtcbiAqIGZvciAoY29uc3QgY2h1bmsgb2YgaXRlcikge1xuICogICBjb25zb2xlLmxvZyhjaHVuayk7XG4gKiB9XG4gKiBmLmNsb3NlKCk7XG4gKiBgYGBcbiAqXG4gKiBJdGVyYXRvciB1c2VzIGFuIGludGVybmFsIGJ1ZmZlciBvZiBmaXhlZCBzaXplIGZvciBlZmZpY2llbmN5OyBpdCByZXR1cm5zXG4gKiBhIHZpZXcgb24gdGhhdCBidWZmZXIgb24gZWFjaCBpdGVyYXRpb24uIEl0IGlzIHRoZXJlZm9yZSBjYWxsZXInc1xuICogcmVzcG9uc2liaWxpdHkgdG8gY29weSBjb250ZW50cyBvZiB0aGUgYnVmZmVyIGlmIG5lZWRlZDsgb3RoZXJ3aXNlIHRoZVxuICogbmV4dCBpdGVyYXRpb24gd2lsbCBvdmVyd3JpdGUgY29udGVudHMgb2YgcHJldmlvdXNseSByZXR1cm5lZCBjaHVuay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBpdGVyYXRlUmVhZGVyU3luYyhcbiAgcjogRGVuby5SZWFkZXJTeW5jLFxuICBvcHRpb25zPzoge1xuICAgIGJ1ZlNpemU/OiBudW1iZXI7XG4gIH0sXG4pOiBJdGVyYWJsZUl0ZXJhdG9yPFVpbnQ4QXJyYXk+IHtcbiAgY29uc3QgYnVmU2l6ZSA9IG9wdGlvbnM/LmJ1ZlNpemUgPz8gREVGQVVMVF9CVUZGRVJfU0laRTtcbiAgY29uc3QgYiA9IG5ldyBVaW50OEFycmF5KGJ1ZlNpemUpO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHIucmVhZFN5bmMoYik7XG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgeWllbGQgYi5zdWJhcnJheSgwLCByZXN1bHQpO1xuICB9XG59XG5cbi8qKiBDb3BpZXMgZnJvbSBgc3JjYCB0byBgZHN0YCB1bnRpbCBlaXRoZXIgRU9GIChgbnVsbGApIGlzIHJlYWQgZnJvbSBgc3JjYCBvclxuICogYW4gZXJyb3Igb2NjdXJzLiBJdCByZXNvbHZlcyB0byB0aGUgbnVtYmVyIG9mIGJ5dGVzIGNvcGllZCBvciByZWplY3RzIHdpdGhcbiAqIHRoZSBmaXJzdCBlcnJvciBlbmNvdW50ZXJlZCB3aGlsZSBjb3B5aW5nLlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjb3B5IH0gZnJvbSBcIi4vY29udmVyc2lvbi50c1wiO1xuICpcbiAqIGNvbnN0IHNvdXJjZSA9IGF3YWl0IERlbm8ub3BlbihcIm15X2ZpbGUudHh0XCIpO1xuICogY29uc3QgYnl0ZXNDb3BpZWQxID0gYXdhaXQgY29weShzb3VyY2UsIERlbm8uc3Rkb3V0KTtcbiAqIGNvbnN0IGRlc3RpbmF0aW9uID0gYXdhaXQgRGVuby5jcmVhdGUoXCJteV9maWxlXzIudHh0XCIpO1xuICogY29uc3QgYnl0ZXNDb3BpZWQyID0gYXdhaXQgY29weShzb3VyY2UsIGRlc3RpbmF0aW9uKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzcmMgVGhlIHNvdXJjZSB0byBjb3B5IGZyb21cbiAqIEBwYXJhbSBkc3QgVGhlIGRlc3RpbmF0aW9uIHRvIGNvcHkgdG9cbiAqIEBwYXJhbSBvcHRpb25zIENhbiBiZSB1c2VkIHRvIHR1bmUgc2l6ZSBvZiB0aGUgYnVmZmVyLiBEZWZhdWx0IHNpemUgaXMgMzJrQlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weShcbiAgc3JjOiBEZW5vLlJlYWRlcixcbiAgZHN0OiBEZW5vLldyaXRlcixcbiAgb3B0aW9ucz86IHtcbiAgICBidWZTaXplPzogbnVtYmVyO1xuICB9LFxuKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgbGV0IG4gPSAwO1xuICBjb25zdCBidWZTaXplID0gb3B0aW9ucz8uYnVmU2l6ZSA/PyBERUZBVUxUX0JVRkZFUl9TSVpFO1xuICBjb25zdCBiID0gbmV3IFVpbnQ4QXJyYXkoYnVmU2l6ZSk7XG4gIGxldCBnb3RFT0YgPSBmYWxzZTtcbiAgd2hpbGUgKGdvdEVPRiA9PT0gZmFsc2UpIHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzcmMucmVhZChiKTtcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKSB7XG4gICAgICBnb3RFT0YgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbndyaXR0ZW4gPSAwO1xuICAgICAgd2hpbGUgKG53cml0dGVuIDwgcmVzdWx0KSB7XG4gICAgICAgIG53cml0dGVuICs9IGF3YWl0IGRzdC53cml0ZShiLnN1YmFycmF5KG53cml0dGVuLCByZXN1bHQpKTtcbiAgICAgIH1cbiAgICAgIG4gKz0gbndyaXR0ZW47XG4gICAgfVxuICB9XG4gIHJldHVybiBuO1xufVxuIl19