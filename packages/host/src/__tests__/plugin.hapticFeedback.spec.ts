import { describe, expect, it, vi } from 'vitest'
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
		stylePresets: { default: { bitmap: { w: 72, h: 72 } } },
		controls: { '0/0': { row: 0, column: 0 } },
	}
}

function makeSurface(triggerHapticFeedback?: () => Promise<void>): SurfaceInstance {
	const surface = mock<SurfaceInstance>()
	surface.init.mockResolvedValue(undefined)
	surface.close.mockResolvedValue(undefined)
	surface.ready.mockResolvedValue(undefined)
	surface.triggerHapticFeedback = triggerHapticFeedback
	return surface
}

function registerProps(hapticFeedback?: boolean): SurfaceRegisterProps {
	return {
		brightness: false,
		...(hapticFeedback === undefined ? {} : { hapticFeedback }),
		surfaceLayout: validLayout(),
		pincodeMap: null,
		location: null,
		configFields: null,
	}
}

function makeWrapper(surface: SurfaceInstance, props: SurfaceRegisterProps) {
	const plugin = mock<SurfacePlugin<unknown>>()
	plugin.detection = undefined
	plugin.checkSupportsHidDevice.mockReturnValue({
		surfaceId: 'test-surface',
		description: 'Test Surface',
		pluginInfo: {},
	})
	plugin.openSurface.mockResolvedValue({ surface, registerProps: props })

	return new PluginWrapper(mock<SurfaceHostContext>(), plugin)
}

async function open(wrapper: PluginWrapper<unknown>) {
	const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')
	expect(result).not.toBeNull()
	return result!
}

describe('PluginWrapper haptic feedback', () => {
	it('keeps legacy and capability-method-mismatched surfaces unsupported', async () => {
		const legacy = makeSurface()
		const legacyResult = await open(makeWrapper(legacy, registerProps()))
		expect(legacyResult.hapticFeedback).toBeUndefined()

		const methodOnlyTrigger = vi.fn().mockResolvedValue(undefined)
		const methodOnlyResult = await open(makeWrapper(makeSurface(methodOnlyTrigger), registerProps()))
		expect(methodOnlyResult.hapticFeedback).toBeUndefined()
		expect(methodOnlyTrigger).not.toHaveBeenCalled()

		const capabilityOnlyResult = await open(makeWrapper(makeSurface(), registerProps(true)))
		expect(capabilityOnlyResult.hapticFeedback).toBeUndefined()
	})

	it('submits one request only for a ready capable surface', async () => {
		const trigger = vi.fn().mockResolvedValue(undefined)
		const surface = makeSurface(trigger)
		const wrapper = makeWrapper(surface, registerProps(true))
		const result = await open(wrapper)
		const connectionId = result.hapticFeedback?.connectionId
		expect(connectionId).toEqual(expect.any(String))

		await wrapper.triggerHapticFeedback('test-surface', connectionId!)
		expect(trigger).not.toHaveBeenCalled()

		await wrapper.readySurface('test-surface', {})
		await wrapper.triggerHapticFeedback('test-surface', connectionId!)
		expect(trigger).toHaveBeenCalledTimes(1)
	})

	it('drops closed requests and contains rejected submissions', async () => {
		const trigger = vi.fn().mockRejectedValue(new Error('device unavailable'))
		const surface = makeSurface(trigger)
		const wrapper = makeWrapper(surface, registerProps(true))
		const result = await open(wrapper)
		const connectionId = result.hapticFeedback!.connectionId
		await wrapper.readySurface('test-surface', {})

		await expect(wrapper.triggerHapticFeedback('test-surface', connectionId)).resolves.toBeUndefined()
		expect(trigger).toHaveBeenCalledTimes(1)

		await wrapper.closeDevice('test-surface')
		await wrapper.triggerHapticFeedback('test-surface', connectionId)
		expect(trigger).toHaveBeenCalledTimes(1)
	})

	it('drops an old generation after reopening the same surface id', async () => {
		const oldTrigger = vi.fn().mockResolvedValue(undefined)
		const newTrigger = vi.fn().mockResolvedValue(undefined)
		const oldSurface = makeSurface(oldTrigger)
		const newSurface = makeSurface(newTrigger)
		const plugin = mock<SurfacePlugin<unknown>>()
		plugin.detection = undefined
		plugin.checkSupportsHidDevice.mockReturnValue({
			surfaceId: 'test-surface',
			description: 'Test Surface',
			pluginInfo: {},
		})
		plugin.openSurface.mockResolvedValueOnce({ surface: oldSurface, registerProps: registerProps(true) })
		plugin.openSurface.mockResolvedValueOnce({ surface: newSurface, registerProps: registerProps(true) })
		const wrapper = new PluginWrapper(mock<SurfaceHostContext>(), plugin)

		const oldResult = await open(wrapper)
		await wrapper.readySurface('test-surface', {})
		await wrapper.closeDevice('test-surface')
		const newResult = await open(wrapper)
		await wrapper.readySurface('test-surface', {})

		expect(newResult.hapticFeedback!.connectionId).not.toBe(oldResult.hapticFeedback!.connectionId)
		await wrapper.triggerHapticFeedback('test-surface', oldResult.hapticFeedback!.connectionId)
		expect(oldTrigger).not.toHaveBeenCalled()
		expect(newTrigger).not.toHaveBeenCalled()

		await wrapper.triggerHapticFeedback('test-surface', newResult.hapticFeedback!.connectionId)
		expect(newTrigger).toHaveBeenCalledTimes(1)
	})
})
