import {
	surfaceLayoutSchema,
	type SurfaceSchemaLayoutDefinition,
	type SurfaceSchemaControlDefinition,
	type SurfaceSchemaControlStylePreset,
	type SurfaceSchemaBitmapConfig,
	type SurfaceSchemaLedsConfig,
	type SurfaceSchemaPixelFormat,
} from './surface-layout-schema.js'
import { formatValidationError } from './schema-error.js'

export type {
	SurfaceSchemaLayoutDefinition,
	SurfaceSchemaControlDefinition,
	SurfaceSchemaControlStylePreset,
	SurfaceSchemaBitmapConfig,
	SurfaceSchemaLedsConfig,
	SurfaceSchemaPixelFormat,
}

/**
 * Validate that a surface layout matches the schema before it is handed off to
 * the host/app, so a malformed layout fails loudly here instead of downstream
 * in the app.
 */
export function validateSurfaceLayout(layout: unknown): asserts layout is SurfaceSchemaLayoutDefinition {
	const result = surfaceLayoutSchema.safeParse(layout)
	if (!result.success) {
		throw new Error(`Surface layout validation failed: ${formatValidationError(result.error)}`)
	}
}
