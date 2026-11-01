/**
 * Illustration: bundles of ten and loose sticks — the hands-on material the whole lesson is about.
 * Drawn here (no stock photo) so it matches the palette; `tens` and `ones` default to 43 = 4 bundles + 3 sticks.
 * Decorative: hidden from screen readers unless a `title` is given.
 */
export function BundlesSticks({
  tens = 4,
  ones = 3,
  className = "",
  title,
}: {
  tens?: number;
  ones?: number;
  className?: string;
  title?: string;
}) {
  const bundleW = 34;
  const gap = 12;
  const width = tens * (bundleW + gap) + ones * 12 + 24;
  return (
    <svg
      viewBox={`0 0 ${width} 120`}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
    >
      {title && <title>{title}</title>}
      {/* bundles: ten sticks held by a band */}
      {Array.from({ length: tens }, (_, b) => {
        const x = 12 + b * (bundleW + gap);
        return (
          <g key={b}>
            {Array.from({ length: 10 }, (_, i) => (
              <rect key={i} x={x + i * 3} y={14 + (i % 2) * 2} width="2.4" height="90" rx="1.2" fill="#c98a4b" />
            ))}
            <rect x={x - 3} y="48" width={bundleW + 2} height="14" rx="7" fill="#0071e3" />
            <rect x={x - 3} y="48" width={bundleW + 2} height="7" rx="7" fill="#ffffff" opacity="0.18" />
          </g>
        );
      })}
      {/* loose sticks */}
      {Array.from({ length: ones }, (_, i) => (
        <rect
          key={i}
          x={12 + tens * (bundleW + gap) + i * 12}
          y={22 + (i % 3) * 3}
          width="3.5"
          height="86"
          rx="1.75"
          fill="#c98a4b"
          transform={`rotate(${(i % 2 ? -1 : 1) * 4} ${12 + tens * (bundleW + gap) + i * 12} 110)`}
        />
      ))}
      {/* the table edge */}
      <rect x="0" y="110" width={width} height="3" rx="1.5" fill="#d2d2d7" />
    </svg>
  );
}
