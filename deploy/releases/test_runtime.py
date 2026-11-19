"""Regression checks for public routing during an asynchronous nginx reload."""
import json
import unittest
from unittest.mock import patch

from pathlib import Path
from runtime import wait_public, container_args


class PublicReadinessTest(unittest.TestCase):
    config = {'public_web_url': 'https://example.test'}

    def test_old_worker_and_stale_release_are_retried_before_api_check(self):
        responses = [RuntimeError('502 from old upstream'),
                     (b'{"release":"old"}', {}),
                     (b'{"release":"new"}', {}), (b'', {})]
        with patch('runtime.request', side_effect=responses) as request, patch('runtime.time.sleep'):
            wait_public(self.config, 'new')
        self.assertEqual(request.call_count, 4)
        self.assertEqual(request.call_args.args,
                         ('https://example.test/napominalki/api/v1/auth/me', 401))

    def test_web_ready_does_not_hide_api_failure(self):
        def response(url, status, **kwargs):
            if url.endswith('release.json'):
                return json.dumps({'release': 'new'}).encode(), {}
            raise RuntimeError('API unavailable')
        with patch('runtime.request', side_effect=response):
            with self.assertRaisesRegex(RuntimeError, 'before timeout') as raised:
                wait_public(self.config, 'new', timeout=0.01)
        self.assertEqual(str(raised.exception.__cause__), 'API unavailable')

    def test_persistently_wrong_release_fails(self):
        with patch('runtime.request', return_value=(b'{"release":"old"}', {})):
            with self.assertRaisesRegex(RuntimeError, 'before timeout'):
                wait_public(self.config, 'new', timeout=0.01)

    def test_dedicated_domain_checks_root_marker_and_api(self):
        config = {'public_web_url': 'https://lk.example.test', 'public_web_base': '/'}
        with patch('runtime.request', side_effect=[(b'{"release":"new"}', {}), (b'', {})]) as request:
            wait_public(config, 'new')
        self.assertEqual([call.args[0] for call in request.call_args_list], [
            'https://lk.example.test/release.json', 'https://lk.example.test/api/v1/auth/me',
        ])


class SecurityImageOverrideTest(unittest.TestCase):
    def test_override_updates_web_without_changing_api_image_or_release(self):
        old, fixed = 'sha256:' + 'a' * 64, 'sha256:' + 'b' * 64
        config = {'web_name': 'web', 'api_name': 'api', 'network': 'test',
                  'env_file': '/env', 'storage': '/storage', 'web_image': fixed}
        manifest = {'release': 'same-code', 'source_sha': 'abc',
                    'images': {'web': old, 'api': old}}
        _, web = container_args(config, Path('/release'), manifest, 'web')
        _, api = container_args(config, Path('/release'), manifest, 'api')
        self.assertIn(fixed, web)
        self.assertNotIn(old, web)
        self.assertIn(old, api)
        self.assertNotIn(fixed, api)
        self.assertIn('napominalky.release=same-code', web)
        config['web_image'] = 'nginx:latest'
        with self.assertRaises(ValueError):
            container_args(config, Path('/release'), manifest, 'web')


if __name__ == '__main__':
    unittest.main()
