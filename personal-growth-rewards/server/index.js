import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { calculate, todayKey } from "../shared/rewards.js";

const ROOT = resolve(import.meta.dirname, "..");
const DATA = join(ROOT, "data");
const BACKUPS = join(DATA, "backups");
mkdirSync(BACKUPS, { recursive: true });
const db = new DatabaseSync(join(DATA, "growth.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS checkins (
    date TEXT PRIMARY KEY, english INTEGER NOT NULL DEFAULT 0,
    exercise INTEGER NOT NULL DEFAULT 0, sleep INTEGER NOT NULL DEFAULT 0,
    backfilled INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
  );
`);

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
const body = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
};
const entries = () => db.prepare("SELECT date,english,exercise,sleep,backfilled,updated_at AS updatedAt FROM checkins ORDER BY date DESC").all()
  .map((e) => ({ ...e, english: !!e.english, exercise: !!e.exercise, sleep: !!e.sleep, backfilled: !!e.backfilled }));
const backup = () => {
  const file = join(BACKUPS, `growth-${todayKey()}.db`);
  if (!existsSync(file)) copyFileSync(join(DATA, "growth.db"), file);
  for (const old of readdirSync(BACKUPS).sort().slice(0, -14)) unlinkSync(join(BACKUPS, old));
};
backup();
setInterval(backup, 6 * 60 * 60 * 1000).unref();

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/")) {
      if (req.url === "/api/dashboard" && req.method === "GET") {
        const all = entries();
        return json(res, 200, { entries: all, summary: calculate(all) });
      }
      if (req.url === "/api/checkins" && req.method === "PUT") {
        const data = await body(req);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return json(res, 400, { error: "日期格式无效" });
        const today = todayKey();
        if (data.date > today) return json(res, 400, { error: "不能记录未来日期" });
        if (![data.english, data.exercise, data.sleep].some(Boolean)) {
          db.prepare("DELETE FROM checkins WHERE date=?").run(data.date);
        } else {
          db.prepare(`INSERT INTO checkins(date,english,exercise,sleep,backfilled,updated_at) VALUES(?,?,?,?,?,?)
            ON CONFLICT(date) DO UPDATE SET english=excluded.english,exercise=excluded.exercise,sleep=excluded.sleep,
            backfilled=excluded.backfilled,updated_at=excluded.updated_at`)
            .run(data.date, +!!data.english, +!!data.exercise, +!!data.sleep, +(data.date < today), new Date().toISOString());
        }
        const all = entries();
        return json(res, 200, { entries: all, summary: calculate(all) });
      }
      return json(res, 404, { error: "接口不存在" });
    }
    const dist = join(ROOT, "dist");
    let path = join(dist, req.url === "/" ? "index.html" : req.url.split("?")[0]);
    if (!path.startsWith(dist) || !existsSync(path)) path = join(dist, "index.html");
    if (!existsSync(path)) return json(res, 503, { error: "请先运行 npm run build" });
    res.writeHead(200, { "Content-Type": mime[extname(path)] || "application/octet-stream" });
    res.end(readFileSync(path));
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "服务器处理失败" });
  }
});
server.listen(Number(process.env.PORT || 4174), "127.0.0.1", () => console.log("成长计划运行于 http://127.0.0.1:4174"));
