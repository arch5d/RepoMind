import Database from "better-sqlite3";
import { join } from "path";

const dbPath = process.argv[2] || "/app/data/repomind.db";
const repoId = process.argv[3] || "bc2040f8-38d1-4ff0-ad83-37c5281a99c7";

const db = new Database(dbPath);

// Clear failed embed jobs
const del = db.prepare("DELETE FROM jobs WHERE repo_id = ? AND type = 'embed'").run(repoId);
console.log(`Deleted ${del.changes} embed jobs for ${repoId}`);

// Reset embed status
db.prepare("UPDATE repositories SET embed_status = 'pending' WHERE id = ?").run(repoId);

const repo = db.prepare("SELECT id, name, embed_status FROM repositories WHERE id = ?").get(repoId);
console.log("Repo status:", repo);

db.close();
