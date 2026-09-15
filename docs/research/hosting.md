# Hosting candidates: facts for the hosting decision

Research for [#52](https://github.com/hunterMotko/shed-builder/issues/52). This
gathers facts only and makes **no recommendation**; the choice belongs to the
next ticket. Every number comes from the host's own docs or pricing page as
read on **2026-09-15**. Prices change, so check the cited page before quoting
one.

## What the code fixes

Read from this repo at `origin/main` (b50da47):

- **Server.** Go 1.25 with Gin. `main.go` calls `newRouter().Run(":8080")`: the
  port is hard-coded and `PORT` is not read. The routes are `/api/save-design`,
  `/api/design/:id` and `/api/designs`. `catalog.json` is built in with
  `go:embed`. Designs sit in an in-memory map, so a restart loses them on every
  host until the storage ticket lands.
- **Frontend.** Vite 7 + React 19 in `frontend/`. `main.go` does not serve
  `frontend/dist` yet. The Go server could serve it, or a static host could sit
  beside it.
- **Kernel.** `frontend/src/kernel/KERNEL.pin` names
  `hunterMotko/shed-cad-rs 8dc68b0…`, and that repo is **private**. CI checks it
  out with `actions/checkout` using `ssh-key: ${{ secrets.KERNEL_SSH_KEY }}` (a
  read-only deploy key). It then installs Rust stable with
  `wasm32-unknown-unknown`, runs `cargo install wasm-bindgen-cli` at the
  version in the kernel's `Cargo.lock`, and runs `tools/build-wasm.sh`.
- **This repo is public.** `gh repo view` reports `visibility: PUBLIC`, and
  that affects two prices below:
  - "GitHub Actions usage is free for standard GitHub-hosted runners in public
    repositories"
    ([GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage)).
  - "GitHub Packages usage is free for public packages", and "Container image
    storage and bandwidth for the Container registry is currently free"
    ([GitHub Packages billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages)).

## Two ways to get the kernel into a deploy

This applies to every host.

- **A. The host builds from source.** The host's Docker build has to clone
  `shed-cad-rs`, so it needs a copy of a key or token for that repo. On hosts
  that support BuildKit secret mounts (`RUN --mount=type=secret`), the secret
  does not stay in the image (Fly, Render). A plain `ARG` does stay in the
  image's build metadata.
- **B. GitHub Actions builds and the host pulls the result.** CI already
  compiles the wasm. A job can build the whole image and push it to a registry,
  such as GHCR or the host's own. The host then receives only the image and
  never touches the kernel repo; `KERNEL_SSH_KEY` stays an Actions secret.
  - The image contains the compiled `.wasm`, which every browser downloads
    anyway. It does not contain the Rust source unless a Dockerfile copies it
    in.
  - A GHCR package pushed from a public repo can be public (free) or private.
    A private one needs the host to hold a registry credential.

## Summary

Costs are for the smallest always-on instance that fits, plus 1 GB of disk, in
USD per month, before tax and egress.

| Host | Runs Go server | Persistent disk | Kernel build | Custom domain + TLS | Outbound SMTP | Deploy triggers | Approx. monthly |
|---|---|---|---|---|---|---|---|
| Fly.io | Yes (Machine from Dockerfile or image) | Volume, one Machine, one region | A (remote builder + `--build-secret`) or B (`fly deploy --image`) | `fly certs add`, Let's Encrypt; first 10 certs free | Not documented; Fly recommends a transactional email service | `flyctl deploy` from Actions with `FLY_API_TOKEN` | shared-cpu-1x 256 MB $2.02 or 512 MB $3.32; volume $0.15/GB |
| Render | Yes (web service) | Paid services only; blocks zero-downtime deploys and scaling | A (Docker secret files) or B (deploy a GHCR image) | Automatic TLS; Hobby includes 2 domains | Blocked on Free; allowed on paid | Auto-deploy on push, "after CI checks pass", deploy hook, API | Starter 0.5 CPU/512 MB $7; disk $0.25/GB; Hobby workspace $0 |
| Railway | Yes (service) | One volume per service, no replicas, brief downtime on redeploy | A (build variables via `ARG`) or B (private registry needs **Pro**) | Automatic Let's Encrypt; Hobby 2 per service | **Blocked on Free/Trial/Hobby**; Pro only | GitHub autodeploy, "Wait for CI", CLI | Hobby $5/mo including $5 usage; $10/GB-RAM, $20/vCPU; volume $0.15/GB |
| Hetzner VPS (Docker + Caddy) | Yes (you run it) | Local NVMe; Volumes €0.04/GB, 3 replicas | B (pull image over SSH) or build on the box | Caddy automatic HTTPS | Ports 25/465 blocked for new customers; 587 open | Your own (e.g. SSH from Actions) | CX23 $6.49 (EU only); CPX11 $20.49 (US); IPv4 $0.60 |
| DigitalOcean Droplet (Docker + Caddy) | Yes (you run it) | Local SSD; Volumes $0.10/GiB, 100 GiB minimum | B or build on the box | Caddy automatic HTTPS | 25/465/587 blocked for new accounts | Your own | 512 MiB $4, 1 GiB $6; backups +20%/+30% |
| Google Cloud Run | Yes (container, port 8080 default) | **No block disk**; filesystem is in memory; Cloud Storage FUSE has no file locking | B (Actions with Workload Identity Federation) | Domain mapping is Preview and "not production-ready"; load balancer or Firebase Hosting otherwise | 25 blocked; 587/465 allowed | `deploy-cloudrun` action, `gcloud` | Free tier may cover low traffic; storage must be managed (Cloud SQL db-f1-micro $0.0105/h ≈ $7.67) |

The Managed database row under each host below covers the no-disk option.

---

## Fly.io

**Constraints**

- **Server.** A Fly Machine runs any container. `fly deploy --image` deploys a
  prebuilt image; `--local-only` / `--remote-only` pick where a Dockerfile is
  built ([flyctl deploy](https://fly.io/docs/flyctl/deploy/)).
- **Disk.** "A volume can attach to one Machine." "Each volume exists on one
  server in a single region. It is not network storage." Fly takes daily
  snapshots and keeps them five days by default (1–60 configurable), and warns:
  "If you only have a single copy of your data on a single volume, and that
  drive fails, then the data is lost." It advises "Always provision at least
  two volumes per app"
  ([Volumes](https://fly.io/docs/volumes/overview/)).
- **Managed database.** Fly Managed Postgres starts at "Basic" $38.00/mo, with
  storage at $0.28/GB ([Managed Postgres](https://fly.io/docs/mpg/)).
- **Kernel build.**
  - Build secrets pass as `fly deploy --build-secret NAME=VALUE` and are
    mounted with `RUN --mount=type=secret`. They are not written to the image
    ([Build secrets](https://fly.io/docs/apps/build-secrets/)). That covers
    path A.
  - `--image` covers path B.
  - The documented GitHub Actions flow uses `flyctl deploy --remote-only` with
    a `FLY_API_TOKEN` repository secret
    ([Continuous deployment](https://fly.io/docs/launch/continuous-deployment-with-github-actions/)).
- **Domain and TLS.** `fly certs add example.com`, with certificates from
  Let's Encrypt. Issuing one needs an AAAA record, an `_acme-challenge` CNAME
  or a `_fly-ownership` TXT record
  ([Custom domains](https://fly.io/docs/networking/custom-domain/)).
  - The first 10 single-hostname certificates are free, then $0.10/mo each.
  - A dedicated IPv4 is $2/mo
    ([Pricing](https://fly.io/docs/about/pricing/)).
- **Email.** Fly's docs recommend a transactional email service. A current
  community thread asks whether outbound port 25 is blocked by default on new
  accounts ([thread](https://community.fly.io/t/outbound-port-25-direct-to-mx-smtp-blocked-by-default-on-new-accounts/28537)).
  No first-party policy page was found.

**Secrets.** Secrets are held in "an encrypted vault" and put into the
Machine's environment at boot. "The API servers can only encrypt; they cannot
decrypt secret values." They are not available at image build time
([Secrets](https://fly.io/docs/apps/secrets/)).

**Cost.** Prices from [Pricing](https://fly.io/docs/about/pricing/).

- shared-cpu-1x: 256 MB $2.02/mo, 512 MB $3.32/mo, 1 GB $5.92/mo.
- Volumes $0.15/GB/mo.
- Egress in North America and Europe $0.02/GB; inbound is free.
- No plan fee is listed.
- **Example:** 512 MB plus a 1 GB volume is about $3.47/mo, or $5.47 with a
  dedicated IPv4.

**Gotchas**

- `fly launch` defaults to `auto_stop_machines = "stop"` and
  `min_machines_running = 0`, which "scales down to zero running machines
  during periods of no traffic". The first request after idle waits for a cold
  start. Set `"off"` or `min_machines_running = 1` to prevent it
  ([Autostop](https://fly.io/docs/launch/autostop-autostart/)).
- A volume pins the Machine to one server in one region. Fly's own guidance
  for redundancy is a second volume with app-level replication.

## Render

**Constraints**

- **Server.** A web service built from Git (native Go or Docker), or from a
  prebuilt image. Private images can come from Docker Hub, GHCR (token with
  `read:packages`), GitLab, Google Artifact Registry or ECR
  ([Deploy an image](https://render.com/docs/deploying-an-image)).
- **Disk.**
  - "You can attach a persistent disk to a paid Render web service"; free
    services get none.
  - "Adding a disk to a service prevents zero-downtime deploys": the old
    instance stops before the new one starts.
  - A service with a disk cannot scale to multiple instances.
  - Daily snapshots are kept at least 7 days.
  - "Only filesystem changes under your disk's mount path are preserved"
    ([Disks](https://render.com/docs/disks)).
  - Disk is $0.25/GB/mo ([Pricing](https://render.com/pricing)).
- **Managed database.** Render Postgres Basic-256mb $6/mo, Basic-1gb $19/mo.
  Expandable storage $0.30/GB. A free database "expire[s] 30 days after
  creation" ([Pricing](https://render.com/pricing),
  [Free](https://render.com/docs/free)).
- **Kernel build.**
  - Docker builds take secret files through
    `RUN --mount=type=secret,id=…`, and "secret mounts aren't persisted in your
    built image" ([Docker secrets](https://render.com/docs/docker-secrets)).
    That covers path A, with the deploy key uploaded to Render.
  - Deploying a GHCR image covers path B.
  - Build pipeline: Hobby 500 min/mo, Pro 1000. Builds time out after 120
    minutes. The Starter build machine is 2 CPU / 8 GB
    ([Build pipeline](https://render.com/docs/build-pipeline)).
- **Domain and TLS.** "Render automatically creates and renews TLS certificates
  for all custom domains." Hobby includes 2 custom domains, and each extra one
  is $0.25/mo ([Custom domains](https://render.com/docs/custom-domains)).
- **Email.** "Free web services can't send outbound network traffic on ports
  25, 465, or 587." Paid instances can
  ([Free](https://render.com/docs/free)).

**Deploys.** Auto-deploy on push to the linked branch, or an "After CI Checks
Pass" option. There is also a deploy hook URL (GET/POST) and a Trigger Deploy
API ([Deploys](https://render.com/docs/deploys)). Auto-deploy "require[s] a
connected Git provider".

**Secrets.** Environment variables and environment groups. Secret files
appear at `/etc/secrets/<filename>`, 1 MB in total per service or group
([Environment variables](https://render.com/docs/configure-environment-variables)).

**Cost.** Prices from [Pricing](https://render.com/pricing).

- Hobby workspace: $0/mo plus compute.
- Starter (`0.5c-512mb`): $7/mo. Standard (`1c-2g`): $25/mo.
- The Free instance (512 MB) cannot take a disk.
- **Example:** Starter plus a 1 GB disk is about $7.25/mo.
- Render renamed its plans to IDs such as `0.5c-512mb` in August 2026
  ([Compute plans](https://render.com/docs/compute-plans)).

**Gotchas**

- Free web services sleep after "15 minutes without receiving any inbound
  traffic" and take "about one minute" to wake. A workspace gets 750 free
  hours a month ([Free](https://render.com/docs/free)).
- A disk means a few seconds of downtime on every deploy, and a single
  instance.

## Railway

**Constraints**

- **Server.** A service built from a GitHub repo (Railpack or Dockerfile) or
  from a Docker image.
  - Build variables reach a Dockerfile through `ARG`
    ([Dockerfiles](https://docs.railway.com/builds/dockerfiles)).
  - The docs checked do not mention BuildKit secret mounts. An `ARG` value
    stays in the image's build history.
- **Disk.**
  - Volume size limits: Free/Trial 0.5 GB, Hobby 5 GB, Pro 50 GB.
  - "Each service can only have a single volume", and "Replicas cannot be used
    with volumes".
  - "There will be a small amount of downtime when re-deploying a service that
    has a volume attached"
    ([Volumes](https://docs.railway.com/reference/volumes)).
  - Backups can run daily (kept 6 days), weekly (27) or monthly (89), billed on
    their incremental size at volume rates
    ([Backups](https://docs.railway.com/volumes/backups)).
- **Managed database.** Railway's Postgres is itself a service with a volume,
  billed at the same usage rates. No separate price tier was found.
- **Kernel build.**
  - Path A: the deploy key becomes a build variable, via `ARG`.
  - Path B: "Private registry credentials are available on the Pro plan", and
    the credentials are encrypted at rest
    ([Private registries](https://docs.railway.com/builds/private-registries)).
    A **public** GHCR image does not need them.
- **Domain and TLS.** CNAME plus a TXT verification record, then "Railway will
  automatically generate and apply a Let's Encrypt certificate". Allowed
  domains: Trial 1, Hobby 2 per service, Pro 20 per service
  ([Working with domains](https://docs.railway.com/networking/domains/working-with-domains)).
- **Email.** SMTP (25/465/587) is blocked on Free, Trial and Hobby and
  available on Pro. Lower plans must use an HTTPS email API
  ([Outbound networking](https://docs.railway.com/networking/outbound-networking)).

**Deploys.** "Services linked to a GitHub repository automatically deploy when
new commits are pushed." "Wait for CI" holds a deploy until GitHub Actions
pass, and skips it if they have not finished within two hours. Autodeploy
needs a project member with contributor access to the repo
([GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys)).

**Secrets.** Service, shared and sealed variables. Variables are available
both to the build and at runtime. A sealed value "is never visible in the UI
nor can it be retrieved via the API"
([Variables](https://docs.railway.com/variables)).

**Cost.** Prices from [Pricing](https://railway.com/pricing).

- Hobby: $5/mo, including $5 of usage. Pro: $20/mo, including $20.
- Usage is billed per second: $20 per vCPU-month, $10 per GB-RAM-month,
  $0.15/GB-month of volume, $0.05/GB egress.
- **Example:** a Go service averaging 0.1 vCPU and 256 MB (about $2 + $2.50)
  plus 1 GB of volume ($0.15) fits inside Hobby's $5. Actual usage is metered,
  so that is an illustration, not a quote.
- **SMTP or a private registry means Pro ($20).**

**Gotchas**

- Serverless (app sleeping) marks a service inactive after 5 minutes without
  outbound packets, so it "sleeps somewhere between 5 and 10 minutes after its
  last outbound traffic". A cold boot follows
  ([Serverless](https://docs.railway.com/deployments/serverless)).
- The docs checked do not state whether sleeping is on by default.

## Small VPS: Hetzner Cloud

This assumes Docker, with Caddy in front of the Go container.

**Constraints**

- **Server.** A full VM; you run everything yourself.
- **Disk.**
  - Local NVMe on every plan.
  - Cloud Volumes range from 10 GB to 10 TB, and every block is stored on
    three physical servers
    ([Volumes](https://docs.hetzner.com/cloud/volumes/overview/)).
  - Volumes are €0.04/GB/mo and were not affected by the June 2026 price
    change. That figure comes from Hetzner search results; the pricing page
    renders it client-side
    ([Block storage](https://www.hetzner.com/cloud/block-storage/)).
- **Managed database.** None in Hetzner Cloud: run SQLite or Postgres on the
  VM, or use an external provider.
- **Kernel build.** Path B: Actions builds the image, then the VM pulls it
  (from GHCR, or by SSH-ing a `docker pull`). Building on the VM is also
  possible, but then the deploy key lives on the VM.
- **Domain and TLS.** Caddy "obtain[s] and renew[s]" certificates from Let's
  Encrypt/ZeroSSL and redirects HTTP to HTTPS. It needs A/AAAA records pointing
  at the server, ports 80/443 open, and a persistent data directory
  ([Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)).
- **Email.** "Ports 25 and 465 are blocked by default on all cloud servers."
  You can ask for them to be unblocked after a month and a paid first invoice.
  Port 587 to an external relay is open
  ([Cloud FAQ](https://docs.hetzner.com/cloud/servers/faq/)).

**Deploys and secrets.** None built in. Typically an Actions job SSHes in and
runs `docker compose pull && up -d`. Secrets go in an env file on the VM, and
the SSH key is an Actions secret.

**Cost.** Prices after the 15 June 2026 adjustment
([Price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)).

- **CX23** (2 vCPU / 4 GB / 40 GB, 20 TB): €5.49 / $6.49 per month. It is
  listed for Germany and Finland only; the
  [cost-optimized page](https://www.hetzner.com/cloud/cost-optimized/) showed
  "currently unavailable".
- **CPX11** in US Ashburn/Hillsboro (2 vCPU / 2 GB / 40 GB, 1 TB traffic):
  $20.49/mo.
- Primary IPv4: €0.50 / $0.60 per month
  ([IPv4 pricing](https://docs.hetzner.com/general/others/ipv4-pricing/)).

**Gotchas**

- US locations cost about 3× more than the EU for comparable plans.
- OS patching, backups, monitoring and Caddy's certificate store are your
  responsibility.
- A single VM is a single point of failure.

## Small VPS: DigitalOcean Droplet

This assumes Docker, with Caddy in front of the Go container.

**Constraints**

- **Server.** A VM, the same model as Hetzner.
- **Disk.**
  - Local SSD on every plan.
  - Block Storage Volumes are $10/mo for 100 GiB ($0.10/GiB), with 100 GiB the
    smallest listed size
    ([Volumes pricing](https://www.digitalocean.com/pricing/volumes)).
- **Managed database.** PostgreSQL from $15.15/mo (1 GiB / 1 vCPU, 10–30 GiB at
  $0.215/GiB)
  ([Managed databases pricing](https://www.digitalocean.com/pricing/managed-databases)).
- **Kernel build.** Path B, the same as Hetzner.
- **Domain and TLS.** Caddy, the same as Hetzner.
- **Email.** "SMTP ports 25, 465, and 587 are blocked on all Droplets for new
  accounts". Unblocking is up to support and not guaranteed
  ([Why is SMTP blocked?](https://docs.digitalocean.com/support/why-is-smtp-blocked/)).
  An HTTPS email API avoids the block.

**Deploys and secrets.** Same as Hetzner: nothing built in.

**Cost.** Prices from
[Droplet pricing](https://www.digitalocean.com/pricing/droplets).

- Basic 512 MiB / 1 vCPU / 10 GiB: $4/mo. Basic 1 GiB / 25 GiB: $6/mo.
- Backups add 20% (weekly) or 30% (daily) of the Droplet's price, or
  usage-based from $0.01/GiB.
- **Example:** the 1 GiB Droplet with SQLite on its local disk and daily
  backups is about $7.80/mo.

**Gotchas**

- Same operational ownership as Hetzner.
- The 100 GiB minimum means a Volume only pays off if local disk is not
  enough.

## Google Cloud Run

**Constraints**

- **Server.** Runs a container. The container must listen on the port
  requests are sent to, 8080 by default, and Cloud Run injects `PORT`. That
  default matches `main.go`'s hard-coded `:8080`
  ([Container contract](https://docs.cloud.google.com/run/docs/container-contract)).
- **Disk.** **Cloud Run has no persistent block disk.**
  - The writable filesystem is in memory, and data "doesn't persist when the
    instance stops"
    ([Container contract](https://docs.cloud.google.com/run/docs/container-contract)).
  - Cloud Storage FUSE volume mounts are "not a fully POSIX-compliant file
    system" and do "not provide concurrency control for multiple writes (file
    locking)". "The last write wins"
    ([Cloud Storage volume mounts](https://docs.cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts)).
  - So storage means a managed database, or SQLite that replicates somewhere
    else.
- **Managed database.** Cloud SQL `db-f1-micro` (shared, 0.6 GB): $0.0105/hour
  in the first region table, about $7.67 for a 730-hour month. SSD storage is
  $0.000232877/GiB-hour (about $0.17/GiB-month). Shared-core instances "are
  not covered by the Cloud SQL SLA"
  ([Cloud SQL pricing](https://cloud.google.com/sql/pricing)).
- **Kernel build.** Path B. `google-github-actions/deploy-cloudrun` deploys a
  fully qualified image. Auth is Workload Identity Federation (recommended) or
  a service-account key
  ([deploy-cloudrun](https://github.com/google-github-actions/deploy-cloudrun)).
  A source deploy exists, but its build runs in Cloud Build and would need the
  kernel key there.
- **Domain and TLS.** Three options
  ([Mapping custom domains](https://docs.cloud.google.com/run/docs/mapping-custom-domains)):
  - A global external Application Load Balancer, which is recommended.
  - Firebase Hosting.
  - Cloud Run domain mapping, which is Preview, limited to about 10 regions,
    and which Google calls "not production-ready". Its managed certificate
    takes "about 15 minutes but can take up to 24 hours".
- **Email.** Outbound port 25 to external destinations is blocked; 587 and
  465 are unrestricted
  ([Sending mail](https://docs.cloud.google.com/compute/docs/tutorials/sending-mail)).

**Secrets.** Secret Manager, exposed to the container as environment variables
(pin a version) or as mounted files (always the latest version)
([Secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)).

**Cost.** Prices from [Pricing](https://cloud.google.com/run/pricing).

- Request-based billing free tier: 180,000 vCPU-seconds, 360,000 GiB-seconds
  and 2 million requests per month.
- Instance-based billing free tier: 240,000 vCPU-seconds and 450,000
  GiB-seconds.
- Instance-based list rate: $0.000018/vCPU-second and $0.000002/GiB-second.
- The request-based per-second rates render client-side and were not
  captured.
- At low traffic with scale-to-zero, the service itself may sit inside the free
  tier. The recurring cost is then the database (Cloud SQL about $7.67 plus
  storage) and any load balancer used for the domain.

**Gotchas**

- Scale-to-zero means cold starts.
- An in-memory filesystem means the current in-memory Designs map, and any
  local SQLite file, disappear whenever an instance stops.
- The production-grade custom-domain path is a load balancer, which is a
  separately billed product.

---

## Cross-cutting notes

- **Port.** `main.go` binds `:8080` and ignores `PORT`. Fly (`internal_port`)
  and Cloud Run (8080 default) can be pointed at 8080. Any host that assigns
  its own port needs either configuration or a one-line change to read `PORT`.
- **Email.** Every host above blocks some SMTP ports on its cheapest tier or on
  new accounts. None blocks outbound HTTPS, so an email API over HTTPS works on
  all of them.
- **Build minutes.** Path B runs the Rust/wasm build on GitHub-hosted runners,
  which are free for this public repo. The host's own build minutes (Render
  500/mo on Hobby, Railway metered) are only spent on path A.
- **Where the deploy key lives.**
  - Path B: `KERNEL_SSH_KEY` stays solely in this repo's Actions secrets.
  - Path A: a second copy lives with the host (Fly build secret, Render secret
    file, Railway variable, or on the VM).
