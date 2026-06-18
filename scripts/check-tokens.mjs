import Database from "better-sqlite3";
const db = new Database("/app/data/repomind.db");
const MAX_CHARS = 800;
const rows = db.prepare("SELECT id, name, file_path, symbol_type, source_code, LENGTH(source_code) as clen FROM parsed_symbols ORDER BY clen DESC").all();
let worst = [];
for (const s of rows) {
  let code = s.source_code || "";
  if (code.length > MAX_CHARS) code = code.slice(0, MAX_CHARS) + "\n// ... truncated";
  const content = `Symbol: ${s.name} (${s.symbol_type})\nFile: ${s.file_path}\nSource:\n${code}`;
  const estimatedTokens = Math.ceil(content.length / 1.2);
  if (estimatedTokens > 512) {
    worst.push({ id: s.id, name: s.name.substring(0,60), flen: s.file_path.length, nlen: s.name.length, contentLen: content.length, estTokens: estimatedTokens, clen: s.clen });
  }
}
worst.sort((a,b) => b.estTokens - a.estTokens);
console.log("Symbols exceeding 512 token estimate:", worst.length);
worst.slice(0, 20).forEach(w => console.log(JSON.stringify(w)));
db.close();
