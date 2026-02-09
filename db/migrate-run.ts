import { Database } from "bun:sqlite";

const db = new Database("db/talebrary.sqlite");
const sql = await Bun.file("db/migrate.sql").text();

// Strip comment-only lines, then split on semicolons
const cleaned = sql.replace(/^--.*$/gm, '');
const statements = cleaned.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

db.run("BEGIN TRANSACTION");
try {
    for (const stmt of statements) {
        db.run(stmt);
    }
    db.run("COMMIT");
} catch (e: any) {
    db.run("ROLLBACK");
    console.error(e.message);
    process.exit(1);
}

const total = db.query("SELECT COUNT(*) as c FROM talebrary_games").get() as any;
const links = db.query("SELECT COUNT(*) as c FROM talebrary_gamelinks").get() as any;
const search = db.query("SELECT COUNT(*) as c FROM talebrary_search").get() as any;
console.log(`Migration complete: ${total.c} games, ${links.c} links, ${search.c} search entries`);

db.close();
