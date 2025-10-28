import type EventEmitter from 'node:events'
import type { SomeCompanionInputField } from './input.js'
import type { RemoteSurfaceConnectionInfo } from './types.js'
import type { DiscoveredSurfaceInfo } from './plugin.js'

export interface SurfacePluginRemoteEvents<TInfo> {
	surfacesConnected: [surfaceInfos: DiscoveredSurfaceInfo<TInfo>[]]
	// surfacesRemoved: [surfaceIds: SurfaceId[]]
}

/**
 * For some plugins which only support using a builtin detection mechanism, this can be used to provide the detection info
 */
export interface SurfacePluginRemote<TInfo> extends EventEmitter<SurfacePluginRemoteEvents<TInfo>> {
	/**
	 * Get any configuration fields needed for configuring a remote connection
	 *
	 * Note: This gets called once during plugin initialisation. Changes made after this will not be detected
	 */
	readonly configFields: SomeCompanionInputField[]

	/**
	 * Setup one or more connections to remote surfaces
	 * @param connectionInfos Info about the connections to add
	 */
	startConnections(connectionInfos: RemoteSurfaceConnectionInfo[]): Promise<void>

	/**
	 * Stop one or more connections to remote surfaces
	 * @param connectionIds Ids of the connections to remove
	 */
	stopConnections(connectionIds: string[]): Promise<void>

	/**
	 * When a surface is discovered, but the application has chosen not to open it, this function is called to inform the detection mechanism
	 * You can use this to cleanup any resources/handles for this surface, as it will not be used further
	 * @param surfaceInfo The info about the surface which was rejected
	 */
	rejectSurface(surfaceInfo: DiscoveredSurfaceInfo<TInfo>): void
}
