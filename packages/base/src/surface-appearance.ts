import {
	surfaceAppearanceSchema,
	type SurfaceAppearanceDefinition,
	type SurfaceAppearanceSize,
	type SurfaceControlAppearance,
	type SurfaceControlShape,
} from './surface-appearance-schema.js'
import type { SurfaceSchemaLayoutDefinition } from './surface-layout-schema.js'
import { formatValidationError } from './schema-error.js'

export type { SurfaceAppearanceDefinition, SurfaceAppearanceSize, SurfaceControlAppearance, SurfaceControlShape }

export { MAX_BODY_IMAGE_LENGTH } from './surface-appearance-schema.js'

/**
 * Validate a surface appearance. Unlike a layout an appearance is optional, so a caller which gets
 * a throw from here should log it and carry on without one, not refuse to open the surface.
 */
export function validateSurfaceAppearance(appearance: unknown): asserts appearance is SurfaceAppearanceDefinition {
	const result = surfaceAppearanceSchema.safeParse(appearance)
	if (!result.success) {
		throw new Error(`Surface appearance validation failed: ${formatValidationError(result.error)}`)
	}
}

/**
 * Which of the layout's controls the appearance says nothing about.
 *
 * Treat a non-empty result as all or nothing and discard the appearance whole. The reverse is fine
 * and not reported: an appearance may cover controls a trimmed layout does not have.
 */
export function appearanceCoversLayout(
	layout: SurfaceSchemaLayoutDefinition,
	appearance: SurfaceAppearanceDefinition,
): string[] {
	return Object.keys(layout.controls).filter((controlId) => !Object.hasOwn(appearance.controls, controlId))
}
