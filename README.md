# Shed Configurator

A customer designs a shed to their own specification, sees it rendered in 3D, and requests a
quote to buy it. The frontend (Vite + React 19 + React Three Fiber) draws the shed with geometry
from a Rust→WebAssembly kernel; the Go server prices the Design and stores it.

**`CLAUDE.md` is the working guide** — architecture, conventions, and what is and is not built.
`CONTEXT.md` is the glossary, `docs/adr/` the decisions, and `shed-options.md` the catalog of record.

## Prerequisites

- Go 1.25 (`go.mod`)
- Node 22 — Vite 7 needs 20.19+ or 22.12+
- Rust stable with the `wasm32-unknown-unknown` target, and the `wasm-bindgen` CLI at the exact
  version the kernel locks
- Access to the private kernel repo, `hunterMotko/shed-cad-rs`, checked out beside this one

## Run it

```bash
# 1. Build the kernel at the commit frontend/src/kernel/KERNEL.pin names
#    (frontend/src/kernel/README.md has the details)
cd ../wasm && tools/build-wasm.sh --target web --out ../threejs/shed_app/frontend/src/kernel/pkg

# 2. The server, on :8080
go build -o shed-server . && ./shed-server

# 3. The frontend, on http://localhost:5173
cd frontend && npm install && npm run dev
```

## Configuration

All optional — with none of them set, the app runs and quote requests are logged in full
instead of emailed.

| Variable | Meaning |
|---|---|
| `SHED_DB` | Where designs and quote requests are stored. Defaults to `shed.db` |
| `QUOTE_EMAIL_TO` | Where a quote request is emailed |
| `QUOTE_EMAIL_FROM` | The verified sender address |
| `RESEND_API_KEY` | The email provider key |

## Check it

```bash
go test ./...                    # server
cd frontend && npm test          # unit tests
cd frontend && npm run lint
cd frontend && npm run test:e2e  # frozen Reference Match renders; baselines are machine-local
```

CI (`.github/workflows/ci.yml`) runs the server tests, and builds the pinned kernel to run the
frontend's lint, unit tests and build. It does not run the frozen renders.
