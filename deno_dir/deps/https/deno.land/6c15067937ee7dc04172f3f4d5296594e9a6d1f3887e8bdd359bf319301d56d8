import type { Logger, Scope } from './mod.ts'
import { red, bold, yellow, blue, green, gray, rgb24, stripColor } from 'https://deno.land/std@0.85.0/fmt/colors.ts'
import { join } from 'https://deno.land/std@0.85.0/path/mod.ts'
import { getDateFormat } from './lib/get-date-format.ts'
import { existsSync } from 'https://deno.land/std@0.85.0/fs/exists.ts'

export const consoleLogger: Logger = (message, level) => {
	const encoder = new TextEncoder()

	if (level === 'error') Deno.stderr.writeSync(encoder.encode(message))
	else Deno.stdout.writeSync(encoder.encode(message))
}

export interface MakeFileLoggerOptions {
	/**
	 * If a time should be prepended onto each log
	 * @default true
	 */
	prependTime?: boolean

	/**
	 * When a new log file should be created
	 * @default 'day'
	 */
	newLogFileEach?: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'log'
}

export const makeFileLogger = (folder: string = '.log', options: MakeFileLoggerOptions = {}): Logger => (message, level) => {
	const date = new Date()
	const prettyDate = getDateFormat(date, options.newLogFileEach || 'day')
	const path = `${level} ${prettyDate}.txt`

	if (!existsSync(folder)) Deno.mkdirSync(folder, { recursive: true })

	Deno.writeTextFileSync(join(folder, path), `${options.prependTime ? `[${getDateFormat(date, 'log')}] ` : ''}${stripColor(message)}`, {
		append: true,
	})
}

export const defaultStringify = (message: any[]): string => {
	return (
		message
			.map(message => {
				if (typeof message === 'string') return message
				else
					return Deno.inspect(message, {
						depth: 100,
					})
			})
			.join(' ') + '\n'
	)
}

export const defaultScopes: Scope[] = [
	{
		name: 'default-error',
		level: 'error',
		prepend: `${bold(red('error'))}:`,
		storeLogs: true,
	},
	{
		name: 'default-warn',
		level: 'warn',
		prepend: `${bold(yellow('warn'))}:`,
		storeLogs: true,
	},
	{
		name: 'default-notice',
		level: 'notice',
		prepend: `${bold(blue('notice'))}:`,
		storeLogs: true,
	},
	{
		name: 'default-info',
		level: 'info',
		prepend: `${bold(green('info'))}:`,
		storeLogs: true,
	},
	{
		name: 'default-debug',
		level: 'debug',
		prepend: `${bold(gray('debug'))}:`,
		storeLogs: true,
	},
	{
		name: 'default-stack',
		level: 'debug',
		messageMap() {
			const stack = new Error().stack
			if (!stack) throw new Error(`Could not get call stack`)

			const stackColor = (str: string) => rgb24(str, { r: 17, g: 168, b: 201 })

			const importantStack = stack
				.split('\n')
				.slice(5)
				.map(str =>
					str
						.replace(/^\s*at/, gray('from'))
						.replace(/([\w\-\.]+):(\d+):(\d+)/, `${stackColor('$1')}:${yellow('$2')}:${yellow('$3')}`)
				)
				.map((str, index) => {
					if (index === 0) return `${bold(stackColor('stack'))} ${str}`
					else return `      ${str}`
				})

			return [importantStack.join('\n')]
		},
		storeLogs: true,
	},
]
