import type { SurfaceSchemaBitmapConfig, SurfaceSchemaPixelFormat } from '@companion-surface/base'
import type { SurfaceRotation } from './types.js'

export interface LockingGraphicsGenerator {
	generatePincodeChar(
		bitmapStyle: SurfaceSchemaBitmapConfig,
		keyCode: number | string,
		rotation: SurfaceRotation,
	): Promise<Uint8Array>

	generatePincodeValue(
		bitmapStyle: SurfaceSchemaBitmapConfig,
		charCount: number,
		rotation: SurfaceRotation,
	): Promise<Uint8Array>
}

export interface HostCardGenerator {
	generateBasicCard(
		width: number,
		height: number,
		pixelFormat: SurfaceSchemaPixelFormat,
		remoteIp: string,
		status: string,
	): Promise<Uint8Array>

	generateLcdStripCard(
		width: number,
		height: number,
		pixelFormat: SurfaceSchemaPixelFormat,
		remoteIp: string,
		status: string,
	): Promise<Uint8Array>

	generateLogoCard(width: number, height: number, pixelFormat: SurfaceSchemaPixelFormat): Promise<Uint8Array>
}
