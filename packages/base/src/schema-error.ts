import type z from 'zod'

/** Format zod issues into a single, human readable string. */
export function formatValidationError(error: z.ZodError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? `/${issue.path.join('/')}` : ''
			return path ? `${path} ${issue.message}` : issue.message
		})
		.join('; ')
}
