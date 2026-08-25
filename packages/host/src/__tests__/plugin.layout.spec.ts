import { describe, it, expect } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { PluginWrapper } from '../plugin.js'
import type { SurfaceHostContext } from '../context.js'
import type {
	HIDDevice,
	SurfaceInstance,
	SurfacePlugin,
	SurfaceRegisterProps,
	SurfaceSchemaLayoutDefinition,
} from '@companion-surface/base'

function validLayout(): SurfaceSchemaLayoutDefinition {
	return {
		stylePresets: {
			default: { bitmap: { w: 72, h: 72 } },
		},
		controls: {
			'0/0': { row: 0, column: 0 },
		},
	}
}

function makeWrapper(surfaceLayout: SurfaceSchemaLayoutDefinition) {
	const surface = mock<SurfaceInstance>()
	surface.init.mockResolvedValue(undefined)
	surface.close.mockResolvedValue(undefined)

	const registerProps: SurfaceRegisterProps = {
		brightness: false,
		surfaceLayout,
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

describe('PluginWrapper surface layout validation', () => {
	it('opens a surface with a valid layout', async () => {
		const { wrapper, surface } = makeWrapper(validLayout())

		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')

		expect(result).not.toBeNull()
		expect(result?.surfaceLayout).toEqual(validLayout())
		expect(surface.init.mock.calls.length).toBe(1)
	})

	it('rejects a surface whose layout does not match the schema', async () => {
		// Missing the required `default` style preset
		const badLayout = { stylePresets: {}, controls: {} } as unknown as SurfaceSchemaLayoutDefinition
		const { wrapper, surface } = makeWrapper(badLayout)

		await expect(wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')).rejects.toThrow(
			'Surface layout validation failed',
		)

		// The surface should have been cleaned up rather than left open
		expect(surface.close.mock.calls.length).toBe(1)
		// And it must not have been initialised, as validation happens first
		expect(surface.init.mock.calls.length).toBe(0)
	})

	it('does not leave a rejected surface registered as open', async () => {
		const badLayout = { stylePresets: {}, controls: {} } as unknown as SurfaceSchemaLayoutDefinition
		const { wrapper } = makeWrapper(badLayout)

		await expect(wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')).rejects.toThrow()

		// A subsequent open with the same id must not report an "already opened" collision,
		// proving the failed attempt was removed from the open-surfaces map.
		await expect(wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')).rejects.toThrow(
			'Surface layout validation failed',
		)
	})
})
