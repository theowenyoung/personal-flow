import { debug } from "../../vendor/puppeteer-core/puppeteer/common/Debug.js";
import { assert } from "../../vendor/puppeteer-core/puppeteer/common/assert.js";
import { debugError, helper, } from "../../vendor/puppeteer-core/puppeteer/common/helper.js";
import { Connection } from "../../vendor/puppeteer-core/puppeteer/common/Connection.js";
import { BrowserWebSocketTransport } from "../../vendor/puppeteer-core/puppeteer/common/BrowserWebSocketTransport.js";
import { TimeoutError } from "../../vendor/puppeteer-core/puppeteer/common/Errors.js";
import { readLines } from "../../vendor/puppeteer-core/vendor/std.ts";
const debugLauncher = debug("puppeteer:launcher");
const PROCESS_ERROR_EXPLANATION = `Puppeteer was unable to kill the process which ran the browser binary.
This means that, on future Puppeteer launches, Puppeteer might not be able to launch the browser.
Please check your open processes and ensure that the browser processes that Puppeteer launched have been killed.
If you think this is a bug, please report it on the Puppeteer issue tracker.`;
export class BrowserRunner {
    _executablePath;
    _processArguments;
    _tempDirectory;
    proc = undefined;
    connection = undefined;
    _closed = true;
    _listeners = [];
    _processClosing;
    constructor(executablePath, processArguments, tempDirectory) {
        this._executablePath = executablePath;
        this._processArguments = processArguments;
        this._tempDirectory = tempDirectory;
    }
    start(options) {
        const { env, dumpio } = options;
        assert(!this.proc, "This process has previously been started.");
        debugLauncher(`Calling ${this._executablePath} ${this._processArguments.join(" ")}`);
        this.proc = Deno.run({
            cmd: [this._executablePath, ...this._processArguments],
            env,
            stdin: "piped",
            stdout: "piped",
            stderr: "piped",
        });
        this._closed = false;
        this._processClosing = this.proc.status().then(async (status) => {
            this._closed = true;
            try {
                if (this.proc) {
                    if (!status.success && dumpio) {
                        await Deno.copy(this.proc.stdout, Deno.stdout);
                        await Deno.copy(this.proc.stderr, Deno.stderr);
                    }
                    this.proc.stdin.close();
                    this.proc.stdout.close();
                    this.proc.stderr.close();
                    this.proc.close();
                }
            }
            catch (err) {
                if (!(err instanceof Deno.errors.BadResource)) {
                    throw err;
                }
            }
            if (this._tempDirectory) {
                await Deno.remove(this._tempDirectory, {
                    recursive: true,
                }).catch((error) => { });
            }
        });
    }
    close() {
        if (this._closed)
            return Promise.resolve();
        if (this._tempDirectory) {
            this.kill();
        }
        else if (this.connection) {
            this.connection.send("Browser.close").catch((error) => {
                debugError(error);
                this.kill();
            });
        }
        helper.removeEventListeners(this._listeners);
        return this._processClosing;
    }
    kill() {
        try {
            if (this._tempDirectory) {
                Deno.removeSync(this._tempDirectory, { recursive: true });
            }
        }
        catch (error) { }
        if (this.proc && this.proc.pid && !this._closed) {
            try {
                this.proc.kill("SIGKILL");
            }
            catch (error) {
                throw new Error(`${PROCESS_ERROR_EXPLANATION}\nError cause: ${error.stack}`);
            }
        }
        helper.removeEventListeners(this._listeners);
    }
    async setupConnection(options) {
        const { timeout, slowMo, preferredRevision } = options;
        const browserWSEndpoint = await waitForWSEndpoint(this.proc, timeout, preferredRevision);
        const transport = await BrowserWebSocketTransport.create(browserWSEndpoint);
        this.connection = new Connection(browserWSEndpoint, transport, slowMo);
        return this.connection;
    }
}
async function waitForWSEndpoint(browserProcess, timeout, preferredRevision) {
    const timeId = setTimeout(() => {
        throw new TimeoutError(`Timed out after ${timeout} ms while trying to connect to the browser! Only Chrome at revision r${preferredRevision} is guaranteed to work.`);
    }, timeout);
    for await (const line of readLines(browserProcess.stderr)) {
        const match = line.match(/^DevTools listening on (ws:\/\/.*)$/);
        if (match) {
            clearTimeout(timeId);
            return match[1];
        }
    }
    clearTimeout(timeId);
    throw new Error([
        "Failed to launch the browser process!" + "",
        "TROUBLESHOOTING: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md",
        "",
    ].join("\n"));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnJvd3NlclJ1bm5lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkJyb3dzZXJSdW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0JBLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDaEYsT0FBTyxFQUNMLFVBQVUsRUFDVixNQUFNLEdBQ1AsTUFBTSx3REFBd0QsQ0FBQztBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDdEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV0RSxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUNsRCxNQUFNLHlCQUF5QixHQUFHOzs7NkVBRzJDLENBQUM7QUFFOUUsTUFBTSxPQUFPLGFBQWE7SUFDaEIsZUFBZSxDQUFTO0lBQ3hCLGlCQUFpQixDQUFXO0lBQzVCLGNBQWMsQ0FBVTtJQUVoQyxJQUFJLEdBQTZCLFNBQVMsQ0FBQztJQUMzQyxVQUFVLEdBQTJCLFNBQVMsQ0FBQztJQUV2QyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ2YsVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUNoQixlQUFlLENBQWlCO0lBRXhDLFlBQ0UsY0FBc0IsRUFDdEIsZ0JBQTBCLEVBQzFCLGFBQXNCO1FBRXRCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQztRQUMxQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztJQUN0QyxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQXNCO1FBQzFCLE1BQU0sRUFB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QWUsRUFDZixpQkFBeUI7SUFFekIsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUM3QixNQUFNLElBQUksWUFBWSxDQUNwQixtQkFBbUIsT0FBTyx3RUFBd0UsaUJBQWlCLHlCQUF5QixDQUM3SSxDQUFDO0lBQ0osQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRVosSUFBSSxLQUFLLEVBQUUsTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxNQUFPLENBQUMsRUFBRTtRQUMxRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDaEUsSUFBSSxLQUFLLEVBQUU7WUFDVCxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckIsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7S0FDRjtJQUVELFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyQixNQUFNLElBQUksS0FBSyxDQUNiO1FBQ0UsdUNBQXVDLEdBQUcsRUFBRTtRQUM1QywyRkFBMkY7UUFDM0YsRUFBRTtLQUNILENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNiLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgeyBkZWJ1ZyB9IGZyb20gXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvcHVwcGV0ZWVyL2NvbW1vbi9EZWJ1Zy5qc1wiO1xuaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIi4uLy4uL3ZlbmRvci9wdXBwZXRlZXItY29yZS9wdXBwZXRlZXIvY29tbW9uL2Fzc2VydC5qc1wiO1xuaW1wb3J0IHtcbiAgZGVidWdFcnJvcixcbiAgaGVscGVyLFxufSBmcm9tIFwiLi4vLi4vdmVuZG9yL3B1cHBldGVlci1jb3JlL3B1cHBldGVlci9jb21tb24vaGVscGVyLmpzXCI7XG5pbXBvcnQgeyBMYXVuY2hPcHRpb25zIH0gZnJvbSBcIi4vTGF1bmNoT3B0aW9ucy50c1wiO1xuaW1wb3J0IHsgQ29ubmVjdGlvbiB9IGZyb20gXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvcHVwcGV0ZWVyL2NvbW1vbi9Db25uZWN0aW9uLmpzXCI7XG5pbXBvcnQgeyBCcm93c2VyV2ViU29ja2V0VHJhbnNwb3J0IH0gZnJvbSBcIi4uLy4uL3ZlbmRvci9wdXBwZXRlZXItY29yZS9wdXBwZXRlZXIvY29tbW9uL0Jyb3dzZXJXZWJTb2NrZXRUcmFuc3BvcnQuanNcIjtcbmltcG9ydCB7IFRpbWVvdXRFcnJvciB9IGZyb20gXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvcHVwcGV0ZWVyL2NvbW1vbi9FcnJvcnMuanNcIjtcbmltcG9ydCB7IHJlYWRMaW5lcyB9IGZyb20gXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvdmVuZG9yL3N0ZC50c1wiO1xuXG5jb25zdCBkZWJ1Z0xhdW5jaGVyID0gZGVidWcoXCJwdXBwZXRlZXI6bGF1bmNoZXJcIik7XG5jb25zdCBQUk9DRVNTX0VSUk9SX0VYUExBTkFUSU9OID0gYFB1cHBldGVlciB3YXMgdW5hYmxlIHRvIGtpbGwgdGhlIHByb2Nlc3Mgd2hpY2ggcmFuIHRoZSBicm93c2VyIGJpbmFyeS5cblRoaXMgbWVhbnMgdGhhdCwgb24gZnV0dXJlIFB1cHBldGVlciBsYXVuY2hlcywgUHVwcGV0ZWVyIG1pZ2h0IG5vdCBiZSBhYmxlIHRvIGxhdW5jaCB0aGUgYnJvd3Nlci5cblBsZWFzZSBjaGVjayB5b3VyIG9wZW4gcHJvY2Vzc2VzIGFuZCBlbnN1cmUgdGhhdCB0aGUgYnJvd3NlciBwcm9jZXNzZXMgdGhhdCBQdXBwZXRlZXIgbGF1bmNoZWQgaGF2ZSBiZWVuIGtpbGxlZC5cbklmIHlvdSB0aGluayB0aGlzIGlzIGEgYnVnLCBwbGVhc2UgcmVwb3J0IGl0IG9uIHRoZSBQdXBwZXRlZXIgaXNzdWUgdHJhY2tlci5gO1xuXG5leHBvcnQgY2xhc3MgQnJvd3NlclJ1bm5lciB7XG4gIHByaXZhdGUgX2V4ZWN1dGFibGVQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgX3Byb2Nlc3NBcmd1bWVudHM6IHN0cmluZ1tdO1xuICBwcml2YXRlIF90ZW1wRGlyZWN0b3J5Pzogc3RyaW5nO1xuXG4gIHByb2M6IERlbm8uUHJvY2VzcyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgY29ubmVjdGlvbjogQ29ubmVjdGlvbiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICBwcml2YXRlIF9jbG9zZWQgPSB0cnVlO1xuICBwcml2YXRlIF9saXN0ZW5lcnMgPSBbXTtcbiAgcHJpdmF0ZSBfcHJvY2Vzc0Nsb3NpbmchOiBQcm9taXNlPHZvaWQ+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGV4ZWN1dGFibGVQYXRoOiBzdHJpbmcsXG4gICAgcHJvY2Vzc0FyZ3VtZW50czogc3RyaW5nW10sXG4gICAgdGVtcERpcmVjdG9yeT86IHN0cmluZ1xuICApIHtcbiAgICB0aGlzLl9leGVjdXRhYmxlUGF0aCA9IGV4ZWN1dGFibGVQYXRoO1xuICAgIHRoaXMuX3Byb2Nlc3NBcmd1bWVudHMgPSBwcm9jZXNzQXJndW1lbnRzO1xuICAgIHRoaXMuX3RlbXBEaXJlY3RvcnkgPSB0ZW1wRGlyZWN0b3J5O1xuICB9XG5cbiAgc3RhcnQob3B0aW9uczogTGF1bmNoT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IHsgZW52LCBkdW1waW8gfSA9IG9wdGlvbnM7XG4gICAgYXNzZXJ0KCF0aGlzLnByb2MsIFwiVGhpcyBwcm9jZXNzIGhhcyBwcmV2aW91c2x5IGJlZW4gc3RhcnRlZC5cIik7XG4gICAgZGVidWdMYXVuY2hlcihcbiAgICAgIGBDYWxsaW5nICR7dGhpcy5fZXhlY3V0YWJsZVBhdGh9ICR7dGhpcy5fcHJvY2Vzc0FyZ3VtZW50cy5qb2luKFwiIFwiKX1gXG4gICAgKTtcbiAgICB0aGlzLnByb2MgPSBEZW5vLnJ1bih7XG4gICAgICBjbWQ6IFt0aGlzLl9leGVjdXRhYmxlUGF0aCwgLi4udGhpcy5fcHJvY2Vzc0FyZ3VtZW50c10sXG4gICAgICBlbnYsXG4gICAgICBzdGRpbjogXCJwaXBlZFwiLFxuICAgICAgc3Rkb3V0OiBcInBpcGVkXCIsXG4gICAgICBzdGRlcnI6IFwicGlwZWRcIixcbiAgICB9KTtcbiAgICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wcm9jZXNzQ2xvc2luZyA9IHRoaXMucHJvYy5zdGF0dXMoKS50aGVuKGFzeW5jIChzdGF0dXMpID0+IHtcbiAgICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAodGhpcy5wcm9jKSB7XG4gICAgICAgICAgaWYgKCFzdGF0dXMuc3VjY2VzcyAmJiBkdW1waW8pIHtcbiAgICAgICAgICAgIGF3YWl0IERlbm8uY29weSh0aGlzLnByb2Muc3Rkb3V0ISwgRGVuby5zdGRvdXQpO1xuICAgICAgICAgICAgYXdhaXQgRGVuby5jb3B5KHRoaXMucHJvYy5zdGRlcnIhLCBEZW5vLnN0ZGVycik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMucHJvYy5zdGRpbiEuY2xvc2UoKTtcbiAgICAgICAgICB0aGlzLnByb2Muc3Rkb3V0IS5jbG9zZSgpO1xuICAgICAgICAgIHRoaXMucHJvYy5zdGRlcnIhLmNsb3NlKCk7XG4gICAgICAgICAgdGhpcy5wcm9jLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5CYWRSZXNvdXJjZSkpIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl90ZW1wRGlyZWN0b3J5KSB7XG4gICAgICAgIGF3YWl0IERlbm8ucmVtb3ZlKHRoaXMuX3RlbXBEaXJlY3RvcnksIHtcbiAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXG4gICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge30pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX2Nsb3NlZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGlmICh0aGlzLl90ZW1wRGlyZWN0b3J5KSB7XG4gICAgICB0aGlzLmtpbGwoKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29ubmVjdGlvbikge1xuICAgICAgLy8gQXR0ZW1wdCB0byBjbG9zZSB0aGUgYnJvd3NlciBncmFjZWZ1bGx5XG4gICAgICB0aGlzLmNvbm5lY3Rpb24uc2VuZChcIkJyb3dzZXIuY2xvc2VcIikuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIGRlYnVnRXJyb3IoZXJyb3IpO1xuICAgICAgICB0aGlzLmtpbGwoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBDbGVhbnVwIHRoaXMgbGlzdGVuZXIgbGFzdCwgYXMgdGhhdCBtYWtlcyBzdXJlIHRoZSBmdWxsIGNhbGxiYWNrIHJ1bnMuIElmIHdlXG4gICAgLy8gcGVyZm9ybSB0aGlzIGVhcmxpZXIsIHRoZW4gdGhlIHByZXZpb3VzIGZ1bmN0aW9uIGNhbGxzIHdvdWxkIG5vdCBoYXBwZW4uXG4gICAgaGVscGVyLnJlbW92ZUV2ZW50TGlzdGVuZXJzKHRoaXMuX2xpc3RlbmVycyk7XG4gICAgcmV0dXJuIHRoaXMuX3Byb2Nlc3NDbG9zaW5nO1xuICB9XG5cbiAga2lsbCgpOiB2b2lkIHtcbiAgICAvLyBBdHRlbXB0IHRvIHJlbW92ZSB0ZW1wb3JhcnkgcHJvZmlsZSBkaXJlY3RvcnkgdG8gYXZvaWQgbGl0dGVyaW5nLlxuICAgIHRyeSB7XG4gICAgICBpZiAodGhpcy5fdGVtcERpcmVjdG9yeSkge1xuICAgICAgICBEZW5vLnJlbW92ZVN5bmModGhpcy5fdGVtcERpcmVjdG9yeSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHt9XG5cbiAgICAvLyBJZiB0aGUgcHJvY2VzcyBmYWlsZWQgdG8gbGF1bmNoIChmb3IgZXhhbXBsZSBpZiB0aGUgYnJvd3NlciBleGVjdXRhYmxlIHBhdGhcbiAgICAvLyBpcyBpbnZhbGlkKSwgdGhlbiB0aGUgcHJvY2VzcyBkb2VzIG5vdCBnZXQgYSBwaWQgYXNzaWduZWQuIEEgY2FsbCB0b1xuICAgIC8vIGBwcm9jLmtpbGxgIHdvdWxkIGVycm9yLCBhcyB0aGUgYHBpZGAgdG8tYmUta2lsbGVkIGNhbiBub3QgYmUgZm91bmQuXG4gICAgaWYgKHRoaXMucHJvYyAmJiB0aGlzLnByb2MucGlkICYmICF0aGlzLl9jbG9zZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMucHJvYy5raWxsKFwiU0lHS0lMTFwiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgJHtQUk9DRVNTX0VSUk9SX0VYUExBTkFUSU9OfVxcbkVycm9yIGNhdXNlOiAke2Vycm9yLnN0YWNrfWBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ2xlYW51cCB0aGlzIGxpc3RlbmVyIGxhc3QsIGFzIHRoYXQgbWFrZXMgc3VyZSB0aGUgZnVsbCBjYWxsYmFjayBydW5zLiBJZiB3ZVxuICAgIC8vIHBlcmZvcm0gdGhpcyBlYXJsaWVyLCB0aGVuIHRoZSBwcmV2aW91cyBmdW5jdGlvbiBjYWxscyB3b3VsZCBub3QgaGFwcGVuLlxuICAgIGhlbHBlci5yZW1vdmVFdmVudExpc3RlbmVycyh0aGlzLl9saXN0ZW5lcnMpO1xuICB9XG5cbiAgYXN5bmMgc2V0dXBDb25uZWN0aW9uKG9wdGlvbnM6IHtcbiAgICB0aW1lb3V0OiBudW1iZXI7XG4gICAgc2xvd01vOiBudW1iZXI7XG4gICAgcHJlZmVycmVkUmV2aXNpb246IHN0cmluZztcbiAgfSk6IFByb21pc2U8Q29ubmVjdGlvbj4ge1xuICAgIGNvbnN0IHsgdGltZW91dCwgc2xvd01vLCBwcmVmZXJyZWRSZXZpc2lvbiB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBicm93c2VyV1NFbmRwb2ludCA9IGF3YWl0IHdhaXRGb3JXU0VuZHBvaW50KFxuICAgICAgdGhpcy5wcm9jISxcbiAgICAgIHRpbWVvdXQsXG4gICAgICBwcmVmZXJyZWRSZXZpc2lvblxuICAgICk7XG4gICAgY29uc3QgdHJhbnNwb3J0ID0gYXdhaXQgQnJvd3NlcldlYlNvY2tldFRyYW5zcG9ydC5jcmVhdGUoYnJvd3NlcldTRW5kcG9pbnQpO1xuICAgIHRoaXMuY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKGJyb3dzZXJXU0VuZHBvaW50LCB0cmFuc3BvcnQsIHNsb3dNbyk7XG4gICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbjtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB3YWl0Rm9yV1NFbmRwb2ludChcbiAgYnJvd3NlclByb2Nlc3M6IERlbm8uUHJvY2VzcyxcbiAgdGltZW91dDogbnVtYmVyLFxuICBwcmVmZXJyZWRSZXZpc2lvbjogc3RyaW5nXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB0aW1lSWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICB0aHJvdyBuZXcgVGltZW91dEVycm9yKFxuICAgICAgYFRpbWVkIG91dCBhZnRlciAke3RpbWVvdXR9IG1zIHdoaWxlIHRyeWluZyB0byBjb25uZWN0IHRvIHRoZSBicm93c2VyISBPbmx5IENocm9tZSBhdCByZXZpc2lvbiByJHtwcmVmZXJyZWRSZXZpc2lvbn0gaXMgZ3VhcmFudGVlZCB0byB3b3JrLmBcbiAgICApO1xuICB9LCB0aW1lb3V0KTtcblxuICBmb3IgYXdhaXQgKGNvbnN0IGxpbmUgb2YgcmVhZExpbmVzKGJyb3dzZXJQcm9jZXNzLnN0ZGVyciEpKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKC9eRGV2VG9vbHMgbGlzdGVuaW5nIG9uICh3czpcXC9cXC8uKikkLyk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZUlkKTtcbiAgICAgIHJldHVybiBtYXRjaFsxXTtcbiAgICB9XG4gIH1cblxuICBjbGVhclRpbWVvdXQodGltZUlkKTtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgIFtcbiAgICAgIFwiRmFpbGVkIHRvIGxhdW5jaCB0aGUgYnJvd3NlciBwcm9jZXNzIVwiICsgXCJcIixcbiAgICAgIFwiVFJPVUJMRVNIT09USU5HOiBodHRwczovL2dpdGh1Yi5jb20vcHVwcGV0ZWVyL3B1cHBldGVlci9ibG9iL21haW4vZG9jcy90cm91Ymxlc2hvb3RpbmcubWRcIixcbiAgICAgIFwiXCIsXG4gICAgXS5qb2luKFwiXFxuXCIpXG4gICk7XG59XG4iXX0=