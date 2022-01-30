import { debug } from "../../vendor/puppeteer-core/puppeteer/common/Debug.js";
import { assert } from "../../vendor/puppeteer-core/puppeteer/common/assert.js";
import { copyDir, exists, existsSync, pathJoin, pathResolve, sprintf, } from "../../vendor/puppeteer-core/vendor/std.ts";
import { readZip } from "../../vendor/puppeteer-core/vendor/zip/mod.ts";
import { cachedir } from "../../vendor/puppeteer-core/vendor/cache.ts";
const debugFetcher = debug(`puppeteer:fetcher`);
const downloadURLs = {
    chrome: {
        linux: "%s/chromium-browser-snapshots/Linux_x64/%d/%s.zip",
        mac: "%s/chromium-browser-snapshots/Mac/%d/%s.zip",
        win32: "%s/chromium-browser-snapshots/Win/%d/%s.zip",
        win64: "%s/chromium-browser-snapshots/Win_x64/%d/%s.zip",
    },
    firefox: {
        linux: "%s/firefox-%s.en-US.%s-x86_64.tar.bz2",
        mac: "%s/firefox-%s.en-US.%s.dmg",
        win32: "%s/firefox-%s.en-US.%s.zip",
        win64: "%s/firefox-%s.en-US.%s.zip",
    },
};
const browserConfig = {
    chrome: {
        host: "https://storage.googleapis.com",
        destination: "chromium",
    },
    firefox: {
        host: "https://archive.mozilla.org/pub/firefox/nightly/latest-mozilla-central",
        destination: "firefox",
    },
};
function archiveName(product, platform, revision) {
    if (product === "chrome") {
        if (platform === "linux")
            return "chrome-linux";
        if (platform === "mac")
            return "chrome-mac";
        if (platform === "win32" || platform === "win64") {
            return parseInt(revision, 10) > 591479 ? "chrome-win" : "chrome-win32";
        }
    }
    else if (product === "firefox") {
        return platform;
    }
    throw new Error(`Unknown product: ${product}`);
}
function downloadURL(product, platform, host, revision) {
    const url = sprintf(downloadURLs[product][platform], host, revision, archiveName(product, platform, revision));
    return url;
}
async function handleArm64() {
    const stats = await Deno.stat("/usr/bin/chromium-browser");
    if (stats === undefined) {
        console.error(`The chromium binary is not available for arm64: `);
        console.error(`If you are on Ubuntu, you can install with: `);
        console.error(`\n apt-get install chromium-browser\n`);
        throw new Error();
    }
}
export class BrowserFetcher {
    _product;
    _downloadsFolder;
    _downloadHost;
    _platform;
    constructor(options = {}) {
        this._product = (options.product || "chrome").toLowerCase();
        assert(this._product === "chrome" || this._product === "firefox", `Unknown product: "${options.product}"`);
        this._downloadsFolder =
            options.path ||
                pathJoin(cachedir(), "deno_puppeteer", browserConfig[this._product].destination);
        this._downloadHost = options.host || browserConfig[this._product].host;
        this.setPlatform(options.platform);
        assert(downloadURLs[this._product][this._platform], "Unsupported platform: " + this._platform);
    }
    setPlatform(platformFromOptions) {
        if (platformFromOptions) {
            this._platform = platformFromOptions;
            return;
        }
        const platform = Deno.build.os;
        if (platform === "darwin")
            this._platform = "mac";
        else if (platform === "linux")
            this._platform = "linux";
        else if (platform === "windows") {
            this._platform = Deno.build.arch === "x86_64" ? "win64" : "win32";
        }
        else
            assert(this._platform, "Unsupported platform: " + Deno.build.os);
    }
    platform() {
        return this._platform;
    }
    product() {
        return this._product;
    }
    host() {
        return this._downloadHost;
    }
    async canDownload(revision) {
        const url = downloadURL(this._product, this._platform, this._downloadHost, revision);
        const req = await fetch(url, { method: "head" });
        return req.status == 200;
    }
    async download(revision, progressCallback = () => { }) {
        const url = downloadURL(this._product, this._platform, this._downloadHost, revision);
        const fileName = url.split("/").pop();
        const archivePath = pathJoin(this._downloadsFolder, fileName);
        const outputPath = this._getFolderPath(revision);
        if (await exists(outputPath))
            return this.revisionInfo(revision);
        if (!(await exists(this._downloadsFolder))) {
            await Deno.mkdir(this._downloadsFolder, { recursive: true });
        }
        if (Deno.build.arch === "arm64") {
            console.error("arm64 downloads not supported.");
            console.error("Use PUPPETEER_EXECUTABLE_PATH to specify an executable path.");
            throw new Error();
        }
        try {
            await downloadFile(url, archivePath, progressCallback);
            await install(archivePath, outputPath);
        }
        finally {
            if (await exists(archivePath)) {
                await Deno.remove(archivePath, { recursive: true });
            }
        }
        const revisionInfo = this.revisionInfo(revision);
        if (revisionInfo && Deno.build.os !== "windows") {
            await Deno.chmod(revisionInfo.executablePath, 0o755);
            if (Deno.build.os === "darwin" && this._product === "chrome") {
                await macOSMakeChromiumHelpersExecutable(revisionInfo.executablePath);
            }
        }
        return revisionInfo;
    }
    async localRevisions() {
        if (!(await exists(this._downloadsFolder)))
            return [];
        const fileNames = [];
        for await (const file of Deno.readDir(this._downloadsFolder)) {
            fileNames.push(file.name);
        }
        return fileNames
            .map((fileName) => parseName(this._product, fileName))
            .filter((entry) => entry && entry.platform === this._platform)
            .map((entry) => entry.revision);
    }
    async remove(revision) {
        const folderPath = this._getFolderPath(revision);
        assert(await exists(folderPath), `Failed to remove: revision ${revision} is not downloaded`);
        await Deno.remove(folderPath, { recursive: true });
    }
    revisionInfo(revision) {
        const folderPath = this._getFolderPath(revision);
        let executablePath = "";
        if (this._product === "chrome") {
            if (this._platform === "mac") {
                executablePath = pathJoin(folderPath, archiveName(this._product, this._platform, revision), "Chromium.app", "Contents", "MacOS", "Chromium");
            }
            else if (this._platform === "linux") {
                executablePath = pathJoin(folderPath, archiveName(this._product, this._platform, revision), "chrome");
            }
            else if (this._platform === "win32" || this._platform === "win64") {
                executablePath = pathJoin(folderPath, archiveName(this._product, this._platform, revision), "chrome.exe");
            }
            else
                throw new Error("Unsupported platform: " + this._platform);
        }
        else if (this._product === "firefox") {
            if (this._platform === "mac") {
                executablePath = pathJoin(folderPath, "Firefox Nightly.app", "Contents", "MacOS", "firefox");
            }
            else if (this._platform === "linux") {
                executablePath = pathJoin(folderPath, "firefox", "firefox");
            }
            else if (this._platform === "win32" || this._platform === "win64") {
                executablePath = pathJoin(folderPath, "firefox", "firefox.exe");
            }
            else
                throw new Error("Unsupported platform: " + this._platform);
        }
        else {
            throw new Error("Unsupported product: " + this._product);
        }
        const url = downloadURL(this._product, this._platform, this._downloadHost, revision);
        const local = existsSync(folderPath);
        debugFetcher({
            revision,
            executablePath,
            folderPath,
            local,
            url,
            product: this._product,
        });
        return {
            revision,
            executablePath,
            folderPath,
            local,
            url,
            product: this._product,
        };
    }
    _getFolderPath(revision) {
        return pathJoin(this._downloadsFolder, this._platform + "-" + revision);
    }
}
function parseName(product, name) {
    const splits = name.split("-");
    if (splits.length !== 2)
        return null;
    const [platform, revision] = splits;
    if (!downloadURLs[product]?.[platform])
        return null;
    return { product, platform, revision };
}
async function downloadFile(url, destinationPath, progressCallback) {
    debugFetcher(`Downloading binary from ${url}`);
    const response = await fetch(url, { method: "GET" });
    if (response.status !== 200) {
        const error = new Error(`Download failed: server returned code ${response.status}. URL: ${url}`);
        await response.arrayBuffer();
        throw error;
    }
    const totalBytes = parseInt(response.headers.get("content-length") ?? "", 10);
    let downloadedBytes = 0;
    const file = await Deno.create(destinationPath);
    for await (const chunk of response.body) {
        downloadedBytes += chunk.length;
        progressCallback?.(downloadedBytes, totalBytes);
        await Deno.writeAll(file, chunk);
    }
}
function install(archivePath, folderPath) {
    debugFetcher(`Installing ${archivePath} to ${folderPath}`);
    if (archivePath.endsWith(".zip"))
        return extractZip(archivePath, folderPath);
    else if (archivePath.endsWith(".tar.bz2")) {
        return extractTar(archivePath, folderPath);
    }
    else if (archivePath.endsWith(".dmg")) {
        return Deno.mkdir(folderPath, { recursive: true }).then(() => installDMG(archivePath, folderPath));
    }
    else
        throw new Error(`Unsupported archive format: ${archivePath}`);
}
async function extractZip(zipPath, folderPath) {
    const z = await readZip(zipPath);
    await z.unzip(folderPath);
}
async function extractTar(tarPath, folderPath) {
    console.log(folderPath);
    await Deno.mkdir(folderPath, { recursive: true });
    const bzcat = Deno.run({
        cmd: ["bzcat", tarPath],
        stdout: "piped",
    });
    const tmp = await Deno.makeTempFile();
    const file = await Deno.create(tmp);
    await Deno.copy(bzcat.stdout, file);
    assert((await bzcat.status()).success, "failed bzcat");
    bzcat.close();
    const untar = Deno.run({
        cmd: ["tar", "-C", folderPath, "-xvf", tmp],
    });
    assert((await untar.status()).success, "failed untar");
    untar.close();
}
async function installDMG(dmgPath, folderPath) {
    let mountPath;
    try {
        const proc = Deno.run({
            cmd: ["hdiutil", "attach", "-nobrowse", "-noautoopen", dmgPath],
        });
        const stdout = new TextDecoder().decode(await proc.output());
        proc.close();
        const volumes = stdout.match(/\/Volumes\/(.*)/m);
        if (!volumes)
            throw new Error(`Could not find volume path in ${stdout}`);
        mountPath = volumes[0];
        let appName = undefined;
        for await (const file of Deno.readDir(mountPath)) {
            if (file.name.endsWith(".app")) {
                appName = file.name;
                break;
            }
        }
        if (!appName)
            throw new Error(`Cannot find app in ${mountPath}`);
        copyDir(pathJoin(mountPath, appName), folderPath);
    }
    finally {
        if (mountPath) {
            const proc = Deno.run({
                cmd: ["hdiutil", "detach", mountPath, "-quiet"],
            });
            debugFetcher(`Unmounting ${mountPath}`);
            const status = await proc.status();
            proc.close();
            assert(status.success, "unmounting failed");
        }
    }
}
async function macOSMakeChromiumHelpersExecutable(executablePath) {
    const helperApps = [
        "Chromium Helper",
        "Chromium Helper (GPU)",
        "Chromium Helper (Plugin)",
        "Chromium Helper (Renderer)",
    ];
    const frameworkPath = pathResolve(executablePath, pathJoin("..", "..", "Frameworks", "Chromium Framework.framework", "Versions"));
    const versionPath = pathJoin(frameworkPath, "Current");
    try {
        const version = await Deno.readTextFile(versionPath);
        for (const helperApp of helperApps) {
            const helperAppPath = pathJoin(frameworkPath, version, "Helpers", helperApp + ".app", "Contents", "MacOS", helperApp);
            await Deno.chmod(helperAppPath, 0o755);
        }
    }
    catch (err) {
        console.error('Failed to make Chromium Helpers executable', String(err));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQnJvd3NlckZldGNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJCcm93c2VyRmV0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFpQkEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNoRixPQUFPLEVBQ0wsT0FBTyxFQUNQLE1BQU0sRUFDTixVQUFVLEVBQ1YsUUFBUSxFQUNSLFdBQVcsRUFDWCxPQUFPLEdBQ1IsTUFBTSwyQ0FBMkMsQ0FBQztBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXZFLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRWhELE1BQU0sWUFBWSxHQUFHO0lBQ25CLE1BQU0sRUFBRTtRQUNOLEtBQUssRUFBRSxtREFBbUQ7UUFDMUQsR0FBRyxFQUFFLDZDQUE2QztRQUNsRCxLQUFLLEVBQUUsNkNBQTZDO1FBQ3BELEtBQUssRUFBRSxpREFBaUQ7S0FDekQ7SUFDRCxPQUFPLEVBQUU7UUFDUCxLQUFLLEVBQUUsdUNBQXVDO1FBQzlDLEdBQUcsRUFBRSw0QkFBNEI7UUFDakMsS0FBSyxFQUFFLDRCQUE0QjtRQUNuQyxLQUFLLEVBQUUsNEJBQTRCO0tBQ3BDO0NBQ08sQ0FBQztBQUVYLE1BQU0sYUFBYSxHQUFHO0lBQ3BCLE1BQU0sRUFBRTtRQUNOLElBQUksRUFBRSxnQ0FBZ0M7UUFDdEMsV0FBVyxFQUFFLFVBQVU7S0FDeEI7SUFDRCxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQ0Ysd0VBQXdFO1FBQzFFLFdBQVcsRUFBRSxTQUFTO0tBQ3ZCO0NBQ08sQ0FBQztBQVFYLFNBQVMsV0FBVyxDQUNsQixPQUFnQixFQUNoQixRQUFrQixFQUNsQixRQUFnQjtJQUVoQixJQUFJ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QUFPLEVBQ1AsU0FBUyxFQUNULFNBQVMsR0FBRyxNQUFNLEVBQ2xCLFVBQVUsRUFDVixPQUFPLEVBQ1AsU0FBUyxDQUNWLENBQUM7WUFDRixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3hDO0tBQ0Y7SUFBQyxPQUFPLEdBQUcsRUFBRTtRQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDMUU7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgeyBQcm9kdWN0IH0gZnJvbSBcIi4uLy4uL3ZlbmRvci9wdXBwZXRlZXItY29yZS9wdXBwZXRlZXIvY29tbW9uL1Byb2R1Y3QuanNcIjtcbmltcG9ydCB7IGRlYnVnIH0gZnJvbSBcIi4uLy4uL3ZlbmRvci9wdXBwZXRlZXItY29yZS9wdXBwZXRlZXIvY29tbW9uL0RlYnVnLmpzXCI7XG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vLi4vdmVuZG9yL3B1cHBldGVlci1jb3JlL3B1cHBldGVlci9jb21tb24vYXNzZXJ0LmpzXCI7XG5pbXBvcnQge1xuICBjb3B5RGlyLFxuICBleGlzdHMsXG4gIGV4aXN0c1N5bmMsXG4gIHBhdGhKb2luLFxuICBwYXRoUmVzb2x2ZSxcbiAgc3ByaW50Zixcbn0gZnJvbSBcIi4uLy4uL3ZlbmRvci9wdXBwZXRlZXItY29yZS92ZW5kb3Ivc3RkLnRzXCI7XG5pbXBvcnQgeyByZWFkWmlwIH0gZnJvbSBcIi4uLy4uL3ZlbmRvci9wdXBwZXRlZXItY29yZS92ZW5kb3IvemlwL21vZC50c1wiO1xuaW1wb3J0IHsgY2FjaGVkaXIgfSBmcm9tIFwiLi4vLi4vdmVuZG9yL3B1cHBldGVlci1jb3JlL3ZlbmRvci9jYWNoZS50c1wiO1xuXG5jb25zdCBkZWJ1Z0ZldGNoZXIgPSBkZWJ1ZyhgcHVwcGV0ZWVyOmZldGNoZXJgKTtcblxuY29uc3QgZG93bmxvYWRVUkxzID0ge1xuICBjaHJvbWU6IHtcbiAgICBsaW51eDogXCIlcy9jaHJvbWl1bS1icm93c2VyLXNuYXBzaG90cy9MaW51eF94NjQvJWQvJXMuemlwXCIsXG4gICAgbWFjOiBcIiVzL2Nocm9taXVtLWJyb3dzZXItc25hcHNob3RzL01hYy8lZC8lcy56aXBcIixcbiAgICB3aW4zMjogXCIlcy9jaHJvbWl1bS1icm93c2VyLXNuYXBzaG90cy9XaW4vJWQvJXMuemlwXCIsXG4gICAgd2luNjQ6IFwiJXMvY2hyb21pdW0tYnJvd3Nlci1zbmFwc2hvdHMvV2luX3g2NC8lZC8lcy56aXBcIixcbiAgfSxcbiAgZmlyZWZveDoge1xuICAgIGxpbnV4OiBcIiVzL2ZpcmVmb3gtJXMuZW4tVVMuJXMteDg2XzY0LnRhci5iejJcIixcbiAgICBtYWM6IFwiJXMvZmlyZWZveC0lcy5lbi1VUy4lcy5kbWdcIixcbiAgICB3aW4zMjogXCIlcy9maXJlZm94LSVzLmVuLVVTLiVzLnppcFwiLFxuICAgIHdpbjY0OiBcIiVzL2ZpcmVmb3gtJXMuZW4tVVMuJXMuemlwXCIsXG4gIH0sXG59IGFzIGNvbnN0O1xuXG5jb25zdCBicm93c2VyQ29uZmlnID0ge1xuICBjaHJvbWU6IHtcbiAgICBob3N0OiBcImh0dHBzOi8vc3RvcmFnZS5nb29nbGVhcGlzLmNvbVwiLFxuICAgIGRlc3RpbmF0aW9uOiBcImNocm9taXVtXCIsXG4gIH0sXG4gIGZpcmVmb3g6IHtcbiAgICBob3N0OlxuICAgICAgXCJodHRwczovL2FyY2hpdmUubW96aWxsYS5vcmcvcHViL2ZpcmVmb3gvbmlnaHRseS9sYXRlc3QtbW96aWxsYS1jZW50cmFsXCIsXG4gICAgZGVzdGluYXRpb246IFwiZmlyZWZveFwiLFxuICB9LFxufSBhcyBjb25zdDtcblxuLyoqXG4gKiBTdXBwb3J0ZWQgcGxhdGZvcm1zLlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgdHlwZSBQbGF0Zm9ybSA9IFwibGludXhcIiB8IFwibWFjXCIgfCBcIndpbjMyXCIgfCBcIndpbjY0XCI7XG5cbmZ1bmN0aW9uIGFyY2hpdmVOYW1lKFxuICBwcm9kdWN0OiBQcm9kdWN0LFxuICBwbGF0Zm9ybTogUGxhdGZvcm0sXG4gIHJldmlzaW9uOiBzdHJpbmdcbik6IHN0cmluZyB7XG4gIGlmIChwcm9kdWN0ID09PSBcImNocm9tZVwiKSB7XG4gICAgaWYgKHBsYXRmb3JtID09PSBcImxpbnV4XCIpIHJldHVybiBcImNocm9tZS1saW51eFwiO1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJtYWNcIikgcmV0dXJuIFwiY2hyb21lLW1hY1wiO1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiIHx8IHBsYXRmb3JtID09PSBcIndpbjY0XCIpIHtcbiAgICAgIC8vIFdpbmRvd3MgYXJjaGl2ZSBuYW1lIGNoYW5nZWQgYXQgcjU5MTQ3OS5cbiAgICAgIHJldHVybiBwYXJzZUludChyZXZpc2lvbiwgMTApID4gNTkxNDc5ID8gXCJjaHJvbWUtd2luXCIgOiBcImNocm9tZS13aW4zMlwiO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwcm9kdWN0ID09PSBcImZpcmVmb3hcIikge1xuICAgIHJldHVybiBwbGF0Zm9ybTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvZHVjdDogJHtwcm9kdWN0fWApO1xufVxuXG4vKipcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBkb3dubG9hZFVSTChcbiAgcHJvZHVjdDogUHJvZHVjdCxcbiAgcGxhdGZvcm06IFBsYXRmb3JtLFxuICBob3N0OiBzdHJpbmcsXG4gIHJldmlzaW9uOiBzdHJpbmdcbik6IHN0cmluZyB7XG4gIGNvbnN0IHVybCA9IHNwcmludGYoXG4gICAgZG93bmxvYWRVUkxzW3Byb2R1Y3RdW3BsYXRmb3JtXSxcbiAgICBob3N0LFxuICAgIHJldmlzaW9uLFxuICAgIGFyY2hpdmVOYW1lKHByb2R1Y3QsIHBsYXRmb3JtLCByZXZpc2lvbilcbiAgKTtcbiAgcmV0dXJuIHVybDtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXJtNjQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHN0YXRzID0gYXdhaXQgRGVuby5zdGF0KFwiL3Vzci9iaW4vY2hyb21pdW0tYnJvd3NlclwiKTtcbiAgaWYgKHN0YXRzID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zb2xlLmVycm9yKGBUaGUgY2hyb21pdW0gYmluYXJ5IGlzIG5vdCBhdmFpbGFibGUgZm9yIGFybTY0OiBgKTtcbiAgICBjb25zb2xlLmVycm9yKGBJZiB5b3UgYXJlIG9uIFVidW50dSwgeW91IGNhbiBpbnN0YWxsIHdpdGg6IGApO1xuICAgIGNvbnNvbGUuZXJyb3IoYFxcbiBhcHQtZ2V0IGluc3RhbGwgY2hyb21pdW0tYnJvd3NlclxcbmApO1xuICAgIHRocm93IG5ldyBFcnJvcigpO1xuICB9XG59XG5cbi8qKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyb3dzZXJGZXRjaGVyT3B0aW9ucyB7XG4gIHBsYXRmb3JtPzogUGxhdGZvcm07XG4gIHByb2R1Y3Q/OiBzdHJpbmc7XG4gIHBhdGg/OiBzdHJpbmc7XG4gIGhvc3Q/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyb3dzZXJGZXRjaGVyUmV2aXNpb25JbmZvIHtcbiAgZm9sZGVyUGF0aDogc3RyaW5nO1xuICBleGVjdXRhYmxlUGF0aDogc3RyaW5nO1xuICB1cmw6IHN0cmluZztcbiAgbG9jYWw6IGJvb2xlYW47XG4gIHJldmlzaW9uOiBzdHJpbmc7XG4gIHByb2R1Y3Q6IHN0cmluZztcbn1cbi8qKlxuICogQnJvd3NlckZldGNoZXIgY2FuIGRvd25sb2FkIGFuZCBtYW5hZ2UgZGlmZmVyZW50IHZlcnNpb25zIG9mIENocm9taXVtIGFuZCBGaXJlZm94LlxuICpcbiAqIEByZW1hcmtzXG4gKiBCcm93c2VyRmV0Y2hlciBvcGVyYXRlcyBvbiByZXZpc2lvbiBzdHJpbmdzIHRoYXQgc3BlY2lmeSBhIHByZWNpc2UgdmVyc2lvbiBvZiBDaHJvbWl1bSwgZS5nLiBgXCI1MzMyNzFcImAuIFJldmlzaW9uIHN0cmluZ3MgY2FuIGJlIG9idGFpbmVkIGZyb20ge0BsaW5rIGh0dHA6Ly9vbWFoYXByb3h5LmFwcHNwb3QuY29tLyB8IG9tYWhhcHJveHkuYXBwc3BvdC5jb219LlxuICogSW4gdGhlIEZpcmVmb3ggY2FzZSwgQnJvd3NlckZldGNoZXIgZG93bmxvYWRzIEZpcmVmb3ggTmlnaHRseSBhbmRcbiAqIG9wZXJhdGVzIG9uIHZlcnNpb24gbnVtYmVycyBzdWNoIGFzIGBcIjc1XCJgLlxuICpcbiAqIEBleGFtcGxlXG4gKiBBbiBleGFtcGxlIG9mIHVzaW5nIEJyb3dzZXJGZXRjaGVyIHRvIGRvd25sb2FkIGEgc3BlY2lmaWMgdmVyc2lvbiBvZiBDaHJvbWl1bVxuICogYW5kIHJ1bm5pbmcgUHVwcGV0ZWVyIGFnYWluc3QgaXQ6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IGJyb3dzZXJGZXRjaGVyID0gcHVwcGV0ZWVyLmNyZWF0ZUJyb3dzZXJGZXRjaGVyKCk7XG4gKiBjb25zdCByZXZpc2lvbkluZm8gPSBhd2FpdCBicm93c2VyRmV0Y2hlci5kb3dubG9hZCgnNTMzMjcxJyk7XG4gKiBjb25zdCBicm93c2VyID0gYXdhaXQgcHVwcGV0ZWVyLmxhdW5jaCh7ZXhlY3V0YWJsZVBhdGg6IHJldmlzaW9uSW5mby5leGVjdXRhYmxlUGF0aH0pXG4gKiBgYGBcbiAqXG4gKiAqKk5PVEUqKiBCcm93c2VyRmV0Y2hlciBpcyBub3QgZGVzaWduZWQgdG8gd29yayBjb25jdXJyZW50bHkgd2l0aCBvdGhlclxuICogaW5zdGFuY2VzIG9mIEJyb3dzZXJGZXRjaGVyIHRoYXQgc2hhcmUgdGhlIHNhbWUgZG93bmxvYWRzIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHVibGljXG4gKi9cblxuZXhwb3J0IGNsYXNzIEJyb3dzZXJGZXRjaGVyIHtcbiAgcHJpdmF0ZSBfcHJvZHVjdDogUHJvZHVjdDtcbiAgcHJpdmF0ZSBfZG93bmxvYWRzRm9sZGVyOiBzdHJpbmc7XG4gIHByaXZhdGUgX2Rvd25sb2FkSG9zdDogc3RyaW5nO1xuICBwcml2YXRlIF9wbGF0Zm9ybSE6IFBsYXRmb3JtO1xuXG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEJyb3dzZXJGZXRjaGVyT3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5fcHJvZHVjdCA9IChvcHRpb25zLnByb2R1Y3QgfHwgXCJjaHJvbWVcIikudG9Mb3dlckNhc2UoKSBhcyBQcm9kdWN0O1xuICAgIGFzc2VydChcbiAgICAgIHRoaXMuX3Byb2R1Y3QgPT09IFwiY2hyb21lXCIgfHwgdGhpcy5fcHJvZHVjdCA9PT0gXCJmaXJlZm94XCIsXG4gICAgICBgVW5rbm93biBwcm9kdWN0OiBcIiR7b3B0aW9ucy5wcm9kdWN0fVwiYFxuICAgICk7XG5cbiAgICB0aGlzLl9kb3dubG9hZHNGb2xkZXIgPVxuICAgICAgb3B0aW9ucy5wYXRoIHx8XG4gICAgICBwYXRoSm9pbihcbiAgICAgICAgY2FjaGVkaXIoKSxcbiAgICAgICAgXCJkZW5vX3B1cHBldGVlclwiLFxuICAgICAgICBicm93c2VyQ29uZmlnW3RoaXMuX3Byb2R1Y3RdLmRlc3RpbmF0aW9uXG4gICAgICApO1xuICAgIHRoaXMuX2Rvd25sb2FkSG9zdCA9IG9wdGlvbnMuaG9zdCB8fCBicm93c2VyQ29uZmlnW3RoaXMuX3Byb2R1Y3RdLmhvc3Q7XG4gICAgdGhpcy5zZXRQbGF0Zm9ybShvcHRpb25zLnBsYXRmb3JtKTtcbiAgICBhc3NlcnQoXG4gICAgICBkb3dubG9hZFVSTHNbdGhpcy5fcHJvZHVjdF1bdGhpcy5fcGxhdGZvcm1dLFxuICAgICAgXCJVbnN1cHBvcnRlZCBwbGF0Zm9ybTogXCIgKyB0aGlzLl9wbGF0Zm9ybVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIHNldFBsYXRmb3JtKHBsYXRmb3JtRnJvbU9wdGlvbnM/OiBQbGF0Zm9ybSk6IHZvaWQge1xuICAgIGlmIChwbGF0Zm9ybUZyb21PcHRpb25zKSB7XG4gICAgICB0aGlzLl9wbGF0Zm9ybSA9IHBsYXRmb3JtRnJvbU9wdGlvbnM7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGxhdGZvcm0gPSBEZW5vLmJ1aWxkLm9zO1xuICAgIGlmIChwbGF0Zm9ybSA9PT0gXCJkYXJ3aW5cIikgdGhpcy5fcGxhdGZvcm0gPSBcIm1hY1wiO1xuICAgIGVsc2UgaWYgKHBsYXRmb3JtID09PSBcImxpbnV4XCIpIHRoaXMuX3BsYXRmb3JtID0gXCJsaW51eFwiO1xuICAgIGVsc2UgaWYgKHBsYXRmb3JtID09PSBcIndpbmRvd3NcIikge1xuICAgICAgdGhpcy5fcGxhdGZvcm0gPSBEZW5vLmJ1aWxkLmFyY2ggPT09IFwieDg2XzY0XCIgPyBcIndpbjY0XCIgOiBcIndpbjMyXCI7XG4gICAgfSBlbHNlIGFzc2VydCh0aGlzLl9wbGF0Zm9ybSwgXCJVbnN1cHBvcnRlZCBwbGF0Zm9ybTogXCIgKyBEZW5vLmJ1aWxkLm9zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBSZXR1cm5zIHRoZSBjdXJyZW50IGBQbGF0Zm9ybWAuXG4gICAqL1xuICBwbGF0Zm9ybSgpOiBQbGF0Zm9ybSB7XG4gICAgcmV0dXJuIHRoaXMuX3BsYXRmb3JtO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIFJldHVybnMgdGhlIGN1cnJlbnQgYFByb2R1Y3RgLlxuICAgKi9cbiAgcHJvZHVjdCgpOiBQcm9kdWN0IHtcbiAgICByZXR1cm4gdGhpcy5fcHJvZHVjdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyBUaGUgZG93bmxvYWQgaG9zdCBiZWluZyB1c2VkLlxuICAgKi9cbiAgaG9zdCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9kb3dubG9hZEhvc3Q7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhdGVzIGEgSEVBRCByZXF1ZXN0IHRvIGNoZWNrIGlmIHRoZSByZXZpc2lvbiBpcyBhdmFpbGFibGUuXG4gICAqIEByZW1hcmtzXG4gICAqIFRoaXMgbWV0aG9kIGlzIGFmZmVjdGVkIGJ5IHRoZSBjdXJyZW50IGBwcm9kdWN0YC5cbiAgICogQHBhcmFtIHJldmlzaW9uIC0gVGhlIHJldmlzaW9uIHRvIGNoZWNrIGF2YWlsYWJpbGl0eSBmb3IuXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGB0cnVlYCBpZiB0aGUgcmV2aXNpb24gY291bGQgYmUgZG93bmxvYWRlZFxuICAgKiBmcm9tIHRoZSBob3N0LlxuICAgKi9cbiAgYXN5bmMgY2FuRG93bmxvYWQocmV2aXNpb246IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHVybCA9IGRvd25sb2FkVVJMKFxuICAgICAgdGhpcy5fcHJvZHVjdCxcbiAgICAgIHRoaXMuX3BsYXRmb3JtLFxuICAgICAgdGhpcy5fZG93bmxvYWRIb3N0LFxuICAgICAgcmV2aXNpb25cbiAgICApO1xuICAgIGNvbnN0IHJlcSA9IGF3YWl0IGZldGNoKHVybCwgeyBtZXRob2Q6IFwiaGVhZFwiIH0pO1xuICAgIHJldHVybiByZXEuc3RhdHVzID09IDIwMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWF0ZXMgYSBHRVQgcmVxdWVzdCB0byBkb3dubG9hZCB0aGUgcmV2aXNpb24gZnJvbSB0aGUgaG9zdC5cbiAgICogQHJlbWFya3NcbiAgICogVGhpcyBtZXRob2QgaXMgYWZmZWN0ZWQgYnkgdGhlIGN1cnJlbnQgYHByb2R1Y3RgLlxuICAgKiBAcGFyYW0gcmV2aXNpb24gLSBUaGUgcmV2aXNpb24gdG8gZG93bmxvYWQuXG4gICAqIEBwYXJhbSBwcm9ncmVzc0NhbGxiYWNrIC0gQSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgY2FsbGVkIHdpdGggdHdvIGFyZ3VtZW50czpcbiAgICogSG93IG1hbnkgYnl0ZXMgaGF2ZSBiZWVuIGRvd25sb2FkZWQgYW5kIHRoZSB0b3RhbCBudW1iZXIgb2YgYnl0ZXMgb2YgdGhlIGRvd25sb2FkLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2Ugd2l0aCByZXZpc2lvbiBpbmZvcm1hdGlvbiB3aGVuIHRoZSByZXZpc2lvbiBpcyBkb3dubG9hZGVkXG4gICAqIGFuZCBleHRyYWN0ZWQuXG4gICAqL1xuICBhc3luYyBkb3dubG9hZChcbiAgICByZXZpc2lvbjogc3RyaW5nLFxuICAgIHByb2dyZXNzQ2FsbGJhY2s6ICh4OiBudW1iZXIsIHk6IG51bWJlcikgPT4gdm9pZCA9ICgpOiB2b2lkID0+IHt9XG4gICk6IFByb21pc2U8QnJvd3NlckZldGNoZXJSZXZpc2lvbkluZm8+IHtcbiAgICBjb25zdCB1cmwgPSBkb3dubG9hZFVSTChcbiAgICAgIHRoaXMuX3Byb2R1Y3QsXG4gICAgICB0aGlzLl9wbGF0Zm9ybSxcbiAgICAgIHRoaXMuX2Rvd25sb2FkSG9zdCxcbiAgICAgIHJldmlzaW9uXG4gICAgKTtcbiAgICBjb25zdCBmaWxlTmFtZSA9IHVybC5zcGxpdChcIi9cIikucG9wKCkhO1xuICAgIGNvbnN0IGFyY2hpdmVQYXRoID0gcGF0aEpvaW4odGhpcy5fZG93bmxvYWRzRm9sZGVyLCBmaWxlTmFtZSk7XG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHRoaXMuX2dldEZvbGRlclBhdGgocmV2aXNpb24pO1xuICAgIGlmIChhd2FpdCBleGlzdHMob3V0cHV0UGF0aCkpIHJldHVybiB0aGlzLnJldmlzaW9uSW5mbyhyZXZpc2lvbik7XG4gICAgaWYgKCEoYXdhaXQgZXhpc3RzKHRoaXMuX2Rvd25sb2Fkc0ZvbGRlcikpKSB7XG4gICAgICBhd2FpdCBEZW5vLm1rZGlyKHRoaXMuX2Rvd25sb2Fkc0ZvbGRlciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfVxuICAgIGlmICgoRGVuby5idWlsZC5hcmNoIGFzIHN0cmluZykgPT09IFwiYXJtNjRcIikge1xuICAgICAgLy8gaGFuZGxlQXJtNjQoKTtcbiAgICAgIC8vIHJldHVybjtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJhcm02NCBkb3dubG9hZHMgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIlVzZSBQVVBQRVRFRVJfRVhFQ1VUQUJMRV9QQVRIIHRvIHNwZWNpZnkgYW4gZXhlY3V0YWJsZSBwYXRoLlwiXG4gICAgICApO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBkb3dubG9hZEZpbGUodXJsLCBhcmNoaXZlUGF0aCwgcHJvZ3Jlc3NDYWxsYmFjayk7XG4gICAgICBhd2FpdCBpbnN0YWxsKGFyY2hpdmVQYXRoLCBvdXRwdXRQYXRoKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgaWYgKGF3YWl0IGV4aXN0cyhhcmNoaXZlUGF0aCkpIHtcbiAgICAgICAgYXdhaXQgRGVuby5yZW1vdmUoYXJjaGl2ZVBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXZpc2lvbkluZm8gPSB0aGlzLnJldmlzaW9uSW5mbyhyZXZpc2lvbik7XG4gICAgaWYgKHJldmlzaW9uSW5mbyAmJiBEZW5vLmJ1aWxkLm9zICE9PSBcIndpbmRvd3NcIikge1xuICAgICAgYXdhaXQgRGVuby5jaG1vZChyZXZpc2lvbkluZm8uZXhlY3V0YWJsZVBhdGgsIDBvNzU1KTtcbiAgICAgIGlmIChEZW5vLmJ1aWxkLm9zID09PSBcImRhcndpblwiICYmIHRoaXMuX3Byb2R1Y3QgPT09IFwiY2hyb21lXCIpIHtcbiAgICAgICAgYXdhaXQgbWFjT1NNYWtlQ2hyb21pdW1IZWxwZXJzRXhlY3V0YWJsZShyZXZpc2lvbkluZm8uZXhlY3V0YWJsZVBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV2aXNpb25JbmZvO1xuICB9XG5cbiAgLyoqXG4gICAqIEByZW1hcmtzXG4gICAqIFRoaXMgbWV0aG9kIGlzIGFmZmVjdGVkIGJ5IHRoZSBjdXJyZW50IGBwcm9kdWN0YC5cbiAgICogQHJldHVybnMgQSBwcm9taXNlIHdpdGggYSBsaXN0IG9mIGFsbCByZXZpc2lvbiBzdHJpbmdzIChmb3IgdGhlIGN1cnJlbnQgYHByb2R1Y3RgKVxuICAgKiBhdmFpbGFibGUgbG9jYWxseSBvbiBkaXNrLlxuICAgKi9cbiAgYXN5bmMgbG9jYWxSZXZpc2lvbnMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghKGF3YWl0IGV4aXN0cyh0aGlzLl9kb3dubG9hZHNGb2xkZXIpKSkgcmV0dXJuIFtdO1xuICAgIGNvbnN0IGZpbGVOYW1lcyA9IFtdO1xuICAgIGZvciBhd2FpdCAoY29uc3QgZmlsZSBvZiBEZW5vLnJlYWREaXIodGhpcy5fZG93bmxvYWRzRm9sZGVyKSkge1xuICAgICAgZmlsZU5hbWVzLnB1c2goZmlsZS5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGVOYW1lc1xuICAgICAgLm1hcCgoZmlsZU5hbWUpID0+IHBhcnNlTmFtZSh0aGlzLl9wcm9kdWN0LCBmaWxlTmFtZSkpXG4gICAgICAuZmlsdGVyKChlbnRyeSkgPT4gZW50cnkgJiYgZW50cnkucGxhdGZvcm0gPT09IHRoaXMuX3BsYXRmb3JtKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5IS5yZXZpc2lvbik7XG4gIH1cblxuICAvKipcbiAgICogQHJlbWFya3NcbiAgICogVGhpcyBtZXRob2QgaXMgYWZmZWN0ZWQgYnkgdGhlIGN1cnJlbnQgYHByb2R1Y3RgLlxuICAgKiBAcGFyYW0gcmV2aXNpb24gLSBBIHJldmlzaW9uIHRvIHJlbW92ZSBmb3IgdGhlIGN1cnJlbnQgYHByb2R1Y3RgLlxuICAgKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSByZXZpc2lvbiBoYXMgYmVlbiByZW1vdmVzIG9yXG4gICAqIHRocm93cyBpZiB0aGUgcmV2aXNpb24gaGFzIG5vdCBiZWVuIGRvd25sb2FkZWQuXG4gICAqL1xuICBhc3luYyByZW1vdmUocmV2aXNpb246IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZvbGRlclBhdGggPSB0aGlzLl9nZXRGb2xkZXJQYXRoKHJldmlzaW9uKTtcbiAgICBhc3NlcnQoXG4gICAgICBhd2FpdCBleGlzdHMoZm9sZGVyUGF0aCksXG4gICAgICBgRmFpbGVkIHRvIHJlbW92ZTogcmV2aXNpb24gJHtyZXZpc2lvbn0gaXMgbm90IGRvd25sb2FkZWRgXG4gICAgKTtcbiAgICBhd2FpdCBEZW5vLnJlbW92ZShmb2xkZXJQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0gcmV2aXNpb24gLSBUaGUgcmV2aXNpb24gdG8gZ2V0IGluZm8gZm9yLlxuICAgKiBAcmV0dXJucyBUaGUgcmV2aXNpb24gaW5mbyBmb3IgdGhlIGdpdmVuIHJldmlzaW9uLlxuICAgKi9cbiAgcmV2aXNpb25JbmZvKHJldmlzaW9uOiBzdHJpbmcpOiBCcm93c2VyRmV0Y2hlclJldmlzaW9uSW5mbyB7XG4gICAgY29uc3QgZm9sZGVyUGF0aCA9IHRoaXMuX2dldEZvbGRlclBhdGgocmV2aXNpb24pO1xuICAgIGxldCBleGVjdXRhYmxlUGF0aCA9IFwiXCI7XG4gICAgaWYgKHRoaXMuX3Byb2R1Y3QgPT09IFwiY2hyb21lXCIpIHtcbiAgICAgIGlmICh0aGlzLl9wbGF0Zm9ybSA9PT0gXCJtYWNcIikge1xuICAgICAgICBleGVjdXRhYmxlUGF0aCA9IHBhdGhKb2luKFxuICAgICAgICAgIGZvbGRlclBhdGgsXG4gICAgICAgICAgYXJjaGl2ZU5hbWUodGhpcy5fcHJvZHVjdCwgdGhpcy5fcGxhdGZvcm0sIHJldmlzaW9uKSxcbiAgICAgICAgICBcIkNocm9taXVtLmFwcFwiLFxuICAgICAgICAgIFwiQ29udGVudHNcIixcbiAgICAgICAgICBcIk1hY09TXCIsXG4gICAgICAgICAgXCJDaHJvbWl1bVwiXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX3BsYXRmb3JtID09PSBcImxpbnV4XCIpIHtcbiAgICAgICAgZXhlY3V0YWJsZVBhdGggPSBwYXRoSm9pbihcbiAgICAgICAgICBmb2xkZXJQYXRoLFxuICAgICAgICAgIGFyY2hpdmVOYW1lKHRoaXMuX3Byb2R1Y3QsIHRoaXMuX3BsYXRmb3JtLCByZXZpc2lvbiksXG4gICAgICAgICAgXCJjaHJvbWVcIlxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiIHx8IHRoaXMuX3BsYXRmb3JtID09PSBcIndpbjY0XCIpIHtcbiAgICAgICAgZXhlY3V0YWJsZVBhdGggPSBwYXRoSm9pbihcbiAgICAgICAgICBmb2xkZXJQYXRoLFxuICAgICAgICAgIGFyY2hpdmVOYW1lKHRoaXMuX3Byb2R1Y3QsIHRoaXMuX3BsYXRmb3JtLCByZXZpc2lvbiksXG4gICAgICAgICAgXCJjaHJvbWUuZXhlXCJcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBwbGF0Zm9ybTogXCIgKyB0aGlzLl9wbGF0Zm9ybSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wcm9kdWN0ID09PSBcImZpcmVmb3hcIikge1xuICAgICAgaWYgKHRoaXMuX3BsYXRmb3JtID09PSBcIm1hY1wiKSB7XG4gICAgICAgIGV4ZWN1dGFibGVQYXRoID0gcGF0aEpvaW4oXG4gICAgICAgICAgZm9sZGVyUGF0aCxcbiAgICAgICAgICBcIkZpcmVmb3ggTmlnaHRseS5hcHBcIixcbiAgICAgICAgICBcIkNvbnRlbnRzXCIsXG4gICAgICAgICAgXCJNYWNPU1wiLFxuICAgICAgICAgIFwiZmlyZWZveFwiXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX3BsYXRmb3JtID09PSBcImxpbnV4XCIpIHtcbiAgICAgICAgZXhlY3V0YWJsZVBhdGggPSBwYXRoSm9pbihmb2xkZXJQYXRoLCBcImZpcmVmb3hcIiwgXCJmaXJlZm94XCIpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9wbGF0Zm9ybSA9PT0gXCJ3aW4zMlwiIHx8IHRoaXMuX3BsYXRmb3JtID09PSBcIndpbjY0XCIpIHtcbiAgICAgICAgZXhlY3V0YWJsZVBhdGggPSBwYXRoSm9pbihmb2xkZXJQYXRoLCBcImZpcmVmb3hcIiwgXCJmaXJlZm94LmV4ZVwiKTtcbiAgICAgIH0gZWxzZSB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBwbGF0Zm9ybTogXCIgKyB0aGlzLl9wbGF0Zm9ybSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIHByb2R1Y3Q6IFwiICsgdGhpcy5fcHJvZHVjdCk7XG4gICAgfVxuICAgIGNvbnN0IHVybCA9IGRvd25sb2FkVVJMKFxuICAgICAgdGhpcy5fcHJvZHVjdCxcbiAgICAgIHRoaXMuX3BsYXRmb3JtLFxuICAgICAgdGhpcy5fZG93bmxvYWRIb3N0LFxuICAgICAgcmV2aXNpb25cbiAgICApO1xuICAgIGNvbnN0IGxvY2FsID0gZXhpc3RzU3luYyhmb2xkZXJQYXRoKTtcbiAgICBkZWJ1Z0ZldGNoZXIoe1xuICAgICAgcmV2aXNpb24sXG4gICAgICBleGVjdXRhYmxlUGF0aCxcbiAgICAgIGZvbGRlclBhdGgsXG4gICAgICBsb2NhbCxcbiAgICAgIHVybCxcbiAgICAgIHByb2R1Y3Q6IHRoaXMuX3Byb2R1Y3QsXG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJldmlzaW9uLFxuICAgICAgZXhlY3V0YWJsZVBhdGgsXG4gICAgICBmb2xkZXJQYXRoLFxuICAgICAgbG9jYWwsXG4gICAgICB1cmwsXG4gICAgICBwcm9kdWN0OiB0aGlzLl9wcm9kdWN0LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBfZ2V0Rm9sZGVyUGF0aChyZXZpc2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aEpvaW4odGhpcy5fZG93bmxvYWRzRm9sZGVyLCB0aGlzLl9wbGF0Zm9ybSArIFwiLVwiICsgcmV2aXNpb24pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlTmFtZShcbiAgcHJvZHVjdDogUHJvZHVjdCxcbiAgbmFtZTogc3RyaW5nXG4pOiB7IHByb2R1Y3Q6IHN0cmluZzsgcGxhdGZvcm06IHN0cmluZzsgcmV2aXNpb246IHN0cmluZyB9IHwgbnVsbCB7XG4gIGNvbnN0IHNwbGl0cyA9IG5hbWUuc3BsaXQoXCItXCIpO1xuICBpZiAoc3BsaXRzLmxlbmd0aCAhPT0gMikgcmV0dXJuIG51bGw7XG4gIGNvbnN0IFtwbGF0Zm9ybSwgcmV2aXNpb25dID0gc3BsaXRzO1xuICBpZiAoIWRvd25sb2FkVVJMc1twcm9kdWN0XT8uW3BsYXRmb3JtIGFzIFwibGludXhcIl0pIHJldHVybiBudWxsO1xuICByZXR1cm4geyBwcm9kdWN0LCBwbGF0Zm9ybSwgcmV2aXNpb24gfTtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRGaWxlKFxuICB1cmw6IHN0cmluZyxcbiAgZGVzdGluYXRpb25QYXRoOiBzdHJpbmcsXG4gIHByb2dyZXNzQ2FsbGJhY2s6ICh4OiBudW1iZXIsIHk6IG51bWJlcikgPT4gdm9pZFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGRlYnVnRmV0Y2hlcihgRG93bmxvYWRpbmcgYmluYXJ5IGZyb20gJHt1cmx9YCk7XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHsgbWV0aG9kOiBcIkdFVFwiIH0pO1xuXG4gIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xuICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgYERvd25sb2FkIGZhaWxlZDogc2VydmVyIHJldHVybmVkIGNvZGUgJHtyZXNwb25zZS5zdGF0dXN9LiBVUkw6ICR7dXJsfWBcbiAgICApO1xuXG4gICAgLy8gY29uc3VtZSByZXNwb25zZSBkYXRhIHRvIGZyZWUgdXAgbWVtb3J5XG4gICAgYXdhaXQgcmVzcG9uc2UuYXJyYXlCdWZmZXIoKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGNvbnN0IHRvdGFsQnl0ZXMgPSBwYXJzZUludChyZXNwb25zZS5oZWFkZXJzLmdldChcImNvbnRlbnQtbGVuZ3RoXCIpID8/IFwiXCIsIDEwKTtcbiAgbGV0IGRvd25sb2FkZWRCeXRlcyA9IDA7XG5cbiAgY29uc3QgZmlsZSA9IGF3YWl0IERlbm8uY3JlYXRlKGRlc3RpbmF0aW9uUGF0aCk7XG5cbiAgLy8gQHRzLWlnbm9yZSBiZWNhdXNlIGluIGxpYi5kb20gUmVhZGFibGVTdHJlYW0gaXMgbm90IGFuIGFzeW5jIGl0ZXJhdG9yIHlldFxuICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlc3BvbnNlLmJvZHkhKSB7XG4gICAgZG93bmxvYWRlZEJ5dGVzICs9IGNodW5rLmxlbmd0aDtcbiAgICBwcm9ncmVzc0NhbGxiYWNrPy4oZG93bmxvYWRlZEJ5dGVzLCB0b3RhbEJ5dGVzKTtcbiAgICBhd2FpdCBEZW5vLndyaXRlQWxsKGZpbGUsIGNodW5rKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnN0YWxsKGFyY2hpdmVQYXRoOiBzdHJpbmcsIGZvbGRlclBhdGg6IHN0cmluZyk6IFByb21pc2U8dW5rbm93bj4ge1xuICBkZWJ1Z0ZldGNoZXIoYEluc3RhbGxpbmcgJHthcmNoaXZlUGF0aH0gdG8gJHtmb2xkZXJQYXRofWApO1xuICBpZiAoYXJjaGl2ZVBhdGguZW5kc1dpdGgoXCIuemlwXCIpKSByZXR1cm4gZXh0cmFjdFppcChhcmNoaXZlUGF0aCwgZm9sZGVyUGF0aCk7XG4gIGVsc2UgaWYgKGFyY2hpdmVQYXRoLmVuZHNXaXRoKFwiLnRhci5iejJcIikpIHtcbiAgICByZXR1cm4gZXh0cmFjdFRhcihhcmNoaXZlUGF0aCwgZm9sZGVyUGF0aCk7XG4gIH0gZWxzZSBpZiAoYXJjaGl2ZVBhdGguZW5kc1dpdGgoXCIuZG1nXCIpKSB7XG4gICAgcmV0dXJuIERlbm8ubWtkaXIoZm9sZGVyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSkudGhlbigoKSA9PlxuICAgICAgaW5zdGFsbERNRyhhcmNoaXZlUGF0aCwgZm9sZGVyUGF0aClcbiAgICApO1xuICB9IGVsc2UgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBhcmNoaXZlIGZvcm1hdDogJHthcmNoaXZlUGF0aH1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZXh0cmFjdFppcCh6aXBQYXRoOiBzdHJpbmcsIGZvbGRlclBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB6ID0gYXdhaXQgcmVhZFppcCh6aXBQYXRoKTtcbiAgYXdhaXQgei51bnppcChmb2xkZXJQYXRoKTtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZXh0cmFjdFRhcih0YXJQYXRoOiBzdHJpbmcsIGZvbGRlclBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zb2xlLmxvZyhmb2xkZXJQYXRoKTtcbiAgYXdhaXQgRGVuby5ta2Rpcihmb2xkZXJQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBiemNhdCA9IERlbm8ucnVuKHtcbiAgICBjbWQ6IFtcImJ6Y2F0XCIsIHRhclBhdGhdLFxuICAgIHN0ZG91dDogXCJwaXBlZFwiLFxuICB9KTtcbiAgY29uc3QgdG1wID0gYXdhaXQgRGVuby5tYWtlVGVtcEZpbGUoKTtcbiAgY29uc3QgZmlsZSA9IGF3YWl0IERlbm8uY3JlYXRlKHRtcCk7XG4gIGF3YWl0IERlbm8uY29weShiemNhdC5zdGRvdXQsIGZpbGUpO1xuICBhc3NlcnQoKGF3YWl0IGJ6Y2F0LnN0YXR1cygpKS5zdWNjZXNzLCBcImZhaWxlZCBiemNhdFwiKTtcbiAgYnpjYXQuY2xvc2UoKTtcblxuICBjb25zdCB1bnRhciA9IERlbm8ucnVuKHtcbiAgICBjbWQ6IFtcInRhclwiLCBcIi1DXCIsIGZvbGRlclBhdGgsIFwiLXh2ZlwiLCB0bXBdLFxuICB9KTtcbiAgYXNzZXJ0KChhd2FpdCB1bnRhci5zdGF0dXMoKSkuc3VjY2VzcywgXCJmYWlsZWQgdW50YXJcIik7XG4gIHVudGFyLmNsb3NlKCk7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxETUcoZG1nUGF0aDogc3RyaW5nLCBmb2xkZXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IG1vdW50UGF0aDtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcm9jID0gRGVuby5ydW4oe1xuICAgICAgY21kOiBbXCJoZGl1dGlsXCIsIFwiYXR0YWNoXCIsIFwiLW5vYnJvd3NlXCIsIFwiLW5vYXV0b29wZW5cIiwgZG1nUGF0aF0sXG4gICAgfSk7XG4gICAgY29uc3Qgc3Rkb3V0ID0gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGF3YWl0IHByb2Mub3V0cHV0KCkpO1xuICAgIHByb2MuY2xvc2UoKTtcbiAgICBjb25zdCB2b2x1bWVzID0gc3Rkb3V0Lm1hdGNoKC9cXC9Wb2x1bWVzXFwvKC4qKS9tKTtcbiAgICBpZiAoIXZvbHVtZXMpIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgdm9sdW1lIHBhdGggaW4gJHtzdGRvdXR9YCk7XG4gICAgbW91bnRQYXRoID0gdm9sdW1lc1swXTtcblxuICAgIGxldCBhcHBOYW1lID0gdW5kZWZpbmVkO1xuICAgIGZvciBhd2FpdCAoY29uc3QgZmlsZSBvZiBEZW5vLnJlYWREaXIobW91bnRQYXRoKSkge1xuICAgICAgaWYgKGZpbGUubmFtZS5lbmRzV2l0aChcIi5hcHBcIikpIHtcbiAgICAgICAgYXBwTmFtZSA9IGZpbGUubmFtZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghYXBwTmFtZSkgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgZmluZCBhcHAgaW4gJHttb3VudFBhdGh9YCk7XG4gICAgY29weURpcihwYXRoSm9pbihtb3VudFBhdGgsIGFwcE5hbWUpLCBmb2xkZXJQYXRoKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBpZiAobW91bnRQYXRoKSB7XG4gICAgICBjb25zdCBwcm9jID0gRGVuby5ydW4oe1xuICAgICAgICBjbWQ6IFtcImhkaXV0aWxcIiwgXCJkZXRhY2hcIiwgbW91bnRQYXRoLCBcIi1xdWlldFwiXSxcbiAgICAgIH0pO1xuICAgICAgZGVidWdGZXRjaGVyKGBVbm1vdW50aW5nICR7bW91bnRQYXRofWApO1xuICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgcHJvYy5zdGF0dXMoKTtcbiAgICAgIHByb2MuY2xvc2UoKTtcbiAgICAgIGFzc2VydChzdGF0dXMuc3VjY2VzcywgXCJ1bm1vdW50aW5nIGZhaWxlZFwiKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbWFjT1NNYWtlQ2hyb21pdW1IZWxwZXJzRXhlY3V0YWJsZShleGVjdXRhYmxlUGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IGhlbHBlckFwcHMgPSBbXG4gICAgXCJDaHJvbWl1bSBIZWxwZXJcIixcbiAgICBcIkNocm9taXVtIEhlbHBlciAoR1BVKVwiLFxuICAgIFwiQ2hyb21pdW0gSGVscGVyIChQbHVnaW4pXCIsXG4gICAgXCJDaHJvbWl1bSBIZWxwZXIgKFJlbmRlcmVyKVwiLFxuICBdO1xuXG4gIGNvbnN0IGZyYW1ld29ya1BhdGggPSBwYXRoUmVzb2x2ZShcbiAgICBleGVjdXRhYmxlUGF0aCxcbiAgICBwYXRoSm9pbihcIi4uXCIsIFwiLi5cIiwgXCJGcmFtZXdvcmtzXCIsIFwiQ2hyb21pdW0gRnJhbWV3b3JrLmZyYW1ld29ya1wiLCBcIlZlcnNpb25zXCIpLFxuICApO1xuICBjb25zdCB2ZXJzaW9uUGF0aCA9IHBhdGhKb2luKGZyYW1ld29ya1BhdGgsIFwiQ3VycmVudFwiKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHZlcnNpb24gPSBhd2FpdCBEZW5vLnJlYWRUZXh0RmlsZSh2ZXJzaW9uUGF0aCk7XG5cbiAgICBmb3IgKGNvbnN0IGhlbHBlckFwcCBvZiBoZWxwZXJBcHBzKSB7XG4gICAgICBjb25zdCBoZWxwZXJBcHBQYXRoID0gcGF0aEpvaW4oXG4gICAgICAgIGZyYW1ld29ya1BhdGgsXG4gICAgICAgIHZlcnNpb24sXG4gICAgICAgIFwiSGVscGVyc1wiLFxuICAgICAgICBoZWxwZXJBcHAgKyBcIi5hcHBcIixcbiAgICAgICAgXCJDb250ZW50c1wiLFxuICAgICAgICBcIk1hY09TXCIsXG4gICAgICAgIGhlbHBlckFwcCxcbiAgICAgICk7XG4gICAgICBhd2FpdCBEZW5vLmNobW9kKGhlbHBlckFwcFBhdGgsIDBvNzU1KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBtYWtlIENocm9taXVtIEhlbHBlcnMgZXhlY3V0YWJsZScsIFN0cmluZyhlcnIpKTtcbiAgfVxufVxuIl19