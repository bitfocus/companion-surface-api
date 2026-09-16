export { PluginWrapper } from './plugin.js'
export * from './graphics.js'
export * from './logging.js'
export * from './types.js'
export * from './context.js'
export { SurfaceRotation } from './types.js'

// Re-export types from base package that are useful for host implementations
export {
	SurfaceModuleManifest,
	validateSurfaceManifest,
	SurfaceSchemaPixelFormat,
	SurfaceSchemaLayoutDefinition,
	SurfaceSchemaControlDefinition,
	SurfaceSchemaControlStylePreset,
	SurfaceSchemaBitmapConfig,
	SurfaceSchemaLedsConfig,
	SurfaceAppearanceDefinition,
	SurfaceAppearanceSize,
	SurfaceControlAppearance,
	SurfaceControlShape,
	validateSurfaceLayout,
	validateSurfaceAppearance,
	appearanceCoversLayout,
	SurfaceModelDefinition,
	SurfaceModelsContext,
	validateSurfaceModelDefinition,
	SURFACE_MODEL_ID_REGEX,
	MAX_BODY_IMAGE_LENGTH,
	DiscoveredRemoteSurfaceInfo,
	LogLevel,
	createModuleLogger,
	SurfaceFirmwareUpdateInfo,
	HIDDevice,
	SurfaceDrawProps,
	HostCapabilities,
	GridSize,
	SurfaceInputVariable,
	SurfaceOutputVariable,
	SomeCompanionInputField,
	OptionsObject,
} from '@companion-surface/base'
