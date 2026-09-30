# Versioned releases (OPS-14)

Code is packaged outside every Git worktree: committed backend source, locally
installed Composer dependencies verified against the production lock entries,
a fresh Vue build, nginx configuration and a file-hash manifest. The source commit
and exact local Docker image IDs identify the release. The initial migration keeps
the current PHP runtime and artisan serve; it neither upgrades packages nor runs
schema migrations. Copied vendor currently includes dev packages. Runtime image
IDs are local to this host; portable image distribution is a separate task.

## Layout

```text
/home/vselug/workspace/Napominalky-runtime/
  releases/<release-id>/       # read-only code/vendor/web/config + manifest.json
  stage/                      # test-only environment, storage and target.json
  production/
    .env                      # mode 0600, never committed
    storage/                  # persistent avatars, logs, framework files
    target.json               # container names, networks, paths and probe URLs
    migration.state.json      # first migration journal
    target.state.json         # managed switch journal
    schedule.log              # scheduler output outside the source tree
```

The artifact contains an **empty** backend/.env mountpoint, overlaid by the actual
runtime file. Storage is writable and bootstrap/cache is tmpfs. Code mounts and
container roots are read-only. API joins DB and proxy networks; web only joins the
proxy network. The node_modules symlink exists only in a temporary export during
build and never enters the artifact. Never install packages through that symlink.

## Package and verify

Run from the control worktree. --ref names a committed revision; --root must be
outside all registered worktrees. Existing release IDs are refused.

```bash
python3 deploy/releases/prepare.py \
  --ref 9cb10c6 --root /home/vselug/workspace/Napominalky-runtime \
  --release-id r9cb10c6-ops14 \
  --vendor /home/vselug/workspace/Napominalky/backend/vendor \
  --node-modules /home/vselug/workspace/Napominalky/web/node_modules \
  --api-image sha256:88507808a3030b6fed3e9b41290db2b9022ff09772446317e17df2be364cfd3e \
  --web-image sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de

python3 deploy/releases/runtime.py verify \
  --release /home/vselug/workspace/Napominalky-runtime/releases/r9cb10c6-ops14
```

The manifest hashes every file, including vendor, so dependency bytes are identified
in addition to their declared versions/references. Environment files are excluded.

## Staging and checks

Staging uses network napominalky_stage, separate PostgreSQL/Redis and a test-only
key, without production credentials/data. API 18001 and web 18081 are loopback only.

```bash
python3 deploy/releases/runtime.py start \
  --release /home/vselug/workspace/Napominalky-runtime/releases/r9cb10c6-ops14 \
  --config /home/vselug/workspace/Napominalky-runtime/stage/target.json

docker exec -e APP_ENV=testing -e DB_DATABASE=reminders_test -e DB_URL= \
  napominalky_stage_api php artisan test --compact --do-not-cache-result
```

Checks cover API health 200, unauthenticated /auth/me 401, empty login 422, SPA 200,
release marker, JS content type and cache lifetime, missing assets 404, SPA no-cache
and security headers. Worktree mutations must not appear in HTTP responses.

Artifact backend tests passed: 412 tests / 1534 assertions. Pest attempted to write
its own vendor result cache despite the PHPUnit no-cache option; the read-only
mount refused it and emitted a warning, without changing the result or artifact.
Managed switching passed in both directions. An induced port collision after API
creation automatically restored the previous pair.

## First production migration

Before execution, record live container IDs, verify candidate and baseline, check
disk space, save a DB backup outside Git and compare code/bundles with production.
Candidate web matches current web/dist byte-for-byte; backend application code is
unchanged. target.json must point outside the source checkout.

migrate.py requires the exact inspected IDs and known legacy mounts. It saves the
crontab, copies .env as 0600, pauses only this application's cron entry, stops API
writes and then copies storage. Both legacy containers remain stopped under new
names. The immutable candidate starts on existing DB/Redis networks. Direct HTTP
checks precede nginx -t/reload, public checks and scheduler restoration.

This causes a short API interruption for storage copy and container replacement.
Other applications' proxy configuration and DB volumes are unchanged. No schema
migration is run. Before public routing, failure restores the legacy pair. After
routing, users may have written new data: recovery launches the baseline artifact
with the NEW shared storage. Never restart the old mutable containers after user
writes have been accepted. Inspect the journal after interrupted execution.

Example target (actual file lives outside Git):

```json
{
  "api_name": "reminders_serve",
  "web_name": "reminders_web",
  "network": "project_reminders",
  "proxy_network": "insure-platform_default",
  "proxy_container": "nginx-proxy",
  "env_file": "/home/vselug/workspace/Napominalky-runtime/production/.env",
  "storage": "/home/vselug/workspace/Napominalky-runtime/production/storage",
  "api_port": "18000",
  "web_port": "127.0.0.1:18082",
  "api_url": "http://127.0.0.1:18000",
  "web_url": "http://127.0.0.1:18082",
  "public_web_url": "https://jemsoft.ru"
}
```

Existing API port exposure is preserved for compatibility. The new web probe is
loopback only. cron_file is a rehearsal-only target option, redirecting cron changes
to a fixture instead of the host crontab.

## Subsequent release / rollback

switch.py accepts only a running managed pair. It locks, verifies hashes, keeps
old containers, restores them on failed startup, and records a journal. It never
migrates or restores a database; storage is shared across code versions.

```bash
python3 deploy/releases/switch.py \
  --release /home/vselug/workspace/Napominalky-runtime/releases/r96e0568-rollback \
  --config /home/vselug/workspace/Napominalky-runtime/production/target.json
```

Use the same command with the new release to roll forward. Schema changes may
invalidate rollback and need a separate compatibility plan. Keep active/baseline
artifacts. Remove only explicitly identified unused containers/releases; never run
global Docker prune on this shared host.

## GitHub

CI also runs on branch pushes, allowing verification before merge. Branch
protection is a separate setting: a passing workflow alone does not make checks
mandatory. Public repository: https://github.com/AlexEdkiy/Napominalky.
Initial public publication requires the owner's explicit approval; the automated
approval reviewer rejected the first proposed push. No refs were uploaded.

References: [Docker mounts](https://docs.docker.com/engine/storage/bind-mounts/),
[nginx reload](https://nginx.org/en/docs/control.html),
[Laravel deployment](https://laravel.com/docs/12.x/deployment).
