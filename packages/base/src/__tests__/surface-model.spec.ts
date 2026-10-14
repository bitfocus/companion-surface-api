import { describe, it, expect } from 'vitest'
import { validateSurfaceModelDefinition } from '../surface-model.js'
import type { SurfaceModelDefinition } from '../surface-api/models.js'

function validModel(overrides: Partial<SurfaceModelDefinition> = {}): SurfaceModelDefinition {
	return {
		id: 'streamdeck-xl',
		name: 'Stream Deck XL',
		layout: {
			stylePresets: { default: { bitmap: { w: 96, h: 96 } } },
			controls: {
				'0/0': { row: 0, column: 0 },
				'0/1': { row: 0, column: 1 },
			},
		},
		appearance: {
			size: { width: 1000, height: 500 },
			bodyColor: '#1a1a1a',
			controls: {
				'0/0': { x: 100, y: 100, width: 180, height: 180 },
				'0/1': { x: 320, y: 100, width: 180, height: 180 },
			},
		},
		...overrides,
	}
}

describe('validateSurfaceModelDefinition', () => {
	it('accepts a valid model', () => {
		expect(() => validateSurfaceModelDefinition(validModel())).not.toThrow()
	})

	it('accepts a model with no appearance', () => {
		const { appearance, ...withoutAppearance } = validModel()
		void appearance
		expect(() => validateSurfaceModelDefinition(withoutAppearance)).not.toThrow()
	})

	describe('basic type validation', () => {
		for (const value of [null, undefined, 'hello', 42]) {
			it(`throws when passed ${JSON.stringify(value)}`, () => {
				expect(() => validateSurfaceModelDefinition(value as any)).toThrow('Surface model validation failed')
			})
		}
	})

	it('throws when the id contains invalid characters', () => {
		// `/` is excluded so that a host is free to namespace these ids with one
		for (const id of ['stream deck', 'elgato/xl', '']) {
			expect(() => validateSurfaceModelDefinition(validModel({ id }))).toThrow('Surface model validation failed')
		}
	})

	it('accepts underscores and dots in an id', () => {
		for (const id of ['streamdeck_xl', 'xl.v2']) {
			expect(() => validateSurfaceModelDefinition(validModel({ id }))).not.toThrow()
		}
	})

	it('throws when the name is empty or missing', () => {
		expect(() => validateSurfaceModelDefinition(validModel({ name: '' }))).toThrow('Surface model validation failed')
		expect(() => validateSurfaceModelDefinition(validModel({ name: undefined as any }))).toThrow(
			'Surface model validation failed',
		)
	})

	it('surfaces a bad layout as a model failure', () => {
		expect(() => validateSurfaceModelDefinition(validModel({ layout: { controls: {} } as any }))).toThrow(
			'Surface model validation failed',
		)
	})

	it('surfaces a bad appearance as a model failure', () => {
		expect(() =>
			validateSurfaceModelDefinition(
				validModel({ appearance: { size: { width: 0, height: 0 }, bodyColor: '#1a1a1a', controls: {} } }),
			),
		).toThrow('Surface model validation failed')
	})

	it('rejects an appearance which does not cover every control of the layout', () => {
		// The drift guard: two records keyed by the same ids, which no schema can cross-reference
		const model = validModel()
		delete model.appearance!.controls['0/1']

		expect(() => validateSurfaceModelDefinition(model)).toThrow('is missing controls: 0/1')
	})

	it('allows an appearance to describe controls the layout does not have', () => {
		// A face covers a whole model, where a layout may have been trimmed to what the host supports
		const model = validModel()
		model.appearance!.controls['0/2'] = { x: 540, y: 100, width: 180, height: 180 }

		expect(() => validateSurfaceModelDefinition(model)).not.toThrow()
	})
})
