import { createHash } from 'node:crypto'

export function assertNever(_v: never): void {
	// Nothing to do
}

export interface RgbColor {
	r: number
	g: number
	b: number
}

export function parseColor(color: string | undefined): RgbColor {
	const r = color ? parseInt(color.substr(1, 2), 16) : 0
	const g = color ? parseInt(color.substr(3, 2), 16) : 0
	const b = color ? parseInt(color.substr(5, 2), 16) : 0

	return { r, g, b }
}

/**
 * Generator for stable fake serial numbers for usb devices without hardware serials.
 *
 * Generates deterministic serials by hashing just the uniqueness key and an index.
 */
export class StableDeviceIdGenerator {
	/**
	 * Cache of device info to fake serial
	 * Map: `${uniquenessKey}||${devicePath}` -> string
	 */
	#previousForDevicePath = new Map<string, string>()

	/**
	 * Track which device paths were seen during the current scan
	 * Set of keys: `${uniquenessKey}||${devicePath}`
	 */
	#seenThisScan = new Set<string>()
	/**
	 * Track which serialnumbers were returned during this scan
	 */
	#returnedThisScan = new Set<string>()

	/**
	 * Generate a stable serial number for a device without a hardware serial.
	 *
	 * @param uniquenessKey - Identifier for the device type (e.g., "vendorId:productId")
	 * @param path - Device path (e.g., "/dev/hidraw0")
	 * @returns A stable fake serial number
	 */
	generateId(uniquenessKey: string, devicePath: string): string {
		const pathCacheKey = `${uniquenessKey}||${devicePath}`

		// Mark as seen during this scan
		this.#seenThisScan.add(pathCacheKey)

		// If there is something cached against the devicePath, use that
		const cachedSerial = this.#previousForDevicePath.get(pathCacheKey)
		if (cachedSerial) return cachedSerial

		// Loop until we find a non-colliding ID
		for (let i = 0; ; i++) {
			const fakeSerial = createHash('sha1').update(`${uniquenessKey}||${i}`).digest('hex')
			if (!this.#returnedThisScan.has(fakeSerial)) {
				this.#returnedThisScan.add(fakeSerial)
				this.#previousForDevicePath.set(pathCacheKey, fakeSerial)
				return fakeSerial
			}
		}
	}

	/**
	 * Prune cache entries for devices that were not seen during the current scan.
	 * This should be called once after processing all devices in a scan.
	 */
	pruneNotSeen(): void {
		// Remove path cache entries that weren't seen
		for (const [key] of this.#previousForDevicePath.entries()) {
			if (!this.#seenThisScan.has(key)) {
				this.#previousForDevicePath.delete(key)
			}
		}

		// Clear the seen set for the next scan
		this.#seenThisScan.clear()
		this.#returnedThisScan.clear()

		// Prepopulate the returned set with existing serials to avoid collisions
		for (const serial of this.#previousForDevicePath.values()) {
			this.#returnedThisScan.add(serial)
		}
	}
}
