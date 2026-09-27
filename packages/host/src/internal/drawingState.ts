import { createModuleLogger, type ModuleLogger } from '@companion-surface/base'
import { ImageWriteQueue } from './writeQueue.js'

export class DrawingState {
	#logger: ModuleLogger
	#queue: ImageWriteQueue<string>
	#state: string

	#isAborting = false
	#execBeforeRunQueue: (() => Promise<void>) | null = null

	get state(): string {
		return this.#state
	}

	constructor(surfaceId: string, state: string) {
		this.#logger = createModuleLogger(`DrawingState/${surfaceId}`)
		this.#state = state
		this.#queue = new ImageWriteQueue()
	}

	/**
	 * Queue a job to be run in the current state. Jobs will be aborted if the state changes
	 * before they are run, but if they have already started they will be allowed to finish.
	 * @param key
	 * @param fn
	 */
	queueJob(key: string, fn: (key: string, signal: AbortSignal) => Promise<void>): void {
		this.#queue.queue(key, fn)
	}

	/**
	 * Transition to a new state, aborting any pending jobs in the queue.
	 * @param newState The new state to transition to
	 * @param fnBeforeRunQueue An optional function to run after aborting the queue but before starting a new one.
	 */
	abortQueued(newState: string, fnBeforeRunQueue?: () => Promise<void>): void {
		let abortQueue: ImageWriteQueue<string> | null = null
		if (!this.#isAborting) {
			this.#isAborting = true
			abortQueue = this.#queue
		}

		this.#logger.debug(`Aborting queue: ${this.#state} -> ${newState} (abort=${!!abortQueue})`)

		this.#state = newState
		this.#queue = new ImageWriteQueue(false)
		this.#execBeforeRunQueue = fnBeforeRunQueue ?? null

		if (abortQueue) {
			abortQueue
				.abort()
				.catch((e) => {
					this.#logger.error(`Failed to abort queue: ${e}`)
				})
				.then(async () => {
					// Loop, as another transition may have supplied a new fn while the previous one was running
					while (this.#execBeforeRunQueue) {
						const fn = this.#execBeforeRunQueue
						this.#execBeforeRunQueue = null
						await fn().catch((e) => {
							this.#logger.error(`Failed to run before queue: ${e}`)
						})
					}
				})
				.finally(() => {
					this.#isAborting = false

					this.#logger.debug('aborted')

					// Start execution
					this.#queue.setRunning()
				})
				.catch((e) => {
					this.#logger.error(`Failed to abort queue: ${e}`)
				})
		}
	}
}
