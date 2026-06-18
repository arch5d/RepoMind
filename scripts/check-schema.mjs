import Database from "better-sqlite3";
const db = new Database("/app/data/repomind.db");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables.map(t => t.name));
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  console.log(`\n${t.name}:`, cols.map(c => `${c.name} (${c.type})`).join(", "));
}
db.close();
