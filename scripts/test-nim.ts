import { createNVIDIAProvider } from "../src/lib/ai/nim-provider";

async function run() {
  let failures: string[] = [];
  let pass = (name: string) => console.log(`  PASS  ${name}`);
  let fail = (name: string, err: unknown) => {
    console.log(`  FAIL  ${name}: ${err instanceof Error ? err.message : err}`);
    failures.push(name);
  };

  // 1. Provider instantiation
  console.log("\n[1] createNVIDIAProvider() returns AIProvider");
  let nim: ReturnType<typeof createNVIDIAProvider>;
  try {
    nim = createNVIDIAProvider();
    if (typeof nim.chat !== "function") throw new Error("chat is not a function");
    if (typeof nim.generateEmbedding !== "function") throw new Error("generateEmbedding is not a function");
    if (typeof nim.getProviderInfo !== "function") throw new Error("getProviderInfo is not a function");
    pass("valid AIProvider instance");
  } catch (e) {
    fail("instantiation", e);
    console.log("\nCannot proceed — provider not constructable.");
    process.exit(1);
  }

  // 5. Verify no fallback to Ollama
  console.log("\n[5] No fallback to Ollama triggered");
  const aiConfig = (await import("../src/config/index")).getConfig();
  if (aiConfig.ai.provider === "ollama") {
    fail("provider config", "AI_PROVIDER is 'ollama', not 'nvidia'");
  } else if (aiConfig.ai.provider !== "nvidia") {
    fail("provider config", `AI_PROVIDER is '${aiConfig.ai.provider}', expected 'nvidia'`);
  } else {
    pass(`AI_PROVIDER = ${aiConfig.ai.provider} (correct)`);
  }

  // 4. getProviderInfo()
  console.log("\n[4] getProviderInfo() metadata");
  try {
    const info = await nim!.getProviderInfo();
    if (info.provider !== "nvidia") fail("provider name", `got "${info.provider}", expected "nvidia"`);
    else pass(`provider = "${info.provider}"`);
    if (info.model !== aiConfig.nvidia.chatModel) fail("chat model", `got "${info.model}", expected "${aiConfig.nvidia.chatModel}"`);
    else pass(`chat model = "${info.model}"`);
    if (info.embeddingModel !== aiConfig.nvidia.embedModel) fail("embed model", `got "${info.embeddingModel}", expected "${aiConfig.nvidia.embedModel}"`);
    else pass(`embed model = "${info.embeddingModel}"`);
    if (info.status === "error") fail("status", `provider error: ${info.error}`);
    else pass(`status = ${info.status} (latency: ${info.latencyMs}ms)`);
  } catch (e) {
    fail("getProviderInfo() threw", e);
  }

  // 2. chat()
  console.log("\n[2] chat() with systemPrompt + userMessage");
  try {
    const reply = await nim!.chat({
      systemPrompt: "You are a helpful assistant. Answer concisely.",
      userMessage: "What is RepoMind?",
    });
    if (typeof reply !== "string" || reply.length < 5) throw new Error(`unexpected reply: "${reply}"`);
    pass(`reply (${reply.length} chars): "${reply.slice(0, 80)}..."`);
  } catch (e) {
    fail("chat()", e);
  }

  // 3. generateEmbedding()
  console.log("\n[3] generateEmbedding() returns numeric vector");
  try {
    const emb = await nim!.generateEmbedding("What is RepoMind?");
    if (!Array.isArray(emb)) throw new Error("not an array");
    if (emb.length === 0) throw new Error("empty array");
    if (typeof emb[0] !== "number") throw new Error(`element is ${typeof emb[0]}, expected number`);
    pass(`vector of ${emb.length} floats`);
  } catch (e) {
    fail("generateEmbedding()", e);
  }

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  if (failures.length === 0) {
    console.log("RESULT: All checks passed. NVIDIA provider is fully functional.");
  } else {
    console.log(`RESULT: ${failures.length} check(s) FAILED:`);
    for (const f of failures) console.log(`  - ${f}`);
  }
}

run();