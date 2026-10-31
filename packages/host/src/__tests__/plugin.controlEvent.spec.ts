import { describe, expect, it, vi } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { PluginWrapper } from '../plugin.js'
import type { SurfaceHostContext } from '../context.js'
import type {
	HIDDevice,
	SurfaceControlEvent,
	SurfaceInstance,
	SurfacePlugin,
	SurfaceRegisterProps,
	SurfaceSchemaLayoutDefinition,
} from '@companion-surface/base'

type ControlEventFn = (controlId: string, event: SurfaceControlEvent) => Promise<void>

function validLayout(): SurfaceSchemaLayoutDefinition {
	return {
		stylePresets: { default: { bitmap: { w: 72, h: 72 } } },
		controls: {
			'0/0': { row: 0, column: 0 },
			'0/1': { row: 0, column: 1 },
		},
	}
}

function makeSurface(controlEvent?: ControlEventFn): SurfaceInstance {
	const surface = mock<SurfaceInstance>()
	surface.init.mockResolvedValue(undefined)
	surface.close.mockResolvedValue(undefined)
	surface.ready.mockResolvedValue(undefined)
	surface.controlEvent = controlEvent
	return surface
}

function registerProps(controlEvents?: boolean): SurfaceRegisterProps {
	return {
		brightness: false,
		...(controlEvents === undefined ? {} : { controlEvents }),
		surfaceLayout: validLayout(),
		pincodeMap: { type: 'custom' },
		location: null,
		configFields: null,
	}
}

function makePlugin(...opens: Array<{ surface: SurfaceInstance; props: SurfaceRegisterProps }>) {
	const plugin = mock<SurfacePlugin<unknown>>()
	plugin.detection = undefined
	plugin.checkSupportsHidDevice.mockReturnValue({
		surfaceId: 'test-surface',
		description: 'Test Surface',
		pluginInfo: {},
	})
	for (const { surface, props } of opens) {
		plugin.openSurface.mockResolvedValueOnce({ surface, registerProps: props })
	}
	return new PluginWrapper(mock<SurfaceHostContext>(), plugin)
}

async function open(wrapper: PluginWrapper<unknown>) {
	const result = await wrapper.openHidDevice(mock<HIDDevice>(), 'test-surface')
	expect(result).not.toBeNull()
	return result!
}

async function openReady(controlEvent: ControlEventFn) {
	const wrapper = makePlugin({ surface: makeSurface(controlEvent), props: registerProps(true) })
	const result = await open(wrapper)
	await wrapper.readySurface('test-surface', {})
	return { wrapper, connectionId: result.controlEvents!.connectionId }
}

describe('PluginWrapper control events', () => {
	it('keeps legacy and capability-method-mismatched surfaces unsupported', async () => {
		const legacyResult = await open(makePlugin({ surface: makeSurface(), props: registerProps() }))
		expect(legacyResult.controlEvents).toBeUndefined()

		const methodOnly = vi.fn<ControlEventFn>().mockResolvedValue(undefined)
		const methodOnlyResult = await open(makePlugin({ surface: makeSurface(methodOnly), props: registerProps() }))
		expect(methodOnlyResult.controlEvents).toBeUndefined()

		const capabilityOnlyResult = await open(makePlugin({ surface: makeSurface(), props: registerProps(true) }))
		expect(capabilityOnlyResult.controlEvents).toBeUndefined()
	})

	it('passes the control and event to a ready surface, and drops them before ready', async () => {
		const controlEvent = vi.fn<ControlEventFn>().mockResolvedValue(undefined)
		const wrapper = makePlugin({ surface: makeSurface(controlEvent), props: registerProps(true) })
		const result = await open(wrapper)
		const connectionId = result.controlEvents?.connectionId
		expect(connectionId).toEqual(expect.any(String))

		await wrapper.controlEvent('test-surface', connectionId!, '0/1', 'press')
		expect(controlEvent).not.toHaveBeenCalled()

		await wrapper.readySurface('test-surface', {})
		await wrapper.controlEvent('test-surface', connectionId!, '0/1', 'press')
		await wrapper.controlEvent('test-surface', connectionId!, '0/0', 'hold')
		expect(controlEvent.mock.calls).toEqual([
			['0/1', 'press'],
			['0/0', 'hold'],
		])
	})

	it('drops events for controls the surface does not have', async () => {
		const controlEvent = vi.fn<ControlEventFn>().mockResolvedValue(undefined)
		const { wrapper, connectionId } = await openReady(controlEvent)

		await wrapper.controlEvent('test-surface', connectionId, '9/9', 'press')
		await wrapper.controlEvent('test-surface', connectionId, '__proto__', 'press')
		expect(controlEvent).not.toHaveBeenCalled()
	})

	it('drops events while the surface is locked', async () => {
		const controlEvent = vi.fn<ControlEventFn>().mockResolvedValue(undefined)
		const { wrapper, connectionId } = await openReady(controlEvent)

		await wrapper.showLockedStatus('test-surface', true, 0, 0)
		await wrapper.controlEvent('test-surface', connectionId, '0/0', 'press')
		expect(controlEvent).not.toHaveBeenCalled()

		await wrapper.showLockedStatus('test-surface', false, 0, 0)
		await wrapper.controlEvent('test-surface', connectionId, '0/0', 'press')
		expect(controlEvent).toHaveBeenCalledTimes(1)
	})

	it('contains a rejecting surface and drops events after close', async () => {
		const controlEvent = vi.fn<ControlEventFn>().mockRejectedValue(new Error('device unavailable'))
		const { wrapper, connectionId } = await openReady(controlEvent)

		await expect(wrapper.controlEvent('test-surface', connectionId, '0/0', 'press')).resolves.toBeUndefined()
		expect(controlEvent).toHaveBeenCalledTimes(1)

		await wrapper.closeDevice('test-surface')
		await wrapper.controlEvent('test-surface', connectionId, '0/0', 'press')
		expect(controlEvent).toHaveBeenCalledTimes(1)
	})

	it('drops an old connection id after reopening the same surface id', async () => {
		const oldEvent = vi.fn<ControlEventFn>().mockResolvedValue(undefined)
		const newEvent = vi.fn<ControlEventFn>().mockResolvedValue(undefined)
		const wrapper = makePlugin(
			{ surface: makeSurface(oldEvent), props: registerProps(true) },
			{ surface: makeSurface(newEvent), props: registerProps(true) },
		)

		const oldResult = await open(wrapper)
		await wrapper.readySurface('test-surface', {})
		await wrapper.closeDevice('test-surface')
		const newResult = await open(wrapper)
		await wrapper.readySurface('test-surface', {})

		expect(newResult.controlEvents!.connectionId).not.toBe(oldResult.controlEvents!.connectionId)
		await wrapper.controlEvent('test-surface', oldResult.controlEvents!.connectionId, '0/0', 'press')
		expect(oldEvent).not.toHaveBeenCalled()
		expect(newEvent).not.toHaveBeenCalled()

		await wrapper.controlEvent('test-surface', newResult.controlEvents!.connectionId, '0/0', 'press')
		expect(newEvent).toHaveBeenCalledTimes(1)
	})
})
