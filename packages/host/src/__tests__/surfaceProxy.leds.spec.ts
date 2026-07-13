import { describe, it, expect, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { SurfaceProxy, type SurfaceProxyContext } from '../surfaceProxy.js'
import type { SurfaceHostContext } from '../context.js'
import type { SurfaceInstance, SurfaceRegisterProps } from '@companion-surface/base'

/** Yield to the macrotask queue so the async draw queue drains. */
async function flush(): Promise<void> {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setImmediate(resolve))
	}
}

function makeProxy() {
	const surface = mock<SurfaceInstance>()
	surface.draw.mockResolvedValue(undefined)
	surface.blank.mockResolvedValue(undefined)

	const context = {
		isLocked: false,
		storeSurface: vi.fn(),
	} as unknown as SurfaceProxyContext

	const host = mock<SurfaceHostContext>()

	const registerProps: SurfaceRegisterProps = {
		brightness: false,
		surfaceLayout: {
			stylePresets: {
				default: { leds: { segments: 3, mode: 'simple' } },
			},
			controls: {
				'led-test': { row: 0, column: 0 },
			},
		},
		pincodeMap: null,
		location: null,
		configFields: null,
	}

	const proxy = new SurfaceProxy(host, context, surface, registerProps)
	return { proxy, surface }
}

describe('SurfaceProxy leds validation', () => {
	it('passes a correctly-sized leds buffer through to the surface', async () => {
		const { proxy, surface } = makeProxy()

		const leds = new Uint8Array(3 * 3)
		await proxy.draw({ controlId: 'led-test', leds })
		await flush()

		expect(surface.draw.mock.calls.length).toBeGreaterThan(0)
		const drawn = surface.draw.mock.calls.at(-1)?.[1]
		expect(drawn?.leds).toBe(leds)
	})

	it('drops a wrong-sized leds buffer but still draws the rest', async () => {
		const { proxy, surface } = makeProxy()

		const leds = new Uint8Array(2 * 3) // wrong: only 2 segments
		await proxy.draw({ controlId: 'led-test', color: '#ffffff', leds })
		await flush()

		expect(surface.draw.mock.calls.length).toBeGreaterThan(0)
		const drawn = surface.draw.mock.calls.at(-1)?.[1]
		expect(drawn?.leds).toBeUndefined()
		expect(drawn?.color).toBe('#ffffff')
	})
})
