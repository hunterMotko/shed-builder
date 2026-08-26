import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		fs: {
			// The catalog lives in catalog.json at the repo root, one level
			// above this one, so that the frontend and the Go server can share
			// a single copy (issue #8). Vite's dev server refuses to serve
			// files outside its root unless they are allowed explicitly.
			allow: ['..'],
		},
	},
	test: {
		// Every seam under test is non-React: pure geometry and pricing
		// functions, the Zustand store driven through getState(), and the Go
		// API (tested separately by `go test`). No jsdom needed.
		environment: 'node',
		include: ['src/**/*.test.js'],
	},
})
