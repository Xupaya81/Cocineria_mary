import type { Role, Table } from "./schema";
export function canManage(
  role: Role,
  area: "content" | "operations" | "reports" | "users",
) {
  return (
    role === "superadmin" ||
    (role === "propietario" && area !== "users") ||
    (role === "personal" && area === "operations")
  );
}
export function overlaps(
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number,
) {
  return start < otherEnd && end > otherStart;
}
export function availableTables(
  tables: Table[],
  reservations: {
    table_id: string;
    start_at: number;
    end_at: number;
    status: string;
  }[],
  people: number,
  start: number,
  end: number,
) {
  return tables
    .filter(
      (t) =>
        t.capacity >= people &&
        t.status !== "fuera de servicio" &&
        !reservations.some(
          (r) =>
            r.table_id === t.id &&
            ["pendiente", "confirmada"].includes(r.status) &&
            overlaps(start, end, r.start_at, r.end_at),
        ),
    )
    .sort((a, b) => a.capacity - b.capacity);
}
export function localDateTime(date: string, time: string): number {
  const wanted = `${date}T${time}`;
  const naive = Date.parse(`${wanted}:00Z`);
  const format = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  // Chile continental: try both legal UTC offsets; reject nonexistent DST wall times.
  for (const offset of [3, 4]) {
    const t = naive + offset * 3600000;
    if (format.format(t).replace(" ", "T") === wanted) return t;
  }
  throw new Error(
    "La hora seleccionada no existe en la zona horaria del restaurante.",
  );
}
export function periodStart(
  period: "day" | "week" | "month",
  now = new Date(),
) {
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const d = new Date(`${date}T12:00:00Z`);
  if (period === "week")
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (period === "month") d.setUTCDate(1);
  const day = d.toISOString().slice(0, 10);
  try {
    return localDateTime(day, "00:00");
  } catch {
    return localDateTime(day, "01:00");
  }
}
export function promotionActive(
  p: { active: boolean; start: string; end: string } | null,
  now = new Date(),
) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return !!p && p.active && p.start <= today && p.end >= today;
}

export function reservationTransitions(
  status: string,
  startAt: number,
  now = Date.now(),
): string[] {
  if (status === "pendiente") return ["confirmada", "cancelada"];
  if (status === "confirmada")
    return ["cancelada", ...(startAt <= now ? ["finalizada"] : [])];
  return [];
}
