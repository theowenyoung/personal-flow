import type { MakeFileLoggerOptions } from '../tools.ts'

function extractPrettyTimezone(date: Date) {
	const res = /\((.*)\)/.exec(date.toString())
	if (!res) throw new Error(`A weird error occurred whilst getting the timezone`)
	return res[1]
}

function negativeOrPositiveSign(num: number): string {
	if (num >= 0) return '+' + num
	return String(num)
}

const getYear = (date: Date) => date.getFullYear()
const getMonth = (date: Date) => [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Nov`, `Dec`][date.getMonth()]
const getDate = (date: Date) => date.getDate()
const getWeekday = (date: Date) => [`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`][date.getDay()]
const getAMP = (date: Date) => (date.getHours() >= 12 ? 'PM' : 'AM')
const getHours = (date: Date) => (date.getHours() > 12 ? date.getHours() - 12 : date.getHours())
const getMinutes = (date: Date) => date.getMinutes()
const getSeconds = (date: Date) => date.getSeconds()
const getMilliseconds = (date: Date) => date.getMilliseconds()
const getTimezone = (date: Date) => `${extractPrettyTimezone(date)} (GMT${negativeOrPositiveSign(date.getTimezoneOffset())}min)`

export function getDateFormat(date: Date, format: MakeFileLoggerOptions['newLogFileEach']): string {
	switch (format) {
		case 'year':
			return `${getYear(date)} ${getTimezone(date)}`
		case 'month':
			return `${getMonth(date)} ${getYear(date)} ${getTimezone(date)}`
		case 'day':
			return `${getWeekday(date)} ${getMonth(date)} ${getDate(date)} ${getYear(date)} ${getTimezone(date)}`
		case 'hour':
			return `${getWeekday(date)} ${getMonth(date)} ${getDate(date)} ${getYear(date)} ${getHours(date)} ${getAMP(date)} ${getTimezone(
				date
			)}`
		case 'minute':
			return `${getWeekday(date)} ${getMonth(date)} ${getDate(date)} ${getYear(date)} ${getHours(date)}:${getMinutes(date)} ${getAMP(
				date
			)} ${getTimezone(date)}`
		case 'second':
			return `${getWeekday(date)} ${getMonth(date)} ${getDate(date)} ${getYear(date)} ${getHours(date)}:${getMinutes(
				date
			)}:${getSeconds(date)} ${getAMP(date)} ${getTimezone(date)}`
		case 'log':
			return `${getWeekday(date)} ${getMonth(date)} ${getDate(date)} ${getYear(date)} ${getHours(date)}:${getMinutes(
				date
			)}:${getSeconds(date)}:${getMilliseconds(date)} ${getAMP(date)} ${getTimezone(date)}`
		default:
			return ``
	}
}
