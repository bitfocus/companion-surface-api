// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HostCapabilities {
	// For future use to support new functionality
	// TODO - explain what this means, and how it interacts in satellite mode
}

/**
 * The context provided to a surface module when running
 */
export interface SurfaceContext {
	/**
	 * Whether the surface is currently locked
	 */
	get isLocked(): boolean

	/**
	 * The capabilities of the host running the surface
	 */
	get capabilities(): HostCapabilities

	/**
	 * Disconnect the surface
	 * @param error Disconnection reason
	 */
	disconnect(error: Error): void

	/**
	 * Trigger a key down event on a control by its id
	 * @param controlId Id of the control
	 */
	keyDownById(controlId: string): void
	/**
	 * Trigger a key up event on a control by its id
	 * @param controlId Id of the control
	 */
	keyUpById(controlId: string): void
	/**
	 * Trigger a key down and a key up event on a control by its id
	 * @param controlId Id of the control
	 */
	keyDownUpById(controlId: string): void
	/**
	 * Trigger a left rotation event on a control by its id
	 * @param controlId Id of the control
	 */
	rotateLeftById(controlId: string): void
	/**
	 * Trigger a right rotation event on a control by its id
	 * @param controlId Id of the control
	 */
	rotateRightById(controlId: string): void

	/**
	 * Change the current page of the surface
	 * @param forward Whether to progress forward or backwards
	 */
	changePage(forward: boolean): void

	/**
	 * Send a value of a transferVariable from surface
	 * @param variable Name of the variable
	 * @param value Value of the variable
	 */
	sendVariableValue(variable: string, value: any): void
}
