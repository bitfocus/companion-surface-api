import {
	buildManifestSchema,
	type SurfaceModuleManifest,
	type SurfaceModuleManifestMaintainer,
	type SurfaceModuleManifestRuntime,
	type SurfaceModuleManifestUsbIds,
} from './manifest-schema.js'
import { formatValidationError } from './schema-error.js'

export type {
	SurfaceModuleManifest,
	SurfaceModuleManifestMaintainer,
	SurfaceModuleManifestRuntime,
	SurfaceModuleManifestUsbIds,
}

// Build both schemas once, up front, so validation is cheap on repeat calls.
const strictManifestSchema = buildManifestSchema(true)
const looseManifestSchema = buildManifestSchema(false)

/**
 * Validate that a manifest looks correctly populated.
 *
 * @param manifest the manifest to validate
 * @param looseChecks when `true`, skip the checks that reject leftover module
 *   template placeholder values. Used while a module is still being developed.
 */
export function validateSurfaceManifest(
	manifest: unknown,
	looseChecks: boolean,
): asserts manifest is SurfaceModuleManifest {
	const schema = looseChecks ? looseManifestSchema : strictManifestSchema

	const result = schema.safeParse(manifest)
	if (!result.success) {
		throw new Error(`Manifest validation failed: ${formatValidationError(result.error)}`)
	}
}
