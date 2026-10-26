import type { ChildId } from "@/lib/contracts";
import type { MessageKey } from "@/lib/i18n";

/** Each child's colour (tokens in globals.css) and name key — written out in full so Tailwind sees the classes. */
export const CHILD_STYLE: Record<ChildId, { text: string; border: string; name: MessageKey }> = {
  ravi: { text: "text-child-ravi", border: "border-child-ravi", name: "child.ravi" },
  arjun: { text: "text-child-arjun", border: "border-child-arjun", name: "child.arjun" },
  meena: { text: "text-child-meena", border: "border-child-meena", name: "child.meena" },
  sana: { text: "text-child-sana", border: "border-child-sana", name: "child.sana" },
};
