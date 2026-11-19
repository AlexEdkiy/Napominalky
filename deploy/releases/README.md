# Versioned releases (OPS-14)

## Current production after OPS-18

Since **2026-11-19 15:07 UTC**, production is on **195.206.252.160**, release
**r9e7ac28-ops18**, unchanged application SHA `9e7ac28bcb382898ae458837363b51240a1eb17a`.
Connect as `devops`; runtime tools are `/srv/napominalky/tools/`, immutable releases
`/srv/napominalky/releases/`, current config `/srv/napominalky/production/target.json`.
The host nginx uses fixed loopback upstreams, so container DNS reload is unnecessary
for `switch.py`. New releases still require verified artifacts, target configuration
and current authorization; temporary migration sudo is removed after deployment.

The old host only forwards Napominalky HTTPS requests to the new host. Its API/app/
web/landing containers are stopped with restart=no, scheduler removed, old DB read-only.
**Never restore writes to the old database after the target accepted changes.**
Use current target data for a code rollback. A return migration requires a fresh
reverse snapshot with writes stopped; historical OPS-14/16 rollback instructions
below must not restore old proxy routes or old production data after OPS-18.

The old PHP image embeds historical environment/log files and must not be exported.
Use clean API image `sha256:b544765a589a3088996a4cb26b7ca6b502401a972a0afee191f45db31f0586a4`
and web image `sha256:bef154735288bc38d99fac41ae63730684bcc661503673a04a0f9bc526ba8598`.
The application bytes are identical; only runtime/release metadata changed.
Fresh DB/Redis credentials are private on the target; APP_KEY and all user data survived.
Only the target scheduler is active. No notification queue worker was added.

[Migration, evidence, pending DNS and host nginx limitation](../../docs/reviews/ops18-target-migration-2026-11-19.md).

## Previous releases and original local layout

OPS-16 adds two web bundles to each new artifact: `web/` for `/napominalki/`
and `web-root/` for `https://lk.napominalky.ru/`. Both share the same source SHA;
the root bundle uses `VITE_API_URL=''`, so API calls use `/api/v1` on its own origin.
Manifest flag `root_web` enables the additional read-only mount and both smoke checks.
Older artifacts without the flag remain supported. For a root-domain public probe,
set `public_web_url` to `https://lk.napominalky.ru` and `public_web_base` to `/`.
Do this only after DNS and TLS are live. Migration and rollback:
[OPS-16 report](../../docs/reviews/ops16-domain-2026-11-18.md).

Before OPS-18, production was **r9e7ac28-ops16** from 2026-11-18 17:57 MSK, source SHA
`9e7ac28bcb382898ae458837363b51240a1eb17a`, at `https://lk.napominalky.ru/`.
Both root/legacy bundles and the old APK API are served. APP_URL/FRONTEND_URL and
the production public probe now use the new origin. There were no migrations.
CI, artifact, root/legacy smoke, public desktop/mobile guest flows, TLS and renewal
dry-run passed. Authenticated flows were tested only on isolated staging.
During release the server provider still cached NXDOMAIN; scoped DNS lookup used
the A record verified through Google/Cloudflare, retaining normal TLS verification.
Keep **r57d35d7-dev26** for rollback and stopped `*-previous-f1d1598c` containers.
Before switching back, restore proxy/env/target from the private backup
`production/backups/ops16-20261118T145714Z/` (under Napominalky-runtime).
This proxy backup preserves the www landing host; do not use older OPS-16 snapshots.
[OPS-16 release and rollback](../../docs/reviews/ops16-domain-2026-11-18.md).

The previous DEV-26 release was **r57d35d7-dev26**, 2026-10-29 11:59 MSK, source SHA
`57d35d7b437af3605c94daf0a92f3ed9b7fe08ea`. DEV-26 separates the parent user-edit
clock from derived updates when applying list deletion. Existing APKs remain compatible.
Only additive migration `2026_10_29_000001_add_user_updated_at_to_shopping_lists`
was applied (batch 18). Backup, exact-SHA CI, 465 artifact backend tests, nine real
mobile SQLite/API scenarios, managed switch and public smoke all passed.
[DEV-26 report](../../docs/reviews/dev26-list-deletion-2026-10-29.md).

