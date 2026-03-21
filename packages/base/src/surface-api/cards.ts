import type { SurfaceSchemaPixelFormat } from '../../generated/surface-layout.d.ts'

export interface CardGenerator {
	/**
	 * Generate a basic placeholder status card.
	 * This is typically a large logo in the middle, with some status text along the bottom.
	 * @param width Width of the card in pixels
	 * @param height Height of the card in pixels
	 * @param pixelFormat Pixel format of the card
	 */
	generateBasicCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array>

	/**
	 * Generate a basic status card designed for a wide and short LCD strip display.
	 * @param width Width of the card in pixels
	 * @param height Height of the card in pixels
	 * @param pixelFormat Pixel format of the card
	 */
	// TODO - can this be done in the basic card when detecting some extreme aspect ratios?
	generateLcdStripCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array>

	/**
	 * Generate a logo-only card.
	 * @param width Width of the card in pixels
	 * @param height Height of the card in pixels
	 * @param pixelFormat Pixel format of the card
	 */
	generateLogoCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array>
}
