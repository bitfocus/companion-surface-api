import { describe, it, expect } from 'vitest'
import { validateSurfaceManifest } from '../manifest.js'
import type { SurfaceModuleManifest } from '../manifest.js'

function validManifest(overrides: Partial<SurfaceModuleManifest> = {}): SurfaceModuleManifest {
	return {
		type: 'surface',
		id: 'companion-surface-test',
		name: 'Test Surface',
		shortname: 'test',
		description: 'A test surface module',
		version: '1.0.0',
		license: 'MIT',
		repository: 'https://github.com/example/companion-surface-test',
		bugs: 'https://github.com/example/companion-surface-test/issues',
		maintainers: [{ name: 'Test Author' }],
		runtime: {
			type: 'node22',
			apiVersion: '1.0.0',
			entrypoint: 'index.js',
		},
		products: ['Test Product'],
		keywords: ['test'],
		usbIds: [],
		...overrides,
	}
}

describe('validateSurfaceManifest', () => {
	describe('basic type validation', () => {
		it('throws when passed null', () => {
			expect(() => validateSurfaceManifest(null as any, true)).toThrow('Manifest is not an object')
		})

		it('throws when passed undefined', () => {
			expect(() => validateSurfaceManifest(undefined as any, true)).toThrow('Manifest is not an object')
		})

		it('throws when passed a string', () => {
			expect(() => validateSurfaceManifest('hello' as any, true)).toThrow('Manifest is not an object')
		})

		it('throws when passed a number', () => {
			expect(() => validateSurfaceManifest(42 as any, true)).toThrow('Manifest is not an object')
		})
	})

	describe('schema validation', () => {
		it('accepts a valid manifest', () => {
			expect(() => validateSurfaceManifest(validManifest(), true)).not.toThrow()
		})

		it('throws when type is not surface', () => {
			expect(() => validateSurfaceManifest(validManifest({ type: 'module' as any }), true)).toThrow(
				"Manifest 'type' must be 'surface'",
			)
		})

		it('throws when id is missing', () => {
			const m = validManifest()
			delete (m as any).id
			expect(() => validateSurfaceManifest(m, true)).toThrow('Manifest validation failed')
		})

		it('throws when name is missing', () => {
			const m = validManifest()
			delete (m as any).name
			expect(() => validateSurfaceManifest(m, true)).toThrow('Manifest validation failed')
		})

		it('throws when products is empty', () => {
			expect(() => validateSurfaceManifest(validManifest({ products: [] as any }), true)).toThrow(
				'Manifest validation failed',
			)
		})

		it('throws when runtime.type is wrong', () => {
			expect(() =>
				validateSurfaceManifest(
					validManifest({ runtime: { ...validManifest().runtime, type: 'node99' as any } }),
					true,
				),
			).toThrow('Manifest validation failed')
		})

		it('throws when runtime.apiVersion is missing', () => {
			const m = validManifest()
			delete (m.runtime as any).apiVersion
			expect(() => validateSurfaceManifest(m, true)).toThrow('Manifest validation failed')
		})
	})

	describe('template placeholder checks (looseChecks=false)', () => {
		it('throws when id contains the template name', () => {
			expect(() => validateSurfaceManifest(validManifest({ id: 'companion-surface-your-module-name' }), false)).toThrow(
				`Manifest incorrectly references template module 'your-module-name'`,
			)
		})

		it('throws when shortname contains the template shortname', () => {
			expect(() => validateSurfaceManifest(validManifest({ shortname: 'module-shortname' }), false)).toThrow(
				`Manifest incorrectly references template module 'module-shortname'`,
			)
		})

		it('throws when description contains the template description', () => {
			const desc = 'A short one line description of your module'
			expect(() => validateSurfaceManifest(validManifest({ description: desc }), false)).toThrow(
				`Manifest incorrectly references template module '${desc}'`,
			)
		})

		it('throws when a maintainer name contains the template name', () => {
			expect(() => validateSurfaceManifest(validManifest({ maintainers: [{ name: 'Your name' }] }), false)).toThrow(
				`Manifest incorrectly references template module 'Your name'`,
			)
		})

		it('throws when a maintainer email contains the template email', () => {
			expect(() =>
				validateSurfaceManifest(validManifest({ maintainers: [{ name: 'Test Author', email: 'Your email' }] }), false),
			).toThrow(`Manifest incorrectly references template module 'Your email'`)
		})

		it('throws when products contains the template product', () => {
			expect(() => validateSurfaceManifest(validManifest({ products: ['Your product'] }), false)).toThrow(
				`Manifest incorrectly references template module 'Your product'`,
			)
		})

		it('does not throw for template placeholders when looseChecks=true', () => {
			expect(() => validateSurfaceManifest(validManifest({ products: ['Your product'] }), true)).not.toThrow()
		})
	})
})
