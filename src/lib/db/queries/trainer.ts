/**
 * Trainer-dashboard numbers over every teacher's lessons (teachers only — not trainers or admins).
 * Aggregates only; the privacy rule (≥ 5 teachers) is applied in src/lib/trainer.ts.
 */
import { sql } from "drizzle-orm";
import type { Move, TeachElement } from "@/lib/contracts";
import { db } from "@/lib/db/client";
import type { Dashboard } from "@/lib/trainer";

export async function dbDashboard(): Promise<Dashboard> {
  const [moves, scores, perTeacher] = await Promise.all([
    db.execute<{ move: Move; uses: number; teachers: number }>(sql`
      select t.director->>'move' as move, count(*)::int as uses, count(distinct s.user_id)::int as teachers
      from turns t join sessions s on s.id = t.session_id join users u on u.id = s.user_id
      where u.role = 'teacher' and t.director is not null
      group by 1 order by 2 desc limit 20`),
    db.execute<{ element: TeachElement; avg: number; teachers: number }>(sql`
      select e->>'element' as element, avg((e->>'score')::numeric)::float as avg, count(distinct s.user_id)::int as teachers
      from coach_cards c join sessions s on s.id = c.session_id join users u on u.id = s.user_id,
           jsonb_array_elements(c.card->'teachScores') e
      where u.role = 'teacher'
      group by 1 limit 10`),
    db.execute<{ lessons: number }>(sql`
      select count(*)::int as lessons from sessions s join users u on u.id = s.user_id
      where u.role = 'teacher' group by s.user_id limit 10000`),
  ]);
  const counts = perTeacher.map((r) => r.lessons);
  const bucket = (lo: number, hi = Infinity) => counts.filter((n) => n >= lo && n <= hi).length;
  return {
    teachers: counts.length,
    lessons: counts.reduce((a, b) => a + b, 0),
    moves: [...moves],
    scores: [...scores],
    lessonBuckets: [
      { lessons: "1", teachers: bucket(1, 1) },
      { lessons: "2", teachers: bucket(2, 2) },
      { lessons: "3", teachers: bucket(3, 3) },
      { lessons: "4+", teachers: bucket(4) },
    ],
    returned: bucket(2),
  };
}
