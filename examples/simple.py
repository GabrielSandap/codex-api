import json
import urllib.request

key = "PASTE_YOUR_LOCAL_KEY_HERE"  # Keep your key private.
question = "Explain what an API is in one sentence."

request = urllib.request.Request(
    "http://127.0.0.1:4317/v1/responses",
    data=json.dumps({"model": "codex", "input": question}).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
)
with urllib.request.urlopen(request, timeout=130) as response:
    print(json.load(response)["output_text"])
