import * as tools from './tools.ts'

export { tools }

export type Logger = (message: string, level: LogLevel) => Promise<void> | void
export type LogLevel = 'error' | 'warn' | 'notice' | 'info' | 'debug'

export interface Scope {
	/**
	 * The name of that scope.  You can later use this name to access this scope via the `hackle.scope` function.
	 *
	 * ```ts
	 * hackle.addScope({
	 * 	name: 'some-name',
	 * 	// ...
	 * })
	 *
	 * hackle.scope('some-scope')('Some log message')
	 */
	name: string

	/**
	 * Which level logs to this scope are to be logged to.
	 *
	 * Precedence is as follows:
	 * - `error`
	 * - `warn`
	 * - `notice`
	 * - `info`
	 * - `debug`
	 */
	level: LogLevel

	/** This will be 'unshifted' to the beginning of the array of messages */
	prepend?: string

	/** This will be 'pushed' to the end of the array of messages */
	append?: string

	/**
	 * All messages to this scope will be mapped through this function if it is specified.
	 * If this it returns a string, 'append' and 'prepend' will be ignored and Hackle will not
	 * attempt to stringify the message.  If an array is returned,
	 * the normal procedure will be adhered to
	 */
	messageMap?: (message: any[]) => any[] | string

	/**
	 * If `true`, the all the logs in this scope will be stored for later access
	 * via the `hackle.getStoredLogs` function
	 * @default false
	 */
	storeLogs?: boolean
}

export interface MakeHackleOptions {
	/**
	 * How the log message to be displayed
	 * @default tools.stringify
	 */
	stringify?: (message: any[]) => string

	/**
	 * How the message is to be logged
	 * @default [tools.consoleLogger]
	 */
	loggers?: Logger[]

	/**
	 * Default log level
	 * @default 'debug'
	 */
	defaultLogLevel?: LogLevel

	/**
	 * Additional scopes that can be accessed with the `hackle.scope` function
	 * @default []
	 */
	additionalScopes?: Scope[]

	/**
	 * If true hackle will not use the default scopes defined in `tools.defaultScopes`
	 * @default false
	 */
	rejectDefaultScopes?: boolean
}

export type Hackle = ReturnType<typeof makeHackle>

