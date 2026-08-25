import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import prettier from 'prettier'
import z from 'zod'
// The schema modules only import `zod`, so they can be loaded directly via
// Node's TypeScript type-stripping without a separate build step.
import { buildManifestSchema } from '../src/manifest-schema.ts'
import { surfaceLayoutSchema } from '../src/surface-layout-schema.ts'

/**
 * Never emit `additionalProperties: false`. Closed objects have repeatedly caused
 * forwards/backwards-compatibility problems, where an older schema rejects an
 * object produced by a newer tool that added a field. Runtime validation stays
 * lenient too: zod objects strip unknown keys rather than rejecting them, so
 * extra properties are always tolerated.
 *
 * Only the boolean `false` form is removed; record/catchall types use
 * `additionalProperties` to describe their value schema and must be left alone.
 */
function stripClosedObjects(ctx) {
	if (ctx.jsonSchema.additionalProperties === false) {
		delete ctx.jsonSchema.additionalProperties
	}
}

async function writeSchema(schema, relativePath, title) {
	const jsonSchema = z.toJSONSchema(schema, {
		target: 'draft-2020-12',
		// `.refine()`-based constraints (eg uniqueItems) cannot be represented in
		// JSON schema; emit what we can rather than throwing on them.
		unrepresentable: 'any',
		override: stripClosedObjects,
	})

	// Prepend the identifying metadata that consumers reference the schema by.
	const output = {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		$id: relativePath,
		title,
		...jsonSchema,
	}

	const outputPath = fileURLToPath(new URL(`..${relativePath}`, import.meta.url))

	// Format through prettier so the committed file always matches the repo style.
	const prettierConfig = await prettier.resolveConfig(outputPath)
	const formatted = await prettier.format(JSON.stringify(output), { ...prettierConfig, parser: 'json' })
	writeFileSync(outputPath, formatted)

	console.log(`Wrote ${outputPath}`)
}

// The published manifest schema is the *strict* one, so that editors flag any
// leftover module-template placeholders while a module is being developed.
await writeSchema(buildManifestSchema(true), '/assets/manifest.schema.json', 'SurfaceModuleManifest')
await writeSchema(surfaceLayoutSchema, '/assets/surface-layout.schema.json', 'SurfaceSchemaLayoutDefinition')
