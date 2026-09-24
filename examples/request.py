import json
import os
import sys
import urllib.request
import urllib.error

key = os.environ.get("CODEX_LOCAL_KEY")
if not key:
    sys.exit("Set CODEX_LOCAL_KEY in your terminal.")

request = urllib.request.Request(
    "http://127.0.0.1:4317/v1/responses",
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
    sys.exit(f"Local service unreachable: {error.reason}")
