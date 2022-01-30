import { Browser } from "../../vendor/puppeteer-core/puppeteer/common/Browser.js";
import { BrowserRunner } from "./BrowserRunner.ts";
import { existsSync, pathJoin, pathResolve, } from "../../vendor/puppeteer-core/vendor/std.ts";
import { BrowserFetcher } from "./BrowserFetcher.ts";
class ChromeLauncher {
    _preferredRevision;
    constructor(preferredRevision) {
        this._preferredRevision = preferredRevision;
    }
    async launch(options = {}) {
        const { ignoreDefaultArgs = false, args = [], executablePath = null, env = Deno.env.toObject(), ignoreHTTPSErrors = false, defaultViewport = { width: 800, height: 600 }, slowMo = 0, timeout = 30000, dumpio = false, } = options;
        const profilePath = pathJoin(await Deno.makeTempDir(), "puppeteer_dev_chrome_profile-");
        await Deno.mkdir(profilePath, { recursive: true });
        const chromeArguments = [];
        if (!ignoreDefaultArgs)
            chromeArguments.push(...this.defaultArgs(options));
        else if (Array.isArray(ignoreDefaultArgs)) {
            chromeArguments.push(...this.defaultArgs(options).filter((arg) => !ignoreDefaultArgs.includes(arg)));
        }
        else
            chromeArguments.push(...args);
        let temporaryUserDataDir = undefined;
        if (!chromeArguments.some((argument) => argument.startsWith("--remote-debugging-"))) {
            chromeArguments.push("--remote-debugging-port=0");
        }
        if (!chromeArguments.some((arg) => arg.startsWith("--user-data-dir"))) {
            temporaryUserDataDir = await Deno.makeTempDir({ dir: profilePath });
            chromeArguments.push(`--user-data-dir=${temporaryUserDataDir}`);
        }
        let chromeExecutable = executablePath;
        if (Deno.build.arch === "arm64") {
            chromeExecutable = "/usr/bin/chromium-browser";
        }
        else if (!executablePath) {
            const { missingText, executablePath } = await resolveExecutablePath(this);
            if (missingText)
                throw new Error(missingText);
            chromeExecutable = executablePath;
        }
        const runner = new BrowserRunner(chromeExecutable, chromeArguments, temporaryUserDataDir);
        runner.start({
            env,
            dumpio,
        });
        try {
            const connection = await runner.setupConnection({
                timeout,
                slowMo,
                preferredRevision: this._preferredRevision,
            });
            const browser = await Browser.create(connection, [], ignoreHTTPSErrors, defaultViewport, runner.proc, runner.close.bind(runner));
            await browser.waitForTarget((t) => t.type() === "page");
            return browser;
        }
        catch (error) {
            runner.kill();
            throw error;
        }
    }
    defaultArgs(options = {}) {
        const chromeArguments = [
            "--disable-background-networking",
            "--enable-features=NetworkService,NetworkServiceInProcess",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-breakpad",
            "--disable-client-side-phishing-detection",
            "--disable-component-extensions-with-background-pages",
            "--disable-default-apps",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-features=Translate",
            "--disable-hang-monitor",
            "--disable-ipc-flooding-protection",
            "--disable-popup-blocking",
            "--disable-prompt-on-repost",
            "--disable-renderer-backgrounding",
            "--disable-sync",
            "--force-color-profile=srgb",
            "--metrics-recording-only",
            "--no-first-run",
            "--enable-automation",
            "--password-store=basic",
            "--use-mock-keychain",
            "--enable-blink-features=IdleDetection",
        ];
        const { devtools = false, headless = !devtools, args = [], userDataDir = null, } = options;
        if (userDataDir) {
            chromeArguments.push(`--user-data-dir=${pathResolve(userDataDir)}`);
        }
        if (devtools)
            chromeArguments.push("--auto-open-devtools-for-tabs");
        if (headless) {
            chromeArguments.push("--headless", "--hide-scrollbars", "--mute-audio");
        }
        if (args.every((arg) => arg.startsWith("-"))) {
            chromeArguments.push("about:blank");
        }
        chromeArguments.push(...args);
        return chromeArguments;
    }
    executablePath() {
        return resolveExecutablePath(this).executablePath;
    }
    get product() {
        return "chrome";
    }
}
class FirefoxLauncher {
    _preferredRevision;
    constructor(preferredRevision) {
        this._preferredRevision = preferredRevision;
    }
    async launch(options = {}) {
        const { ignoreDefaultArgs = false, args = [], executablePath = null, env = Deno.env.toObject(), ignoreHTTPSErrors = false, defaultViewport = { width: 800, height: 600 }, slowMo = 0, timeout = 30000, extraPrefsFirefox = {}, } = options;
        const firefoxArguments = [];
        if (!ignoreDefaultArgs)
            firefoxArguments.push(...this.defaultArgs(options));
        else if (Array.isArray(ignoreDefaultArgs)) {
            firefoxArguments.push(...this.defaultArgs(options).filter((arg) => !ignoreDefaultArgs.includes(arg)));
        }
        else
            firefoxArguments.push(...args);
        if (!firefoxArguments.some((argument) => argument.startsWith("--remote-debugging-"))) {
            firefoxArguments.push("--remote-debugging-port=0");
        }
        let temporaryUserDataDir = undefined;
        if (!firefoxArguments.includes("-profile") &&
            !firefoxArguments.includes("--profile")) {
            temporaryUserDataDir = await this._createProfile(extraPrefsFirefox);
            firefoxArguments.push("--profile");
            firefoxArguments.push(temporaryUserDataDir);
        }
        await this._updateRevision();
        let firefoxExecutable = executablePath;
        if (!executablePath) {
            const { missingText, executablePath } = resolveExecutablePath(this);
            if (missingText)
                throw new Error(missingText);
            firefoxExecutable = executablePath;
        }
        const runner = new BrowserRunner(firefoxExecutable, firefoxArguments, temporaryUserDataDir);
        runner.start({
            env,
        });
        try {
            const connection = await runner.setupConnection({
                timeout,
                slowMo,
                preferredRevision: this._preferredRevision,
            });
            const browser = await Browser.create(connection, [], ignoreHTTPSErrors, defaultViewport, runner.proc, runner.close.bind(runner));
            await browser.waitForTarget((t) => t.type() === "page");
            return browser;
        }
        catch (error) {
            runner.kill();
            throw error;
        }
    }
    executablePath() {
        return resolveExecutablePath(this).executablePath;
    }
    async _updateRevision() {
        if (this._preferredRevision === "latest") {
            const browserFetcher = new BrowserFetcher({
                product: this.product,
            });
            const localRevisions = await browserFetcher.localRevisions();
            if (localRevisions[0])
                this._preferredRevision = localRevisions[0];
        }
    }
    get product() {
        return "firefox";
    }
    defaultArgs(options = {}) {
        const firefoxArguments = ["--no-remote", "--foreground"];
        if (Deno.build.os == "windows") {
            firefoxArguments.push("--wait-for-browser");
        }
        const { devtools = false, headless = !devtools, args = [], userDataDir = null, } = options;
        if (userDataDir) {
            firefoxArguments.push("--profile");
            firefoxArguments.push(userDataDir);
        }
        if (headless)
            firefoxArguments.push("--headless");
        if (devtools)
            firefoxArguments.push("--devtools");
        if (args.every((arg) => arg.startsWith("-"))) {
            firefoxArguments.push("about:blank");
        }
        firefoxArguments.push(...args);
        return firefoxArguments;
    }
    async _createProfile(extraPrefs) {
        const profilePath = pathJoin(await Deno.makeTempDir(), "puppeteer_dev_firefox_profile-");
        await Deno.mkdir(profilePath, { recursive: true });
        const prefsJS = [];
        const userJS = [];
        const server = "dummy.test";
        const defaultPreferences = {
            "app.normandy.api_url": "",
            "app.update.checkInstallTime": false,
            "app.update.disabledForTesting": true,
            "apz.content_response_timeout": 60000,
            "browser.contentblocking.features.standard": "-tp,tpPrivate,cookieBehavior0,-cm,-fp",
            "browser.dom.window.dump.enabled": true,
            "browser.newtabpage.activity-stream.feeds.system.topstories": false,
            "browser.newtabpage.enabled": false,
            "browser.pagethumbnails.capturing_disabled": true,
            "browser.safebrowsing.blockedURIs.enabled": false,
            "browser.safebrowsing.downloads.enabled": false,
            "browser.safebrowsing.malware.enabled": false,
            "browser.safebrowsing.passwords.enabled": false,
            "browser.safebrowsing.phishing.enabled": false,
            "browser.search.update": false,
            "browser.sessionstore.resume_from_crash": false,
            "browser.shell.checkDefaultBrowser": false,
            "browser.startup.homepage": "about:blank",
            "browser.startup.homepage_override.mstone": "ignore",
            "browser.startup.page": 0,
            "browser.tabs.disableBackgroundZombification": false,
            "browser.tabs.warnOnCloseOtherTabs": false,
            "browser.tabs.warnOnOpen": false,
            "browser.uitour.enabled": false,
            "browser.urlbar.suggest.searches": false,
            "browser.usedOnWindows10.introURL": "",
            "browser.warnOnQuit": false,
            "datareporting.healthreport.documentServerURI": `http://${server}/dummy/healthreport/`,
            "datareporting.healthreport.logging.consoleEnabled": false,
            "datareporting.healthreport.service.enabled": false,
            "datareporting.healthreport.service.firstRun": false,
            "datareporting.healthreport.uploadEnabled": false,
            "datareporting.policy.dataSubmissionEnabled": false,
            "datareporting.policy.dataSubmissionPolicyBypassNotification": true,
            "devtools.jsonview.enabled": false,
            "dom.disable_open_during_load": false,
            "dom.file.createInChild": true,
            "dom.ipc.reportProcessHangs": false,
            "dom.max_chrome_script_run_time": 0,
            "dom.max_script_run_time": 0,
            "extensions.autoDisableScopes": 0,
            "extensions.enabledScopes": 5,
            "extensions.getAddons.cache.enabled": false,
            "extensions.installDistroAddons": false,
            "extensions.screenshots.disabled": true,
            "extensions.update.enabled": false,
            "extensions.update.notifyUser": false,
            "extensions.webservice.discoverURL": `http://${server}/dummy/discoveryURL`,
            "fission.autostart": false,
            "focusmanager.testmode": true,
            "general.useragent.updates.enabled": false,
            "geo.provider.testing": true,
            "geo.wifi.scan": false,
            "hangmonitor.timeout": 0,
            "javascript.options.showInConsole": true,
            "media.gmp-manager.updateEnabled": false,
            "network.cookie.cookieBehavior": 0,
            "network.http.prompt-temp-redirect": false,
            "network.http.speculative-parallel-limit": 0,
            "network.manage-offline-status": false,
            "network.sntp.pools": server,
            "plugin.state.flash": 0,
            "privacy.trackingprotection.enabled": false,
            "remote.enabled": true,
            "security.certerrors.mitm.priming.enabled": false,
            "security.fileuri.strict_origin_policy": false,
            "security.notification_enable_delay": 0,
            "services.settings.server": `http://${server}/dummy/blocklist/`,
            "signon.autofillForms": false,
            "signon.rememberSignons": false,
            "startup.homepage_welcome_url": "about:blank",
            "startup.homepage_welcome_url.additional": "",
            "toolkit.cosmeticAnimations.enabled": false,
            "toolkit.startup.max_resumed_crashes": -1,
        };
        Object.assign(defaultPreferences, extraPrefs);
        for (const [key, value] of Object.entries(defaultPreferences)) {
            userJS.push(`user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`);
        }
        await Deno.writeTextFile(pathJoin(profilePath, "user.js"), userJS.join("\n"));
        await Deno.writeTextFile(pathJoin(profilePath, "prefs.js"), prefsJS.join("\n"));
        return profilePath;
    }
}
function resolveExecutablePath(launcher) {
    const executablePath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
    if (executablePath) {
        const missingText = !existsSync(executablePath)
            ? "Tried to use PUPPETEER_EXECUTABLE_PATH env variable to launch browser but did not find any executable at: " +
                executablePath
            : undefined;
        return { executablePath, missingText };
    }
    const downloadPath = Deno.env.get("PUPPETEER_DOWNLOAD_PATH");
    const browserFetcher = new BrowserFetcher({
        product: launcher.product,
        path: downloadPath,
    });
    if (launcher.product === "chrome") {
        const revision = Deno.env.get("PUPPETEER_CHROMIUM_REVISION");
        if (revision) {
            const revisionInfo = browserFetcher.revisionInfo(revision);
            const missingText = !revisionInfo.local
                ? "Tried to use PUPPETEER_CHROMIUM_REVISION env variable to launch browser but did not find executable at: " +
                    revisionInfo.executablePath
                : undefined;
            return { executablePath: revisionInfo.executablePath, missingText };
        }
    }
    const revisionInfo = browserFetcher.revisionInfo(launcher._preferredRevision);
    const missingText = !revisionInfo.local
        ? `Could not find browser revision ${launcher._preferredRevision}. Run "PUPPETEER_PRODUCT=${launcher.product} deno run -A --unstable ${new URL("../../vendor/puppeteer-core/puppeteer/../../../install.ts", import.meta.url)}" to download a supported browser binary.`
        : undefined;
    return { executablePath: revisionInfo.executablePath, missingText };
}
export default function Launcher(preferredRevision, product) {
    if (!product)
        product = Deno.env.get("PUPPETEER_PRODUCT");
    switch (product) {
        case "firefox":
            return new FirefoxLauncher(preferredRevision);
        case "chrome":
        default:
            if (typeof product !== "undefined" && product !== "chrome") {
                console.warn(`Warning: unknown product name ${product}. Falling back to chrome.`);
            }
            return new ChromeLauncher(preferredRevision);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGF1bmNoZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJMYXVuY2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFnQkEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUluRCxPQUFPLEVBQ0wsVUFBVSxFQUNWLFFBQVEsRUFDUixXQUFXLEdBQ1osTUFBTSwyQ0FBMkMsQ0FBQztBQUNuRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFnQnJELE1BQU0sY0FBYztJQUNsQixrQkFBa0IsQ0FBUztJQUUzQixZQUFZLGlCQUF5QjtRQUNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsaUJBQWlCLENBQUM7SUFDOUMsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQ1YsVUFBb0UsRUFBRTtRQUV0RSxNQUFNLEVBQ0osaUJBQWlCLEdBQUcsS0FBSyxFQUN6QixJQUFJLEdBQUcsRUFBRSxFQUNULGNBQWMsR0FBRyxJQUFJLEVBQ3JCLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUN6QixpQkFBaUIsR0FBRyxLQUFLLEVBQ3pCLGVBQWUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUM3QyxNQUFNLEdBQUcsQ0FBQyxFQUNWLE9BQU8sR0FBRyxLQUFLLEVBQ2YsTUFBTSxHQUFHLEtBQUssR0FDZixHQUFHLE9BQU8sQ0FBQztRQUVaLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FDMUIsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQ3hCLCtCQUErQixDQUNoQyxDQUFDO1FBQ0YsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FB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R0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDMUQsUUFBUSxPQUFPLEVBQUU7UUFDZixLQUFLLFNBQVM7WUFDWixPQUFPLElBQUksZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDaEQsS0FBSyxRQUFRLENBQUM7UUFDZDtZQUNFLElBQUksT0FBTyxPQUFPLEtBQUssV0FBVyxJQUFJLE9BQU8sS0FBSyxRQUFRLEVBQUU7Z0JBSzFELE9BQU8sQ0FBQyxJQUFJLENBQ1YsaUNBQWlDLE9BQU8sMkJBQTJCLENBQ3BFLENBQUM7YUFDSDtZQUNELE9BQU8sSUFBSSxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztLQUNoRDtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IEJyb3dzZXIgfSBmcm9tIFwiLi4vLi4vdmVuZG9yL3B1cHBldGVlci1jb3JlL3B1cHBldGVlci9jb21tb24vQnJvd3Nlci5qc1wiO1xuaW1wb3J0IHsgQnJvd3NlclJ1bm5lciB9IGZyb20gXCIuL0Jyb3dzZXJSdW5uZXIudHNcIjtcbmltcG9ydCB7IENocm9tZUFyZ09wdGlvbnMsIExhdW5jaE9wdGlvbnMgfSBmcm9tIFwiLi9MYXVuY2hPcHRpb25zLnRzXCI7XG5pbXBvcnQgeyBCcm93c2VyQ29ubmVjdE9wdGlvbnMgfSBmcm9tIFwiLi4vLi4vdmVuZG9yL3B1cHBldGVlci1jb3JlL3B1cHBldGVlci9jb21tb24vQnJvd3NlckNvbm5lY3Rvci5qc1wiO1xuaW1wb3J0IHsgUHJvZHVjdCB9IGZyb20gXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvcHVwcGV0ZWVyL2NvbW1vbi9Qcm9kdWN0LmpzXCI7XG5pbXBvcnQge1xuICBleGlzdHNTeW5jLFxuICBwYXRoSm9pbixcbiAgcGF0aFJlc29sdmUsXG59IGZyb20gXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvdmVuZG9yL3N0ZC50c1wiO1xuaW1wb3J0IHsgQnJvd3NlckZldGNoZXIgfSBmcm9tIFwiLi9Ccm93c2VyRmV0Y2hlci50c1wiO1xuXG4vKipcbiAqIERlc2NyaWJlcyBhIGxhdW5jaGVyIC0gYSBjbGFzcyB0aGF0IGlzIGFibGUgdG8gY3JlYXRlIGFuZCBsYXVuY2ggYSBicm93c2VyIGluc3RhbmNlLlxuICogQHB1YmxpY1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb2R1Y3RMYXVuY2hlciB7XG4gIGxhdW5jaChvYmplY3Q6IExhdW5jaE9wdGlvbnMgJiBCcm93c2VyQ29ubmVjdE9wdGlvbnMpOiBQcm9taXNlPEJyb3dzZXI+O1xuICBleGVjdXRhYmxlUGF0aDogKCkgPT4gc3RyaW5nO1xuICBkZWZhdWx0QXJncyhvYmplY3Q6IHt9KTogc3RyaW5nW107XG4gIHByb2R1Y3Q6IFByb2R1Y3Q7XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmNsYXNzIENocm9tZUxhdW5jaGVyIGltcGxlbWVudHMgUHJvZHVjdExhdW5jaGVyIHtcbiAgX3ByZWZlcnJlZFJldmlzaW9uOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJlZmVycmVkUmV2aXNpb246IHN0cmluZykge1xuICAgIHRoaXMuX3ByZWZlcnJlZFJldmlzaW9uID0gcHJlZmVycmVkUmV2aXNpb247XG4gIH1cblxuICBhc3luYyBsYXVuY2goXG4gICAgb3B0aW9uczogTGF1bmNoT3B0aW9ucyAmIENocm9tZUFyZ09wdGlvbnMgJiBCcm93c2VyQ29ubmVjdE9wdGlvbnMgPSB7fSxcbiAgKTogUHJvbWlzZTxCcm93c2VyPiB7XG4gICAgY29uc3Qge1xuICAgICAgaWdub3JlRGVmYXVsdEFyZ3MgPSBmYWxzZSxcbiAgICAgIGFyZ3MgPSBbXSxcbiAgICAgIGV4ZWN1dGFibGVQYXRoID0gbnVsbCxcbiAgICAgIGVudiA9IERlbm8uZW52LnRvT2JqZWN0KCksXG4gICAgICBpZ25vcmVIVFRQU0Vycm9ycyA9IGZhbHNlLFxuICAgICAgZGVmYXVsdFZpZXdwb3J0ID0geyB3aWR0aDogODAwLCBoZWlnaHQ6IDYwMCB9LFxuICAgICAgc2xvd01vID0gMCxcbiAgICAgIHRpbWVvdXQgPSAzMDAwMCxcbiAgICAgIGR1bXBpbyA9IGZhbHNlLFxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgY29uc3QgcHJvZmlsZVBhdGggPSBwYXRoSm9pbihcbiAgICAgIGF3YWl0IERlbm8ubWFrZVRlbXBEaXIoKSxcbiAgICAgIFwicHVwcGV0ZWVyX2Rldl9jaHJvbWVfcHJvZmlsZS1cIixcbiAgICApO1xuICAgIGF3YWl0IERlbm8ubWtkaXIocHJvZmlsZVBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGNvbnN0IGNocm9tZUFyZ3VtZW50cyA9IFtdO1xuICAgIGlmICghaWdub3JlRGVmYXVsdEFyZ3MpIGNocm9tZUFyZ3VtZW50cy5wdXNoKC4uLnRoaXMuZGVmYXVsdEFyZ3Mob3B0aW9ucykpO1xuICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWdub3JlRGVmYXVsdEFyZ3MpKSB7XG4gICAgICBjaHJvbWVBcmd1bWVudHMucHVzaChcbiAgICAgICAgLi4udGhpcy5kZWZhdWx0QXJncyhvcHRpb25zKS5maWx0ZXIoXG4gICAgICAgICAgKGFyZykgPT4gIWlnbm9yZURlZmF1bHRBcmdzLmluY2x1ZGVzKGFyZyksXG4gICAgICAgICksXG4gICAgICApO1xuICAgIH0gZWxzZSBjaHJvbWVBcmd1bWVudHMucHVzaCguLi5hcmdzKTtcblxuICAgIGxldCB0ZW1wb3JhcnlVc2VyRGF0YURpciA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChcbiAgICAgICFjaHJvbWVBcmd1bWVudHMuc29tZSgoYXJndW1lbnQpID0+XG4gICAgICAgIGFyZ3VtZW50LnN0YXJ0c1dpdGgoXCItLXJlbW90ZS1kZWJ1Z2dpbmctXCIpXG4gICAgICApXG4gICAgKSB7XG4gICAgICBjaHJvbWVBcmd1bWVudHMucHVzaChcIi0tcmVtb3RlLWRlYnVnZ2luZy1wb3J0PTBcIik7XG4gICAgfVxuICAgIGlmICghY2hyb21lQXJndW1lbnRzLnNvbWUoKGFyZykgPT4gYXJnLnN0YXJ0c1dpdGgoXCItLXVzZXItZGF0YS1kaXJcIikpKSB7XG4gICAgICB0ZW1wb3JhcnlVc2VyRGF0YURpciA9IGF3YWl0IERlbm8ubWFrZVRlbXBEaXIoeyBkaXI6IHByb2ZpbGVQYXRoIH0pO1xuICAgICAgY2hyb21lQXJndW1lbnRzLnB1c2goYC0tdXNlci1kYXRhLWRpcj0ke3RlbXBvcmFyeVVzZXJEYXRhRGlyfWApO1xuICAgIH1cblxuICAgIGxldCBjaHJvbWVFeGVjdXRhYmxlID0gZXhlY3V0YWJsZVBhdGg7XG4gICAgaWYgKChEZW5vLmJ1aWxkLmFyY2ggYXMgc3RyaW5nKSA9PT0gXCJhcm02NFwiKSB7XG4gICAgICBjaHJvbWVFeGVjdXRhYmxlID0gXCIvdXNyL2Jpbi9jaHJvbWl1bS1icm93c2VyXCI7XG4gICAgfSBlbHNlIGlmICghZXhlY3V0YWJsZVBhdGgpIHtcbiAgICAgIGNvbnN0IHsgbWlzc2luZ1RleHQsIGV4ZWN1dGFibGVQYXRoIH0gPSBhd2FpdCByZXNvbHZlRXhlY3V0YWJsZVBhdGgodGhpcyk7XG4gICAgICBpZiAobWlzc2luZ1RleHQpIHRocm93IG5ldyBFcnJvcihtaXNzaW5nVGV4dCk7XG4gICAgICBjaHJvbWVFeGVjdXRhYmxlID0gZXhlY3V0YWJsZVBhdGg7XG4gICAgfVxuXG4gICAgY29uc3QgcnVubmVyID0gbmV3IEJyb3dzZXJSdW5uZXIoXG4gICAgICBjaHJvbWVFeGVjdXRhYmxlISxcbiAgICAgIGNocm9tZUFyZ3VtZW50cyxcbiAgICAgIHRlbXBvcmFyeVVzZXJEYXRhRGlyLFxuICAgICk7XG4gICAgcnVubmVyLnN0YXJ0KHtcbiAgICAgIGVudixcbiAgICAgIGR1bXBpbyxcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb25uZWN0aW9uID0gYXdhaXQgcnVubmVyLnNldHVwQ29ubmVjdGlvbih7XG4gICAgICAgIHRpbWVvdXQsXG4gICAgICAgIHNsb3dNbyxcbiAgICAgICAgcHJlZmVycmVkUmV2aXNpb246IHRoaXMuX3ByZWZlcnJlZFJldmlzaW9uLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBicm93c2VyID0gYXdhaXQgQnJvd3Nlci5jcmVhdGUoXG4gICAgICAgIGNvbm5lY3Rpb24sXG4gICAgICAgIFtdLFxuICAgICAgICBpZ25vcmVIVFRQU0Vycm9ycyxcbiAgICAgICAgZGVmYXVsdFZpZXdwb3J0LFxuICAgICAgICBydW5uZXIucHJvYyxcbiAgICAgICAgcnVubmVyLmNsb3NlLmJpbmQocnVubmVyKSxcbiAgICAgICk7XG4gICAgICBhd2FpdCBicm93c2VyLndhaXRGb3JUYXJnZXQoKHQpID0+IHQudHlwZSgpID09PSBcInBhZ2VcIik7XG4gICAgICByZXR1cm4gYnJvd3NlcjtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcnVubmVyLmtpbGwoKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyFMYXVuY2hlci5DaHJvbWVBcmdPcHRpb25zPX0gb3B0aW9uc1xuICAgKiBAcmV0dXJucyB7IUFycmF5PHN0cmluZz59XG4gICAqL1xuICBkZWZhdWx0QXJncyhvcHRpb25zOiBDaHJvbWVBcmdPcHRpb25zID0ge30pOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgY2hyb21lQXJndW1lbnRzID0gW1xuICAgICAgXCItLWRpc2FibGUtYmFja2dyb3VuZC1uZXR3b3JraW5nXCIsXG4gICAgICBcIi0tZW5hYmxlLWZlYXR1cmVzPU5ldHdvcmtTZXJ2aWNlLE5ldHdvcmtTZXJ2aWNlSW5Qcm9jZXNzXCIsXG4gICAgICBcIi0tZGlzYWJsZS1iYWNrZ3JvdW5kLXRpbWVyLXRocm90dGxpbmdcIixcbiAgICAgIFwiLS1kaXNhYmxlLWJhY2tncm91bmRpbmctb2NjbHVkZWQtd2luZG93c1wiLFxuICAgICAgXCItLWRpc2FibGUtYnJlYWtwYWRcIixcbiAgICAgIFwiLS1kaXNhYmxlLWNsaWVudC1zaWRlLXBoaXNoaW5nLWRldGVjdGlvblwiLFxuICAgICAgXCItLWRpc2FibGUtY29tcG9uZW50LWV4dGVuc2lvbnMtd2l0aC1iYWNrZ3JvdW5kLXBhZ2VzXCIsXG4gICAgICBcIi0tZGlzYWJsZS1kZWZhdWx0LWFwcHNcIixcbiAgICAgIFwiLS1kaXNhYmxlLWRldi1zaG0tdXNhZ2VcIixcbiAgICAgIFwiLS1kaXNhYmxlLWV4dGVuc2lvbnNcIixcbiAgICAgIFwiLS1kaXNhYmxlLWZlYXR1cmVzPVRyYW5zbGF0ZVwiLFxuICAgICAgXCItLWRpc2FibGUtaGFuZy1tb25pdG9yXCIsXG4gICAgICBcIi0tZGlzYWJsZS1pcGMtZmxvb2RpbmctcHJvdGVjdGlvblwiLFxuICAgICAgXCItLWRpc2FibGUtcG9wdXAtYmxvY2tpbmdcIixcbiAgICAgIFwiLS1kaXNhYmxlLXByb21wdC1vbi1yZXBvc3RcIixcbiAgICAgIFwiLS1kaXNhYmxlLXJlbmRlcmVyLWJhY2tncm91bmRpbmdcIixcbiAgICAgIFwiLS1kaXNhYmxlLXN5bmNcIixcbiAgICAgIFwiLS1mb3JjZS1jb2xvci1wcm9maWxlPXNyZ2JcIixcbiAgICAgIFwiLS1tZXRyaWNzLXJlY29yZGluZy1vbmx5XCIsXG4gICAgICBcIi0tbm8tZmlyc3QtcnVuXCIsXG4gICAgICBcIi0tZW5hYmxlLWF1dG9tYXRpb25cIixcbiAgICAgIFwiLS1wYXNzd29yZC1zdG9yZT1iYXNpY1wiLFxuICAgICAgXCItLXVzZS1tb2NrLWtleWNoYWluXCIsXG4gICAgICAvLyBUT0RPKHNhZHltKTogcmVtb3ZlICctLWVuYWJsZS1ibGluay1mZWF0dXJlcz1JZGxlRGV0ZWN0aW9uJ1xuICAgICAgLy8gb25jZSBJZGxlRGV0ZWN0aW9uIGlzIHR1cm5lZCBvbiBieSBkZWZhdWx0LlxuICAgICAgXCItLWVuYWJsZS1ibGluay1mZWF0dXJlcz1JZGxlRGV0ZWN0aW9uXCIsXG4gICAgXTtcbiAgICBjb25zdCB7XG4gICAgICBkZXZ0b29scyA9IGZhbHNlLFxuICAgICAgaGVhZGxlc3MgPSAhZGV2dG9vbHMsXG4gICAgICBhcmdzID0gW10sXG4gICAgICB1c2VyRGF0YURpciA9IG51bGwsXG4gICAgfSA9IG9wdGlvbnM7XG4gICAgaWYgKHVzZXJEYXRhRGlyKSB7XG4gICAgICBjaHJvbWVBcmd1bWVudHMucHVzaChgLS11c2VyLWRhdGEtZGlyPSR7cGF0aFJlc29sdmUodXNlckRhdGFEaXIpfWApO1xuICAgIH1cbiAgICBpZiAoZGV2dG9vbHMpIGNocm9tZUFyZ3VtZW50cy5wdXNoKFwiLS1hdXRvLW9wZW4tZGV2dG9vbHMtZm9yLXRhYnNcIik7XG4gICAgaWYgKGhlYWRsZXNzKSB7XG4gICAgICBjaHJvbWVBcmd1bWVudHMucHVzaChcIi0taGVhZGxlc3NcIiwgXCItLWhpZGUtc2Nyb2xsYmFyc1wiLCBcIi0tbXV0ZS1hdWRpb1wiKTtcbiAgICB9XG4gICAgaWYgKGFyZ3MuZXZlcnkoKGFyZykgPT4gYXJnLnN0YXJ0c1dpdGgoXCItXCIpKSkge1xuICAgICAgY2hyb21lQXJndW1lbnRzLnB1c2goXCJhYm91dDpibGFua1wiKTtcbiAgICB9XG4gICAgY2hyb21lQXJndW1lbnRzLnB1c2goLi4uYXJncyk7XG4gICAgcmV0dXJuIGNocm9tZUFyZ3VtZW50cztcbiAgfVxuXG4gIGV4ZWN1dGFibGVQYXRoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc29sdmVFeGVjdXRhYmxlUGF0aCh0aGlzKS5leGVjdXRhYmxlUGF0aDtcbiAgfVxuXG4gIGdldCBwcm9kdWN0KCk6IFByb2R1Y3Qge1xuICAgIHJldHVybiBcImNocm9tZVwiO1xuICB9XG59XG5cbi8qKlxuICogQGludGVybmFsXG4gKi9cbmNsYXNzIEZpcmVmb3hMYXVuY2hlciBpbXBsZW1lbnRzIFByb2R1Y3RMYXVuY2hlciB7XG4gIF9wcmVmZXJyZWRSZXZpc2lvbjogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByZWZlcnJlZFJldmlzaW9uOiBzdHJpbmcpIHtcbiAgICB0aGlzLl9wcmVmZXJyZWRSZXZpc2lvbiA9IHByZWZlcnJlZFJldmlzaW9uO1xuICB9XG5cbiAgYXN5bmMgbGF1bmNoKFxuICAgIG9wdGlvbnM6XG4gICAgICAmIExhdW5jaE9wdGlvbnNcbiAgICAgICYgQ2hyb21lQXJnT3B0aW9uc1xuICAgICAgJiBCcm93c2VyQ29ubmVjdE9wdGlvbnNcbiAgICAgICYge1xuICAgICAgICBleHRyYVByZWZzRmlyZWZveD86IHsgW3g6IHN0cmluZ106IHVua25vd24gfTtcbiAgICAgIH0gPSB7fSxcbiAgKTogUHJvbWlzZTxCcm93c2VyPiB7XG4gICAgY29uc3Qge1xuICAgICAgaWdub3JlRGVmYXVsdEFyZ3MgPSBmYWxzZSxcbiAgICAgIGFyZ3MgPSBbXSxcbiAgICAgIGV4ZWN1dGFibGVQYXRoID0gbnVsbCxcbiAgICAgIGVudiA9IERlbm8uZW52LnRvT2JqZWN0KCksXG4gICAgICBpZ25vcmVIVFRQU0Vycm9ycyA9IGZhbHNlLFxuICAgICAgZGVmYXVsdFZpZXdwb3J0ID0geyB3aWR0aDogODAwLCBoZWlnaHQ6IDYwMCB9LFxuICAgICAgc2xvd01vID0gMCxcbiAgICAgIHRpbWVvdXQgPSAzMDAwMCxcbiAgICAgIGV4dHJhUHJlZnNGaXJlZm94ID0ge30sXG4gICAgfSA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBmaXJlZm94QXJndW1lbnRzID0gW107XG4gICAgaWYgKCFpZ25vcmVEZWZhdWx0QXJncykgZmlyZWZveEFyZ3VtZW50cy5wdXNoKC4uLnRoaXMuZGVmYXVsdEFyZ3Mob3B0aW9ucykpO1xuICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWdub3JlRGVmYXVsdEFyZ3MpKSB7XG4gICAgICBmaXJlZm94QXJndW1lbnRzLnB1c2goXG4gICAgICAgIC4uLnRoaXMuZGVmYXVsdEFyZ3Mob3B0aW9ucykuZmlsdGVyKFxuICAgICAgICAgIChhcmcpID0+ICFpZ25vcmVEZWZhdWx0QXJncy5pbmNsdWRlcyhhcmcpLFxuICAgICAgICApLFxuICAgICAgKTtcbiAgICB9IGVsc2UgZmlyZWZveEFyZ3VtZW50cy5wdXNoKC4uLmFyZ3MpO1xuXG4gICAgaWYgKFxuICAgICAgIWZpcmVmb3hBcmd1bWVudHMuc29tZSgoYXJndW1lbnQpID0+XG4gICAgICAgIGFyZ3VtZW50LnN0YXJ0c1dpdGgoXCItLXJlbW90ZS1kZWJ1Z2dpbmctXCIpXG4gICAgICApXG4gICAgKSB7XG4gICAgICBmaXJlZm94QXJndW1lbnRzLnB1c2goXCItLXJlbW90ZS1kZWJ1Z2dpbmctcG9ydD0wXCIpO1xuICAgIH1cblxuICAgIGxldCB0ZW1wb3JhcnlVc2VyRGF0YURpciA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChcbiAgICAgICFmaXJlZm94QXJndW1lbnRzLmluY2x1ZGVzKFwiLXByb2ZpbGVcIikgJiZcbiAgICAgICFmaXJlZm94QXJndW1lbnRzLmluY2x1ZGVzKFwiLS1wcm9maWxlXCIpXG4gICAgKSB7XG4gICAgICB0ZW1wb3JhcnlVc2VyRGF0YURpciA9IGF3YWl0IHRoaXMuX2NyZWF0ZVByb2ZpbGUoZXh0cmFQcmVmc0ZpcmVmb3gpO1xuICAgICAgZmlyZWZveEFyZ3VtZW50cy5wdXNoKFwiLS1wcm9maWxlXCIpO1xuICAgICAgZmlyZWZveEFyZ3VtZW50cy5wdXNoKHRlbXBvcmFyeVVzZXJEYXRhRGlyKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLl91cGRhdGVSZXZpc2lvbigpO1xuICAgIGxldCBmaXJlZm94RXhlY3V0YWJsZSA9IGV4ZWN1dGFibGVQYXRoO1xuICAgIGlmICghZXhlY3V0YWJsZVBhdGgpIHtcbiAgICAgIGNvbnN0IHsgbWlzc2luZ1RleHQsIGV4ZWN1dGFibGVQYXRoIH0gPSByZXNvbHZlRXhlY3V0YWJsZVBhdGgodGhpcyk7XG4gICAgICBpZiAobWlzc2luZ1RleHQpIHRocm93IG5ldyBFcnJvcihtaXNzaW5nVGV4dCk7XG4gICAgICBmaXJlZm94RXhlY3V0YWJsZSA9IGV4ZWN1dGFibGVQYXRoO1xuICAgIH1cblxuICAgIGNvbnN0IHJ1bm5lciA9IG5ldyBCcm93c2VyUnVubmVyKFxuICAgICAgZmlyZWZveEV4ZWN1dGFibGUhLFxuICAgICAgZmlyZWZveEFyZ3VtZW50cyxcbiAgICAgIHRlbXBvcmFyeVVzZXJEYXRhRGlyLFxuICAgICk7XG4gICAgcnVubmVyLnN0YXJ0KHtcbiAgICAgIGVudixcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb25uZWN0aW9uID0gYXdhaXQgcnVubmVyLnNldHVwQ29ubmVjdGlvbih7XG4gICAgICAgIHRpbWVvdXQsXG4gICAgICAgIHNsb3dNbyxcbiAgICAgICAgcHJlZmVycmVkUmV2aXNpb246IHRoaXMuX3ByZWZlcnJlZFJldmlzaW9uLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBicm93c2VyID0gYXdhaXQgQnJvd3Nlci5jcmVhdGUoXG4gICAgICAgIGNvbm5lY3Rpb24sXG4gICAgICAgIFtdLFxuICAgICAgICBpZ25vcmVIVFRQU0Vycm9ycyxcbiAgICAgICAgZGVmYXVsdFZpZXdwb3J0LFxuICAgICAgICBydW5uZXIucHJvYyxcbiAgICAgICAgcnVubmVyLmNsb3NlLmJpbmQocnVubmVyKSxcbiAgICAgICk7XG4gICAgICBhd2FpdCBicm93c2VyLndhaXRGb3JUYXJnZXQoKHQpID0+IHQudHlwZSgpID09PSBcInBhZ2VcIik7XG4gICAgICByZXR1cm4gYnJvd3NlcjtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcnVubmVyLmtpbGwoKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIGV4ZWN1dGFibGVQYXRoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHJlc29sdmVFeGVjdXRhYmxlUGF0aCh0aGlzKS5leGVjdXRhYmxlUGF0aDtcbiAgfVxuXG4gIGFzeW5jIF91cGRhdGVSZXZpc2lvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyByZXBsYWNlICdsYXRlc3QnIHBsYWNlaG9sZGVyIHdpdGggYWN0dWFsIGRvd25sb2FkZWQgcmV2aXNpb25cbiAgICBpZiAodGhpcy5fcHJlZmVycmVkUmV2aXNpb24gPT09IFwibGF0ZXN0XCIpIHtcbiAgICAgIGNvbnN0IGJyb3dzZXJGZXRjaGVyID0gbmV3IEJyb3dzZXJGZXRjaGVyKHtcbiAgICAgICAgcHJvZHVjdDogdGhpcy5wcm9kdWN0LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBsb2NhbFJldmlzaW9ucyA9IGF3YWl0IGJyb3dzZXJGZXRjaGVyLmxvY2FsUmV2aXNpb25zKCk7XG4gICAgICBpZiAobG9jYWxSZXZpc2lvbnNbMF0pIHRoaXMuX3ByZWZlcnJlZFJldmlzaW9uID0gbG9jYWxSZXZpc2lvbnNbMF07XG4gICAgfVxuICB9XG5cbiAgZ2V0IHByb2R1Y3QoKTogUHJvZHVjdCB7XG4gICAgcmV0dXJuIFwiZmlyZWZveFwiO1xuICB9XG5cbiAgZGVmYXVsdEFyZ3Mob3B0aW9uczogQ2hyb21lQXJnT3B0aW9ucyA9IHt9KTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGZpcmVmb3hBcmd1bWVudHMgPSBbXCItLW5vLXJlbW90ZVwiLCBcIi0tZm9yZWdyb3VuZFwiXTtcbiAgICBpZiAoRGVuby5idWlsZC5vcyA9PSBcIndpbmRvd3NcIikge1xuICAgICAgZmlyZWZveEFyZ3VtZW50cy5wdXNoKFwiLS13YWl0LWZvci1icm93c2VyXCIpO1xuICAgIH1cbiAgICBjb25zdCB7XG4gICAgICBkZXZ0b29scyA9IGZhbHNlLFxuICAgICAgaGVhZGxlc3MgPSAhZGV2dG9vbHMsXG4gICAgICBhcmdzID0gW10sXG4gICAgICB1c2VyRGF0YURpciA9IG51bGwsXG4gICAgfSA9IG9wdGlvbnM7XG4gICAgaWYgKHVzZXJEYXRhRGlyKSB7XG4gICAgICBmaXJlZm94QXJndW1lbnRzLnB1c2goXCItLXByb2ZpbGVcIik7XG4gICAgICBmaXJlZm94QXJndW1lbnRzLnB1c2godXNlckRhdGFEaXIpO1xuICAgIH1cbiAgICBpZiAoaGVhZGxlc3MpIGZpcmVmb3hBcmd1bWVudHMucHVzaChcIi0taGVhZGxlc3NcIik7XG4gICAgaWYgKGRldnRvb2xzKSBmaXJlZm94QXJndW1lbnRzLnB1c2goXCItLWRldnRvb2xzXCIpO1xuICAgIGlmIChhcmdzLmV2ZXJ5KChhcmcpID0+IGFyZy5zdGFydHNXaXRoKFwiLVwiKSkpIHtcbiAgICAgIGZpcmVmb3hBcmd1bWVudHMucHVzaChcImFib3V0OmJsYW5rXCIpO1xuICAgIH1cbiAgICBmaXJlZm94QXJndW1lbnRzLnB1c2goLi4uYXJncyk7XG4gICAgcmV0dXJuIGZpcmVmb3hBcmd1bWVudHM7XG4gIH1cblxuICBhc3luYyBfY3JlYXRlUHJvZmlsZShleHRyYVByZWZzOiB7IFt4OiBzdHJpbmddOiB1bmtub3duIH0pOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHByb2ZpbGVQYXRoID0gcGF0aEpvaW4oXG4gICAgICBhd2FpdCBEZW5vLm1ha2VUZW1wRGlyKCksXG4gICAgICBcInB1cHBldGVlcl9kZXZfZmlyZWZveF9wcm9maWxlLVwiLFxuICAgICk7XG4gICAgYXdhaXQgRGVuby5ta2Rpcihwcm9maWxlUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgY29uc3QgcHJlZnNKUzogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB1c2VySlMgPSBbXTtcbiAgICBjb25zdCBzZXJ2ZXIgPSBcImR1bW15LnRlc3RcIjtcbiAgICBjb25zdCBkZWZhdWx0UHJlZmVyZW5jZXMgPSB7XG4gICAgICAvLyBNYWtlIHN1cmUgU2hpZWxkIGRvZXNuJ3QgaGl0IHRoZSBuZXR3b3JrLlxuICAgICAgXCJhcHAubm9ybWFuZHkuYXBpX3VybFwiOiBcIlwiLFxuICAgICAgLy8gRGlzYWJsZSBGaXJlZm94IG9sZCBidWlsZCBiYWNrZ3JvdW5kIGNoZWNrXG4gICAgICBcImFwcC51cGRhdGUuY2hlY2tJbnN0YWxsVGltZVwiOiBmYWxzZSxcbiAgICAgIC8vIERpc2FibGUgYXV0b21hdGljYWxseSB1cGdyYWRpbmcgRmlyZWZveFxuICAgICAgXCJhcHAudXBkYXRlLmRpc2FibGVkRm9yVGVzdGluZ1wiOiB0cnVlLFxuXG4gICAgICAvLyBJbmNyZWFzZSB0aGUgQVBaIGNvbnRlbnQgcmVzcG9uc2UgdGltZW91dCB0byAxIG1pbnV0ZVxuICAgICAgXCJhcHouY29udGVudF9yZXNwb25zZV90aW1lb3V0XCI6IDYwMDAwLFxuXG4gICAgICAvLyBQcmV2ZW50IHZhcmlvdXMgZXJyb3IgbWVzc2FnZSBvbiB0aGUgY29uc29sZVxuICAgICAgLy8gamVzdC1wdXBwZXRlZXIgYXNzZXJ0cyB0aGF0IG5vIGVycm9yIG1lc3NhZ2UgaXMgZW1pdHRlZCBieSB0aGUgY29uc29sZVxuICAgICAgXCJicm93c2VyLmNvbnRlbnRibG9ja2luZy5mZWF0dXJlcy5zdGFuZGFyZFwiOlxuICAgICAgICBcIi10cCx0cFByaXZhdGUsY29va2llQmVoYXZpb3IwLC1jbSwtZnBcIixcblxuICAgICAgLy8gRW5hYmxlIHRoZSBkdW1wIGZ1bmN0aW9uOiB3aGljaCBzZW5kcyBtZXNzYWdlcyB0byB0aGUgc3lzdGVtXG4gICAgICAvLyBjb25zb2xlXG4gICAgICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xNTQzMTE1XG4gICAgICBcImJyb3dzZXIuZG9tLndpbmRvdy5kdW1wLmVuYWJsZWRcIjogdHJ1ZSxcbiAgICAgIC8vIERpc2FibGUgdG9wc3Rvcmllc1xuICAgICAgXCJicm93c2VyLm5ld3RhYnBhZ2UuYWN0aXZpdHktc3RyZWFtLmZlZWRzLnN5c3RlbS50b3BzdG9yaWVzXCI6IGZhbHNlLFxuICAgICAgLy8gQWx3YXlzIGRpc3BsYXkgYSBibGFuayBwYWdlXG4gICAgICBcImJyb3dzZXIubmV3dGFicGFnZS5lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgLy8gQmFja2dyb3VuZCB0aHVtYm5haWxzIGluIHBhcnRpY3VsYXIgY2F1c2UgZ3JpZWY6IGFuZCBkaXNhYmxpbmdcbiAgICAgIC8vIHRodW1ibmFpbHMgaW4gZ2VuZXJhbCBjYW5ub3QgaHVydFxuICAgICAgXCJicm93c2VyLnBhZ2V0aHVtYm5haWxzLmNhcHR1cmluZ19kaXNhYmxlZFwiOiB0cnVlLFxuXG4gICAgICAvLyBEaXNhYmxlIHNhZmVicm93c2luZyBjb21wb25lbnRzLlxuICAgICAgXCJicm93c2VyLnNhZmVicm93c2luZy5ibG9ja2VkVVJJcy5lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgXCJicm93c2VyLnNhZmVicm93c2luZy5kb3dubG9hZHMuZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIFwiYnJvd3Nlci5zYWZlYnJvd3NpbmcubWFsd2FyZS5lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgXCJicm93c2VyLnNhZmVicm93c2luZy5wYXNzd29yZHMuZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIFwiYnJvd3Nlci5zYWZlYnJvd3NpbmcucGhpc2hpbmcuZW5hYmxlZFwiOiBmYWxzZSxcblxuICAgICAgLy8gRGlzYWJsZSB1cGRhdGVzIHRvIHNlYXJjaCBlbmdpbmVzLlxuICAgICAgXCJicm93c2VyLnNlYXJjaC51cGRhdGVcIjogZmFsc2UsXG4gICAgICAvLyBEbyBub3QgcmVzdG9yZSB0aGUgbGFzdCBvcGVuIHNldCBvZiB0YWJzIGlmIHRoZSBicm93c2VyIGhhcyBjcmFzaGVkXG4gICAgICBcImJyb3dzZXIuc2Vzc2lvbnN0b3JlLnJlc3VtZV9mcm9tX2NyYXNoXCI6IGZhbHNlLFxuICAgICAgLy8gU2tpcCBjaGVjayBmb3IgZGVmYXVsdCBicm93c2VyIG9uIHN0YXJ0dXBcbiAgICAgIFwiYnJvd3Nlci5zaGVsbC5jaGVja0RlZmF1bHRCcm93c2VyXCI6IGZhbHNlLFxuXG4gICAgICAvLyBEaXNhYmxlIG5ld3RhYnBhZ2VcbiAgICAgIFwiYnJvd3Nlci5zdGFydHVwLmhvbWVwYWdlXCI6IFwiYWJvdXQ6YmxhbmtcIixcbiAgICAgIC8vIERvIG5vdCByZWRpcmVjdCB1c2VyIHdoZW4gYSBtaWxzdG9uZSB1cGdyYWRlIG9mIEZpcmVmb3ggaXMgZGV0ZWN0ZWRcbiAgICAgIFwiYnJvd3Nlci5zdGFydHVwLmhvbWVwYWdlX292ZXJyaWRlLm1zdG9uZVwiOiBcImlnbm9yZVwiLFxuICAgICAgLy8gU3RhcnQgd2l0aCBhIGJsYW5rIHBhZ2UgYWJvdXQ6YmxhbmtcbiAgICAgIFwiYnJvd3Nlci5zdGFydHVwLnBhZ2VcIjogMCxcblxuICAgICAgLy8gRG8gbm90IGFsbG93IGJhY2tncm91bmQgdGFicyB0byBiZSB6b21iaWZpZWQgb24gQW5kcm9pZDogb3RoZXJ3aXNlIGZvclxuICAgICAgLy8gdGVzdHMgdGhhdCBvcGVuIGFkZGl0aW9uYWwgdGFiczogdGhlIHRlc3QgaGFybmVzcyB0YWIgaXRzZWxmIG1pZ2h0IGdldFxuICAgICAgLy8gdW5sb2FkZWRcbiAgICAgIFwiYnJvd3Nlci50YWJzLmRpc2FibGVCYWNrZ3JvdW5kWm9tYmlmaWNhdGlvblwiOiBmYWxzZSxcbiAgICAgIC8vIERvIG5vdCB3YXJuIHdoZW4gY2xvc2luZyBhbGwgb3RoZXIgb3BlbiB0YWJzXG4gICAgICBcImJyb3dzZXIudGFicy53YXJuT25DbG9zZU90aGVyVGFic1wiOiBmYWxzZSxcbiAgICAgIC8vIERvIG5vdCB3YXJuIHdoZW4gbXVsdGlwbGUgdGFicyB3aWxsIGJlIG9wZW5lZFxuICAgICAgXCJicm93c2VyLnRhYnMud2Fybk9uT3BlblwiOiBmYWxzZSxcblxuICAgICAgLy8gRGlzYWJsZSB0aGUgVUkgdG91ci5cbiAgICAgIFwiYnJvd3Nlci51aXRvdXIuZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIC8vIFR1cm4gb2ZmIHNlYXJjaCBzdWdnZXN0aW9ucyBpbiB0aGUgbG9jYXRpb24gYmFyIHNvIGFzIG5vdCB0byB0cmlnZ2VyXG4gICAgICAvLyBuZXR3b3JrIGNvbm5lY3Rpb25zLlxuICAgICAgXCJicm93c2VyLnVybGJhci5zdWdnZXN0LnNlYXJjaGVzXCI6IGZhbHNlLFxuICAgICAgLy8gRGlzYWJsZSBmaXJzdCBydW4gc3BsYXNoIHBhZ2Ugb24gV2luZG93cyAxMFxuICAgICAgXCJicm93c2VyLnVzZWRPbldpbmRvd3MxMC5pbnRyb1VSTFwiOiBcIlwiLFxuICAgICAgLy8gRG8gbm90IHdhcm4gb24gcXVpdHRpbmcgRmlyZWZveFxuICAgICAgXCJicm93c2VyLndhcm5PblF1aXRcIjogZmFsc2UsXG5cbiAgICAgIC8vIERlZmVuc2l2ZWx5IGRpc2FibGUgZGF0YSByZXBvcnRpbmcgc3lzdGVtc1xuICAgICAgXCJkYXRhcmVwb3J0aW5nLmhlYWx0aHJlcG9ydC5kb2N1bWVudFNlcnZlclVSSVwiOlxuICAgICAgICBgaHR0cDovLyR7c2VydmVyfS9kdW1teS9oZWFsdGhyZXBvcnQvYCxcbiAgICAgIFwiZGF0YXJlcG9ydGluZy5oZWFsdGhyZXBvcnQubG9nZ2luZy5jb25zb2xlRW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIFwiZGF0YXJlcG9ydGluZy5oZWFsdGhyZXBvcnQuc2VydmljZS5lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgXCJkYXRhcmVwb3J0aW5nLmhlYWx0aHJlcG9ydC5zZXJ2aWNlLmZpcnN0UnVuXCI6IGZhbHNlLFxuICAgICAgXCJkYXRhcmVwb3J0aW5nLmhlYWx0aHJlcG9ydC51cGxvYWRFbmFibGVkXCI6IGZhbHNlLFxuXG4gICAgICAvLyBEbyBub3Qgc2hvdyBkYXRhcmVwb3J0aW5nIHBvbGljeSBub3RpZmljYXRpb25zIHdoaWNoIGNhbiBpbnRlcmZlcmUgd2l0aCB0ZXN0c1xuICAgICAgXCJkYXRhcmVwb3J0aW5nLnBvbGljeS5kYXRhU3VibWlzc2lvbkVuYWJsZWRcIjogZmFsc2UsXG4gICAgICBcImRhdGFyZXBvcnRpbmcucG9saWN5LmRhdGFTdWJtaXNzaW9uUG9saWN5QnlwYXNzTm90aWZpY2F0aW9uXCI6IHRydWUsXG5cbiAgICAgIC8vIERldlRvb2xzIEpTT05WaWV3ZXIgc29tZXRpbWVzIGZhaWxzIHRvIGxvYWQgZGVwZW5kZW5jaWVzIHdpdGggaXRzIHJlcXVpcmUuanMuXG4gICAgICAvLyBUaGlzIGRvZXNuJ3QgYWZmZWN0IFB1cHBldGVlciBidXQgc3BhbXMgY29uc29sZSAoQnVnIDE0MjQzNzIpXG4gICAgICBcImRldnRvb2xzLmpzb252aWV3LmVuYWJsZWRcIjogZmFsc2UsXG5cbiAgICAgIC8vIERpc2FibGUgcG9wdXAtYmxvY2tlclxuICAgICAgXCJkb20uZGlzYWJsZV9vcGVuX2R1cmluZ19sb2FkXCI6IGZhbHNlLFxuXG4gICAgICAvLyBFbmFibGUgdGhlIHN1cHBvcnQgZm9yIEZpbGUgb2JqZWN0IGNyZWF0aW9uIGluIHRoZSBjb250ZW50IHByb2Nlc3NcbiAgICAgIC8vIFJlcXVpcmVkIGZvciB8UGFnZS5zZXRGaWxlSW5wdXRGaWxlc3wgcHJvdG9jb2wgbWV0aG9kLlxuICAgICAgXCJkb20uZmlsZS5jcmVhdGVJbkNoaWxkXCI6IHRydWUsXG5cbiAgICAgIC8vIERpc2FibGUgdGhlIFByb2Nlc3NIYW5nTW9uaXRvclxuICAgICAgXCJkb20uaXBjLnJlcG9ydFByb2Nlc3NIYW5nc1wiOiBmYWxzZSxcblxuICAgICAgLy8gRGlzYWJsZSBzbG93IHNjcmlwdCBkaWFsb2d1ZXNcbiAgICAgIFwiZG9tLm1heF9jaHJvbWVfc2NyaXB0X3J1bl90aW1lXCI6IDAsXG4gICAgICBcImRvbS5tYXhfc2NyaXB0X3J1bl90aW1lXCI6IDAsXG5cbiAgICAgIC8vIE9ubHkgbG9hZCBleHRlbnNpb25zIGZyb20gdGhlIGFwcGxpY2F0aW9uIGFuZCB1c2VyIHByb2ZpbGVcbiAgICAgIC8vIEFkZG9uTWFuYWdlci5TQ09QRV9QUk9GSUxFICsgQWRkb25NYW5hZ2VyLlNDT1BFX0FQUExJQ0FUSU9OXG4gICAgICBcImV4dGVuc2lvbnMuYXV0b0Rpc2FibGVTY29wZXNcIjogMCxcbiAgICAgIFwiZXh0ZW5zaW9ucy5lbmFibGVkU2NvcGVzXCI6IDUsXG5cbiAgICAgIC8vIERpc2FibGUgbWV0YWRhdGEgY2FjaGluZyBmb3IgaW5zdGFsbGVkIGFkZC1vbnMgYnkgZGVmYXVsdFxuICAgICAgXCJleHRlbnNpb25zLmdldEFkZG9ucy5jYWNoZS5lbmFibGVkXCI6IGZhbHNlLFxuXG4gICAgICAvLyBEaXNhYmxlIGluc3RhbGxpbmcgYW55IGRpc3RyaWJ1dGlvbiBleHRlbnNpb25zIG9yIGFkZC1vbnMuXG4gICAgICBcImV4dGVuc2lvbnMuaW5zdGFsbERpc3Ryb0FkZG9uc1wiOiBmYWxzZSxcblxuICAgICAgLy8gRGlzYWJsZWQgc2NyZWVuc2hvdHMgZXh0ZW5zaW9uXG4gICAgICBcImV4dGVuc2lvbnMuc2NyZWVuc2hvdHMuZGlzYWJsZWRcIjogdHJ1ZSxcblxuICAgICAgLy8gVHVybiBvZmYgZXh0ZW5zaW9uIHVwZGF0ZXMgc28gdGhleSBkbyBub3QgYm90aGVyIHRlc3RzXG4gICAgICBcImV4dGVuc2lvbnMudXBkYXRlLmVuYWJsZWRcIjogZmFsc2UsXG5cbiAgICAgIC8vIFR1cm4gb2ZmIGV4dGVuc2lvbiB1cGRhdGVzIHNvIHRoZXkgZG8gbm90IGJvdGhlciB0ZXN0c1xuICAgICAgXCJleHRlbnNpb25zLnVwZGF0ZS5ub3RpZnlVc2VyXCI6IGZhbHNlLFxuXG4gICAgICAvLyBNYWtlIHN1cmUgb3BlbmluZyBhYm91dDphZGRvbnMgd2lsbCBub3QgaGl0IHRoZSBuZXR3b3JrXG4gICAgICBcImV4dGVuc2lvbnMud2Vic2VydmljZS5kaXNjb3ZlclVSTFwiOlxuICAgICAgICBgaHR0cDovLyR7c2VydmVyfS9kdW1teS9kaXNjb3ZlcnlVUkxgLFxuXG4gICAgICAvLyBGb3JjZSBkaXNhYmxlIEZpc3Npb24gdW50aWwgdGhlIFJlbW90ZSBBZ2VudCBpcyBjb21wYXRpYmxlXG4gICAgICBcImZpc3Npb24uYXV0b3N0YXJ0XCI6IGZhbHNlLFxuXG4gICAgICAvLyBBbGxvdyB0aGUgYXBwbGljYXRpb24gdG8gaGF2ZSBmb2N1cyBldmVuIGl0IHJ1bnMgaW4gdGhlIGJhY2tncm91bmRcbiAgICAgIFwiZm9jdXNtYW5hZ2VyLnRlc3Rtb2RlXCI6IHRydWUsXG4gICAgICAvLyBEaXNhYmxlIHVzZXJhZ2VudCB1cGRhdGVzXG4gICAgICBcImdlbmVyYWwudXNlcmFnZW50LnVwZGF0ZXMuZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIC8vIEFsd2F5cyB1c2UgbmV0d29yayBwcm92aWRlciBmb3IgZ2VvbG9jYXRpb24gdGVzdHMgc28gd2UgYnlwYXNzIHRoZVxuICAgICAgLy8gbWFjT1MgZGlhbG9nIHJhaXNlZCBieSB0aGUgY29yZWxvY2F0aW9uIHByb3ZpZGVyXG4gICAgICBcImdlby5wcm92aWRlci50ZXN0aW5nXCI6IHRydWUsXG4gICAgICAvLyBEbyBub3Qgc2NhbiBXaWZpXG4gICAgICBcImdlby53aWZpLnNjYW5cIjogZmFsc2UsXG4gICAgICAvLyBObyBoYW5nIG1vbml0b3JcbiAgICAgIFwiaGFuZ21vbml0b3IudGltZW91dFwiOiAwLFxuICAgICAgLy8gU2hvdyBjaHJvbWUgZXJyb3JzIGFuZCB3YXJuaW5ncyBpbiB0aGUgZXJyb3IgY29uc29sZVxuICAgICAgXCJqYXZhc2NyaXB0Lm9wdGlvbnMuc2hvd0luQ29uc29sZVwiOiB0cnVlLFxuXG4gICAgICAvLyBEaXNhYmxlIGRvd25sb2FkIGFuZCB1c2FnZSBvZiBPcGVuSDI2NDogYW5kIFdpZGV2aW5lIHBsdWdpbnNcbiAgICAgIFwibWVkaWEuZ21wLW1hbmFnZXIudXBkYXRlRW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIC8vIFByZXZlbnQgdmFyaW91cyBlcnJvciBtZXNzYWdlIG9uIHRoZSBjb25zb2xlXG4gICAgICAvLyBqZXN0LXB1cHBldGVlciBhc3NlcnRzIHRoYXQgbm8gZXJyb3IgbWVzc2FnZSBpcyBlbWl0dGVkIGJ5IHRoZSBjb25zb2xlXG4gICAgICBcIm5ldHdvcmsuY29va2llLmNvb2tpZUJlaGF2aW9yXCI6IDAsXG5cbiAgICAgIC8vIERvIG5vdCBwcm9tcHQgZm9yIHRlbXBvcmFyeSByZWRpcmVjdHNcbiAgICAgIFwibmV0d29yay5odHRwLnByb21wdC10ZW1wLXJlZGlyZWN0XCI6IGZhbHNlLFxuXG4gICAgICAvLyBEaXNhYmxlIHNwZWN1bGF0aXZlIGNvbm5lY3Rpb25zIHNvIHRoZXkgYXJlIG5vdCByZXBvcnRlZCBhcyBsZWFraW5nXG4gICAgICAvLyB3aGVuIHRoZXkgYXJlIGhhbmdpbmcgYXJvdW5kXG4gICAgICBcIm5ldHdvcmsuaHR0cC5zcGVjdWxhdGl2ZS1wYXJhbGxlbC1saW1pdFwiOiAwLFxuXG4gICAgICAvLyBEbyBub3QgYXV0b21hdGljYWxseSBzd2l0Y2ggYmV0d2VlbiBvZmZsaW5lIGFuZCBvbmxpbmVcbiAgICAgIFwibmV0d29yay5tYW5hZ2Utb2ZmbGluZS1zdGF0dXNcIjogZmFsc2UsXG5cbiAgICAgIC8vIE1ha2Ugc3VyZSBTTlRQIHJlcXVlc3RzIGRvIG5vdCBoaXQgdGhlIG5ldHdvcmtcbiAgICAgIFwibmV0d29yay5zbnRwLnBvb2xzXCI6IHNlcnZlcixcblxuICAgICAgLy8gRGlzYWJsZSBGbGFzaC5cbiAgICAgIFwicGx1Z2luLnN0YXRlLmZsYXNoXCI6IDAsXG5cbiAgICAgIFwicHJpdmFjeS50cmFja2luZ3Byb3RlY3Rpb24uZW5hYmxlZFwiOiBmYWxzZSxcblxuICAgICAgLy8gRW5hYmxlIFJlbW90ZSBBZ2VudFxuICAgICAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTU0NDM5M1xuICAgICAgXCJyZW1vdGUuZW5hYmxlZFwiOiB0cnVlLFxuXG4gICAgICAvLyBEb24ndCBkbyBuZXR3b3JrIGNvbm5lY3Rpb25zIGZvciBtaXRtIHByaW1pbmdcbiAgICAgIFwic2VjdXJpdHkuY2VydGVycm9ycy5taXRtLnByaW1pbmcuZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgIC8vIExvY2FsIGRvY3VtZW50cyBoYXZlIGFjY2VzcyB0byBhbGwgb3RoZXIgbG9jYWwgZG9jdW1lbnRzLFxuICAgICAgLy8gaW5jbHVkaW5nIGRpcmVjdG9yeSBsaXN0aW5nc1xuICAgICAgXCJzZWN1cml0eS5maWxldXJpLnN0cmljdF9vcmlnaW5fcG9saWN5XCI6IGZhbHNlLFxuICAgICAgLy8gRG8gbm90IHdhaXQgZm9yIHRoZSBub3RpZmljYXRpb24gYnV0dG9uIHNlY3VyaXR5IGRlbGF5XG4gICAgICBcInNlY3VyaXR5Lm5vdGlmaWNhdGlvbl9lbmFibGVfZGVsYXlcIjogMCxcblxuICAgICAgLy8gRW5zdXJlIGJsb2NrbGlzdCB1cGRhdGVzIGRvIG5vdCBoaXQgdGhlIG5ldHdvcmtcbiAgICAgIFwic2VydmljZXMuc2V0dGluZ3Muc2VydmVyXCI6IGBodHRwOi8vJHtzZXJ2ZXJ9L2R1bW15L2Jsb2NrbGlzdC9gLFxuXG4gICAgICAvLyBEbyBub3QgYXV0b21hdGljYWxseSBmaWxsIHNpZ24taW4gZm9ybXMgd2l0aCBrbm93biB1c2VybmFtZXMgYW5kXG4gICAgICAvLyBwYXNzd29yZHNcbiAgICAgIFwic2lnbm9uLmF1dG9maWxsRm9ybXNcIjogZmFsc2UsXG4gICAgICAvLyBEaXNhYmxlIHBhc3N3b3JkIGNhcHR1cmUsIHNvIHRoYXQgdGVzdHMgdGhhdCBpbmNsdWRlIGZvcm1zIGFyZSBub3RcbiAgICAgIC8vIGluZmx1ZW5jZWQgYnkgdGhlIHByZXNlbmNlIG9mIHRoZSBwZXJzaXN0ZW50IGRvb3JoYW5nZXIgbm90aWZpY2F0aW9uXG4gICAgICBcInNpZ25vbi5yZW1lbWJlclNpZ25vbnNcIjogZmFsc2UsXG5cbiAgICAgIC8vIERpc2FibGUgZmlyc3QtcnVuIHdlbGNvbWUgcGFnZVxuICAgICAgXCJzdGFydHVwLmhvbWVwYWdlX3dlbGNvbWVfdXJsXCI6IFwiYWJvdXQ6YmxhbmtcIixcblxuICAgICAgLy8gRGlzYWJsZSBmaXJzdC1ydW4gd2VsY29tZSBwYWdlXG4gICAgICBcInN0YXJ0dXAuaG9tZXBhZ2Vfd2VsY29tZV91cmwuYWRkaXRpb25hbFwiOiBcIlwiLFxuXG4gICAgICAvLyBEaXNhYmxlIGJyb3dzZXIgYW5pbWF0aW9ucyAodGFicywgZnVsbHNjcmVlbiwgc2xpZGluZyBhbGVydHMpXG4gICAgICBcInRvb2xraXQuY29zbWV0aWNBbmltYXRpb25zLmVuYWJsZWRcIjogZmFsc2UsXG5cbiAgICAgIC8vIFByZXZlbnQgc3RhcnRpbmcgaW50byBzYWZlIG1vZGUgYWZ0ZXIgYXBwbGljYXRpb24gY3Jhc2hlc1xuICAgICAgXCJ0b29sa2l0LnN0YXJ0dXAubWF4X3Jlc3VtZWRfY3Jhc2hlc1wiOiAtMSxcbiAgICB9O1xuXG4gICAgT2JqZWN0LmFzc2lnbihkZWZhdWx0UHJlZmVyZW5jZXMsIGV4dHJhUHJlZnMpO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGRlZmF1bHRQcmVmZXJlbmNlcykpIHtcbiAgICAgIHVzZXJKUy5wdXNoKFxuICAgICAgICBgdXNlcl9wcmVmKCR7SlNPTi5zdHJpbmdpZnkoa2V5KX0sICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSk7YCxcbiAgICAgICk7XG4gICAgfVxuICAgIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgICAgIHBhdGhKb2luKHByb2ZpbGVQYXRoLCBcInVzZXIuanNcIiksXG4gICAgICB1c2VySlMuam9pbihcIlxcblwiKSxcbiAgICApO1xuICAgIGF3YWl0IERlbm8ud3JpdGVUZXh0RmlsZShcbiAgICAgIHBhdGhKb2luKHByb2ZpbGVQYXRoLCBcInByZWZzLmpzXCIpLFxuICAgICAgcHJlZnNKUy5qb2luKFwiXFxuXCIpLFxuICAgICk7XG4gICAgcmV0dXJuIHByb2ZpbGVQYXRoO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVFeGVjdXRhYmxlUGF0aChcbiAgbGF1bmNoZXI6IENocm9tZUxhdW5jaGVyIHwgRmlyZWZveExhdW5jaGVyLFxuKTogeyBleGVjdXRhYmxlUGF0aDogc3RyaW5nOyBtaXNzaW5nVGV4dD86IHN0cmluZyB9IHtcbiAgY29uc3QgZXhlY3V0YWJsZVBhdGggPSBEZW5vLmVudi5nZXQoXCJQVVBQRVRFRVJfRVhFQ1VUQUJMRV9QQVRIXCIpO1xuICBpZiAoZXhlY3V0YWJsZVBhdGgpIHtcbiAgICBjb25zdCBtaXNzaW5nVGV4dCA9ICFleGlzdHNTeW5jKGV4ZWN1dGFibGVQYXRoKVxuICAgICAgPyBcIlRyaWVkIHRvIHVzZSBQVVBQRVRFRVJfRVhFQ1VUQUJMRV9QQVRIIGVudiB2YXJpYWJsZSB0byBsYXVuY2ggYnJvd3NlciBidXQgZGlkIG5vdCBmaW5kIGFueSBleGVjdXRhYmxlIGF0OiBcIiArXG4gICAgICAgIGV4ZWN1dGFibGVQYXRoXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4geyBleGVjdXRhYmxlUGF0aCwgbWlzc2luZ1RleHQgfTtcbiAgfVxuICBjb25zdCBkb3dubG9hZFBhdGggPSBEZW5vLmVudi5nZXQoXCJQVVBQRVRFRVJfRE9XTkxPQURfUEFUSFwiKTtcbiAgY29uc3QgYnJvd3NlckZldGNoZXIgPSBuZXcgQnJvd3NlckZldGNoZXIoe1xuICAgIHByb2R1Y3Q6IGxhdW5jaGVyLnByb2R1Y3QsXG4gICAgcGF0aDogZG93bmxvYWRQYXRoLFxuICB9KTtcbiAgaWYgKGxhdW5jaGVyLnByb2R1Y3QgPT09IFwiY2hyb21lXCIpIHtcbiAgICBjb25zdCByZXZpc2lvbiA9IERlbm8uZW52LmdldChcIlBVUFBFVEVFUl9DSFJPTUlVTV9SRVZJU0lPTlwiKTtcbiAgICBpZiAocmV2aXNpb24pIHtcbiAgICAgIGNvbnN0IHJldmlzaW9uSW5mbyA9IGJyb3dzZXJGZXRjaGVyLnJldmlzaW9uSW5mbyhyZXZpc2lvbik7XG4gICAgICBjb25zdCBtaXNzaW5nVGV4dCA9ICFyZXZpc2lvbkluZm8ubG9jYWxcbiAgICAgICAgPyBcIlRyaWVkIHRvIHVzZSBQVVBQRVRFRVJfQ0hST01JVU1fUkVWSVNJT04gZW52IHZhcmlhYmxlIHRvIGxhdW5jaCBicm93c2VyIGJ1dCBkaWQgbm90IGZpbmQgZXhlY3V0YWJsZSBhdDogXCIgK1xuICAgICAgICAgIHJldmlzaW9uSW5mby5leGVjdXRhYmxlUGF0aFxuICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgIHJldHVybiB7IGV4ZWN1dGFibGVQYXRoOiByZXZpc2lvbkluZm8uZXhlY3V0YWJsZVBhdGgsIG1pc3NpbmdUZXh0IH07XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmV2aXNpb25JbmZvID0gYnJvd3NlckZldGNoZXIucmV2aXNpb25JbmZvKGxhdW5jaGVyLl9wcmVmZXJyZWRSZXZpc2lvbik7XG4gIGNvbnN0IG1pc3NpbmdUZXh0ID0gIXJldmlzaW9uSW5mby5sb2NhbFxuICAgID8gYENvdWxkIG5vdCBmaW5kIGJyb3dzZXIgcmV2aXNpb24gJHtsYXVuY2hlci5fcHJlZmVycmVkUmV2aXNpb259LiBSdW4gXCJQVVBQRVRFRVJfUFJPRFVDVD0ke2xhdW5jaGVyLnByb2R1Y3R9IGRlbm8gcnVuIC1BIC0tdW5zdGFibGUgJHtuZXcgVVJMKFxuICAgICAgXCIuLi8uLi92ZW5kb3IvcHVwcGV0ZWVyLWNvcmUvcHVwcGV0ZWVyLy4uLy4uLy4uL2luc3RhbGwudHNcIixcbiAgICAgIGltcG9ydC5tZXRhLnVybCxcbiAgICApfVwiIHRvIGRvd25sb2FkIGEgc3VwcG9ydGVkIGJyb3dzZXIgYmluYXJ5LmBcbiAgICA6IHVuZGVmaW5lZDtcbiAgcmV0dXJuIHsgZXhlY3V0YWJsZVBhdGg6IHJldmlzaW9uSW5mby5leGVjdXRhYmxlUGF0aCwgbWlzc2luZ1RleHQgfTtcbn1cblxuLyoqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTGF1bmNoZXIoXG4gIHByZWZlcnJlZFJldmlzaW9uOiBzdHJpbmcsXG4gIHByb2R1Y3Q/OiBzdHJpbmcsXG4pOiBQcm9kdWN0TGF1bmNoZXIge1xuICAvLyBwdXBwZXRlZXItY29yZSBkb2Vzbid0IHRha2UgaW50byBhY2NvdW50IFBVUFBFVEVFUl8qIGVudiB2YXJpYWJsZXMuXG4gIGlmICghcHJvZHVjdCkgcHJvZHVjdCA9IERlbm8uZW52LmdldChcIlBVUFBFVEVFUl9QUk9EVUNUXCIpO1xuICBzd2l0Y2ggKHByb2R1Y3QpIHtcbiAgICBjYXNlIFwiZmlyZWZveFwiOlxuICAgICAgcmV0dXJuIG5ldyBGaXJlZm94TGF1bmNoZXIocHJlZmVycmVkUmV2aXNpb24pO1xuICAgIGNhc2UgXCJjaHJvbWVcIjpcbiAgICBkZWZhdWx0OlxuICAgICAgaWYgKHR5cGVvZiBwcm9kdWN0ICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2R1Y3QgIT09IFwiY2hyb21lXCIpIHtcbiAgICAgICAgLyogVGhlIHVzZXIgZ2F2ZSB1cyBhbiBpbmNvcnJlY3QgcHJvZHVjdCBuYW1lXG4gICAgICAgICAqIHdlJ2xsIGRlZmF1bHQgdG8gbGF1bmNoaW5nIENocm9tZSwgYnV0IGxvZyB0byB0aGUgY29uc29sZVxuICAgICAgICAgKiB0byBsZXQgdGhlIHVzZXIga25vdyAodGhleSd2ZSBwcm9iYWJseSB0eXBvZWQpLlxuICAgICAgICAgKi9cbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGBXYXJuaW5nOiB1bmtub3duIHByb2R1Y3QgbmFtZSAke3Byb2R1Y3R9LiBGYWxsaW5nIGJhY2sgdG8gY2hyb21lLmAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IENocm9tZUxhdW5jaGVyKHByZWZlcnJlZFJldmlzaW9uKTtcbiAgfVxufVxuIl19