import type EventEmitter from 'node:events'
import type { OptionsObject, SomeCompanionInputField } from './input.js'
import type { RemoteSurfaceConnectionInfo } from './types.js'
import type { DetectionSurfaceInfo } from './plugin.js'

export interface SurfacePluginRemoteEvents<TInfo> {
	surfacesConnected: [surfaceInfos: DetectionSurfaceInfo<TInfo>[]]
	// surfacesRemoved: [surfaceIds: SurfaceId[]]

	/**
	 * Fired when surface discovery detects new surfaces
	 * This is used as suggestions in the ui of remote surfaces the user can setup
	 */
	connectionsFound: [connectionInfos: DiscoveredRemoteSurfaceInfo[]]
	/**
	 * Fired when previously detected surfaces are forgotten
	 * This is the opposite of connectionsFound, to forget any connections which are no longer available
	 */
	connectionsForgotten: [connectionIds: string[]]
}

/**
 * For some plugins which only support using a builtin detection mechanism, this can be used to provide the detection info
 */
export interface SurfacePluginRemote<TInfo> extends EventEmitter<SurfacePluginRemoteEvents<TInfo>> {
	/**
	 * Get any configuration fields needed for configuring a remote connection
	 *
	 * Note: This gets fetched once during plugin initialisation. Changes made after this will not be detected
	 */
	readonly configFields: SomeCompanionInputField[]

	/**
	 * An expression to use to check if two configs refer to the same remote surface connection.
	 * Often this should not include every field, as some affect behaviour rather than the identity of the connection
	 *
	 * This uses the companion expression syntax, one object can be accessed like $(objA:address) and the other like $(objB:address)
	 *
	 * Note: This gets fetched once during plugin initialisation. Changes made after this will not be detected
	 */
	readonly checkConfigMatchesExpression: string | null

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
	rejectSurface(surfaceInfo: DetectionSurfaceInfo<TInfo>): void
}

export interface DiscoveredRemoteSurfaceInfo {
	/**
	 * A unique id. This is used to identify the connection for updates and being forgotten
	 */
	id: string
	/**
	 * A user friendly name for the connection. Such as the hostname or user chosen name
	 */
	displayName: string
	/**
	 * A secondary description for the connection. Such as the model or device type
	 */
	description: string
	// /**
	//  * An address (if applicable) for the connection. Such as an IP or hostname
	//  */
	// addresses: string|null
	/**
	 * The configuration object to use for connecting to this remote surface.
	 * This should match the schema defined with `configFields`, as once added it will be user editable with those fields
	 */
	config: OptionsObject
}
