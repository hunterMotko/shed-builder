import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	test: {
		// Every seam under test is non-React: pure geometry and pricing
		// functions, the Zustand store driven through getState(), and the Go
		// API (tested separately by `go test`). No jsdom needed.
		environment: 'node',
		include: ['src/**/*.test.js'],
	},
})
