/** Believable trainer-dashboard numbers for mock mode (CI, demos without a database): 9 teachers. */
import type { Dashboard } from "@/lib/trainer";

export const mockDashboard: Dashboard = {
  teachers: 9,
  lessons: 21,
  moves: [
    { move: "new_sum", uses: 44, teachers: 9 },
    { move: "tell_answer", uses: 31, teachers: 9 },
    { move: "ask_to_explain", uses: 17, teachers: 7 },
    { move: "concrete_materials", uses: 14, teachers: 6 },
    { move: "targeted_question", uses: 12, teachers: 6 },
    { move: "repeat_same_way", uses: 11, teachers: 5 },
    { move: "move_on_or_scold", uses: 8, teachers: 4 },
    { move: "invite_quiet_child", uses: 7, teachers: 5 },
    { move: "specific_praise", uses: 9, teachers: 6 },
    { move: "check_whole_class", uses: 10, teachers: 6 },
  ],
  scores: [
    { element: "checks_for_understanding", avg: 3.4, teachers: 9 },
    { element: "lesson_facilitation", avg: 3.1, teachers: 7 },
    { element: "feedback", avg: 2.6, teachers: 9 },
    { element: "supportive_environment", avg: 3.8, teachers: 8 },
    { element: "critical_thinking", avg: 2.2, teachers: 4 },
  ],
  lessonBuckets: [
    { lessons: "1", teachers: 3 },
    { lessons: "2", teachers: 3 },
    { lessons: "3", teachers: 2 },
    { lessons: "4+", teachers: 1 },
  ],
  returned: 6,
};
