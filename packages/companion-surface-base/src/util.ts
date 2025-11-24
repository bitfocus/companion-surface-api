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
 * Helper class to generate stable, unique device IDs for devices that lack serial numbers.
 * Each instance is scoped to a single batch of devices, ensuring uniqueness within that batch.
 *
 * @example
 * ```typescript
 * const generator = new StableDeviceIdGenerator()
 * const serial1 = generator.generateId('1234:5678', '/dev/hidraw0')
 * const serial2 = generator.generateId('1234:5678', '/dev/hidraw1')
 * // serial1 and serial2 will be unique even for the same uniquenessKey
 * ```
 */
export class StableDeviceIdGenerator {
	readonly #previousForDevicePath = new Map<string, string>()
	readonly #returnedIds = new Map<string, string>()

	/**
	 * Generate a stable unique ID for a device within the current batch.
	 *
	 * @param uniquenessKey - A string containing device identifiers (e.g., "vendorId:productId")
	 * @param devicePath - A unique identifier for the device. Typically the device path. This is to ensure that multiple endpoints of the same hid device get the same id.
	 * @returns A stable unique identifier for the device
	 */
	generateId(uniquenessKey: string, devicePath?: string): string {
		// Generate a complete key

		// If there is something cached against the devicePath, use that
		const pathCacheKey = `${uniquenessKey}||${devicePath}`
		if (devicePath) {
			const cached = this.#previousForDevicePath.get(pathCacheKey)
			if (cached) return cached
		}

		// Loop until we find a non-colliding ID
		for (let i = 0; ; i++) {
			const id = `${uniquenessKey}||${i}`
			if (!this.#returnedIds.has(id)) {
				const fakeSerial = createHash('sha1').update(id).digest('hex')

				this.#returnedIds.set(id, fakeSerial)
				this.#previousForDevicePath.set(pathCacheKey, fakeSerial)
				return fakeSerial
			}
		}
	}
}
