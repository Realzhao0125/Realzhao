export const HABITS = [
  { id: "english", name: "英语学习", detail: "每天学一下，完成连胜", icon: "Aa" },
  { id: "exercise", name: "规律锻炼", detail: "每次锻炼 30 分钟以上", icon: "动" },
  { id: "sleep", name: "早睡", detail: "21:30 前放下手机躺下", icon: "眠" }
];

const DAY = 86400000;
export const toDate = (value) => new Date(`${value}T00:00:00Z`);
export const dateKey = (date) => date.toISOString().slice(0, 10);
export const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export const addDays = (value, days) => dateKey(new Date(toDate(value).getTime() + days * DAY));
export const addMonths = (value, months) => {
  const date = toDate(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return dateKey(date);
};

export function periodFor(firstDate, date, length) {
  const elapsed = Math.max(0, Math.floor((toDate(date) - toDate(firstDate)) / DAY));
  const index = Math.floor(elapsed / length);
  const start = addDays(firstDate, index * length);
  return { index, start, end: addDays(start, length - 1), length };
}

function calendarPeriod(firstDate, date, monthStep) {
  let index = 0;
  while (addMonths(firstDate, (index + 1) * monthStep) <= date) index++;
  const start = addMonths(firstDate, index * monthStep);
  const next = addMonths(firstDate, (index + 1) * monthStep);
  const length = Math.round((toDate(next) - toDate(start)) / DAY);
  return { index, start, end: addDays(next, -1), length };
}

function periodReward(entries, period, type, threshold, coinReward, streakReward) {
  const days = Array.from({ length: period.length }, (_, i) => addDays(period.start, i));
  const inPeriod = entries.filter((e) => e.date >= period.start && e.date <= period.end);
  const coins = inPeriod.reduce((sum, e) => sum + HABITS.filter((h) => e[h.id]).length, 0);
  const perfect = days.every((day) => {
    const entry = inPeriod.find((e) => e.date === day);
    return entry && HABITS.every((h) => entry[h.id]);
  });
  const rewards = [];
  if (coins >= threshold) rewards.push({ id: `${type}-${period.index}-coins`, type, label: `${type}金币达标`, amount: coinReward });
  for (const habit of HABITS) {
    if (days.every((day) => inPeriod.find((e) => e.date === day)?.[habit.id])) {
      rewards.push({ id: `${type}-${period.index}-${habit.id}`, type, label: `${habit.name}${type}连续完成`, amount: streakReward });
    }
  }
  const multiplier = perfect ? 2 : 1;
  return { ...period, type, coins, threshold, perfect, multiplier, rewards: rewards.map((r) => ({ ...r, multiplier, finalAmount: r.amount * multiplier })) };
}

export function calculate(entries, today = todayKey()) {
  if (!entries.length) return { coins: 0, totalReward: 0, exerciseThisWeek: 0, periods: [], rewards: [], streaks: Object.fromEntries(HABITS.map((h) => [h.id, 0])) };
  const firstDate = entries.map((e) => e.date).sort()[0];
  const specs = [
    { type: "周", threshold: 13, coinReward: 100, streakReward: 50, period: (index) => ({ index, start: addDays(firstDate, index * 7), end: addDays(firstDate, index * 7 + 6), length: 7 }), current: () => periodFor(firstDate, today, 7) },
    { type: "月", threshold: 52, coinReward: 500, streakReward: 500, period: (index) => { const start = addMonths(firstDate, index); const next = addMonths(firstDate, index + 1); return { index, start, end: addDays(next, -1), length: Math.round((toDate(next) - toDate(start)) / DAY) }; }, current: () => calendarPeriod(firstDate, today, 1) },
    { type: "季度", threshold: 156, coinReward: 1000, streakReward: 1000, period: (index) => { const start = addMonths(firstDate, index * 3); const next = addMonths(firstDate, (index + 1) * 3); return { index, start, end: addDays(next, -1), length: Math.round((toDate(next) - toDate(start)) / DAY) }; }, current: () => calendarPeriod(firstDate, today, 3) }
  ];
  const allPeriods = [];
  for (const spec of specs) {
    const current = spec.current();
    for (let index = 0; index <= current.index; index++) allPeriods.push(periodReward(entries, spec.period(index), spec.type, spec.threshold, spec.coinReward, spec.streakReward));
  }
  const streaks = {};
  for (const habit of HABITS) {
    let streak = 0;
    for (let cursor = today; ; cursor = addDays(cursor, -1)) {
      if (!entries.find((e) => e.date === cursor)?.[habit.id]) break;
      streak++;
    }
    streaks[habit.id] = streak;
  }
  const rewards = allPeriods.flatMap((p) => p.rewards);
  return {
    firstDate,
    coins: entries.reduce((sum, e) => sum + HABITS.filter((h) => e[h.id]).length, 0),
    exerciseThisWeek: entries.filter((e) => e.date >= periodFor(firstDate, today, 7).start && e.date <= today && e.exercise).length,
    totalReward: rewards.reduce((sum, r) => sum + r.finalAmount, 0),
    periods: specs.map(({ type }) => allPeriods.filter((p) => p.type === type).at(-1)),
    rewards: rewards.sort((a, b) => b.id.localeCompare(a.id)),
    streaks
  };
}
