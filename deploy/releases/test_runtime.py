"""Regression checks for public routing during an asynchronous nginx reload."""
import json
import unittest
from unittest.mock import patch

from runtime import wait_public


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


if __name__ == '__main__':
    unittest.main()
