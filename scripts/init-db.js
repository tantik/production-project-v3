import { initDatabase, getDatabaseKind } from '../services/db.js';

await initDatabase();
console.log(JSON.stringify({ ok: true, database: await getDatabaseKind() }, null, 2));
