/**
 * Deletes the local SQLite database and re-seeds a fresh year of simulated history.
 * Usage: npm run db:reset
 */
import { resetDatabase, simDate } from "../src/lib/db";

const db = resetDatabase();
console.log(`MyLiquid database reset. Market date: ${simDate(db)} (${db.name})`);
db.close();
