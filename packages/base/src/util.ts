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
