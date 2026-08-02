import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { SurfaceProxy, SurfaceProxyContext } from '../surfaceProxy.js'
import type { SurfaceHostContext } from '../context.js'
import type { SurfaceInstance, SurfaceRegisterProps } from '@companion-surface/base'

function makeContext() {
	const inputRotate = vi.fn()
	const host = mock<SurfaceHostContext>({
		surfaceEvents: { inputRotate } as unknown as SurfaceHostContext['surfaceEvents'],
	})

	const surface = mock<SurfaceInstance>()
	surface.draw.mockResolvedValue(undefined)
	surface.blank.mockResolvedValue(undefined)

	const registerProps: SurfaceRegisterProps = {
		brightness: false,
		surfaceLayout: {
			stylePresets: {
				default: {},
			},
			controls: {
				enc: { row: 0, column: 0 },
			},
		},
		pincodeMap: null,
		location: null,
		configFields: null,
	}

	const context = new SurfaceProxyContext(host, 'surf1', vi.fn())
	// The SurfaceProxy constructor registers itself with the context via storeSurface
	new SurfaceProxy(host, context, surface, registerProps)

	return { context, inputRotate }
}

describe('SurfaceProxyContext rotate', () => {
	let ctx: ReturnType<typeof makeContext>
	beforeEach(() => {
		ctx = makeContext()
	})

	it('rotateLeftById defaults to a single leftward step', () => {
		ctx.context.rotateLeftById('enc')
		expect(ctx.inputRotate).toHaveBeenCalledWith('surf1', 'enc', -1)
	})

	it('rotateRightById defaults to a single rightward step', () => {
		ctx.context.rotateRightById('enc')
		expect(ctx.inputRotate).toHaveBeenCalledWith('surf1', 'enc', 1)
	})

	it('rotateLeftById uses the magnitude of amount and forces leftward direction', () => {
		ctx.context.rotateLeftById('enc', 3)
		ctx.context.rotateLeftById('enc', -4) // sign ignored, still leftward
		expect(ctx.inputRotate).toHaveBeenNthCalledWith(1, 'surf1', 'enc', -3)
		expect(ctx.inputRotate).toHaveBeenNthCalledWith(2, 'surf1', 'enc', -4)
	})

	it('rotateRightById uses the magnitude of amount and forces rightward direction', () => {
		ctx.context.rotateRightById('enc', 5)
		ctx.context.rotateRightById('enc', -2) // sign ignored, still rightward
		expect(ctx.inputRotate).toHaveBeenNthCalledWith(1, 'surf1', 'enc', 5)
		expect(ctx.inputRotate).toHaveBeenNthCalledWith(2, 'surf1', 'enc', 2)
	})

	it('rotateById forwards the signed delta verbatim', () => {
		ctx.context.rotateById('enc', -7)
		ctx.context.rotateById('enc', 2)
		expect(ctx.inputRotate).toHaveBeenNthCalledWith(1, 'surf1', 'enc', -7)
		expect(ctx.inputRotate).toHaveBeenNthCalledWith(2, 'surf1', 'enc', 2)
	})

	it('ignores a zero or non-finite delta', () => {
		ctx.context.rotateById('enc', 0)
		ctx.context.rotateById('enc', Number.NaN)
		ctx.context.rotateById('enc', Number.POSITIVE_INFINITY)
		expect(ctx.inputRotate).not.toHaveBeenCalled()
	})

	it('ignores rotation for an unknown control', () => {
		ctx.context.rotateById('missing', 1)
		expect(ctx.inputRotate).not.toHaveBeenCalled()
	})
})
