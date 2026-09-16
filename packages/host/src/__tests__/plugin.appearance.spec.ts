import { describe, it, expect } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { PluginWrapper } from '../plugin.js'
import type { SurfaceHostContext } from '../context.js'
import type {
	HIDDevice,
	SurfaceInstance,
	SurfacePlugin,
	SurfaceRegisterProps,
	SurfaceAppearanceDefinition,
	SurfaceSchemaLayoutDefinition,
} from '@companion-surface/base'

function validLayout(): SurfaceSchemaLayoutDefinition {
	return {
		stylePresets: {
			default: { bitmap: { w: 72, h: 72 } },
		},
		controls: {
			'0/0': { row: 0, column: 0 },
			'0/1': { row: 0, column: 1 },
		},
	}
}

function validAppearance(): SurfaceAppearanceDefinition {
	return {
		size: { width: 500, height: 250 },
		bodyColor: '#1a1a1a',
		controls: {
			'0/0': { x: 50, y: 50, width: 150, height: 150, shape: { type: 'rect', cornerRadius: 18 } },
			'0/1': { x: 250, y: 50, width: 150, height: 150 },
		},
	}
}

function makeWrapper(surfaceAppearance: SurfaceAppearanceDefinition | null) {
	const surface = mock<SurfaceInstance>()
	surface.init.mockResolvedValue(undefined)
	surface.close.mockResolvedValue(undefined)

	const registerProps: SurfaceRegisterProps = {
		brightness: false,
		surfaceLayout: validLayout(),
		surfaceAppearance,
		pincodeMap: null,
		location: null,
		configFields: null,
	}

	const plugin = mock<SurfacePlugin<unknown>>()
	plugin.detection = undefined
	plugin.checkSupportsHidDevice.mockReturnValue({
		surfaceId: 'test-surface',
		description: 'Test Surface',
		pluginInfo: {},
	})
	plugin.openSurface.mockResolvedValue({ surface, registerProps })

	const host = mock<SurfaceHostContext>()

	const wrapper = new PluginWrapper(host, plugin)
	return { wrapper, surface, plugin }
}

describe('PluginWrapper surface appearance validation', () => {
	it('reports a valid appearance back to the host', async () => {
		const { wrapper } = makeWrapper(validAppearance())

		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')

		expect(result?.surfaceAppearance).toEqual(validAppearance())
	})

	it('reports null when the surface supplies no appearance', async () => {
		const { wrapper } = makeWrapper(null)

		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')

		expect(result?.surfaceAppearance).toBeNull()
	})

	// The inverse of "rejects a surface whose layout does not match" in plugin.layout.spec.ts.
	// Together the two are the required-vs-recommended contract expressed as tests.
	it('still opens the surface when the appearance is malformed', async () => {
		const badAppearance = { size: { width: 0, height: 0 } } as unknown as SurfaceAppearanceDefinition
		const { wrapper, surface } = makeWrapper(badAppearance)

		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')

		expect(result).not.toBeNull()
		expect(result?.surfaceAppearance).toBeNull()
		expect(result?.surfaceLayout).toEqual(validLayout())
		expect(surface.init.mock.calls.length).toBe(1)
		expect(surface.close.mock.calls.length).toBe(0)
	})

	it('discards an appearance which does not cover every control of the layout', async () => {
		// All or nothing: mixing a declared face with derived geometry would draw a device with holes in it
		const partial = validAppearance()
		delete partial.controls['0/1']

		const { wrapper, surface } = makeWrapper(partial)

		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')

		expect(result?.surfaceAppearance).toBeNull()
		expect(surface.init.mock.calls.length).toBe(1)
	})

	it('keeps an appearance which describes controls the layout does not have', async () => {
		const extra = validAppearance()
		extra.controls['1/0'] = { x: 50, y: 250, width: 150, height: 150 }

		const { wrapper } = makeWrapper(extra)

		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')

		expect(result?.surfaceAppearance).toEqual(extra)
	})
})
