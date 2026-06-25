import Database from "better-sqlite3";
const db = new Database("/app/data/repomind.db");
db.prepare("UPDATE repositories SET embed_status = 'pending' WHERE embed_status = 'embedding'").run();
db.close();
