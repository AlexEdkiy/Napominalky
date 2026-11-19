#!/usr/bin/env python3
"""Check both configured PHP clients; save only non-secret probe results."""
import argparse
import json
from pathlib import Path
import subprocess
from redis_acl import ROOT, write

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('phase',choices=['staged','active'])
args=parser.parse_args()
code=(Path(__file__).resolve().parent/'redis_acl_probe.php').read_text()
code=code.replace("$results = [];", "ensure(config('database.redis.default.username') === 'app', 'Named ACL user missing');\n$results = [];")
results={}
for name in ['reminders_serve','reminders_app']:
    r=subprocess.run(['docker','exec','-i',name,'php'],input=code,capture_output=True,text=True)
    for suffix,data in [('stdout',r.stdout),('stderr',r.stderr)]:
        path=ROOT/(args.phase+'-'+name+'.'+suffix+'.txt')
        path.write_text(data);path.chmod(0o600)
    if r.returncode: raise RuntimeError(name+' probe failed; inspect private output')
    result=json.loads(r.stdout)
    assert result['passed']
    results[name]=result
write(ROOT/(args.phase+'-laravel.json'),{'passed':True,'clients':results})
print(json.dumps({'passed':True,'clients':list(results)}))
