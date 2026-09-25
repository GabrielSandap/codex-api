const key = "PASTE_YOUR_LOCAL_KEY_HERE"; // Keep your key private.
const question = "Explain what an API is in one sentence.";

const response = await fetch("http://127.0.0.1:4317/v1/responses", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model: "codex", input: question }),
  signal: AbortSignal.timeout(130_000),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error.message);
console.log(result.output_text);
