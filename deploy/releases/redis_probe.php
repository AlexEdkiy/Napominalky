<?php
// Run against an isolated candidate, or the active release. Never execute queued jobs.
declare(strict_types=1);

require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$prefix = 'ops22-probe-'.bin2hex(random_bytes(12));
$cache = $app->make('cache')->store('redis');
$queue = $app->make('queue')->connection('redis');
$session = $app->make('session')->driver('redis')->getHandler();
$sessionId = bin2hex(random_bytes(20));
$lock = $cache->lock($prefix.'-lock', 30);
$results = [];
function ensure(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException($message);
    }
}
try {
    ensure($cache->put($prefix, ['verified' => true], 60), 'Cache write failed');
    ensure($cache->get($prefix) === ['verified' => true], 'Cache read failed');
    $results['cache'] = true;
    ensure($lock->get(), 'Cache lock failed');
    ensure($lock->release(), 'Cache Lua lock release failed');
    $results['cache_lock'] = true;
    ensure($session->write($sessionId, 'ops22-session'), 'Session write failed');
    ensure($session->read($sessionId) === 'ops22-session', 'Session read failed');
    $results['session'] = true;
    $queue->push('Ops22ProbeNeverExecuted', ['ops22' => true], $prefix);
    ensure($queue->size($prefix) === 1, 'Queue push failed');
    $job = $queue->pop($prefix);
    ensure($job !== null && $job->payload()['data']['ops22'] === true, 'Queue Lua pop failed');
    $job->delete();
    ensure($queue->size($prefix) === 0, 'Queue delete failed');
    $results['queue_push_pop_delete'] = true;
} finally {
    $cache->forget($prefix);
    $lock->release();
    $session->destroy($sessionId);
    $queue->clear($prefix);
}
echo json_encode(['passed' => true, 'checks' => $results], JSON_PRETTY_PRINT).PHP_EOL;
