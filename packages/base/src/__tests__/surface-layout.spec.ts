import { describe, it, expect } from 'vitest'
import { validateSurfaceLayout } from '../surface-layout.js'
import type { SurfaceSchemaLayoutDefinition } from '../surface-layout.js'

function validLayout(overrides: Partial<SurfaceSchemaLayoutDefinition> = {}): SurfaceSchemaLayoutDefinition {
	return {
		stylePresets: {
			default: {
				bitmap: { w: 72, h: 72 },
				text: true,
				colors: 'hex',
			},
		},
		controls: {
			'0/0': { row: 0, column: 0 },
			'0/1': { row: 0, column: 1, stylePreset: 'default' },
		},
		...overrides,
	}
}

describe('validateSurfaceLayout', () => {
	describe('basic type validation', () => {
		it('throws when passed null', () => {
			expect(() => validateSurfaceLayout(null as any)).toThrow('Surface layout is not an object')
		})

		it('throws when passed undefined', () => {
			expect(() => validateSurfaceLayout(undefined as any)).toThrow('Surface layout is not an object')
		})

		it('throws when passed a string', () => {
			expect(() => validateSurfaceLayout('hello' as any)).toThrow('Surface layout is not an object')
		})
	})

	it('accepts a valid layout', () => {
		expect(() => validateSurfaceLayout(validLayout())).not.toThrow()
	})

	it('throws when the required default style preset is missing', () => {
		expect(() => validateSurfaceLayout({ stylePresets: {} as any, controls: {} })).toThrow(
			'Surface layout validation failed',
		)
	})

	it('throws when stylePresets is missing entirely', () => {
		expect(() => validateSurfaceLayout({ controls: {} } as any)).toThrow('Surface layout validation failed')
	})

	it('throws when a control is missing its position', () => {
		expect(() => validateSurfaceLayout(validLayout({ controls: { '0/0': { row: 0 } as any } }))).toThrow(
			'Surface layout validation failed',
		)
	})

	it('throws when a control id contains invalid characters', () => {
		expect(() => validateSurfaceLayout(validLayout({ controls: { 'bad id!': { row: 0, column: 0 } } }))).toThrow(
			'Surface layout validation failed',
		)
	})

	it('throws on additional unknown properties', () => {
		expect(() => validateSurfaceLayout(validLayout({ extra: true } as any))).toThrow('Surface layout validation failed')
	})

	it('throws when leds config is missing required fields', () => {
		expect(() =>
			validateSurfaceLayout(
				validLayout({
					stylePresets: { default: { leds: { segments: 24 } as any } },
				}),
			),
		).toThrow('Surface layout validation failed')
	})
})
