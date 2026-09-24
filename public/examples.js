import { t, locale } from './i18n.js';
// No real credential is ever interpolated into a snippet.
export const setupCommands = {
  posix: `printf 'API key (hidden input): '
IFS= read -r -s CODEX_LOCAL_KEY
export CODEX_LOCAL_KEY
printf '\\n'`,
  powershell: `$secret = Read-Host "API key" -AsSecureString
$env:CODEX_LOCAL_KEY = [System.Net.NetworkCredential]::new("", $secret).Password
Remove-Variable secret`,
};

export function getExamples(baseUrl) {
  const endpoint = `${baseUrl}/responses`;
  return {
    python: {
      file: 'example.py', run: 'python3 example.py  (Windows: py example.py)',
      requirements: t("Python 3 · Bibliothèque standard uniquement, aucun paquet à installer."),
      result: t("Le programme affiche le texte de la réponse. En cas d’erreur, il affiche le message renvoyé par l’API."),
      code: `import json
import os
import sys
import urllib.request
import urllib.error

key = os.environ.get("CODEX_LOCAL_KEY")
if not key:
    sys.exit("Set CODEX_LOCAL_KEY in your terminal.")

request = urllib.request.Request(
    ${JSON.stringify(endpoint)},
    data=json.dumps({
        "model": "codex",
        "input": "Explain an API in one sentence.",
    }).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(request, timeout=130) as response:
        result = json.load(response)
    print(result["output_text"])
except urllib.error.HTTPError as error:
    result = json.loads(error.read().decode("utf-8"))
    sys.exit(f"Error {error.code} : {result['error']['message']}")
except urllib.error.URLError as error:
    sys.exit(f"Local service unreachable: {error.reason}")`,
    },
    javascript: {
      file: 'example.mjs', run: 'node example.mjs',
      requirements: t("Node.js 22 ou supérieur · Aucun paquet à installer. À exécuter côté Node.js, pas dans une page web."),
      result: t("Le champ output_text contient le texte de la réponse. Le programme signale aussi les erreurs de clé ou de connexion."),
      code: `const key = process.env.CODEX_LOCAL_KEY;
if (!key) {
  throw new Error("Set CODEX_LOCAL_KEY in your terminal.");
}

try {
  const response = await fetch(${JSON.stringify(endpoint)}, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${key}\`,
    },
    body: JSON.stringify({
      model: "codex",
      input: "Explain an API in one sentence.",
    }),
    signal: AbortSignal.timeout(130_000),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(\`Error \${response.status} : \${result.error.message}\`);
  }
  console.log(result.output_text);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}`,
    },
    curl: {
      file: t("Terminal — Bash ou Zsh"), run: t("Coller la commande dans le même terminal que la variable de clé."),
      requirements: t("cURL · Cet exemple utilise la syntaxe macOS / Linux (Bash ou Zsh)."),
      result: t("La réponse s’affiche en JSON : le texte se trouve dans output_text. En cas d’échec, consultez error.message et le statut HTTP."),
      code: `curl --silent --show-error --max-time 130 \\
  ${JSON.stringify(endpoint)} \\
  --header "Content-Type: application/json" \\
  --header "Authorization: Bearer \${CODEX_LOCAL_KEY:?Set CODEX_LOCAL_KEY}" \\
  --data '{"model":"codex","input":"Explain an API in one sentence."}' \\
  --write-out '\\nHTTP status: %{http_code}\\n'`,
    },
    php: {
      file: 'example.php', run: 'php example.php',
      requirements: t("PHP 8 ou supérieur · Extension cURL requise. À exécuter sur le même ordinateur que Codex API."),
      result: t("Le script affiche le texte de la réponse. Les erreurs HTTP ou de connexion sont envoyées vers la sortie d’erreur."),
      code: `<?php
$key = getenv('CODEX_LOCAL_KEY');
if (!$key) {
    fwrite(STDERR, "Set CODEX_LOCAL_KEY in your terminal.\\n");
    exit(1);
}

$request = curl_init(${JSON.stringify(endpoint)});
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
    fwrite(STDERR, curl_error($request) . "\\n");
    curl_close($request);
    exit(1);
}
$status = curl_getinfo($request, CURLINFO_HTTP_CODE);
curl_close($request);
$result = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
if ($status >= 400) {
    fwrite(STDERR, "Error $status : " . $result['error']['message'] . "\\n");
    exit(1);
}
echo $result['output_text'] . "\\n";`,
    },
  };
}
