curl --silent --show-error --max-time 130 \
  "http://127.0.0.1:4317/v1/responses" \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${CODEX_LOCAL_KEY:?Set CODEX_LOCAL_KEY}" \
  --data '{"model":"codex","input":"Explain an API in one sentence."}' \
  --write-out '\nHTTP status: %{http_code}\n'
