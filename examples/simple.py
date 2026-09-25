"""Personal example: copy outside the repository before adding your private key."""
import json
import urllib.error
import urllib.request

key = "PASTE_YOUR_LOCAL_KEY_HERE"
question = "Explain what an API is in one sentence."

if key == "PASTE_YOUR_LOCAL_KEY_HERE":
    raise SystemExit("Open your personal copy of this file and replace the key placeholder first.")

request = urllib.request.Request(
    "http://127.0.0.1:4317/v1/responses",
    data=json.dumps({"model": "codex", "input": question}).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
)
try:
    with urllib.request.urlopen(request, timeout=130) as response:
        print(json.load(response)["output_text"])
except urllib.error.HTTPError as error:
    details = json.load(error).get("error", {})
    raise SystemExit(f"HTTP {error.code}: {details.get('message', 'Request failed')}")
except (urllib.error.URLError, TimeoutError):
    raise SystemExit("Cannot reach Codex API. Check that the local service is running and online.")
