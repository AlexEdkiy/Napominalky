#!/usr/bin/env python3
"""OPS-23 host-specific Redis ACL rollout. Secrets stay in the private runtime."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import socket
import shutil
import subprocess
import time

from upgrade_nginx import api, docker, endpoint, specification, write
from upgrade_redis import IMAGE, verify_preserved

ROOT = Path('/home/vselug/workspace/Napominalky-runtime/redis-acl-20261119')
ACL_DIR = Path('/home/vselug/workspace/Napominalky-runtime/production/redis-acl')
NAME = 'reminders_redis'
CANDIDATE = NAME + '-ops23-candidate'
BACKUP = NAME + '-before-ops23'
PREFIX = 'reminders-app-database-'
ENV_FILES = [Path('/home/vselug/workspace/Napominalky-runtime/production/.env'),
             Path('/home/vselug/workspace/Napominalky/backend/.env')]
COMMANDS = '''ping echo quit hello select client|setname client|setinfo
get mget set setex psetex setnx exists del unlink incr incrby decr decrby
expire pexpire ttl pttl persist multi exec discard watch unwatch eval evalsha
llen lindex lpop rpush blpop zadd zcard zrem zrange zrangebyscore zremrangebyrank'''.split()
HEALTH = ['CMD-SHELL', 'REDISCLI_AUTH="$(cat /run/redis-acl/health.password)" redis-cli --user health --no-auth-warning ping | grep -qx PONG']


def credentials():
    return json.loads((ROOT / 'credentials.private.json').read_text())


def cli(name, *args, user='operator'):
    return batch(name, [list(args)], user)[0]


def read_resp(stream):
    line = stream.readline()
    if not line:
        raise RuntimeError('Redis disconnected')
    kind, value = line[:1], line[1:-2]
    if kind == b'-':
        raise RuntimeError(value.decode(errors='replace'))
    if kind == b'+': return value.decode()
    if kind == b':': return int(value)
    if kind == b'$':
        size = int(value)
        if size == -1: return None
        data = stream.read(size)
        if stream.read(2) != b'\r\n': raise RuntimeError('Invalid bulk response')
        return data.decode('latin1')
    if kind == b'*':
        size = int(value)
        return None if size == -1 else [read_resp(stream) for _ in range(size)]
    raise RuntimeError('Unknown Redis response')


def inventory(name, user='operator'):
    rows = []
    for db in re.findall(r'^db(\d+):', cli(name, 'INFO', 'keyspace', user=user), re.M):
        # SELECT and the following command need the same connection.
        cursor = '0'
        while True:
            result = batch(name, [['SELECT', db], ['SCAN', cursor, 'COUNT', '100']], user)
            cursor, keys = result[-1]
            for key in keys:
                value, ttl = batch(name, [['SELECT', db], ['DUMP', key], ['PTTL', key]], user)[-2:]
                rows.append({'db': db, 'key_hash': hashlib.sha256(key.encode()).hexdigest(),
                             'dump_hash': hashlib.sha256(value.encode('latin1')).hexdigest(), 'pttl': ttl})
            if str(cursor) == '0':
                break
    return sorted(rows, key=lambda r: (r['db'], r['key_hash']))


def batch(name, commands, user='operator'):
    if user:
        commands = [['AUTH', user, credentials()[user]]] + commands
    if name == CANDIDATE:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect(str(ROOT / 'candidate-data/redis.sock'))
    elif name == NAME:
        sock = socket.create_connection(('172.19.0.3', 6379), timeout=10)
    else:
        raise ValueError('Unexpected target')
    with sock, sock.makefile('rb') as stream:
        results = []
        for cmd in commands:
            values = [str(v).encode() for v in cmd]
            payload = b'*' + str(len(values)).encode() + b'\r\n'
            payload += b''.join(b'$'+str(len(v)).encode()+b'\r\n'+v+b'\r\n' for v in values)
            sock.sendall(payload)
            results.append(read_resp(stream))
    if user and results[0] != 'OK': raise RuntimeError('Authentication failed')
    return results[1:] if user else results


def ready(name):
    for _ in range(80):
        try:
            if cli(name, 'PING') == 'PONG':
                return
        except (RuntimeError, OSError, subprocess.CalledProcessError, ValueError):
            pass
        time.sleep(.25)
    raise RuntimeError('Redis failed readiness')


def rules():
    return (ACL_DIR / 'users.acl').read_text().splitlines()


def prepare():
    if (ROOT / 'credentials.private.json').exists():
        raise RuntimeError('Already prepared; refusing credential overwrite')
    creds = {u: secrets.token_hex(32) for u in ['app', 'operator', 'health']}
    write(ROOT / 'credentials.private.json', creds)
    ACL_DIR.mkdir(mode=0o750)
    os.chown(ACL_DIR, 0, 1000)
    ACL_DIR.chmod(0o750)
    hashes = {u: '#' + hashlib.sha256(v.encode()).hexdigest() for u, v in creds.items()}
    acl = ['user default reset off',
           'user operator reset on ' + hashes['operator'] + ' ~* &* +@all',
           'user health reset on ' + hashes['health'] + ' -@all +ping',
           'user app reset on ' + hashes['app'] + ' ~' + PREFIX + '* -@all ' + ' '.join('+' + c for c in COMMANDS)]
    for name, data in [('users.acl', '\n'.join(acl) + '\n'), ('health.password', creds['health'] + '\n')]:
        p = ACL_DIR / name
        p.write_text(data)
        os.chown(p, 0, 1000)
        p.chmod(0o640)
    for i, p in enumerate(ENV_FILES):
        shutil.copy2(p, ROOT / f'env-{i}.before.private')
        (ROOT / f'env-{i}.before.private').chmod(0o600)
    before = inventory(NAME, None)
    write(ROOT / 'inventory-preflight.json', before)
    cli(NAME, 'SAVE', user=None)
    docker('cp', NAME + ':/data/dump.rdb', str(ROOT / 'dump.preflight.rdb'))
    (ROOT / 'dump.preflight.rdb').chmod(0o600)
    print('ACL configuration, private credentials and RDB backup prepared')


def candidate():
    data = ROOT / 'candidate-data'
    data.mkdir(mode=0o700)
    shutil.copy2(ROOT / 'dump.preflight.rdb', data / 'dump.rdb')
    os.chown(data, 999, 1000)
    os.chown(data / 'dump.rdb', 999, 1000)
    docker('run', '-d', '--name', CANDIDATE, '--network', 'none', '--user', '999:1000',
           '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
           '--mount', f'type=bind,src={data},dst=/data',
           '--mount', f'type=bind,src={ACL_DIR},dst=/run/redis-acl,readonly', IMAGE,
           'redis-server', '--save', '', '--appendonly', 'no', '--aclfile', '/run/redis-acl/users.acl',
           '--unixsocket', '/data/redis.sock', '--unixsocketperm', '600')
    ready(CANDIDATE)
    verify_preserved(json.loads((ROOT / 'inventory-preflight.json').read_text()), inventory(CANDIDATE))
    print('Isolated Redis loaded RDB and ACL')


def security(name):
    denied = [ ['CONFIG', 'SET', 'dir', '/tmp'], ['REPLICAOF', '127.0.0.1', '1'],
               ['SLAVEOF', 'NO', 'ONE'], ['MODULE', 'LOAD', '/tmp/no.so'],
               ['ACL', 'SETUSER', 'evil', 'on'], ['FLUSHALL'], ['FLUSHDB'],
               ['RESTORE', PREFIX+'probe', '0', 'invalid'], ['MIGRATE','127.0.0.1','1',PREFIX+'probe','0','1'],
               ['DEBUG', 'HELP'], ['SHUTDOWN'], ['SAVE'], ['BGSAVE'], ['MONITOR'], ['KEYS', '*'],
               ['SCAN','0'], ['FUNCTION','LIST'], ['SCRIPT','FLUSH'], ['PUBLISH','outside','test'],
               ['GET', 'outside-prefix'], ['SET', 'outside-prefix', 'test'] ]
    for command in denied:
        result = cli(name, 'ACL', 'DRYRUN', 'app', *command)
        if result == 'OK':
            raise RuntimeError('Unexpectedly permitted: ' + command[0])
    try:
        cli(name, 'PING', user=None)
    except RuntimeError as e:
        if 'NOAUTH' not in str(e): raise
    else:
        raise RuntimeError('Anonymous connection was accepted')
    # Real read-only denials, including attempts through Lua.
    for command in [['CONFIG','GET','dir'], ['GET','outside-prefix'],
                    ['EVAL', "return redis.call('GET','outside-prefix')", '0'],
                    ['EVAL', "return redis.call('CONFIG','GET','dir')", '0']]:
        try:
            cli(name, *command, user='app')
        except RuntimeError as e:
            if not any(s in str(e).lower() for s in ['noperm', 'permissions', 'not allowed']): raise
        else:
            raise RuntimeError('ACL bypass accepted')
    assert cli(name,'PING',user='health')=='PONG'
    assert cli(name,'ACL','DRYRUN','health','GET',PREFIX+'probe')!='OK'
    write(ROOT / (name + '.security.json'), {'passed': True, 'denied_commands':len(denied),
            'anonymous_denied':True, 'lua_bypass_denied':True,'health_ping_only':True})
    print(name, 'security checks passed')


def stage():
    if not json.loads((ROOT / 'candidate-laravel.json').read_text())['passed']:
        raise RuntimeError('Candidate integration required')
    security(CANDIDATE)
    for line in rules():
        words = line.split()
        if words[1] != 'default':
            assert cli(NAME, 'ACL', 'SETUSER', *words[1:], user=None) == 'OK'
    for path in ENV_FILES:
        text = path.read_text()
        for key, value in {'REDIS_USERNAME':'app','REDIS_PASSWORD':credentials()['app'], 'REDIS_ACL_DIR':str(ACL_DIR)}.items():
            line = key + '=' + value
            text = re.sub(r'^'+key+r'=.*$', lambda _:line, text, flags=re.M) if re.search(r'^'+key+'=',text,re.M) else text.rstrip()+'\n'+line+'\n'
        # Keep inode: production .env is a file bind mount.
        with path.open('w') as f:
            f.write(text); f.flush(); os.fsync(f.fileno())
    # This host's dev PHP-FPM workers use uid/gid 82; avoid world-readable credentials.
    os.chown(ENV_FILES[1], -1, 82)
    ENV_FILES[1].chmod(0o640)
    docker('restart', '--timeout', '10', 'reminders_serve')
    docker('kill', '--signal=USR2', 'reminders_app')
    write(ROOT / 'state.json', {'phase':'clients-staged'})
    print('Named user enabled; PHP clients reloaded with private credentials')


def apply():
    if not json.loads((ROOT / 'staged-laravel.json').read_text())['passed']:
        raise RuntimeError('Staged application integration required')
    old = json.loads((ROOT / (NAME+'.before.private.json')).read_text())
    current = json.loads(docker('inspect',NAME))[0]
    assert current['Id']==old['Id'] and current['State']['Running']
    assert not current['HostConfig']['PortBindings']
    assert not any('/'+BACKUP in c['Names'] for c in api('GET','/containers/json?all=1'))
    _, spec = specification(old, IMAGE)
    spec['Labels'].pop('ops19.nginx_image',None)
    spec['Labels']['ops23.redis_acl']='enabled'
    spec['Cmd']=['redis-server','--save','60','1','--loglevel','warning','--aclfile','/run/redis-acl/users.acl']
    spec['Healthcheck']['Test']=HEALTH
    spec['HostConfig']['Binds'].append(str(ACL_DIR)+':/run/redis-acl:ro')
    write(ROOT / 'desired.private.json',spec)
    new_id=None; renamed=False; start=time.monotonic()
    try:
        cli(NAME,'CLIENT','PAUSE','60000','WRITE')
        before=inventory(NAME); write(ROOT/'inventory-cutover-before.json',before)
        assert cli(NAME,'SAVE')=='OK'
        docker('stop','--timeout','30',NAME)
        docker('cp',NAME+':/data/dump.rdb',str(ROOT/'dump.cutover.rdb'))
        docker('rename',NAME,BACKUP); renamed=True
        docker('update','--restart=no',BACKUP)
        for net in old['NetworkSettings']['Networks']: docker('network','disconnect',net,BACKUP)
        new_id=api('POST','/containers/create?name='+NAME,spec)['Id']
        docker('start',NAME); ready(NAME)
        after=inventory(NAME); verify_preserved(before,after,time.monotonic()-start)
        write(ROOT/'inventory-cutover-after.json',after)
        security(NAME)
        write(ROOT/'state.json',{'phase':'active','cutover_seconds':time.monotonic()-start,'keys_preserved':len(before)})
        print('Authenticated ACL active; original keys preserved')
    except BaseException:
        if new_id:
            docker('stop','--timeout','20',new_id)
            for net in old['NetworkSettings']['Networks']: docker('network','disconnect',net,new_id)
            docker('update','--restart=no',new_id)
            docker('rename',new_id,NAME+'-failed-ops23')
        if renamed:
            attached=json.loads(docker('inspect',BACKUP))[0]['NetworkSettings']['Networks']
            for net,settings in old['NetworkSettings']['Networks'].items():
                if net not in attached: api('POST','/networks/'+net+'/connect',{'Container':BACKUP,'EndpointConfig':endpoint(net,settings,NAME,True)})
            docker('rename',BACKUP,NAME)
        docker('update','--restart='+old['HostConfig']['RestartPolicy']['Name'],NAME)
        docker('start',NAME)
        # Old container has no persistent ACL; restore application user before clients reconnect.
        for line in rules():
            words=line.split()
            if words[1]!='default': cli(NAME,'ACL','SETUSER',*words[1:],user=None)
        cli(NAME,'CLIENT','UNPAUSE'); ready(NAME)
        write(ROOT/'state.json',{'phase':'restored-default-open'})
        raise


if __name__=='__main__':
    os.umask(0o077)
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['prepare','candidate','stage','apply','security'])
    parser.add_argument('--name',default=CANDIDATE,choices=[CANDIDATE,NAME])
    args=parser.parse_args()
    if args.action=='security': security(args.name)
    else: globals()[args.action]()
