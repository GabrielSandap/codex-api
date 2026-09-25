<?php
$key = "PASTE_YOUR_LOCAL_KEY_HERE"; // Keep your key private.
$question = "Explain what an API is in one sentence.";

$request = curl_init("http://127.0.0.1:4317/v1/responses");
curl_setopt_array($request, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 130,
    CURLOPT_HTTPHEADER => ["Content-Type: application/json", "Authorization: Bearer $key"],
    CURLOPT_POSTFIELDS => json_encode(["model" => "codex", "input" => $question], JSON_THROW_ON_ERROR),
]);
$body = curl_exec($request);
if ($body === false) throw new RuntimeException(curl_error($request));
$result = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
curl_close($request);
if (isset($result["error"])) throw new RuntimeException($result["error"]["message"]);
echo $result["output_text"] . PHP_EOL;
