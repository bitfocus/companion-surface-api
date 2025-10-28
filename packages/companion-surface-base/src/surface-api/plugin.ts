import type { HIDDevice, OpenSurfaceResult } from './types.js'
import type { SurfaceContext } from './context.js'
import type { SurfacePluginDetection } from './detection.js'
import { SurfacePluginRemote } from './remote.js'

/**
 * The base SurfacePlugin interface, for all surface plugins
 */
export interface SurfacePlugin<TInfo> {
	/**
	 * Some plugins are forced to use a builtin detection mechanism by their surfaces or inner library
	 * In this case, this property should be set to an instance of SurfacePluginDetection
	 *
	 * It is preferred that plugins to NOT use this, and to instead use the abtractions we provide to reduce the cost of scanning and detection
	 * Note: it is important that no events are emitted from this until after init() has been invoked, or they will be lost
	 */
	readonly detection?: SurfacePluginDetection<TInfo>

	/**
	 * Some plugins can make connections to IP/cloud based surfaces
	 * In this case, this property should be set to an instance of SurfacePluginRemote
	 *
	 * Note: it is important that no events are emitted from this until after init() has been invoked, or they will be lost
	 */
	readonly remote?: SurfacePluginRemote<TInfo>

	/**
	 * Initialize the plugin
	 *
	 * This will be called once when the plugin is loaded, before any surfaces or events are used
	 */
	init(): Promise<void>

	/**
	 * Uninitialise the plugin
	 *
	 * This will be called once when the plugin is about to be unloaded. You should reset and close any surfaces here, and prepare for being terminated
	 */
	destroy(): Promise<void>

	/**
	 * Check if a HID device is supported by this plugin
	 * Note: This must not open the device, just perform checks based on the provided info to see if it is supported
	 * @param device HID device to check
	 * @returns Info about the device if it is supported, otherwise null
	 */
	checkSupportsHidDevice?: (device: HIDDevice) => DiscoveredSurfaceInfo<TInfo> | null

	/**
	 * Perform a scan for devices, but not open them
	 * Note: This should only be used if the plugin uses a protocol where we don't have other handling for
	 */
	scanForSurfaces?: () => Promise<DiscoveredSurfaceInfo<TInfo>[]>

	/**
	 * Open a discovered/known surface
	 * This can be called for multiple surfaces in parallel
	 * @param surfaceId Id of the surface
	 * @param pluginInfo Plugin specific info about the surface
	 * @param context Context for the surface
	 * @returns Instance of the surface
	 */
	openSurface: (surfaceId: string, pluginInfo: TInfo, context: SurfaceContext) => Promise<OpenSurfaceResult>
}

export interface DiscoveredSurfaceInfo<TInfo> {
	surfaceId: string
	description: string
	pluginInfo: TInfo
}
