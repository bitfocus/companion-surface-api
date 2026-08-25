import z from 'zod'
import {
	surfaceLayoutSchema,
	type SurfaceSchemaLayoutDefinition,
	type SurfaceSchemaControlDefinition,
	type SurfaceSchemaControlStylePreset,
	type SurfaceSchemaBitmapConfig,
	type SurfaceSchemaLedsConfig,
	type SurfaceSchemaPixelFormat,
} from './surface-layout-schema.js'

export type {
	SurfaceSchemaLayoutDefinition,
	SurfaceSchemaControlDefinition,
	SurfaceSchemaControlStylePreset,
	SurfaceSchemaBitmapConfig,
	SurfaceSchemaLedsConfig,
	SurfaceSchemaPixelFormat,
}

/** Format zod issues into a single, human readable string. */
function formatValidationError(error: z.ZodError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? `/${issue.path.join('/')}` : ''
			return path ? `${path} ${issue.message}` : issue.message
		})
		.join('; ')
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
