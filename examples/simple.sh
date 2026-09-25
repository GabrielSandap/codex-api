#!/bin/sh
key="PASTE_YOUR_LOCAL_KEY_HERE" # Keep your key private.

# Change the question in "input" below. The response is printed as JSON.
curl --silent --show-error --fail-with-body --max-time 130 \
  "http://127.0.0.1:4317/v1/responses" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer $key" \
  --data '{"model":"codex","input":"Explain what an API is in one sentence."}'
