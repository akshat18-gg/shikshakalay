/**
 * A child's avatar: a soft circle in the child's colour with the first letter of their name (works for Devanagari
 * too: "र" for रवि). `quiet` greys it out for a withdrawn child. Decorative — the name is always written next to it.
 */
import type { ChildId } from "@/lib/contracts";

const FILL: Record<ChildId, string> = {
  ravi: "#fde8dc",
  arjun: "#dde7fb",
  meena: "#eedcfb",
  sana: "#fbdde9",
};
const INK: Record<ChildId, string> = {
  ravi: "#b03a0a",
  arjun: "#1d4ed8",
  meena: "#7e22ce",
  sana: "#ad1457",
};

export function ChildAvatar({
  id,
  name,
  quiet = false,
  size = 32,
}: {
  id: ChildId;
  name: string;
  quiet?: boolean;
  size?: number;
}) {
  const letter = Array.from(name)[0] ?? "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0 transition-opacity duration-300"
      style={{ opacity: quiet ? 0.45 : 1 }}
    >
      <circle cx="16" cy="16" r="16" fill={quiet ? "#e8e8ed" : FILL[id]} />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontSize="15"
        fontWeight="600"
        fill={quiet ? "#6e6e73" : INK[id]}
        fontFamily="inherit"
      >
        {letter}
      </text>
    </svg>
  );
}
