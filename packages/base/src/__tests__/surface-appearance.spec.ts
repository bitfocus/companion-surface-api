import { describe, it, expect } from 'vitest'
import { appearanceCoversLayout, validateSurfaceAppearance } from '../surface-appearance.js'
import type { SurfaceAppearanceDefinition } from '../surface-appearance.js'
import { MAX_BODY_IMAGE_LENGTH } from '../surface-appearance-schema.js'
import type { SurfaceSchemaLayoutDefinition } from '../surface-layout.js'

function validAppearance(overrides: Partial<SurfaceAppearanceDefinition> = {}): SurfaceAppearanceDefinition {
	return {
		size: { width: 1560, height: 1220 },
		bodyColor: '#1a1a1a',
		controls: {
			'0/0': { x: 120, y: 180, width: 180, height: 180, shape: { type: 'rect', cornerRadius: 20 } },
			'0/1': { x: 340, y: 180, width: 180, height: 180 },
			'1/0': { x: 120, y: 400, width: 180, height: 180, shape: { type: 'circle' } },
		},
		...overrides,
	}
}

function validLayout(): SurfaceSchemaLayoutDefinition {
	return {
		stylePresets: { default: { bitmap: { w: 72, h: 72 } } },
		controls: {
			'0/0': { row: 0, column: 0 },
			'0/1': { row: 0, column: 1 },
			'1/0': { row: 1, column: 0 },
		},
	}
}

