// node --test worker/nebius.test.mjs : Nemotron routing on Nebius Token Factory (network mocked).
import test from "node:test";
import assert from "node:assert/strict";
import { chat } from "./assistant-extras.js";
import { providerChain, cleanText } from "./llm-provider.js";
import { sanitizeActions, fiatOf } from "./assistant-extras.js";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

test("nebius first, openai fallback", () => {
  const c = providerChain({ LLM_PROVIDER: "nebius", NEBIUS_API_KEY: "n", OPENAI_API_KEY: "o" }, ["gpt-4.1-mini"]);
  assert.equal(c[0].provider, "nebius");
  assert.equal(c[0].model, "nvidia/nemotron-3-super-120b-a12b");
  assert.equal(c[1].provider, "openai");
  assert.equal(providerChain({ OPENAI_API_KEY: "o" }, ["m"])[0].provider, "openai");
});

test("chat calls Token Factory and strips think tags", async () => {
  const orig = globalThis.fetch;
  let url = "";
  globalThis.fetch = async (u) => { url = String(u); return json({ choices: [{ message: { content: "<think>x</think>```json\n{\"actions\":[]}\n```" } }] }); };
  try {
    const r = await chat({ LLM_PROVIDER: "nebius", NEBIUS_API_KEY: "n" }, { messages: [] }, 1000);
    assert.equal(url, "https://api.tokenfactory.nebius.com/v1/chat/completions");
    assert.equal(r.text, '{"actions":[]}');
    assert.equal(r.provider, "nebius");
  } finally { globalThis.fetch = orig; }
});

test("cleanText keeps plain text", () => assert.equal(cleanText("hi"), "hi"));

