import { describe, it, expect } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { PluginWrapper } from '../plugin.js'
import type { SurfaceHostContext } from '../context.js'
import type {
	HostCapabilities,
	SurfaceModelDefinition,
	SurfaceModelsContext,
	SurfacePlugin,
} from '@companion-surface/base'

function validModel(overrides: Partial<SurfaceModelDefinition> = {}): SurfaceModelDefinition {
	return {
		id: 'streamdeck-xl',
		name: 'Stream Deck XL',
		layout: {
			stylePresets: { default: { bitmap: { w: 96, h: 96 } } },
			controls: { '0/0': { row: 0, column: 0 } },
		},
		appearance: {
			size: { width: 500, height: 250 },
			bodyColor: '#1a1a1a',
			controls: { '0/0': { x: 50, y: 50, width: 150, height: 150 } },
		},
		...overrides,
	}
}

function makeWrapper() {
	const plugin = mock<SurfacePlugin<unknown>>()
	plugin.detection = undefined
	plugin.remote = undefined
	plugin.init.mockResolvedValue(undefined)
	plugin.getSurfaceModels.mockResolvedValue([])

	const host = mock<SurfaceHostContext>()

	return { wrapper: new PluginWrapper(host, plugin), plugin, host }
}

describe('PluginWrapper surface models', () => {
	it('holds the plugin models after init', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue([validModel()])

		await wrapper.init()

		expect(wrapper.getSurfaceModels()).toEqual([validModel()])
	})

	it('has no models before init', () => {
		const { wrapper } = makeWrapper()

		expect(wrapper.getSurfaceModels()).toEqual([])
	})

	it('asks for the models only after init has completed', async () => {
		const { wrapper, plugin } = makeWrapper()

		const order: string[] = []
		plugin.init.mockImplementation(async () => {
			order.push('init')
		})
		plugin.getSurfaceModels.mockImplementation(async () => {
			order.push('getSurfaceModels')
			return []
		})

		await wrapper.init()

		expect(order).toEqual(['init', 'getSurfaceModels'])
	})

	it('passes the host capabilities through so model layouts match live ones', async () => {
		const { wrapper, plugin, host } = makeWrapper()
		const capabilities: HostCapabilities = { supportsNonSquareButtons: true, supportsLeds: false }
		Object.assign(host, { capabilities })

		let seenContext: SurfaceModelsContext | undefined
		plugin.getSurfaceModels.mockImplementation(async (context) => {
			seenContext = context
			return []
		})

		await wrapper.init()

		expect(seenContext?.capabilities).toEqual(capabilities)
	})

	it('drops an invalid model but keeps the rest of the same batch', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue([
			validModel({ id: 'bad id!' }),
			validModel({ id: 'streamdeck-mini', name: 'Stream Deck Mini' }),
		])

		await wrapper.init()

		expect(wrapper.getSurfaceModels().map((model) => model.id)).toEqual(['streamdeck-mini'])
	})

	it('drops a model whose appearance does not cover its layout', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue([
			validModel({
				appearance: { size: { width: 10, height: 10 }, bodyColor: '#1a1a1a', controls: {} },
			}),
		])

		await wrapper.init()

		expect(wrapper.getSurfaceModels()).toEqual([])
	})

	it('drops a model whose id is a reserved word', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue([validModel({ id: '__proto__' })])

		await wrapper.init()

		expect(wrapper.getSurfaceModels()).toEqual([])
	})

	it('drops duplicate ids, keeping the first', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue([validModel({ name: 'First' }), validModel({ name: 'Second' })])

		expect(await wrapper.init().then(() => wrapper.getSurfaceModels().map((m) => m.name))).toEqual(['First'])
	})

	// A model is a nicety; a plugin still drives its surfaces without one, so nothing here may be fatal
	it('still initialises when every model is invalid', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue([validModel({ id: '' }), validModel({ id: 'also bad' })])

		await expect(wrapper.init()).resolves.toBeUndefined()
		expect(wrapper.getSurfaceModels()).toEqual([])
	})

	it('still initialises when getSurfaceModels returns something which is not a list', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockResolvedValue('not a list' as any)

		await expect(wrapper.init()).resolves.toBeUndefined()
		expect(wrapper.getSurfaceModels()).toEqual([])
	})

	it('still initialises when getSurfaceModels throws', async () => {
		const { wrapper, plugin } = makeWrapper()
		plugin.getSurfaceModels.mockRejectedValue(new Error('no database'))

		await expect(wrapper.init()).resolves.toBeUndefined()
		expect(wrapper.getSurfaceModels()).toEqual([])
	})

	it('keeps its own copy, so a plugin mutating what it returned changes nothing', async () => {
		const { wrapper, plugin } = makeWrapper()
		const model = validModel()
		plugin.getSurfaceModels.mockResolvedValue([model])

		await wrapper.init()
		model.name = 'Renamed after the fact'

		expect(wrapper.getSurfaceModels()[0].name).toBe('Stream Deck XL')
	})
})
