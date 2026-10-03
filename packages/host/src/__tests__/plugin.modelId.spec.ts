import { describe, it, expect } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { PluginWrapper } from '../plugin.js'
import type { SurfaceHostContext } from '../context.js'
import type {
	HIDDevice,
	SurfaceInstance,
	SurfaceModelDefinition,
	SurfacePlugin,
	SurfaceRegisterProps,
	SurfaceSchemaLayoutDefinition,
} from '@companion-surface/base'

function validLayout(): SurfaceSchemaLayoutDefinition {
	return {
		stylePresets: { default: { bitmap: { w: 72, h: 72 } } },
		controls: { '0/0': { row: 0, column: 0 } },
	}
}

function model(id: string): SurfaceModelDefinition {
	return { id, name: `Model ${id}`, layout: validLayout() }
}

async function openWith(modelId: string | null, declared: SurfaceModelDefinition[]) {
	const surface = mock<SurfaceInstance>()
	surface.init.mockResolvedValue(undefined)
	surface.close.mockResolvedValue(undefined)

	const registerProps: SurfaceRegisterProps = {
		brightness: false,
		surfaceLayout: validLayout(),
		surfaceAppearance: null,
		modelId,
		pincodeMap: null,
		location: null,
		configFields: null,
	}

	const plugin = mock<SurfacePlugin<unknown>>()
	plugin.detection = undefined
	plugin.remote = undefined
	plugin.init.mockResolvedValue(undefined)
	plugin.getSurfaceModels.mockResolvedValue(declared)
	plugin.checkSupportsHidDevice.mockReturnValue({ surfaceId: 'test-surface', description: 'Test', pluginInfo: {} })
	plugin.openSurface.mockResolvedValue({ surface, registerProps })

	const wrapper = new PluginWrapper(mock<SurfaceHostContext>(), plugin)
	await wrapper.init()

	return wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')
}

describe('PluginWrapper surface model id', () => {
	it('reports which declared model the surface is', async () => {
		const result = await openWith('streamdeck-xl', [model('streamdeck-xl'), model('streamdeck-mini')])

		expect(result?.modelId).toBe('streamdeck-xl')
	})

	it('reports null when the surface names no model', async () => {
		const result = await openWith(null, [model('streamdeck-xl')])

		expect(result?.modelId).toBeNull()
	})

	it('drops a model id the plugin did not declare, rather than report one nothing can be found by', async () => {
		const result = await openWith('streamdeck-unknown', [model('streamdeck-xl')])

		expect(result).not.toBeNull()
		expect(result?.modelId).toBeNull()
	})
})
