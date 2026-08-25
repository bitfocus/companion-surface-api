import z from 'zod'

/**
 * Single source of truth for the surface module manifest schema.
 *
 * The manifest is validated in two modes:
 *   - `loose`  – structural validation only. Used while a module is still being
 *                developed and may still contain template placeholder values.
 *   - `strict` – structural validation plus checks that the module has been
 *                filled in properly (ie no leftover template placeholders).
 *
 * Both modes are produced from the exact same code by the generator functions
 * below, so there is only ever one description of the manifest to maintain. The
 * generated JSON schema (`assets/manifest.schema.json`) and the TypeScript types
 * are both derived from these definitions too.
 */

/** Escape a string so it can be embedded literally into a `RegExp` source. */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * In strict mode, forbid a string field from containing one of the module
 * template's placeholder values.
 *
 * The constraint is expressed as a regex (rather than a `.refine()`) so that it
 * is carried through into the generated JSON schema as a `pattern`, and is
 * therefore surfaced by editors as well as enforced at runtime. In loose mode
 * the field is left untouched.
 */
function forbidPlaceholder(base: z.ZodString, placeholder: string, strict: boolean): z.ZodString {
	if (!strict) return base

	// Matches any string that does NOT contain `placeholder` anywhere ([\s\S] so
	// that newlines in eg a description are covered too).
	const pattern = new RegExp(`^((?!${escapeRegExp(placeholder)})[\\s\\S])*$`)
	return base.regex(pattern, `must not contain the module template placeholder ${JSON.stringify(placeholder)}`)
}

/** True if `arr` contains two items that are deeply equal. */
function hasDuplicates(arr: readonly unknown[]): boolean {
	const seen = new Set<string>()
	for (const item of arr) {
		const key = typeof item === 'string' ? item : JSON.stringify(item, Object.keys(item as object).sort())
		if (seen.has(key)) return true
		seen.add(key)
	}
	return false
}

/**
 * An array whose items must be unique. `uniqueItems` is attached to the JSON
 * schema output, and the same constraint is enforced at runtime.
 */
function uniqueArray<T extends z.ZodType>(item: T, opts: { min?: number } = {}) {
	let arr = z.array(item)
	if (opts.min !== undefined) arr = arr.min(opts.min)
	return arr
		.refine((value) => !hasDuplicates(value), { error: 'must not contain duplicate items' })
		.meta({
			uniqueItems: true,
		})
}

// ── Sub-schemas that do not depend on the strict/loose mode ────────────────────

const runtimeSchema = z
	.object({
		type: z.enum(['node22', 'node26']).describe('Type of the module. Must be: node22 or node26'),
		apiVersion: z.string().describe('The version of the host-api used'),
		entrypoint: z.string().describe('Entrypoint to pass to the runtime. eg index.js'),
	})
	.describe('Information on how to execute the module')
	.meta({ id: 'SurfaceModuleManifestRuntime', title: 'SurfaceModuleManifestRuntime' })

const usbIdsSchema = z
	.object({
		vendorId: z.int(),
		productIds: uniqueArray(z.int(), { min: 1 }),
	})
	.meta({ id: 'SurfaceModuleManifestUsbIds', title: 'SurfaceModuleManifestUsbIds' })

// ── Mode-dependent generators ──────────────────────────────────────────────────

/** Build the maintainer sub-schema for the given strictness. */
function buildMaintainerSchema(strict: boolean) {
	return z
		.object({
			name: forbidPlaceholder(z.string(), 'Your name', strict),
			email: forbidPlaceholder(z.string(), 'Your email', strict).optional(),
			github: z.string().optional(),
			url: z.string().optional(),
		})
		.meta({ id: 'SurfaceModuleManifestMaintainer', title: 'SurfaceModuleManifestMaintainer' })
}

function buildManifestSchemaObject(strict: boolean) {
	return z
		.object({
			$schema: z.string().optional(),
			type: z.enum(['surface']).describe('Type of module. Must be: surface'),
			id: forbidPlaceholder(z.string(), 'your-module-name', strict).describe('Unique identifier for the module'),
			name: forbidPlaceholder(z.string(), 'your-module-name', strict).describe('Name of the module'),
			shortname: forbidPlaceholder(z.string(), 'module-shortname', strict),
			description: forbidPlaceholder(z.string(), 'A short one line description of your module', strict).describe(
				'Description of the module',
			),
			version: z.string().describe('Current version of the module'),
			isPrerelease: z
				.boolean()
				.optional()
				.describe('Is this a pre-release version. Note: this gets set by the build system'),
			license: z.string().describe('SPDX identifier for license of the module'),
			repository: z.string().describe('URL to the source repository'),
			bugs: z.string().describe('URL to bug tracker'),
			maintainers: uniqueArray(buildMaintainerSchema(strict)).describe('List of active maintainers'),
			runtime: runtimeSchema,
			products: uniqueArray(forbidPlaceholder(z.string(), 'Your product', strict), { min: 1 }),
			keywords: uniqueArray(z.string()),
			usbIds: uniqueArray(usbIdsSchema).describe(
				'List of USB vendor and product IDs that the module supports. Your module will only be notified of devices matching these IDs.',
			),
			allowMultipleInstances: z
				.boolean()
				.optional()
				.describe('Whether multiple instances of this module can be run simultaneously'),
		})
		.meta({ id: 'SurfaceModuleManifest', title: 'SurfaceModuleManifest' })
}

// ── Inferred types ─────────────────────────────────────────────────────────────
// The strict/loose distinction only adds runtime `pattern` constraints, so it has
// no effect on the inferred TypeScript types.

export type SurfaceModuleManifest = z.infer<ReturnType<typeof buildManifestSchemaObject>>
export type SurfaceModuleManifestMaintainer = z.infer<ReturnType<typeof buildMaintainerSchema>>
export type SurfaceModuleManifestRuntime = z.infer<typeof runtimeSchema>
export type SurfaceModuleManifestUsbIds = z.infer<typeof usbIdsSchema>

/**
 * Build the complete manifest schema.
 *
 * @param strict when `true`, additionally reject leftover module-template
 *   placeholder values (eg `Your product`, `your-module-name`).
 */
export function buildManifestSchema(strict: boolean): z.ZodType<SurfaceModuleManifest> {
	return buildManifestSchemaObject(strict)
}
