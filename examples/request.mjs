const key = process.env.CODEX_LOCAL_KEY;
if (!key) {
  throw new Error("Set CODEX_LOCAL_KEY in your terminal.");
}

try {
  const response = await fetch("http://127.0.0.1:4317/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "codex",
      input: "Explain an API in one sentence.",
    }),
    signal: AbortSignal.timeout(130_000),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Error ${response.status} : ${result.error.message}`);
  }
  console.log(result.output_text);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
