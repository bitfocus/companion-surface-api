/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
	test: {
		environment: 'node',
		// Hide console output from passing tests, but keep it for failing ones
		silent: 'passed-only',
		exclude: ['**/node_modules/**', '**/dist/**'],
		coverage: {
			provider: 'v8',
			include: ['**/src/**/*.ts', '!**/node_modules/**'],
		},
	},
})
