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
 * Read the colour of a single LED segment from a packed RGB `SurfaceDrawProps.leds` buffer.
 * @param buffer The packed RGB buffer (3 bytes per segment)
 * @param index The zero-based segment index
 */
export function readLedColor(buffer: Uint8Array, index: number): RgbColor {
	const offset = index * 3
	return {
		r: buffer[offset] ?? 0,
		g: buffer[offset + 1] ?? 0,
		b: buffer[offset + 2] ?? 0,
	}
}

/**
 * Write the colour of a single LED segment into a packed RGB buffer.
 * Provided for tests/tooling; Companion produces the buffer, so surfaces rarely need this.
 * @param buffer The packed RGB buffer (3 bytes per segment)
 * @param index The zero-based segment index
 * @param color The colour to write
 */
export function writeLedColor(buffer: Uint8Array, index: number, color: RgbColor): void {
	const offset = index * 3
	buffer[offset] = color.r
	buffer[offset + 1] = color.g
	buffer[offset + 2] = color.b
}

/**
 * Flatten a colour to a single 0-255 intensity, for surfaces whose LEDs are monochrome.
 * Uses the Rec.709 luma coefficients.
 * @param color The colour to flatten
 */
export function colorToIntensity(color: RgbColor): number {
	return Math.round(0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b)
}