export function makeHackle(options: MakeHackleOptions = {}) {
	const stringify = options.stringify || tools.defaultStringify
	const rejectDefaultScopes = options.rejectDefaultScopes || false
	const rawScopes = options.additionalScopes || []

	let logLevel: LogLevel | null = options.defaultLogLevel || 'debug'
	let loggers = options.loggers || [tools.consoleLogger]

	// Mount the default scopes if allowed
	if (!rejectDefaultScopes) rawScopes.unshift(...tools.defaultScopes)

	// Create out storage maps for easy access later
	const scopes: Map<string, Scope> = new Map()
	const logStorage: Map<string, string[]> = new Map()

	// Populate the scopes map
	rawScopes.forEach(scope => scopes.set(scope.name, scope))

	function log(scopeName: string, message: any[]) {
		if (!logLevel) return

		const scope = scopes.get(scopeName)
		if (scope === undefined) throw new Error(`No scope has been set for '${scopeName}'`)

		const levelMap = {
			error: 5,
			warn: 4,
			notice: 3,
			info: 2,
			debug: 1,
		}

		if (levelMap[scope.level] < levelMap[logLevel]) return

		let prettyMessage = ``

		const defaultProcedure = () => {
			if (scope.prepend) message = [scope.prepend, ...message]
			if (scope.append) message = [...message, scope.append]

			prettyMessage = stringify(message)
		}

		if (scope.messageMap) {
			const res = scope.messageMap(message)
			if (typeof res === 'string') prettyMessage = res
			else {
				message = res
				defaultProcedure()
			}
		} else defaultProcedure()

		if (scope.storeLogs) {
			const previousLogs = logStorage.get(scope.name)
			logStorage.set(scope.name, previousLogs ? [...previousLogs, prettyMessage] : [prettyMessage])
		}

		loggers.forEach(logger => logger(prettyMessage, scope.level))
	}

	/** Logs a message to the 'error' level and exits */
	function critical(...message: any[]): never {
		error(...message)
		if (Deno) return Deno.exit()
		else throw new Error(`A critical error was encountered`)
	}

	/** Logs message to the 'error' level */
	function error(...message: any[]) {
		scope('default-error')(...message)
	}

	/** Logs message to the 'warn' level */
	function warn(...message: any[]) {
		scope('default-warn')(...message)
	}

	/** Logs message to the 'notice' level */
	function notice(...message: any[]) {
		scope('default-notice')(...message)
	}

	/** Logs message to the 'info' level */
	function info(...message: any[]) {
		scope('default-info')(...message)
	}

	/** Logs message to the 'debug' level */
	function debug(...message: any[]) {
		scope('default-debug')(...message)
	}

	/**
	 * Logs the current call stack to the 'debug' level
	 *
	 * ```ts
	 * hackle.logStack()
	 * ```
	 */
	function logStack() {
		scope('default-stack')()
	}

	/**
	 * Sets the log level to the value of 'level'.
	 * Only logs that are equal to or higher than the set level will be logged.
	 *
	 * Level order:
	 * - `error`
	 * - `warn`
	 * - `notice`
	 * - `info`
	 * - `debug`
	 *
	 * So if I set the log level to `warn`...
	 *
	 * ```ts
	 * hackle.setLogLevel('warn')
	 *
	 * hackle.error('some error')
	 * hackle.warn('some warn')
	 * hackle.notice('some notice')
	 * hackle.info('some info')
	 * ```
	 *
	 * ...only errors and warnings will appear on the console.
	 *
	 * ```
	 * some error
	 * some warn
	 * ```
	 */
	function setLogLevel(level: LogLevel | null) {
		logLevel = level
	}

	/**
	 * Just a wrapper around `hackle.setLogLevel` except it validates the level first.
	 * NOTE: The string `none` counts as `hackle.setLogLevel(null)`.  Non-string values are ignored.
	 *
	 * The intended usage for this function is to make it easier to set the log level straight from a CLI option.
	 *
	 * Here is an example using `cmd`:
	 * ```ts
	 * const program = new Command()
	 * program.option('--log-level <level>')
	 * program.parse(Deno.args)
	 *
	 * hackle.setRawLogLevel(program.logLevel)
	 * ```
	 */
	function setRawLogLevel(level: any) {
		if (level === 'none') setLogLevel(null)
		else if (level === 'error') setLogLevel('error')
		else if (level === 'warn') setLogLevel('warn')
		else if (level === 'notice') setLogLevel('notice')
		else if (level === 'info') setLogLevel('info')
		else if (level === 'debug') setLogLevel('debug')
		else if (typeof level === 'string')
			error(
				`An invalid log level was received.  '${level}' is not one of the valid log levels: 'none', 'error', 'warn', 'notice', 'info', and 'debug'.`
			)
	}

	/**
	 * Adds a custom scope that can be later accessed with the `hackle.scope` function.
	 *
	 * ```ts
	 * hackle.addScope({
	 * 	name: 'my-scope',
	 * 	level: 'notice',
	 * 	prepend: 'myScope: ',
	 * })
	 *
	 * const log = hackle.scope('my-scope')
	 *
	 * log('hello there') // -> myScope: hello there
	 * ```
	 */
	function addScope(scope: Scope) {
		scopes.set(scope.name, scope)
	}

	/**
	 * Activates a certain scope.
	 *
	 * ```ts
	 * hackle.addScope({
	 * 	name: 'my-scope',
	 * 	level: 'notice',
	 * 	prepend: 'myScope: ',
	 * })
	 *
	 * const log = hackle.scope('my-scope')
	 *
	 * log('hello there') // -> myScope: hello there
	 * ```
	 */
	function scope(scopeName: string) {
		return (...message: any[]) => {
			log(scopeName, message)
		}
	}

	/** Get the currently used scopes */
	function currentScopes(): Scope[] {
		return Array.from(scopes.values())
	}

	/** Removes the default scopes */
	function removeDefaultScopes() {
		Object.values(tools.defaultScopes)
			.map(scope => scope.name)
			.forEach(name => scopes.delete(name))
	}

	/**
	 * Get the logs that have already been logged on `scopeName`
	 *
	 * @returns `null` if `storeLogs` is not set to `true` on the particular scope
	 *
	 * ```ts
	 * hackle.error('Some error') // uses the 'default-error' scope behind the scenes
	 *
	 * const logs = hackle.getLogsOnScope('default-error')
	 *
	 * stripColor(logs[0]) // -> 'error: Some error'
	 * ```
	 */
	function getLogsOnScope(scopeName: string): string[] | null {
		return logStorage.get(scopeName) || null
	}

	/**
	 * Sets the loggers to be used
	 *
	 * ```ts
	 * hackle.error('error for console')
	 *
	 * hackle.setLoggers(tools.makeFileLogger('.log'))
	 * hackle.error('error for file')
	 */
	function setLoggers(newLoggers: Logger[]) {
		loggers = newLoggers
	}

	return {
		critical,
		error,
		warn,
		notice,
		info,
		debug,
		logStack,
		setLogLevel,
		setRawLogLevel,
		addScope,
		scope,
		currentScopes,
		removeDefaultScopes,
		getLogsOnScope,
		setLoggers,
	}
}
