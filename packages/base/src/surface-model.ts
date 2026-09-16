import {
	SURFACE_MODEL_ID_REGEX,
	SURFACE_MODEL_STRING_MAX_LENGTH,
	type SurfaceModelDefinition,
} from './surface-api/models.js'
import { appearanceCoversLayout, validateSurfaceAppearance } from './surface-appearance.js'
import { validateSurfaceLayout } from './surface-layout.js'

/** Validate a surface model definition, composing the layout and appearance validators. */
export function validateSurfaceModelDefinition(model: unknown): asserts model is SurfaceModelDefinition {
	// Not a zod schema: the schema files are loaded by tools/generate-schemas.mjs through Node's type
	// stripping, which cannot resolve their `.js` specifiers, so one schema file cannot import another.
	const fail = (message: string): never => {
		throw new Error(`Surface model validation failed: ${message}`)
	}

	if (!model || typeof model !== 'object') fail('expected an object')
	const candidate = model as Partial<SurfaceModelDefinition>

	if (typeof candidate.id !== 'string' || !SURFACE_MODEL_ID_REGEX.test(candidate.id)) {
		fail(`/id must match ${SURFACE_MODEL_ID_REGEX.source}`)
	}
	if (candidate.id!.length > SURFACE_MODEL_STRING_MAX_LENGTH) {
		fail(`/id must be at most ${SURFACE_MODEL_STRING_MAX_LENGTH} characters`)
	}

	if (typeof candidate.name !== 'string' || candidate.name.length === 0) fail('/name must be a non-empty string')
	if (candidate.name!.length > SURFACE_MODEL_STRING_MAX_LENGTH) {
		fail(`/name must be at most ${SURFACE_MODEL_STRING_MAX_LENGTH} characters`)
	}

	try {
		validateSurfaceLayout(candidate.layout)
	} catch (e: any) {
		fail(`/layout ${e?.message ?? e}`)
	}

	if (candidate.appearance !== undefined) {
		try {
			validateSurfaceAppearance(candidate.appearance)
		} catch (e: any) {
			fail(`/appearance ${e?.message ?? e}`)
		}

		// A face which does not cover every control is worse than no face at all:
		// the host would have to mix declared geometry with derived geometry, and
		// draw a device with holes in it.
		const missing = appearanceCoversLayout(candidate.layout!, candidate.appearance)
		if (missing.length > 0) fail(`/appearance is missing controls: ${missing.join(', ')}`)
	}
}
