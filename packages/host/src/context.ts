import type { DiscoveredRemoteSurfaceInfo, SurfaceFirmwareUpdateInfo } from '@companion-surface/base'
import type { LockingGraphicsGenerator, HostCardGenerator } from './graphics.js'
import type { CheckDeviceResult, OpenDeviceResult } from './types.js'

/**
 * Result of checking whether a discovered surface should be opened.
 */
export interface ShouldOpenSurfaceResult {
	/** Whether the surface should be opened */
	shouldOpen: boolean
	/** The collision-resolved surface ID to use when opening the device */
	resolvedSurfaceId: string
}

export interface SurfaceHostContext {
	readonly lockingGraphics: LockingGraphicsGenerator
	readonly cardsGenerator: HostCardGenerator

	readonly capabilities: HostCapabilities

	readonly surfaceEvents: HostSurfaceEvents

	/**
	 * Check whether a discovered surface should be opened.
	 * This must be called before opening a detected surface to get the collision-resolved ID.
	 * @param info - Information about the discovered device
	 * @returns Result indicating if the surface should be opened and the resolved ID to use
	 */
	readonly shouldOpenDiscoveredSurface: (info: CheckDeviceResult) => Promise<ShouldOpenSurfaceResult>
	readonly notifyOpenedDiscoveredSurface: (info: OpenDeviceResult) => Promise<void>

	/**
	 * Notify the host that discovered surfaces are no longer available.
	 * This should be called when surfaces that were detected (but not necessarily opened) go away.
	 * @param devicePaths - The device paths of the surfaces to forget
	 */
	readonly forgetDiscoveredSurfaces: (devicePaths: string[]) => void

	readonly connectionsFound: (connectionInfos: DiscoveredRemoteSurfaceInfo[]) => void
	readonly connectionsForgotten: (connectionIds: string[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HostCapabilities {
	// Nothing yet
}

export interface HostSurfaceEvents {
	readonly disconnected: (surfaceId: string) => void

	readonly inputPress: (surfaceId: string, controlId: string, pressed: boolean) => void
	readonly inputRotate: (surfaceId: string, controlId: string, delta: number) => void

	readonly changePage: (surfaceId: string, forward: boolean) => void

	readonly setVariableValue: (surfaceId: string, name: string, value: any) => void

	readonly pincodeEntry: (surfaceId: string, char: number) => void

	readonly firmwareUpdateInfo: (surfaceId: string, info: SurfaceFirmwareUpdateInfo | null) => void
}
