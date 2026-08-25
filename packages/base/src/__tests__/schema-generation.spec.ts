import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import z from 'zod'
import { buildManifestSchema } from '../manifest-schema.js'

/** Recursively collect every value found at an `additionalProperties` key. */
function collectAdditionalProperties(node: unknown, out: unknown[] = []): unknown[] {
	if (Array.isArray(node)) {
		for (const item of node) collectAdditionalProperties(item, out)
	} else if (node && typeof node === 'object') {
		for (const [key, value] of Object.entries(node)) {
			if (key === 'additionalProperties') out.push(value)
			collectAdditionalProperties(value, out)
		}
	}
	return out
}

function readAsset(relativePath: string): unknown {
	const url = new URL(`../../assets/${relativePath}`, import.meta.url)
	return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
}

describe('generated schema assets', () => {
	it('never emits `additionalProperties: false` (forward-compatibility)', () => {
		for (const asset of ['manifest.schema.json', 'surface-layout.schema.json']) {
			const schema = readAsset(asset)
			const additionalProps = collectAdditionalProperties(schema)
			expect(additionalProps, `${asset} should not close any objects`).not.toContain(false)
		}
	})

	it('committed assets match what the generator would produce', () => {
		const manifestJson = z.toJSONSchema(buildManifestSchema(true), {
			target: 'draft-2020-12',
			unrepresentable: 'any',
			override: (ctx) => {
				if (ctx.jsonSchema.additionalProperties === false) delete ctx.jsonSchema.additionalProperties
			},
		})
		const committed = readAsset('manifest.schema.json') as Record<string, unknown>
		// `$id` is the only field the generator adds on top of zod's output.
		const { $id, ...committedBody } = committed
		void $id
		expect(committedBody).toEqual(manifestJson)
	})
})

describe('manifest strict vs loose modes', () => {
	const strict = buildManifestSchema(true)
	const loose = buildManifestSchema(false)

	const withPlaceholder = {
		type: 'surface',
		id: 'companion-surface-test',
		name: 'Test',
		shortname: 'test',
		description: 'desc',
		version: '1.0.0',
		license: 'MIT',
		repository: 'x',
		bugs: 'y',
		maintainers: [{ name: 'Test' }],
		runtime: { type: 'node22', apiVersion: '1.0.0', entrypoint: 'index.js' },
		products: ['Your product'],
		keywords: [],
		usbIds: [],
	}

	it('rejects template placeholders in strict mode', () => {
		expect(strict.safeParse(withPlaceholder).success).toBe(false)
	})

	it('accepts template placeholders in loose mode', () => {
		expect(loose.safeParse(withPlaceholder).success).toBe(true)
	})

	it('strips unknown keys rather than rejecting them', () => {
		const result = loose.safeParse({ ...withPlaceholder, someFutureField: true })
		expect(result.success).toBe(true)
		expect(result.success && 'someFutureField' in result.data).toBe(false)
	})
})
