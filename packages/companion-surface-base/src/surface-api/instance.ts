import type { CardGenerator } from './cards.js'
import type { SurfaceFirmwareUpdateCache, SurfaceFirmwareUpdateInfo } from './firmware.js'
import type { SurfaceDrawProps, SurfaceId } from './types.js'

export interface SurfaceInstance {
	/**
	 * A unique ID for this surface instance
	 * This is typically the serial number
	 */
	readonly surfaceId: SurfaceId
	/**
	 * A user-friendly name for this surface
	 * This should be the product name of the device
	 */
	readonly productName: string

	/**
	 * Initialize the surface for use, called after creation
	 */
	init(): Promise<void>

	/**
	 * Clean up any resources, and close the surface
	 */
	close(): Promise<void>

	/**
	 * If there are any config fields defined, when the user updates the config, this is called to inform the surface of the new config
	 * This will be called just before ready() with the initial config
	 */
	updateConfig?(config: Record<string, any>): void

	/**
	 * When the surface transitions into the ready state
	 * This means that it is about to begin drawing
	 */
	ready(): Promise<void>

	// updateCapabilities(capabilities: ClientCapabilities): void

	/**
	 * Set the brightness of the display
	 * @param percent 0-100
	 */
	setBrightness(percent: number): Promise<void>

	/**
	 * Clear the display, setting all pixels to black/off
	 */
	blank(): Promise<void>

	/**
	 * Draw to the device
	 * @param signal AbortSignal to cancel the draw operation
	 * @param drawProps Data to draw
	 */
	draw(signal: AbortSignal, drawProps: SurfaceDrawProps): Promise<void>

	onVariableValue?(name: string, value: any): void

	showLockedStatus?(locked: boolean, characterCount: number): void

	/**
	 * Show a status image on the device, instead of the normal operation
	 * This is typically used for Satellite to show the "connecting" state
	 * @param signal AbortSignal to cancel the status display
	 * @param cardGenerator Card generator to create the status image(s)
	 */
	showStatus(signal: AbortSignal, cardGenerator: CardGenerator, statusMessage: string): Promise<void>

	/**
	 * Check for firmware updates for this surface
	 * @param versionsCache Cache object to assist with caching any api calls needed to determine latest versions
	 * @returns Firmware update info, or null if no update is available
	 */
	checkForFirmwareUpdates?(versionsCache: SurfaceFirmwareUpdateCache): Promise<SurfaceFirmwareUpdateInfo | null>
}