describe('validateSurfaceAppearance', () => {
	describe('basic type validation', () => {
		it('throws when passed null', () => {
			expect(() => validateSurfaceAppearance(null as any)).toThrow('Surface appearance validation failed')
		})

		it('throws when passed undefined', () => {
			expect(() => validateSurfaceAppearance(undefined as any)).toThrow('Surface appearance validation failed')
		})

		it('throws when passed a string', () => {
			expect(() => validateSurfaceAppearance('hello' as any)).toThrow('Surface appearance validation failed')
		})
	})

	it('accepts a valid appearance', () => {
		expect(() => validateSurfaceAppearance(validAppearance())).not.toThrow()
	})

	it('accepts an appearance with no artwork, just a body colour', () => {
		expect(() =>
			validateSurfaceAppearance({ size: { width: 10, height: 10 }, bodyColor: '#1a1a1a', controls: {} }),
		).not.toThrow()
	})

	it('throws when size is missing', () => {
		const { size, ...withoutSize } = validAppearance()
		void size
		expect(() => validateSurfaceAppearance(withoutSize as any)).toThrow('Surface appearance validation failed')
	})

	it('throws when the face has no extent', () => {
		expect(() => validateSurfaceAppearance(validAppearance({ size: { width: 0, height: 100 } }))).toThrow(
			'Surface appearance validation failed',
		)
	})

	it('throws when a control id contains invalid characters', () => {
		expect(() =>
			validateSurfaceAppearance(validAppearance({ controls: { 'bad id!': { x: 0, y: 0, width: 1, height: 1 } } })),
		).toThrow('Surface appearance validation failed')
	})

	it('throws when a control is missing its size', () => {
		expect(() =>
			validateSurfaceAppearance(validAppearance({ controls: { '0/0': { x: 0, y: 0, height: 1 } as any } })),
		).toThrow('Surface appearance validation failed')
	})

	it('allows a control to overhang the edge of the face', () => {
		// A real control can sit right on the edge of a device, so bounds are not clamped to `size`
		expect(() =>
			validateSurfaceAppearance(validAppearance({ controls: { '0/0': { x: -10, y: 1210, width: 40, height: 40 } } })),
		).not.toThrow()
	})

	it('tolerates additional unknown top-level properties (lenient, forward-compatible)', () => {
		// Unknown keys are stripped rather than rejected, so newer appearances with
		// extra fields still validate against an older schema.
		expect(() => validateSurfaceAppearance(validAppearance({ extra: true } as any))).not.toThrow()
	})

	describe('shapes', () => {
		it('accepts a rect with no corner radius', () => {
			expect(() =>
				validateSurfaceAppearance(
					validAppearance({ controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, shape: { type: 'rect' } } } }),
				),
			).not.toThrow()
		})

		it('accepts a circle', () => {
			expect(() =>
				validateSurfaceAppearance(
					validAppearance({ controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, shape: { type: 'circle' } } } }),
				),
			).not.toThrow()
		})

		it('throws on an unrecognised shape type', () => {
			expect(() =>
				validateSurfaceAppearance(
					validAppearance({
						controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, shape: { type: 'hexagon' } as any } },
					}),
				),
			).toThrow('Surface appearance validation failed')
		})

		it('throws on a negative corner radius', () => {
			expect(() =>
				validateSurfaceAppearance(
					validAppearance({
						controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, shape: { type: 'rect', cornerRadius: -1 } } },
					}),
				),
			).toThrow('Surface appearance validation failed')
		})
	})

	describe('kind and legend', () => {
		it('accepts every control type', () => {
			for (const type of ['button', 'encoder', 'jog', 'fader', 'lcd-segment'] as const) {
				expect(() =>
					validateSurfaceAppearance(
						validAppearance({ controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, type } } }),
					),
				).not.toThrow()
			}
		})

		it('throws on an unrecognised control type', () => {
			expect(() =>
				validateSurfaceAppearance(
					validAppearance({ controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, type: 'trackball' as any } } }),
				),
			).toThrow('Surface appearance validation failed')
		})

		it('accepts a printed legend', () => {
			expect(() =>
				validateSurfaceAppearance(
					validAppearance({ controls: { '0/0': { x: 0, y: 0, width: 1, height: 1, label: 'CUT' } } }),
				),
			).not.toThrow()
		})
	})

	describe('body image', () => {
		const svgDataUri = `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`

		it('accepts a base64 svg data uri', () => {
			expect(() => validateSurfaceAppearance(validAppearance({ bodyImage: svgDataUri }))).not.toThrow()
		})

		it('accepts png and webp', () => {
			for (const mime of ['image/png', 'image/webp']) {
				expect(() =>
					validateSurfaceAppearance(validAppearance({ bodyImage: `data:${mime};base64,AAAA` })),
				).not.toThrow()
			}
		})

		it('throws on a mime type outside the allowlist', () => {
			expect(() => validateSurfaceAppearance(validAppearance({ bodyImage: 'data:image/gif;base64,AAAA' }))).toThrow(
				'Surface appearance validation failed',
			)
		})

		it('throws on a url rather than inline data', () => {
			// Nothing downstream shares a filesystem or an origin with the module, so only inline data works
			expect(() => validateSurfaceAppearance(validAppearance({ bodyImage: 'https://example.com/face.svg' }))).toThrow(
				'Surface appearance validation failed',
			)
		})

		it('throws when the image is over the size cap', () => {
			const oversized = `data:image/png;base64,${'A'.repeat(MAX_BODY_IMAGE_LENGTH)}`
			expect(() => validateSurfaceAppearance(validAppearance({ bodyImage: oversized }))).toThrow(
				'Surface appearance validation failed',
			)
		})
	})

	it('throws when the body colour is missing', () => {
		const { bodyColor, ...withoutColour } = validAppearance()
		void bodyColor
		expect(() => validateSurfaceAppearance(withoutColour as any)).toThrow('Surface appearance validation failed')
	})

	it('throws on a malformed body colour', () => {
		for (const colour of ['red', '#fff', 'rgb(1,2,3)']) {
			expect(() => validateSurfaceAppearance(validAppearance({ bodyColor: colour }))).toThrow(
				'Surface appearance validation failed',
			)
		}
	})
})

describe('appearanceCoversLayout', () => {
	it('returns nothing when every control is described', () => {
		expect(appearanceCoversLayout(validLayout(), validAppearance())).toEqual([])
	})

	it('returns the controls the appearance says nothing about', () => {
		const appearance = validAppearance()
		delete appearance.controls['0/1']

		expect(appearanceCoversLayout(validLayout(), appearance)).toEqual(['0/1'])
	})

	it('ignores appearance entries the layout does not have', () => {
		// Normal: a face covers a whole model, where a live layout may have been trimmed to what the host supports
		const appearance = validAppearance()
		appearance.controls['2/0'] = { x: 0, y: 0, width: 1, height: 1 }

		expect(appearanceCoversLayout(validLayout(), appearance)).toEqual([])
	})
})
