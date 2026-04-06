import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@companion-surface/base', () => ({
	createModuleLogger: () => ({
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	}),
}))

import { DrawingState } from '../internal/drawingState.js'

describe('DrawingState', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	// ── constructor / state ────────────────────────────────────────────────

	describe('constructor', () => {
		it('initialises with the provided state', () => {
			const ds = new DrawingState('surface-1', 'idle')
			expect(ds.state).toBe('idle')
		})
	})

	// ── queueJob ──────────────────────────────────────────────────────────

	describe('queueJob', () => {
		it('executes a queued job', async () => {
			const ds = new DrawingState('s1', 'idle')
			const fn = vi.fn().mockResolvedValue(undefined)

			ds.queueJob('key1', fn)
			await vi.runAllTimersAsync()

			expect(fn).toHaveBeenCalledOnce()
			expect(fn).toHaveBeenCalledWith('key1', expect.any(AbortSignal))
		})

		it('executes multiple jobs with distinct keys', async () => {
			const ds = new DrawingState('s1', 'idle')
			const fn = vi.fn().mockResolvedValue(undefined)

			ds.queueJob('k1', fn)
			ds.queueJob('k2', fn)
			ds.queueJob('k3', fn)

			await vi.runAllTimersAsync()

			expect(fn).toHaveBeenCalledTimes(3)
		})

		it('passes an AbortSignal to the job', async () => {
			const ds = new DrawingState('s1', 'idle')
			let receivedSignal: AbortSignal | undefined

			ds.queueJob('k1', async (_k, signal) => {
				receivedSignal = signal
			})

			await vi.runAllTimersAsync()

			expect(receivedSignal).toBeInstanceOf(AbortSignal)
			expect(receivedSignal?.aborted).toBe(false)
		})

		it('deduplicates pending jobs with the same key', async () => {
			const ds = new DrawingState('s1', 'idle')
			// Fill the 3 concurrent slots so 'cover' stays pending
			const unblock: Array<() => void> = []
			for (let i = 0; i < 3; i++) {
				ds.queueJob(
					`hold${i}`,
					async () =>
						new Promise<void>((r) => {
							unblock.push(r)
						}),
				)
			}

			const fn1 = vi.fn().mockResolvedValue(undefined)
			const fn2 = vi.fn().mockResolvedValue(undefined)

			ds.queueJob('cover', fn1)
			ds.queueJob('cover', fn2) // should overwrite fn1 while still pending

			for (const r of unblock) r() // release held jobs
			await vi.runAllTimersAsync()

			expect(fn1).not.toHaveBeenCalled()
			expect(fn2).toHaveBeenCalledOnce()
		})
	})

	// ── abortQueued ───────────────────────────────────────────────────────

	describe('abortQueued', () => {
		it('updates the state property immediately (synchronously)', () => {
			const ds = new DrawingState('s1', 'idle')
			ds.abortQueued('drawing')
			expect(ds.state).toBe('drawing')
		})

		it('reflects the last state after multiple synchronous abortQueued calls', () => {
			const ds = new DrawingState('s1', 'idle')
			ds.abortQueued('state1')
			ds.abortQueued('state2')
			ds.abortQueued('state3')
			expect(ds.state).toBe('state3')
		})

		it('does not execute pending jobs from the old queue after abort', async () => {
			const ds = new DrawingState('s1', 'idle')

			// Fill up all concurrent slots (3) so the next job has to queue
			const unblock: Array<() => void> = []
			for (let i = 0; i < 3; i++) {
				ds.queueJob(
					`hold${i}`,
					async () =>
						new Promise<void>((r) => {
							unblock.push(r)
						}),
				)
			}

			const pendingFn = vi.fn().mockResolvedValue(undefined)
			ds.queueJob('pending', pendingFn) // stays in pendingImages

			ds.abortQueued('aborted-state')

			// Unblock the running jobs so abort can drain
			for (const r of unblock) r()
			await vi.runAllTimersAsync()

			expect(pendingFn).not.toHaveBeenCalled()
		})

		it('marks the AbortSignal of in-progress jobs as aborted synchronously', async () => {
			const ds = new DrawingState('s1', 'idle')
			let capturedSignal!: AbortSignal
			let resolveJob!: () => void

			ds.queueJob('k1', async (_k, signal) => {
				capturedSignal = signal
				await new Promise<void>((r) => {
					resolveJob = r
				})
			})

			// capturedSignal is set synchronously when the job starts in queue()
			ds.abortQueued('new-state') // calls abort() which fires drainAbort.abort()

			expect(capturedSignal.aborted).toBe(true)

			resolveJob()
			await vi.runAllTimersAsync()
		})

		it('starts jobs queued after abortQueued once abort completes', async () => {
			const ds = new DrawingState('s1', 'idle')
			const fn = vi.fn().mockResolvedValue(undefined)

			ds.abortQueued('drawing')
			ds.queueJob('k1', fn) // goes into the new (not-yet-running) queue

			await vi.runAllTimersAsync()

			expect(fn).toHaveBeenCalledOnce()
		})

		it('calls fnBeforeRunQueue before any new jobs execute', async () => {
			const ds = new DrawingState('s1', 'idle')
			const order: string[] = []

			const fnBefore = vi.fn().mockImplementation(async () => {
				order.push('before')
			})
			const jobFn = vi.fn().mockImplementation(async () => {
				order.push('job')
			})

			ds.abortQueued('drawing', fnBefore)
			ds.queueJob('k1', jobFn)

			await vi.runAllTimersAsync()

			expect(fnBefore).toHaveBeenCalledOnce()
			expect(order).toEqual(['before', 'job'])
		})

		it('starts new jobs even when no fnBeforeRunQueue is provided', async () => {
			const ds = new DrawingState('s1', 'idle')
			const fn = vi.fn().mockResolvedValue(undefined)

			ds.abortQueued('drawing') // no callback
			ds.queueJob('k1', fn)

			await vi.runAllTimersAsync()

			expect(fn).toHaveBeenCalledOnce()
		})

		it('still starts new jobs when fnBeforeRunQueue rejects', async () => {
			const ds = new DrawingState('s1', 'idle')
			const fn = vi.fn().mockResolvedValue(undefined)
			const badFn = vi.fn().mockRejectedValue(new Error('setup failed'))

			ds.abortQueued('drawing', badFn)
			ds.queueJob('k1', fn)

			await vi.runAllTimersAsync()

			expect(badFn).toHaveBeenCalledOnce()
			// Despite fnBeforeRunQueue failing, the new queue should still start
			expect(fn).toHaveBeenCalledOnce()
		})

		it('passes an un-aborted AbortSignal to jobs started after the new queue begins', async () => {
			const ds = new DrawingState('s1', 'idle')
			let signal: AbortSignal | undefined

			ds.abortQueued('drawing')
			ds.queueJob('k1', async (_k, s) => {
				signal = s
			})

			await vi.runAllTimersAsync()

			expect(signal?.aborted).toBe(false)
		})

		// ── double-abort (abort while aborting) ───────────────────────────

		it('only runs the fnBeforeRunQueue for the final state when abortQueued is called twice during abort', async () => {
			const ds = new DrawingState('s1', 'idle')

			let resolveFirstJob!: () => void
			ds.queueJob(
				'hold',
				async () =>
					new Promise<void>((r) => {
						resolveFirstJob = r
					}),
			)

			const fn1 = vi.fn().mockResolvedValue(undefined)
			const fn2 = vi.fn().mockResolvedValue(undefined)

			ds.abortQueued('state2', fn1) // starts abort; #isAborting = true
			ds.abortQueued('state3', fn2) // state2 superseded before its queue ran

			resolveFirstJob()
			await vi.runAllTimersAsync()

			// fn1 is correctly skipped: state2's queue never ran, so its setup is irrelevant
			expect(fn1).not.toHaveBeenCalled()
			// fn2 runs as preparation before state3's jobs execute
			expect(fn2).toHaveBeenCalledOnce()
		})

		it('uses the latest state after several overlapping abortQueued calls', async () => {
			const ds = new DrawingState('s1', 'state0')

			let resolveJob!: () => void
			ds.queueJob(
				'hold',
				async () =>
					new Promise<void>((r) => {
						resolveJob = r
					}),
			)

			ds.abortQueued('state1')
			ds.abortQueued('state2')
			ds.abortQueued('state3')

			expect(ds.state).toBe('state3') // synchronous state is always latest

			resolveJob()
			await vi.runAllTimersAsync()

			expect(ds.state).toBe('state3')
		})

		it('drops jobs queued for an intermediate state that is itself aborted', async () => {
			const ds = new DrawingState('s1', 'idle')

			let resolveFirstJob!: () => void
			ds.queueJob(
				'hold',
				async () =>
					new Promise<void>((r) => {
						resolveFirstJob = r
					}),
			)

			const intermediateFn = vi.fn().mockResolvedValue(undefined)

			ds.abortQueued('state2') // queue2 created (not running)
			ds.queueJob('mid', intermediateFn) // queued for state2

			ds.abortQueued('state3') // state2 is superseded; queue2 never starts

			resolveFirstJob()
			await vi.runAllTimersAsync()

			// intermediateFn was queued for state2, which was itself aborted before
			// starting — dropping it is correct, same as dropping pending jobs from
			// the original queue when state1 was aborted.
			expect(intermediateFn).not.toHaveBeenCalled()
		})
	})
})
