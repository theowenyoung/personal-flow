import { Hackle, makeHackle } from './mod.ts'

declare global {
	var print: Hackle['debug']
	var hackle: Hackle
}

//@ts-ignore
if (!window.hackle) window.hackle = makeHackle()

// @ts-ignore
if (!window.print) window.print = window.hackle.debug