Keep **r3bb319c-mob75** for code rollback; stopped containers are
`reminders_serve-previous-af97ba2b` and `reminders_web-previous-af97ba2b`.
Retain the new column on rollback. If the old code accepted writes after rollback,
repeat `user_updated_at = updated_at` backfill with writes stopped before enabling
DEV-26 again. See [ARCH-8](../../docs/architecture/list-deletion-clock.md).
Do not restore the database backup automatically. Retain earlier favorites/schedule
columns and shared storage. MOB-74 email verification was not included in this release.

The initial OPS-14 migration on 2026-09-30
automatically recovered to baseline after a transient proxy 502; the corrected
managed switch then passed. Current state is recorded in production/target.state.json.
[Execution report](../../docs/reviews/ops14-release-2026-09-30.md).

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
proxy network. Compose labels inherited from the PHP image are overridden with
project napominalky-release, so the development Compose project cannot mistake the
API for its app service. The node_modules symlink exists only in a temporary export during
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

The initial-migration rehearsal also passed using dummy credentials/storage and a
fixture crontab. Existing uploads, environment permissions, unrelated cron entries
and a new upload made AFTER migration survived rollback. Migration took about 8 s;
rollback about 6 s on this host. A failed storage-copy attempt restored the legacy
pair before routing. An injected failure after a direct API write, before proxy
reload, restored the baseline using new storage and preserved that write. Copy now uses a read-only helper mount while the old API is
stopped, preserving ownership and private directory permissions.

```bash
python3 deploy/releases/rehearse.py \
  --root /home/vselug/workspace/Napominalky-runtime/rehearsal-new \
  --release /home/vselug/workspace/Napominalky-runtime/releases/r9cb10c6-ops14 \
  --baseline /home/vselug/workspace/Napominalky-runtime/releases/r96e0568-rollback \
  --stage-env /home/vselug/workspace/Napominalky-runtime/stage/.env
```

Stop/remove only earlier rehearsal fixture containers before rerunning. Disposable
rehearsal fixtures from this session were removed after verification; journals are
retained in stage/rehearsal-evidence.json. Active staging, production and baseline remain.

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
migration is run. Before starting the new API, failure restores the legacy pair. Once the API can
accept requests (including its published port), recovery launches the baseline artifact
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
  "api_port": "127.0.0.1:18000",
  "web_port": "127.0.0.1:18082",
  "api_url": "http://127.0.0.1:18000",
  "web_url": "http://127.0.0.1:18082",
  "public_web_url": "https://jemsoft.ru"
}
```

Since OPS-20 the API and web probes are loopback only. Published mobile clients
use the HTTPS /napominalki API through nginx; direct Internet port 18000 is closed. cron_file is a rehearsal-only target option, redirecting cron changes
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

nginx reload is asynchronous. Public probes wait up to 20 seconds for the expected
release marker and API status, allowing old workers to retire; persistent failures
trigger recovery. Three regression checks run locally and in the backend CI job.

## GitHub

CI also runs on branch pushes, allowing verification before merge. Branch
protection is a separate setting: a passing workflow alone does not make checks
mandatory. Public repository: https://github.com/AlexEdkiy/Napominalky.
The owner explicitly approved public publication of main and manage-2026-09-30
on 2026-09-30 after the automated reviewer requested that consent. GitHub Actions
run [36691202007](https://github.com/AlexEdkiy/Napominalky/actions/runs/36691202007)
passed backend, mobile checks and web checks at f933b10.
[Run 36691997833](https://github.com/AlexEdkiy/Napominalky/actions/runs/36691997833)
also passed at 68f81a1, including the release routing regressions.
[Run 36692654027](https://github.com/AlexEdkiy/Napominalky/actions/runs/36692654027)
passed all three jobs at 34a16d0.

The owner imported [ruleset 24237275](https://github.com/AlexEdkiy/Napominalky/rules/24237275)
on 2026-09-30. API verification confirmed enforcement=active for refs/heads/main,
protected=true, the three required GitHub Actions checks with strict policy, the PR
requirement, and deletion/force-push restrictions. OPS-14 is complete.

Ruleset source: [.github/rulesets/main.json](../../.github/rulesets/main.json).
The following import instructions are for another repository or initial setup; the
current repository already has the active rule above. Import it through Settings → Rules → Rulesets → New ruleset → Import a ruleset,
review and Create with enforcement Active. It targets main, requires the three
checks from GitHub Actions (app ID 15368 verified from this run), requires a PR,
blocks deletion/force push and configures no bypass actors in the import file.
Public API responses do not expose the live bypass list without admin access. Zero mandatory approvals keeps
a single-maintainer workflow usable; it does not claim independent review.

SSH authorizes Git pushes but not repository administration through the API.
An authenticated GitHub CLI with repository Administration:write can alternatively
apply the reviewed file:

```bash
gh api --method POST repos/AlexEdkiy/Napominalky/rulesets \
  --input .github/rulesets/main.json
