// Minimal Streamable HTTP client for OGraf Studio's MCP endpoint.
const endpoint = process.env.OGRAF_MCP_URL ?? 'http://127.0.0.1:4398/mcp';
let nextId = 1;

export async function call(name, args = {}) {
  // "No operation was admitted" means nothing ran, so a busy editor is always safe to retry.
  for (let attempt = 0; ; attempt++) {
    try {
      return await request(name, args);
    } catch (error) {
      if (attempt >= 30 || !/No operation was admitted/.test(error.message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function request(name, args) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(600_000),
  });
  const body = await response.text();
  const line = body
    .split('\n')
    .filter((entry) => entry.startsWith('data: '))
    .at(-1);
  const rpc = JSON.parse(line ? line.slice(6) : body);
  if (rpc.error) throw new Error(`${name}: ${JSON.stringify(rpc.error)}`);
  const text = rpc.result.content?.find((entry) => entry.type === 'text')?.text;
  let result = rpc.result.structuredContent;
  if (result === undefined) {
    try {
      result = JSON.parse(text);
    } catch {
      result = { text };
    }
  }
  if (rpc.result.isError) throw new Error(`${name}: ${text ?? JSON.stringify(result)}`);
  return result;
}
