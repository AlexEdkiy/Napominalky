#!/usr/bin/env python3
"""Run the real release PHP code against the network-isolated ACL candidate."""
import json
from pathlib import Path
import subprocess
from redis_acl import ROOT, CANDIDATE, PREFIX, credentials, security, docker, write

root = Path(__file__).resolve().parent
snapshot = json.loads((ROOT / 'reminders_serve.before.private.json').read_text())
backend = next(m['Source'] for m in snapshot['Mounts'] if m['Destination']=='/var/www/html')
env = {'APP_ENV':'testing','APP_NAME':'Reminders App','APP_DEBUG':'false',
       'APP_KEY':'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
       'APP_PACKAGES_CACHE':'/tmp/packages.php','APP_SERVICES_CACHE':'/tmp/services.php',
       'DB_CONNECTION':'sqlite','DB_DATABASE':':memory:', 'LOG_CHANNEL':'stderr',
       'REDIS_HOST':'127.0.0.1','REDIS_USERNAME':'app','REDIS_PASSWORD':credentials()['app'],
       'REDIS_PREFIX':PREFIX,'CACHE_PREFIX':'reminders_', 'REDIS_CLIENT':'phpredis',
       'CACHE_STORE':'redis','SESSION_DRIVER':'redis','QUEUE_CONNECTION':'redis'}
env_file = ROOT / 'candidate-laravel.private.env'
env_file.write_text(''.join(k+'='+v+'\n' for k,v in env.items())); env_file.chmod(0o600)
command = ['docker','run','--rm','--name','ops23-laravel-probe','--network','container:'+CANDIDATE,
           '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
           '--env-file',str(env_file),'--mount',f'type=bind,src={backend},dst=/var/www/html,readonly',
           '--mount',f'type=bind,src={root / "redis_acl_probe.php"},dst=/probe.php,readonly']
for path in ['/tmp','/var/www/html/storage','/var/www/html/bootstrap/cache']:
    command += ['--tmpfs',path+':rw,nosuid,mode=1777,size=64m']
command += [snapshot['Image'],'php','/probe.php']
r = subprocess.run(command,capture_output=True,text=True)
for suffix,content in [('stdout',r.stdout),('stderr',r.stderr)]:
    p=ROOT/('candidate-laravel.'+suffix+'.txt');p.write_text(content);p.chmod(0o600)
if r.returncode:
    raise RuntimeError('Isolated Laravel probe failed; inspect private stdout/stderr')
result=json.loads(r.stdout)
assert result['passed']
security(CANDIDATE)
write(ROOT/'candidate-laravel.json',result)
print(json.dumps(result))