```

Do not run that POST again if a matching ruleset exists: inspect/update it instead.
After import, verify GET /repos/AlexEdkiy/Napominalky/rules/branches/main returns the
required checks and PR rule. The JSON file alone does not enable protection.
[GitHub ruleset import documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository#importing-a-ruleset).

References: [Docker mounts](https://docs.docker.com/engine/storage/bind-mounts/),
[nginx reload](https://nginx.org/en/docs/control.html),
[Laravel deployment](https://laravel.com/docs/12.x/deployment).

## Security-only nginx image overrides (OPS-19)

A target may set `web_image` to an inspected immutable `sha256:` image ID.
It overrides only the web runtime; artifact hashes, release markers, source SHA
and API image remain unchanged. Use this to retain an nginx security update across
code releases and rollbacks. Never modify an existing artifact manifest in place.
The current fixed image is `nginx:1.30.7-alpine@sha256:bef154735288bc38d99fac41ae63730684bcc661503673a04a0f9bc526ba8598`.

`upgrade_nginx.py` snapshots the six known nginx containers privately, preflights
candidates on loopback ports, then replaces one selected container while preserving
ports, mounts, restrictions and addresses on user-defined networks. It retains the
old container disconnected and stopped as `<name>-before-ops19`, automatically
restoring it on a startup error. HTTP checks must also pass; on a failed HTTP check
run its `rollback --root <snapshot-dir> --name <name>` command immediately.
Do not restart a retained old container directly. Snapshot `*.desired.json` files
are the exact digest-pinned Docker create specifications for unmanaged edge services.
Private execution evidence and HTTP verification: runtime `nginx-security-20261119/`.

## Private service ports (OPS-20)

Runtime `production/target.json` pins `api_port` to `127.0.0.1:18000`.
Insure Compose binds its five ports to loopback and explicitly reuses the existing
Redis volume as an external volume. Do not remove that volume or recreate Redis
with a new anonymous volume. The unmanaged jemsoft landing create specification
is runtime `ports-security-20261119/jemsoft-landing.desired.json`.

Root-owned `/usr/local/sbin/ops20-private-ports` enforces IPv4/IPv6 Docker ingress
restrictions on ens3, matching ORIGINAL conntrack destination ports. It is installed
from `deploy/security/private-ports.sh` and invoked by systemd, Docker ExecStartPost
and the UFW start hook. The UFW public VNC/X11 allow rules are removed.
VNC is available through a user-established SSH tunnel to localhost:5901; the
existing desktop was not restarted. Its systemd override restricts future starts
to localhost and disables TCP X11. Keep the user's normal SSH jump/proxy settings.

Example client tunnel: `ssh -N -L 15901:127.0.0.1:5901 vselug@94.103.15.24`.
Connect the VNC viewer to localhost:15901. SSH authentication is still required.

The private evidence directory includes before/desired Docker specifications, data
backups, external probes and verification. `restrict_ports.py rollback` can restore
an ordinary retained container; it intentionally refuses the suspicious old Redis.
Never start `insure_redis-before-ops20`; retain it offline for investigation.
A rollback must preserve current data and should leave the firewall protection in
place. Do not restore a full historical iptables snapshot over new Docker state.


## OPS-21: Insure Platform выведен из эксплуатации

2026-11-19 владелец разрешил отключение Insure Platform. Все `insure_*` контейнеры,
включая `*-before-ops20`, остановлены, `restart=no`, без сетей. Их Compose-сервисы
находятся в профиле `retired`; не включать этот профиль. Старые OPS-20 снимки и
утилиту rebind/rollback не использовать для возвращения Insure в работу.

Общий nginx-proxy продолжает работать; Insure upstream удалены, прежние маршруты
возвращают 410. Конфигурация всё ещё смонтирована из
`/home/vselug/.openclaw/workspace/insure-platform/nginx.conf`: не удалять этот файл
или каталог до отдельного переноса mount. `insure-platform_default` остаётся общей
сетью других сайтов; удалять её нельзя. Данные/журналы сохранены в приватном runtime.
Подробности: [SEC-2/OPS-21](../../docs/reviews/sec2-redis-incident-2026-11-19.md).


## OPS-22: Redis patch upgrade

Target: `reminders_redis`, Redis 7.4.8 → 7.4.12-alpine, official digest
`sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe`.
Use `upgrade_redis.py` only for the private OPS-22 snapshot directory; it refuses
other image references and requires successful candidate and Laravel checks.
The candidate loads a copy of the RDB without a network. `redis_probe.php` checks
Laravel cache/locks/session and push/pop/delete in a unique disposable queue;
it does not execute jobs. Run the isolated PHP probe with a temporary writable
package cache and a separate Redis key prefix.

Cutover plan: queue writes briefly, capture fingerprints, stop Redis gracefully,
copy its final RDB, retain the stopped old container, replace only Redis with the
same volume/IP/aliases, and compare data. Preserve the same named volume during
an emergency executable rollback; never overwrite it with an earlier snapshot.
A rollback to 7.4.8 reintroduces known vulnerabilities and is only an emergency step.
Do not start Insure containers or run compose down. Pin the image in both repository
Compose files and the active Compose source recorded in the container labels.
Postchecks: Redis health/persistence and no published ports, Laravel integration,
production runtime smoke, existing HTTP/TLS checks, scheduler definition/cron,
unchanged neighboring container IDs and start times.


Executed on 2026-11-19: all three original keys preserved, cutover 3.4 seconds,
Redis healthy; candidate and production Laravel probes passed, production smoke
and 41 HTTP/TLS checks passed. The temporary candidate was removed; its data copy
and two RDB backups remain in the private runtime `redis-security-20261119/`.
`reminders_redis-before-ops22` is stopped, disconnected, restart=no. It shares the
current volume: never start it alongside the active Redis. Automatic failure
recovery was not needed; no production downgrade was exercised.

Executed commands from the OPS-22 worktree (not an instruction to repeat the upgrade):

```sh
sudo python3 deploy/releases/upgrade_redis.py candidate --root /home/vselug/workspace/Napominalky-runtime/redis-security-20261119 --image redis:7.4.12-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe
# Between candidate and apply: isolated Laravel probe; matching result recorded privately.
sudo python3 deploy/releases/upgrade_redis.py apply --root /home/vselug/workspace/Napominalky-runtime/redis-security-20261119 --image redis:7.4.12-alpine@sha256:7f7d30b7fdd09467bac58198a1f166dd69789d348d4fe859cccb20e0cf287fbe
sudo docker exec -i reminders_serve php < deploy/releases/redis_probe.php
python3 deploy/releases/runtime.py smoke --release /home/vselug/workspace/Napominalky-runtime/releases/r9e7ac28-ops16 --config /home/vselug/workspace/Napominalky-runtime/production/target.json
```

The snapshot directory is a required precondition, not created by these commands.
It contains the inspected old container specification, preflight RDB and integration
results. The guard rejects re-applying after the container identity changes.
[Execution report and remaining scope](../../docs/reviews/ops22-redis-security-2026-11-19.md).


## OPS-23: authenticated Redis ACL

Plan: generate separate app/operator/health credentials outside Git; test the
explicit Laravel command allowlist against an isolated RDB copy; test persistence
across candidate restart. Stage the named app user while legacy connections still
work, update the mounted production and dev .env files in place, reload PHP, and
verify real Laravel operations. Then replace only Redis with the same volume/IP
and a read-only ACL bind mount; default user is disabled. Keep the old container
stopped and disconnected for emergency recovery using current data.

`redis_acl.py` is a host-specific OPS-23 rollout tool, not a generic installer.
It requires private snapshots in runtime `redis-acl-20261119/`. Steps: `prepare`,
`candidate`, `redis_acl_candidate.py`, `stage`, staged application verification,
then `apply` and final checks. Do not repeat steps on an already migrated server.
`redis_acl_probe.php` uses unique disposable keys and a queue; it never executes jobs.

Both Compose definitions require `REDIS_ACL_DIR` pointing to the provisioned
runtime `production/redis-acl/` directory. It contains password hashes in users.acl
and a ping-only health password; it is mounted read-only. Application plaintext
credentials stay in existing private .env files, operator credentials only in the
private evidence directory. Do not print or commit either. Back up ACL configuration
and credentials separately from RDB: ACLs are not stored in RDB.

Allowlist covers current Laravel cache/session/rate limiter and Redis queue usage;
FLUSHDB/FLUSHALL, CONFIG, replication, MODULE, ACL, RESTORE, MIGRATE and arbitrary
key access are denied to the app. `cache:clear`/`optimize:clear` can therefore fail
on the Redis-wide cache flush step. Use scoped key invalidation. Horizon is not
running: its management commands need a separate ACL review before enabling it.


Executed 2026-11-19: named credentials active in both PHP clients, default disabled,
Redis healthy, same three original keys/volume/IP, no published ports. Redis cutover
was 1.58 seconds (separate from PHP reload); production smoke and 41 HTTP/TLS checks
passed. Candidate restart retained ACLs; temporary candidate removed after testing.
Dev .env is 0640, owner unchanged, group 82 for the verified PHP-FPM worker identity;
production .env remains 0600. Update this ownership if the PHP image UID/GID changes.

Operational admin access: from the trusted host/worktree, root can import
`redis_acl.py` and call `cli(NAME, ...)`, which reads the operator credential from
private runtime and authenticates over the local Docker bridge. Never pass passwords
as command-line arguments or copy operator credentials into app environments.
The Python helper targets this exact host/IP and is not a public Redis client API.

`reminders_redis-before-ops23` (and OPS-22 snapshots) remain stopped, restart=no,
without networks. They share the current data volume. Never start them alongside
active Redis or use old Compose snapshots: those configurations lack the ACL mount.
Automatic cutover failure recovery was not exercised. It restores the previous
container/current data and staged app account, with legacy default access temporarily
open; reapply the protected ACL configuration before considering recovery complete.
A repair of the mounted ACL file on the current Redis is preferable to rolling back
security. No RDB restoration over current data is part of this workflow.

[Execution evidence, command scope and limitations](../../docs/reviews/ops23-redis-acl-2026-11-19.md).
