import type { SurfaceSchemaLayoutDefinition } from '../generated/surface-layout.d.ts'
// @ts-expect-error no typings
// eslint-disable-next-line n/no-missing-import
import validateSurfaceLayoutSchema from '../generated/validate_surface_layout.js'

export type * from '../generated/surface-layout.d.ts'

/** Validate that a surface layout matches the schema before it is handed off to the host/app */
export function validateSurfaceLayout(layout: SurfaceSchemaLayoutDefinition): void {
	if (!layout || typeof layout !== 'object') {
		throw new Error(`Surface layout is not an object`)
	}

	if (!validateSurfaceLayoutSchema(layout)) {
		const errors = validateSurfaceLayoutSchema.errors
		if (!errors) throw new Error(`Surface layout failed validation with unknown reason`)

		throw new Error(`Surface layout validation failed: ${JSON.stringify(errors)}`)
	}
}
