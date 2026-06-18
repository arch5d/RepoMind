import Database from "better-sqlite3";
const db = new Database("/app/data/repomind.db");
const res = db.prepare("UPDATE repositories SET embed_status = 'pending' WHERE embed_status IN ('failed', 'embedding')").run();
console.log("Reset", res.changes, "repos");
db.close();
