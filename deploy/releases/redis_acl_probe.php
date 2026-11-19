<?php
// Run against an isolated candidate, or the active release. Never execute queued jobs.
declare(strict_types=1);

require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$prefix = 'ops23-probe-'.bin2hex(random_bytes(12));
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
    ensure($cache->add($prefix.'-add', 1, 60), 'Cache add failed');
    ensure(!$cache->add($prefix.'-add', 1, 60), 'Cache add overwrote existing key');
    ensure($cache->increment($prefix.'-add') === 2, 'Cache increment failed');
    ensure($cache->decrement($prefix.'-add') === 1, 'Cache decrement failed');
    ensure($cache->putMany([$prefix.'-a'=>'alpha',$prefix.'-b'=>'beta'], 60), 'Cache transaction failed');
    ensure(array_values($cache->many([$prefix.'-a',$prefix.'-b'])) === ['alpha','beta'], 'Cache multi-get failed');
    $limiter = $app->make(Illuminate\Cache\RateLimiter::class);
    ensure($limiter->hit($prefix.'-rate', 60) === 1, 'Rate limiter failed');
    $limiter->clear($prefix.'-rate');
    $results['cache_add_counters_transactions_rate_limit'] = true;
    ensure($lock->get(), 'Cache lock failed');
    ensure($lock->release(), 'Cache Lua lock release failed');
    $results['cache_lock'] = true;
    ensure($session->write($sessionId, 'ops23-session'), 'Session write failed');
    ensure($session->read($sessionId) === 'ops23-session', 'Session read failed');
    $results['session'] = true;
    $queue->push('Ops23ProbeNeverExecuted', ['ops23' => true], $prefix);
    ensure($queue->size($prefix) === 1, 'Queue push failed');
    $job = $queue->pop($prefix);
    ensure($job !== null && $job->payload()['data']['ops23'] === true, 'Queue Lua pop failed');
    $job->delete();
    ensure($queue->size($prefix) === 0, 'Queue delete failed');
    $queue->later(0, 'Ops23ProbeNeverExecuted', ['ops23'=>true], $prefix);
    $delayed = $queue->pop($prefix);
    ensure($delayed !== null, 'Delayed queue migration failed');
    $delayed->release(0);
    $retried = $queue->pop($prefix);
    ensure($retried !== null && $retried->attempts() === 2, 'Queue retry failed');
    $retried->delete();
    ensure($queue->size($prefix) === 0, 'Queue not empty after retry');
    $results['queue_push_pop_delete_delay_retry'] = true;
} finally {
    foreach (['', '-add', '-a', '-b', '-rate', '-rate:timer'] as $suffix) { $cache->forget($prefix.$suffix); }
    $lock->release();
    $session->destroy($sessionId);
    $queue->clear($prefix);
}
echo json_encode(['passed' => true, 'checks' => $results], JSON_PRETTY_PRINT).PHP_EOL;
