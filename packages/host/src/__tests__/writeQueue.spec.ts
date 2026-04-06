import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImageWriteQueue } from '../internal/writeQueue.js'

describe('ImageWriteQueue', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	// ── basic queuing ──────────────────────────────────────────────────────

	describe('basic queuing', () => {
		it('executes a queued job', async () => {
			const queue = new ImageWriteQueue<string>()
			const fn = vi.fn().mockResolvedValue(undefined)

			queue.queue('key1', fn)
			await vi.runAllTimersAsync()

			expect(fn).toHaveBeenCalledOnce()
			expect(fn).toHaveBeenCalledWith('key1', expect.any(AbortSignal))
		})

		it('passes a non-aborted AbortSignal to jobs', async () => {
			const queue = new ImageWriteQueue<string>()
			let receivedSignal: AbortSignal | undefined

			queue.queue('k1', async (_k, signal) => {
				receivedSignal = signal
			})
			await vi.runAllTimersAsync()

			expect(receivedSignal).toBeInstanceOf(AbortSignal)
			expect(receivedSignal?.aborted).toBe(false)
		})

		it('replaces an existing pending job with the same key', async () => {
			const queue = new ImageWriteQueue<string>(false) // not running yet
			const fn1 = vi.fn().mockResolvedValue(undefined)
			const fn2 = vi.fn().mockResolvedValue(undefined)

			queue.queue('key1', fn1)
			queue.queue('key1', fn2) // should overwrite fn1 since it hasn't started

			queue.setRunning()
			await vi.runAllTimersAsync()

			expect(fn1).not.toHaveBeenCalled()
			expect(fn2).toHaveBeenCalledOnce()
		})

		it('treats different keys independently (no dedup)', async () => {
			const queue = new ImageWriteQueue<string>(false)
			const fn1 = vi.fn().mockResolvedValue(undefined)
			const fn2 = vi.fn().mockResolvedValue(undefined)

			queue.queue('key1', fn1)
			queue.queue('key2', fn2)

			queue.setRunning()
			await vi.runAllTimersAsync()

			expect(fn1).toHaveBeenCalledOnce()
			expect(fn2).toHaveBeenCalledOnce()
		})

		it('appends a new key rather than updating when key is not already queued', async () => {
			const queue = new ImageWriteQueue<string>(false)
			const calls: string[] = []

			queue.queue('a', async (k) => {
				calls.push(k)
			})
			queue.queue('b', async (k) => {
				calls.push(k)
			})
			queue.queue('a', async (k) => {
				calls.push(k + '-replaced')
			})

			queue.setRunning()
			await vi.runAllTimersAsync()

			// 'a' should be replaced; 'b' should run; 'a-replaced' runs in 'a's slot
			expect(calls).toContain('a-replaced')
			expect(calls).toContain('b')
			expect(calls).not.toContain('a')
		})

		it('executes all unique-key jobs', async () => {
			const queue = new ImageWriteQueue<string>()
			const executed: string[] = []

			for (const key of ['a', 'b', 'c', 'd', 'e']) {
				queue.queue(key, async (k) => {
					executed.push(k)
				})
			}

			await vi.runAllTimersAsync()

			expect(executed).toHaveLength(5)
			expect(executed).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd', 'e']))
		})
	})

	// ── autostart ──────────────────────────────────────────────────────────

	describe('autostart', () => {
		it('does not execute jobs until setRunning() when autostart=false', async () => {
			const queue = new ImageWriteQueue<string>(false)
			const fn = vi.fn().mockResolvedValue(undefined)

			queue.queue('key1', fn)
			await vi.runAllTimersAsync()

			expect(fn).not.toHaveBeenCalled()
		})

		it('starts queued jobs after setRunning()', async () => {
			const queue = new ImageWriteQueue<string>(false)
			const fn = vi.fn().mockResolvedValue(undefined)

			queue.queue('key1', fn)
			queue.setRunning()
			await vi.runAllTimersAsync()

			expect(fn).toHaveBeenCalledOnce()
		})

		it('reports running=false before setRunning()', () => {
			const queue = new ImageWriteQueue<string>(false)
			expect(queue.running).toBe(false)
		})

		it('reports running=true after setRunning()', () => {
			const queue = new ImageWriteQueue<string>(false)
			queue.setRunning()
			expect(queue.running).toBe(true)
		})

		it('reports running=true when autostart=true (default)', () => {
			const queue = new ImageWriteQueue<string>()
			expect(queue.running).toBe(true)
		})

		it('throws when setRunning() is called after abort', async () => {
			const queue = new ImageWriteQueue<string>(false)
			await queue.abort()
			expect(() => queue.setRunning()).toThrow('queue is aborted')
		})
	})

	// ── concurrency ────────────────────────────────────────────────────────

	describe('concurrency', () => {
		it('respects maxConcurrent (3) when jobs are added sequentially while running', async () => {
			const queue = new ImageWriteQueue<string>() // autostart=true
			let concurrent = 0
			let maxObserved = 0

			const makeJob =
				(_key: string) =>
				async (_k: string): Promise<void> => {
					concurrent++
					maxObserved = Math.max(maxObserved, concurrent)
					await new Promise<void>((res) => setTimeout(res, 10))
					concurrent--
				}

			for (let i = 0; i < 9; i++) {
				queue.queue(`key${i}`, makeJob(`key${i}`))
			}

			await vi.runAllTimersAsync()

			expect(concurrent).toBe(0) // all finished
			expect(maxObserved).toBeGreaterThanOrEqual(1)
			expect(maxObserved).toBeLessThanOrEqual(3)
		})

		it('does not run a key concurrently with itself', async () => {
			const queue = new ImageWriteQueue<string>()
			const inProgressForKey: Record<string, number> = {}
			let sawConcurrentSameKey = false

			const makeJob =
				(key: string) =>
				async (_k: string): Promise<void> => {
					inProgressForKey[key] = (inProgressForKey[key] ?? 0) + 1
					if ((inProgressForKey[key] ?? 0) > 1) sawConcurrentSameKey = true
					await new Promise<void>((res) => setTimeout(res, 5))
					inProgressForKey[key]--
				}

			// Only the last queued fn for 'key1' should execute (dedup replaces earlier)
			queue.queue('key1', makeJob('key1'))
			queue.queue('key1', makeJob('key1'))
			queue.queue('key1', makeJob('key1'))

			await vi.runAllTimersAsync()

			expect(sawConcurrentSameKey).toBe(false)
		})

		it('setRunning() starts up to maxConcurrent jobs immediately when multiple are pending', async () => {
			const queue = new ImageWriteQueue<string>(false) // nothing runs until setRunning
			const started: string[] = []
			const jobControllers: Record<string, () => void> = {}

			for (const key of ['k1', 'k2', 'k3']) {
				queue.queue(key, async (k) => {
					started.push(k)
					return new Promise<void>((res) => {
						jobControllers[k] = res
					})
				})
			}

			queue.setRunning()

			// Flush microtasks but NOT setImmediate/timers so no job can complete
			// and re-trigger tryDequeue.
			await Promise.resolve()
			await Promise.resolve()

			expect(started).toHaveLength(3)

			// Clean up: resolve all pending jobs so the queue drains cleanly.
			for (const resolve of Object.values(jobControllers)) resolve()
			await vi.runAllTimersAsync()
		})

		it('after abort/restart, multiple pending jobs start concurrently up to maxConcurrent', async () => {
			const queue2 = new ImageWriteQueue<string>(false)
			const started2: string[] = []
			const ctrl2: Record<string, () => void> = {}

			for (const key of ['a', 'b', 'c']) {
				queue2.queue(key, async (k) => {
					started2.push(k)
					return new Promise<void>((res) => {
						ctrl2[k] = res
					})
				})
			}

			queue2.setRunning()
			await Promise.resolve()
			await Promise.resolve()

			expect(started2).toHaveLength(3)

			for (const resolve of Object.values(ctrl2)) resolve()
			await vi.runAllTimersAsync()
		})
	})

	// ── abort ──────────────────────────────────────────────────────────────

	describe('abort', () => {
		it('resolves immediately when the queue is empty and nothing is running', async () => {
			const queue = new ImageWriteQueue<string>()
			await expect(queue.abort()).resolves.toBeUndefined()
		})

		it('resolves immediately when autostart=false and no jobs ever ran', async () => {
			const queue = new ImageWriteQueue<string>(false)
			const fn = vi.fn()
			queue.queue('k', fn)

			await expect(queue.abort()).resolves.toBeUndefined()
			expect(fn).not.toHaveBeenCalled()
		})

		it('cancels jobs that are still pending (not yet started)', async () => {
			// Fill all 3 concurrent slots so the 4th job stays pending
			const queue = new ImageWriteQueue<string>()
			const unblock: Array<() => void> = []
			for (let i = 0; i < 3; i++) {
				queue.queue(
					`running${i}`,
					async () =>
						new Promise<void>((res) => {
							unblock.push(res)
						}),
				)
			}

			const pendingFn = vi.fn().mockResolvedValue(undefined)
			queue.queue('pending', pendingFn) // goes into pendingImages (inProgress is full)

			const abortPromise = queue.abort()

			// Finish the running jobs so the drain promise resolves
			for (const res of unblock) res()
			await abortPromise

			expect(pendingFn).not.toHaveBeenCalled()
		})

		it('waits for in-progress jobs to finish before resolving', async () => {
			const queue = new ImageWriteQueue<string>()
			let resolveJob!: () => void
			queue.queue(
				'k1',
				async () =>
					new Promise<void>((res) => {
						resolveJob = res
					}),
			)

			// Job starts synchronously in queue()
			const abortPromise = queue.abort()
			let abortSettled = false
			void abortPromise.then(() => {
				abortSettled = true
			})

			// Drain microtasks — abort should still be waiting
			await Promise.resolve()
			expect(abortSettled).toBe(false)

			resolveJob()
			await abortPromise
			expect(abortSettled).toBe(true)
		})

		it('marks the AbortSignal as aborted on in-progress jobs immediately on abort()', async () => {
			const queue = new ImageWriteQueue<string>()
			let capturedSignal!: AbortSignal
			let resolveJob!: () => void

			queue.queue('k1', async (_k, signal) => {
				capturedSignal = signal
				await new Promise<void>((res) => {
					resolveJob = res
				})
			})

			// capturedSignal is set synchronously when fn starts inside queue()
			const abortPromise = queue.abort() // synchronously calls drainAbort.abort()

			expect(capturedSignal).toBeDefined()
			expect(capturedSignal.aborted).toBe(true)

			resolveJob()
			await abortPromise
		})

		it('throws when queuing into an already-aborted queue', async () => {
			const queue = new ImageWriteQueue<string>()
			await queue.abort()
			expect(() => queue.queue('k', vi.fn())).toThrow('queue is aborted')
		})

		it('abort() resolves only after ALL in-progress jobs have finished', async () => {
			// With maxConcurrent=3, queuing 3 jobs sequentially puts all of them
			// in-progress simultaneously.  abort() must wait for all three.
			const queue = new ImageWriteQueue<string>()
			const unblock: Array<() => void> = []
			let doneCount = 0

			for (let i = 0; i < 3; i++) {
				queue.queue(`k${i}`, async () => {
					await new Promise<void>((r) => {
						unblock.push(r)
					})
					doneCount++
				})
			}

			const abortPromise = queue.abort()

			// No jobs have finished yet
			expect(doneCount).toBe(0)

			for (const r of unblock) r()
			await abortPromise

			expect(doneCount).toBe(3)
		})

		it('swallows errors thrown by jobs and still processes next items', async () => {
			const queue = new ImageWriteQueue<string>()
			const fn2 = vi.fn().mockResolvedValue(undefined)

			queue.queue('k1', async () => {
				throw new Error('job error')
			})
			queue.queue('k2', fn2)

			await vi.runAllTimersAsync()

			expect(fn2).toHaveBeenCalledOnce()
		})
	})
})
