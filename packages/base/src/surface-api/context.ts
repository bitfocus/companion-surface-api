export interface HostCapabilities {
	/**
	 * Indicates whether the host supports non-square buttons.
	 */
	supportsNonSquareButtons: boolean | undefined

	/**
	 * Indicates whether the host supports addressable LED strips/rings (the `leds` control capability).
	 * When this is not true, a surface should omit `leds` from its style presets and fall back to
	 * whatever it would otherwise draw (e.g. a plain backlight colour).
	 */
	supportsLeds: boolean | undefined
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
	 * @param amount Number of steps rotated for this event. The magnitude is used (`Math.abs`);
	 * the direction is always leftward. Defaults to `1`.
	 */
	rotateLeftById(controlId: string, amount?: number): void
	/**
	 * Trigger a right rotation event on a control by its id
	 * @param controlId Id of the control
	 * @param amount Number of steps rotated for this event. The magnitude is used (`Math.abs`);
	 * the direction is always rightward. Defaults to `1`.
	 */
	rotateRightById(controlId: string, amount?: number): void
	/**
	 * Trigger a rotation event on a control by its id, with a signed step count.
	 * @param controlId Id of the control
	 * @param delta Signed number of steps rotated for this event: the sign is the direction
	 * (negative = leftward, positive = rightward) and the magnitude is the number of steps.
	 * Must be a non-zero finite number; a `delta` of `0` is ignored.
	 */
	rotateById(controlId: string, delta: number): void

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
