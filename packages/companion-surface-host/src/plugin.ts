import { SurfaceProxy, SurfaceProxyContext } from './surfaceProxy.js'
import {
	createModuleLogger,
	type RemoteSurfaceConnectionInfo,
	type DiscoveredSurfaceInfo,
	type HIDDevice,
	type OpenSurfaceResult,
	type SurfaceDrawProps,
	type SurfacePlugin,
} from '@companion-surface/base'
import type { SurfaceHostContext } from './context.js'
import type { PluginFeatures, CheckDeviceResult, OpenDeviceResult } from './types.js'
import { FirmwareUpdateCheck } from './firmwareUpdateCheck.js'

export class PluginWrapper<TInfo = unknown> {
	readonly #logger = createModuleLogger('PluginWrapper')

	readonly #host: SurfaceHostContext
	readonly #plugin: SurfacePlugin<TInfo>
	readonly #firmwareUpdateCheck: FirmwareUpdateCheck

	readonly #openSurfaces = new Map<string, SurfaceProxy | null>() // Null means opening in progress

	constructor(host: SurfaceHostContext, plugin: SurfacePlugin<TInfo>) {
		this.#host = host
		this.#plugin = plugin
		this.#firmwareUpdateCheck = new FirmwareUpdateCheck(this.#openSurfaces, (surfaceId, updateInfo) => {
			this.#host.surfaceEvents.firmwareUpdateInfo(surfaceId, updateInfo)
		})
	}

	getPluginFeatures(): PluginFeatures {
		return {
			supportsDetection: !!this.#plugin.detection,
			supportsHid: typeof this.#plugin.checkSupportsHidDevice === 'function',
			supportsScan: typeof this.#plugin.scanForSurfaces === 'function',
			supportsOutbound: this.#plugin.remote
				? {
						configFields: this.#plugin.remote.configFields,
					}
				: undefined,
		}
	}

	async init(): Promise<void> {
		if (this.#plugin.detection) {
			this.#logger.info('Initializing for surface detection')

			const rejectFn = this.#plugin.detection.rejectSurface.bind(this.#plugin.detection)

			// // Setup detection events
			// this.#plugin.detection.on('surfacesRemoved', (surfaceIds) => {
			// 	for (const surfaceId of surfaceIds) {
			// 		this.#cleanupSurfaceById(surfaceId)
			// 	}
			// })
			this.#plugin.detection.on('surfacesAdded', (surfaceInfos) => {
				for (const info of surfaceInfos) {
					this.#offerOpenDevice(info, 'detection', rejectFn).catch((e) => {
						this.#logger.error(`Error opening discovered device: ${e}`)
					})
				}
			})
		}

		if (this.#plugin.remote) {
			this.#logger.info('Initializing for outbound connections')

			const rejectFn = this.#plugin.remote.rejectSurface.bind(this.#plugin.remote)

			this.#plugin.remote.on('surfacesConnected', (surfaceInfos) => {
				for (const info of surfaceInfos) {
					this.#offerOpenDevice(info, 'outbound', rejectFn).catch((e) => {
						this.#logger.error(`Error opening discovered device: ${e}`)
					})
				}
			})
		}

		this.#logger.info('Initializing plugin')

		await this.#plugin.init()

		this.#firmwareUpdateCheck.init()
	}

	async destroy(): Promise<void> {
		this.#firmwareUpdateCheck.destoy()

		// Close all open surfaces
		await Promise.allSettled(
			Array.from(this.#openSurfaces.values()).map(async (surface) =>
				surface?.close().catch((e) => {
					this.#logger.error(`Error closing surface: ${e}`)
				}),
			),
		)

		this.#openSurfaces.clear()

		// Then destroy the plugin
		await this.#plugin.destroy()
	}

	async checkHidDevice(hidDevice: HIDDevice): Promise<CheckDeviceResult | null> {
		// Disable when detection is enabled
		if (this.#plugin.detection) return null

		// Refuse if we don't support this
		if (!this.#plugin.checkSupportsHidDevice) return null

		// Check if hid device is supported
		const info = this.#plugin.checkSupportsHidDevice(hidDevice)
		if (!info) return null

		// Report back the basic info
		return {
			surfaceId: info.surfaceId,
			description: info.description,
		}
	}

	async openHidDevice(hidDevice: HIDDevice): Promise<OpenDeviceResult | null> {
		// Disable when detection is enabled
		if (this.#plugin.detection) return null

		// Refuse if we don't support this
		if (!this.#plugin.checkSupportsHidDevice) return null

		// Check if hid device is supported
		const info = this.#plugin.checkSupportsHidDevice(hidDevice)
		if (!info) return null

		return this.#openDeviceInner(info)
	}

	async #offerOpenDevice(
		info: DiscoveredSurfaceInfo<TInfo>,
		mode: string,
		rejectFn: (info: DiscoveredSurfaceInfo<TInfo>) => void,
	): Promise<void> {
		if (this.#openSurfaces.has(info.surfaceId)) {
			// Already open, assume faulty detection logic
			return
		}

		// Ask host if we should open this
		const shouldOpen = await this.#host.shouldOpenDiscoveredSurface({
			surfaceId: info.surfaceId,
			description: info.description,
		})
		this.#logger.info(`Discovered ${mode} surface: ${info.surfaceId}, ${info.description} (shouldOpen=${shouldOpen})`)
		if (!shouldOpen) {
			// Reject the surface
			rejectFn(info)
			return
		}

		// All clear, open it
		const openInfo = await this.#openDeviceInner(info)
		if (!openInfo) return

		this.#logger.info(`Opened discovered ${mode} surface: ${openInfo.surfaceId}`)

		// Report back to host
		this.#host.notifyOpenedDiscoveredSurface(openInfo).catch((e) => {
			rejectFn(info)
			this.#logger.error(`Error reporting opened discovered ${mode} surface: ${e}`)
		})
	}

	async #openDeviceInner(info: DiscoveredSurfaceInfo<TInfo>): Promise<OpenDeviceResult | null> {
		if (this.#openSurfaces.has(info.surfaceId)) {
			throw new Error(`Surface with id ${info.surfaceId} is already opened`)
		}
		this.#openSurfaces.set(info.surfaceId, null) // Mark as opening

		const surfaceContext = new SurfaceProxyContext(this.#host, info.surfaceId, (err) => {
			this.#logger.error(`Surface error: ${err}`)
			this.#cleanupSurfaceById(info.surfaceId)
		})

		// Open the surface
		let surface: OpenSurfaceResult | undefined
		try {
			surface = await this.#plugin.openSurface(info.surfaceId, info.pluginInfo, surfaceContext)

			await surface.surface.init()
		} catch (e) {
			// Remove from list as it has failed
			this.#openSurfaces.delete(info.surfaceId)

			// Ensure surface is closed
			if (surface) surface.surface?.close().catch(() => {}) // Ignore errors here

			throw e
		}

		// Wrap the surface
		const wrapped = new SurfaceProxy(this.#host, surfaceContext, surface.surface, surface.registerProps)
		this.#openSurfaces.set(info.surfaceId, wrapped)

		// Trigger a firmware update check
		this.#firmwareUpdateCheck.triggerCheckSurfaceForUpdates(wrapped)

		// The surface is now open, report back
		return {
			surfaceId: info.surfaceId,
			description: info.description,
			supportsBrightness: surface.registerProps.brightness,
			surfaceLayout: surface.registerProps.surfaceLayout,
			transferVariables: surface.registerProps.transferVariables ?? null,
			location: surface.registerProps.location ?? null,
		}
	}

	#lastScannedDevices: DiscoveredSurfaceInfo<TInfo>[] = []

	async scanForDevices(): Promise<CheckDeviceResult[]> {
		// Perform a trigger when detection is enabled
		if (this.#plugin.detection) {
			this.#logger.info('Triggering detection scan')
			await this.#plugin.detection.triggerScan()
			// Return empty, as the detection will trigger its own events
			return []
		}

		if (!this.#plugin.scanForSurfaces) return []

		this.#logger.info('Triggering surface scan')
		const results = await this.#plugin.scanForSurfaces()

		// Cache these for when one is opened
		this.#lastScannedDevices = results

		return results.map((r) => ({
			surfaceId: r.surfaceId,
			description: r.description,
		}))
	}

	async openScannedDevice(device: CheckDeviceResult): Promise<OpenDeviceResult | null> {
		// Disable when detection is enabled
		if (this.#plugin.detection) return null

		const cachedInfo = this.#lastScannedDevices.find((d) => d.surfaceId === device.surfaceId)

		// Not found, return null
		if (!cachedInfo) {
			this.#logger.warn(`Failed to find cached surface info for scanned device ${device.surfaceId}`)
			return null
		}

		this.#logger.info(`Opening scanned device ${device.surfaceId}`)

		return this.#openDeviceInner(cachedInfo)
	}

	#cleanupSurfaceById(surfaceId: string): void {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) return

		try {
			// cleanup
			this.#openSurfaces.delete(surfaceId)
			this.#host.surfaceEvents.disconnected(surfaceId)

			surface.close().catch(() => {
				// Ignore
			})
		} catch (_e) {
			// Ignore
		}
	}

	async setBrightness(surfaceId: string, brightness: number): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		// Check if brightness is supported
		if (!surface.registerProps.brightness) return

		await surface.setBrightness(brightness)
	}

	async blankSurface(surfaceId: string): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.blankSurface()
	}

	async readySurface(surfaceId: string): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		await surface.readySurface()
	}

	async draw(surfaceId: string, drawProps: SurfaceDrawProps[]): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		// TODO - error handling
		for (const props of drawProps) {
			const control = surface.registerProps.surfaceLayout.controls[props.controlId]
			if (!control) throw new Error(`Control "${props.controlId}" does not exist on surface ${surfaceId}`)

			await surface.draw(props)
		}
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async onVariableValue(surfaceId: string, name: string, value: any): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.onVariableValue(name, value)
	}

	async showLockedStatus(surfaceId: string, locked: boolean, characterCount: number): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.showLockedStatus(locked, characterCount)
	}

	async showStatus(surfaceId: string, hostname: string, status: string): Promise<void> {
		const surface = this.#openSurfaces.get(surfaceId)
		if (!surface) throw new Error(`Surface with id ${surfaceId} is not opened`)

		surface.showStatus(hostname, status)
	}

	async setupRemoteConnections(connectionInfos: RemoteSurfaceConnectionInfo[]): Promise<void> {
		if (!this.#plugin.remote) throw new Error('Plugin does not support outbound connections')

		this.#logger.info(`Setting up ${connectionInfos.length} remote connections:`)
		for (const connectionInfo of connectionInfos) {
			this.#logger.info(` - ${connectionInfo.connectionId} (${JSON.stringify(connectionInfo.config)})`)
		}

		await this.#plugin.remote.startConnections(connectionInfos)
	}
	async stopRemoteConnections(connectionIds: string[]): Promise<void> {
		if (!this.#plugin.remote) throw new Error('Plugin does not support outbound connections')

		this.#logger.info(`Stopping ${connectionIds.length} remote connections:`)
		for (const connectionId of connectionIds) {
			this.#logger.info(` - ${connectionId}`)
		}

		await this.#plugin.remote.stopConnections(connectionIds)
	}
}
