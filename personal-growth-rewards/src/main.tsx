import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type HabitId = "english" | "exercise" | "sleep";
type Entry = { date: string; english: boolean; exercise: boolean; sleep: boolean; backfilled: boolean };
type Period = { type: string; start: string; end: string; coins: number; threshold: number; perfect: boolean; multiplier: number };
type Summary = { coins: number; totalReward: number; exerciseThisWeek: number; streaks: Record<HabitId, number>; periods: Period[]; rewards: { id: string; label: string; amount: number; multiplier: number; finalAmount: number }[] };
const habits: { id: HabitId; name: string; detail: string; glyph: string; color: string }[] = [
  { id: "english", name: "英语学习", detail: "今天也向更广阔的世界靠近", glyph: "Aa", color: "peach" },
  { id: "exercise", name: "规律锻炼", detail: "让身体感受到你的认真", glyph: "动", color: "green" },
  { id: "sleep", name: "早睡", detail: "今晚把温柔留给明天的自己", glyph: "眠", color: "blue" }
];
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [message, setMessage] = useState("");
  const selected = useMemo(() => entries.find((e) => e.date === selectedDate) || { date: selectedDate, english: false, exercise: false, sleep: false, backfilled: selectedDate < today }, [entries, selectedDate]);
  const completed = habits.filter((h) => selected[h.id]).length;

  const load = () => api("/api/dashboard").then((d) => { setEntries(d.entries); setSummary(d.summary); }).catch((e) => setMessage(e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js"); }, []);

  async function toggle(id: HabitId) {
    const next = { ...selected, [id]: !selected[id] };
    try {
      const data = await api("/api/checkins", { method: "PUT", body: JSON.stringify(next) });
      setEntries(data.entries); setSummary(data.summary);
      setMessage(next[id] ? "做得很好，这枚金币属于你。" : "记录已更新，诚实面对自己也很珍贵。");
      setTimeout(() => setMessage(""), 2600);
    } catch (error) { setMessage((error as Error).message); }
  }

  return <main className="shell">
    <header><div><p className="eyebrow">今天也在慢慢变好</p><h1>你好，成长中的自己。</h1></div><div className="coin"><span>✦</span><div><b>{summary?.coins || 0}</b><small>累计金币</small></div></div></header>
    <section className="hero"><div><p>累计获得奖励</p><h2>¥ {summary?.totalReward || 0}</h2><span>{completed === 3 ? "今天三项全部完成，漂亮收官。" : `今天已完成 ${completed}/3，继续积攒属于你的光。`}</span></div><div className="orb"><b>{completed}</b><small>/ 3 今日</small></div></section>
    <section className="date-row"><button onClick={() => setSelectedDate(today)} className={selectedDate === today ? "active" : ""}>回到今天</button><input type="date" max={today} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />{selectedDate < today && <span className="backfill">补录日期</span>}</section>
    <section className="habit-grid">{habits.map((habit) => <button key={habit.id} className={`habit-card ${habit.color} ${selected[habit.id] ? "done" : ""}`} onClick={() => toggle(habit.id)}><span className="habit-icon">{habit.glyph}</span><div><h3>{habit.name}</h3><p>{habit.detail}</p><small>{habit.id === "exercise" ? `本周 ${summary?.exerciseThisWeek || 0}/3 次 · ` : ""}连续 {summary?.streaks[habit.id] || 0} 天</small></div><i>{selected[habit.id] ? "✓" : "+1"}</i></button>)}</section>
    <section><div className="section-title"><div><p className="eyebrow">YOUR JOURNEY</p><h2>奖励进度</h2></div><span>从第一次打卡开始计算</span></div><div className="period-grid">{summary?.periods.map((period) => { const pct = Math.min(100, Math.round(period.coins / period.threshold * 100)); return <article className="period-card" key={period.type}><div><b>{period.type}进度</b><span>{period.start.slice(5)} 至 {period.end.slice(5)}</span></div><strong>{period.coins}<small> / {period.threshold} 金币</small></strong><div className="progress"><i style={{ width: `${pct}%` }} /></div><footer><span>{pct}% 完成</span><span>{period.perfect ? "全勤奖励 ×2" : "三项每日全勤可翻倍"}</span></footer></article> })}</div></section>
    <section><div className="section-title"><div><p className="eyebrow">REWARD HISTORY</p><h2>已经兑现的努力</h2></div></div><div className="reward-list">{summary?.rewards.length ? summary.rewards.slice(0, 8).map((r) => <div className="reward" key={r.id}><span>✦</span><div><b>{r.label}</b><small>{r.multiplier === 2 ? "全勤翻倍奖励" : "奖励已自动计入"}</small></div><strong>+ ¥{r.finalAmount}</strong></div>) : <div className="empty">第一份奖励正在路上。今天的小行动，会成为未来的惊喜。</div>}</div></section>
    <section><div className="section-title"><div><p className="eyebrow">RECENT CHECK-INS</p><h2>近期成长记录</h2></div></div><div className="history-list">{entries.slice(0, 10).map((entry) => <button key={entry.date} onClick={() => setSelectedDate(entry.date)}><div><b>{entry.date}</b>{entry.backfilled && <span>补录</span>}</div><small>{habits.filter((h) => entry[h.id]).map((h) => h.name).join(" · ")}</small><strong>{habits.filter((h) => entry[h.id]).length}/3</strong></button>)}{!entries.length && <div className="empty">完成第一次打卡后，成长记录会出现在这里。</div>}</div></section>
    {message && <div className="toast">{message}</div>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
