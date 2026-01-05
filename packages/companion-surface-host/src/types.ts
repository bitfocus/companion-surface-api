import type {
	SomeCompanionInputField,
	SurfaceInputVariable,
	SurfaceOutputVariable,
	SurfaceSchemaLayoutDefinition,
} from '@companion-surface/base'

export interface PluginFeatures {
	// apiVersion: string

	supportsDetection: boolean
	supportsHid: boolean
	supportsScan: boolean
	supportsOutbound?: {
		configFields: SomeCompanionInputField[]
		configMatchesExpression: string | null
	}
}

export interface CheckDeviceResult {
	devicePath: string
	surfaceId: string
	surfaceIdIsNotUnique: boolean
	description: string
}

export interface OpenDeviceResult {
	/**
	 * A unique ID for this surface. This is typically in the format of `<product>:<serialNumber>`
	 */
	surfaceId: string
	/**
	 * A user-friendly name for this surface. This is often the product name
	 */
	description: string

	/**
	 * Whether the surface supports setting brightness
	 */
	supportsBrightness: boolean
	/**
	 * The definition of the controls on the surface and the properties needed for drawing
	 */
	surfaceLayout: SurfaceSchemaLayoutDefinition
	/**
	 * Describes any custom input or output variables for the surface
	 * These are typically used for reporting values such as a tbar or battery level.
	 * Or for providing non-button values such as leds next to a tbar
	 */
	transferVariables: Array<SurfaceInputVariable | SurfaceOutputVariable> | null

	/**
	 * If the surface is connected over a network, provide the ip address here as a visual aid to the user
	 * If not connected over a network, set to null
	 */
	location: string | null

	/**
	 * Any configuration fields for the surface
	 */
	configFields: SomeCompanionInputField[] | null
}
