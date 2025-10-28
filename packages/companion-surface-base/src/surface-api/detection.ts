import type EventEmitter from 'node:events'
import type { DiscoveredSurfaceInfo } from './plugin.js'

export interface SurfacePluginDetectionEvents<TInfo> {
	surfacesAdded: [surfaceInfos: DiscoveredSurfaceInfo<TInfo>[]]
	// surfacesRemoved: [surfaceIds: SurfaceId[]]
}

/**
 * For some plugins which only support using a builtin detection mechanism, this can be used to provide the detection info
 */
export interface SurfacePluginDetection<TInfo> extends EventEmitter<SurfacePluginDetectionEvents<TInfo>> {
	/**
	 * Trigger this plugin to perform a scan for any connected surfaces.
	 * This is used when the user triggers a scan, so should refresh any caches when possible
	 */
	triggerScan(): Promise<void>

	/**
	 * When a surface is discovered, but the application has chosen not to open it, this function is called to inform the detection mechanism
	 * You can use this to cleanup any resources/handles for this surface, as it will not be used further
	 * @param surfaceInfo The info about the surface which was rejected
	 */
	rejectSurface(surfaceInfo: DiscoveredSurfaceInfo<TInfo>): void
}
