import type { SurfaceSchemaLayoutDefinition } from '../surface-layout-schema.js'
import type { SurfaceAppearanceDefinition } from '../surface-appearance-schema.js'
import type { HostCapabilities } from './context.js'

/** Allowed characters in a surface model id. */
export const SURFACE_MODEL_ID_REGEX = /^[a-zA-Z0-9\-_.]+$/

/** Longest accepted model id or name. */
export const SURFACE_MODEL_STRING_MAX_LENGTH = 200

/**
 * A model of surface this plugin knows how to drive, whether or not one is plugged in, so that a
 * user can lay out a device they do not own yet.
 *
 * Its `layout` is only used when no surface of it is connected: a connected surface always reports
 * its own, which may legitimately differ.
 */
export interface SurfaceModelDefinition {
	/**
	 * Stable id for this model, unique within the plugin. Must match
	 * {@link SURFACE_MODEL_ID_REGEX}.
	 *
	 * Persisted by the host, so changing it orphans whatever a user has set up
	 * against it.
	 */
	id: string

	/** User facing name of the model, eg `Stream Deck XL`. */
	name: string

	/** The controls this model has, in the form a connected surface of it would report. */
	layout: SurfaceSchemaLayoutDefinition

	/**
	 * How to draw this model's face.
	 *
	 * Optional: a model with no appearance is still worth declaring, and is
	 * drawn from geometry derived out of its layout.
	 */
	appearance?: SurfaceAppearanceDefinition
}

/** What a plugin is told about its surroundings when it is asked for its models. */
export interface SurfaceModelsContext {
	/**
	 * The capabilities of the host running this plugin.
	 *
	 * The same values a surface is given in its `SurfaceContext`, available here
	 * so that a model's layout can be built to the same constraints a live
	 * surface's layout would be - otherwise the two disagree for exactly the
	 * surfaces where it matters.
	 */
	readonly capabilities: HostCapabilities
}
