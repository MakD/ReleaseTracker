import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../bot-memory.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS releases (
    repo_full_name TEXT PRIMARY KEY,
    last_release_id TEXT,
    last_etag TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log(`DB is ready! Saving to: ${dbPath}`);

export default db;