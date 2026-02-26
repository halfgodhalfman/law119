"use client";

/**
 * RadarChart — Pure SVG + Tailwind implementation, no external dependencies.
 *
 * Displays up to 5 dimensions on a regular polygon grid.
 * Values are 0–100; each dimension is mapped to a vertex of the polygon.
 * Animation is achieved via CSS transitions (no framer-motion required).
 */

import { useEffect, useState } from "react";

export type RadarDimension = {
  key: string;
  /** Chinese label */
  label: string;
  /** English label */
  en: string;
};

export const ATTORNEY_RADAR_DIMENSIONS: RadarDimension[] = [
  { key: "credentials",    label: "执照资质", en: "Credentials" },
  { key: "responsiveness", label: "响应速度", en: "Response"    },
  { key: "clientRating",   label: "客户评分", en: "Rating"      },
  { key: "compliance",     label: "合规表现", en: "Compliance"  },
  { key: "experience",     label: "从业经验", en: "Experience"  },
];

type Props = {
  /** Map from dimension key to 0–100 value */
  scores: Record<string, number>;
  dimensions?: RadarDimension[];
  /** SVG canvas size in px (default 200) */
  size?: number;
  /** Whether to animate from 0 → real value on mount (default true) */
  animated?: boolean;
};

/** Convert polar (angle in radians, radius) to cartesian {x, y} */
function polar(angle: number, radius: number, cx: number, cy: number) {
  return {
    x: cx + radius * Math.sin(angle),
    y: cy - radius * Math.cos(angle),
  };
}

/** Build an SVG polygon points string from an array of {x, y} */
function toPoints(pts: { x: number; y: number }[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

export function RadarChart({
  scores,
  dimensions = ATTORNEY_RADAR_DIMENSIONS,
  size = 200,
  animated = true,
}: Props) {
  const n = dimensions.length;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38; // max radius from center to vertex
  const labelR = size * 0.48; // radius for labels (outside grid)

  // On mount, animate from 0 → real values
  const [displayScores, setDisplayScores] = useState<Record<string, number>>(
    animated ? Object.fromEntries(dimensions.map((d) => [d.key, 0])) : scores,
  );
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    if (!animated) return;
    const timer = setTimeout(() => {
      setDisplayScores(scores);
    }, 80); // slight delay so the transition is visible on mount
    return () => clearTimeout(timer);
  }, [animated, scores]);

  // Grid rings at 25%, 50%, 75%, 100%
  const gridRings = [0.25, 0.5, 0.75, 1];

  const angleStep = (2 * Math.PI) / n;

  // Build polygon points for a given value map (0–100)
  function buildPolygonPoints(vals: Record<string, number>) {
    return dimensions.map((dim, i) => {
      const angle = i * angleStep;
      const v = Math.min(Math.max(vals[dim.key] ?? 0, 0), 100) / 100;
      return polar(angle, v * maxR, cx, cy);
    });
  }

  const dataPoints = buildPolygonPoints(displayScores);

  return (
    <div className="relative inline-block select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="律师技能雷达图 Attorney skill radar">
        {/* Background grid rings */}
        {gridRings.map((pct) => {
          const ringPts = dimensions.map((_, i) => polar(i * angleStep, pct * maxR, cx, cy));
          return (
            <polygon
              key={pct}
              points={toPoints(ringPts)}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={pct < 1 ? "3 3" : undefined}
            />
          );
        })}

        {/* Spoke lines from center to each vertex */}
        {dimensions.map((_, i) => {
          const end = polar(i * angleStep, maxR, cx, cy);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon — CSS transition on all presentation attrs */}
        <polygon
          points={toPoints(dataPoints)}
          fill="rgba(245, 158, 11, 0.18)"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{ transition: animated ? "all 0.7s cubic-bezier(0.4,0,0.2,1)" : undefined }}
        />

        {/* Data vertex dots */}
        {dataPoints.map((pt, i) => {
          const dim = dimensions[i];
          const isHovered = hoveredKey === dim.key;
          return (
            <circle
              key={dim.key}
              cx={pt.x}
              cy={pt.y}
              r={isHovered ? 5 : 3.5}
              fill={isHovered ? "#d97706" : "#f59e0b"}
              stroke="white"
              strokeWidth="1.5"
              style={{ transition: "r 0.2s, fill 0.2s" }}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredKey(dim.key)}
              onMouseLeave={() => setHoveredKey(null)}
            />
          );
        })}

        {/* Dimension labels */}
        {dimensions.map((dim, i) => {
          const angle = i * angleStep;
          const { x, y } = polar(angle, labelR, cx, cy);
          const isHovered = hoveredKey === dim.key;
          // Anchor based on position relative to center
          const textAnchor = x < cx - 4 ? "end" : x > cx + 4 ? "start" : "middle";
          const dominantBaseline = y < cy - 4 ? "auto" : y > cy + 4 ? "hanging" : "middle";
          const score = Math.round(Math.min(Math.max(scores[dim.key] ?? 0, 0), 100));

          return (
            <g key={dim.key}>
              <text
                x={x}
                y={y}
                textAnchor={textAnchor}
                dominantBaseline={dominantBaseline}
                fontSize={size < 180 ? 9 : 10}
                fill={isHovered ? "#92400e" : "#64748b"}
                fontWeight={isHovered ? "700" : "500"}
                style={{ transition: "fill 0.2s, font-weight 0.2s" }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredKey(dim.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                {dim.label}
              </text>
              {/* Show score tooltip on hover */}
              {isHovered && (
                <text
                  x={x}
                  y={y + (dominantBaseline === "hanging" ? 13 : dominantBaseline === "auto" ? -13 : 13)}
                  textAnchor={textAnchor}
                  fontSize={9}
                  fill="#d97706"
                  fontWeight="600"
                >
                  {score}/100
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
