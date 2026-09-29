import { describe, it, expect } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { PluginWrapper } from '../plugin.js'
import type { SurfaceHostContext } from '../context.js'
import type {
	HIDDevice,
	SurfaceContext,
	SurfaceInstance,
	SurfacePlugin,
	SurfaceRegisterProps,
} from '@companion-surface/base'

function makeWrapper() {
	const surface = mock<SurfaceInstance>()
	surface.init.mockResolvedValue(undefined)
	surface.close.mockResolvedValue(undefined)

	const registerProps: SurfaceRegisterProps = {
		brightness: false,
		surfaceLayout: {
			stylePresets: {
				default: { bitmap: { w: 72, h: 72 } },
			},
			controls: {
				'0/0': { row: 0, column: 0 },
			},
		},
		pincodeMap: null,
		location: null,
		configFields: null,
	}

	const plugin = mock<SurfacePlugin<unknown>>({
		detection: undefined,
		checkSupportsHidDevice: () => ({
			surfaceId: 'test-surface',
			description: 'Test Surface',
			pluginInfo: {},
		}),
	})
	plugin.openSurface.mockResolvedValue({ surface, registerProps })

	const host = mock<SurfaceHostContext>()

	const wrapper = new PluginWrapper(host, plugin)
	return { wrapper, surface, plugin, registerProps }
}

describe('PluginWrapper close while opening', () => {
	it('fails the open when the surface disconnects during openSurface', async () => {
		const { wrapper, surface, plugin, registerProps } = makeWrapper()
		plugin.openSurface.mockImplementation(async (_id, _info, context: SurfaceContext) => {
			context.disconnect(new Error('socket closed'))
			return { surface, registerProps }
		})

		await expect(wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')).rejects.toThrow('was closed while opening')
		expect(surface.close.mock.calls.length).toBe(1)
	})

	it('fails the open when closeDevice is called during init', async () => {
		const { wrapper, surface } = makeWrapper()
		surface.init.mockImplementation(async () => {
			await wrapper.closeDevice('test-surface')
		})

		await expect(wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')).rejects.toThrow('was closed while opening')
		expect(surface.close.mock.calls.length).toBe(1)
	})

	it('allows the surface to be reopened after a close while opening', async () => {
		const { wrapper, surface } = makeWrapper()
		surface.init.mockImplementationOnce(async () => {
			await wrapper.closeDevice('test-surface')
		})

		await expect(wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')).rejects.toThrow()

		// The stale close must not leak into the next open
		const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')
		expect(result).not.toBeNull()
	})
})
