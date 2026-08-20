import postgres from "postgres"; import { config } from "dotenv"; config({ path: ".env.local" });
import { writeFileSync } from "node:fs";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const r = await sql`SELECT q.id, qs.external_key, q.order_index FROM questions q
  JOIN question_sets qs ON qs.id=q.set_id WHERE qs.source='cambridge' ORDER BY qs.external_key, q.order_index`;
writeFileSync(process.argv[2], JSON.stringify(r.map(x=>`${x.external_key}#${x.order_index}=${x.id}`)));
console.log("captured", r.length);
await sql.end();
