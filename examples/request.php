<?php
$key = getenv('CODEX_LOCAL_KEY');
if (!$key) {
    fwrite(STDERR, "Set CODEX_LOCAL_KEY in your terminal.\n");
    exit(1);
}

$request = curl_init("http://127.0.0.1:4317/v1/responses");
curl_setopt_array($request, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 130,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'codex',
        'input' => 'Explain an API in one sentence.',
    ], JSON_THROW_ON_ERROR),
]);

$body = curl_exec($request);
if ($body === false) {
    fwrite(STDERR, curl_error($request) . "\n");
    curl_close($request);
    exit(1);
}
$status = curl_getinfo($request, CURLINFO_HTTP_CODE);
curl_close($request);
$result = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
if ($status >= 400) {
    fwrite(STDERR, "Error $status : " . $result['error']['message'] . "\n");
    exit(1);
}
echo $result['output_text'] . "\n";
