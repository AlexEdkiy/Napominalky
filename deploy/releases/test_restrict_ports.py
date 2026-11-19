import unittest
from restrict_ports import spec

class PrivatePortsTest(unittest.TestCase):
    def test_reuses_anonymous_redis_volume_without_changing_other_settings(self):
        old={'Name':'/insure_redis','Image':'sha256:fixed',
             'Config':{'Image':'redis:7-alpine','Env':['KEEP=yes']},
             'HostConfig':{'PortBindings':{'6379/tcp':[{'HostIp':'','HostPort':'6379'}]},'Binds':None,'ReadonlyRootfs':False},
             'Mounts':[{'Type':'volume','Name':'existing-data','Source':'/vol/existing-data','Destination':'/data','RW':True}],
             'NetworkSettings':{'Networks':{'test':{'IPAddress':'172.18.0.4','Aliases':['redis']}}}}
        new=spec(old)
        self.assertEqual(new['HostConfig']['Mounts'][0]['Source'],'existing-data')
        self.assertEqual(new['HostConfig']['PortBindings']['6379/tcp'][0],{'HostIp':'127.0.0.1','HostPort':'6379'})
        self.assertEqual(new['Env'],['KEEP=yes'])
        self.assertEqual(new['NetworkingConfig']['EndpointsConfig']['test']['IPAMConfig']['IPv4Address'],'172.18.0.4')
        self.assertIsNone(old['HostConfig'].get('Mounts'))
        old['HostConfig']['Binds']=['existing-data:/data:rw']
        self.assertNotIn('Mounts',spec(old)['HostConfig'])

if __name__=='__main__':unittest.main()
