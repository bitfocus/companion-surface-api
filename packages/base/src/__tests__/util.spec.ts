import { describe, it, expect } from 'vitest'
import { readLedColor, writeLedColor, colorToIntensity } from '../util.js'

describe('readLedColor', () => {
	it('reads the rgb triple for a segment index', () => {
		const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
		expect(readLedColor(buffer, 0)).toEqual({ r: 1, g: 2, b: 3 })
		expect(readLedColor(buffer, 1)).toEqual({ r: 4, g: 5, b: 6 })
		expect(readLedColor(buffer, 2)).toEqual({ r: 7, g: 8, b: 9 })
	})

	it('returns zeroes when reading past the end of the buffer', () => {
		const buffer = new Uint8Array([10, 20, 30])
		expect(readLedColor(buffer, 5)).toEqual({ r: 0, g: 0, b: 0 })
	})
})

describe('writeLedColor', () => {
	it('writes the rgb triple for a segment index', () => {
		const buffer = new Uint8Array(9)
		writeLedColor(buffer, 1, { r: 4, g: 5, b: 6 })
		expect(Array.from(buffer)).toEqual([0, 0, 0, 4, 5, 6, 0, 0, 0])
	})

	it('round-trips with readLedColor', () => {
		const buffer = new Uint8Array(6)
		const color = { r: 255, g: 128, b: 1 }
		writeLedColor(buffer, 0, color)
		expect(readLedColor(buffer, 0)).toEqual(color)
	})
})

describe('colorToIntensity', () => {
	it('maps black and white to their extremes', () => {
		expect(colorToIntensity({ r: 0, g: 0, b: 0 })).toBe(0)
		expect(colorToIntensity({ r: 255, g: 255, b: 255 })).toBe(255)
	})

	it('weights green most heavily (Rec.709 luma)', () => {
		const green = colorToIntensity({ r: 0, g: 255, b: 0 })
		const red = colorToIntensity({ r: 255, g: 0, b: 0 })
		const blue = colorToIntensity({ r: 0, g: 0, b: 255 })
		expect(green).toBeGreaterThan(red)
		expect(red).toBeGreaterThan(blue)
		expect(green).toBe(Math.round(0.7152 * 255))
	})
})
