import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		fs: {
			// The catalog lives in backend/catalog.json, one level above this
			// root — it has to, because go:embed cannot reach outside its own
			// module (issue #8). Vite's dev server refuses to serve files
			// outside the root unless they are allowed explicitly.
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
