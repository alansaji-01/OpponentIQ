export interface ShotPoint {
  id: number;
  player_name: string;
  team_code: string;
  x: number;
  y: number;
  outcome: string;
  minute: number;
  distance_m: number;
  xg: number;
  under_pressure: boolean;
}

export interface NetworkNode {
  id: number;
  name: string;
  number: number;
  team_code: string;
  team_color: string;
  avg_x: number;
  avg_y: number;
  touch_count: number;
}

export interface NetworkLink {
  source: number;
  target: number;
  pass_count: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface AttackChannels {
  total_attacks: number;
  left: { count: number; pct: number };
  center: { count: number; pct: number };
  right: { count: number; pct: number };
}

interface TacticalPitchProps {
  mode: 'HEATMAP' | 'NETWORK' | 'SHOTS' | 'CHANNELS';
  densityGrid?: number[][];
  maxDensity?: number;
  shots?: ShotPoint[];
  nodes?: NetworkNode[];
  links?: NetworkLink[];
  channels?: AttackChannels;
  selectedPlayerId?: number | null;
  onSelectPlayer?: (id: number) => void;
}

export default function TacticalPitch({
  mode,
  densityGrid,
  maxDensity = 1,
  shots = [],
  nodes = [],
  links = [],
  channels,
  selectedPlayerId,
  onSelectPlayer,
}: TacticalPitchProps) {
  // Standard FIFA pitch coordinates scaled into 1050 x 680 SVG viewBox (ratio 1.54)
  const width = 1050;
  const height = 680;

  // Converts 0-100 pitch coords to SVG absolute pixels
  const toSvgX = (x: number) => (x / 100.0) * (width - 40) + 20;
  const toSvgY = (y: number) => (y / 100.0) * (height - 40) + 20;

  return (
    <div className="relative w-full aspect-[105/68] bg-[#06110B] border border-border overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon Field Glow */}
          <filter id="field-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── 1. Pitch Markings (Tactical Wireframe) ────────────────────── */}
        {/* Outer boundary */}
        <rect
          x="20"
          y="20"
          width={width - 40}
          height={height - 40}
          fill="none"
          stroke="#193826"
          strokeWidth="3"
        />

        {/* Halfway Line */}
        <line
          x1={width / 2}
          y1="20"
          x2={width / 2}
          y2={height - 20}
          stroke="#193826"
          strokeWidth="2.5"
        />

        {/* Center Circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r="91.5"
          fill="none"
          stroke="#193826"
          strokeWidth="2.5"
        />
        <circle cx={width / 2} cy={height / 2} r="3.5" fill="#193826" />

        {/* Penalty Areas */}
        {/* Left Box (Home) */}
        <rect
          x="20"
          y={height / 2 - 165}
          width="165"
          height="330"
          fill="none"
          stroke="#193826"
          strokeWidth="2.5"
        />
        <rect
          x="20"
          y={height / 2 - 73.2}
          width="55"
          height="146.4"
          fill="none"
          stroke="#193826"
          strokeWidth="2"
        />
        {/* Left Goal */}
        <rect x="6" y={height / 2 - 36.6} width="14" height="73.2" fill="#0E2317" stroke="#193826" strokeWidth="2" />

        {/* Right Box (Away) */}
        <rect
          x={width - 185}
          y={height / 2 - 165}
          width="165"
          height="330"
          fill="none"
          stroke="#193826"
          strokeWidth="2.5"
        />
        <rect
          x={width - 75}
          y={height / 2 - 73.2}
          width="55"
          height="146.4"
          fill="none"
          stroke="#193826"
          strokeWidth="2"
        />
        {/* Right Goal */}
        <rect x={width - 20} y={height / 2 - 36.6} width="14" height="73.2" fill="#0E2317" stroke="#193826" strokeWidth="2" />

        {/* ── 2. MODE: SPATIAL DENSITY HEATMAP ──────────────────────────── */}
        {mode === 'HEATMAP' && densityGrid && (
          <g opacity="0.85">
            {densityGrid.map((row, rIdx) => {
              const cellHeight = (height - 40) / densityGrid.length;
              return row.map((val, cIdx) => {
                const cellWidth = (width - 40) / row.length;
                const norm = Math.min(1.0, val / Math.max(1, maxDensity * 0.65));
                if (norm < 0.05) return null;

                // Color gradient: Dark emerald -> Neon Green -> Orange -> Crimson
                let fill = 'rgba(0, 255, 135, 0.2)';
                if (norm > 0.75) {
                  fill = 'rgba(255, 51, 75, 0.75)';
                } else if (norm > 0.45) {
                  fill = 'rgba(255, 184, 0, 0.6)';
                } else if (norm > 0.2) {
                  fill = 'rgba(0, 255, 135, 0.45)';
                }

                return (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={20 + cIdx * cellWidth}
                    y={20 + rIdx * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={fill}
                  />
                );
              });
            })}
          </g>
        )}

        {/* ── 3. MODE: ATTACK CHANNELS OVERLAY ──────────────────────────── */}
        {mode === 'CHANNELS' && channels && (
          <g>
            {/* Dividing longitudinal third lines */}
            <line x1="20" y1={(height - 40) * 0.333 + 20} x2={width - 20} y2={(height - 40) * 0.333 + 20} stroke="#00FF87" strokeDasharray="6 6" strokeWidth="1.5" opacity="0.4" />
            <line x1="20" y1={(height - 40) * 0.667 + 20} x2={width - 20} y2={(height - 40) * 0.667 + 20} stroke="#00FF87" strokeDasharray="6 6" strokeWidth="1.5" opacity="0.4" />

            {/* Left Wing Attack Zone (Top longitudinal strip) */}
            <rect x="20" y="20" width={width - 40} height={(height - 40) * 0.333} fill="rgba(0, 180, 216, 0.08)" />
            <text x={width / 2} y={(height - 40) * 0.17 + 20} fill="#00B4D8" fontSize="24" fontWeight="900" fontFamily="monospace" textAnchor="middle">
              LEFT CHANNEL: {channels.left.pct}% ({channels.left.count} ACTIONS)
            </text>

            {/* Central Channel (Middle longitudinal strip) */}
            <rect x="20" y={(height - 40) * 0.333 + 20} width={width - 40} height={(height - 40) * 0.334} fill="rgba(0, 255, 135, 0.12)" />
            <text x={width / 2} y={height / 2 + 8} fill="#00FF87" fontSize="26" fontWeight="900" fontFamily="monospace" textAnchor="middle">
              CENTRAL CORRIDOR: {channels.center.pct}% ({channels.center.count} ACTIONS)
            </text>

            {/* Right Wing Attack Zone (Bottom longitudinal strip) */}
            <rect x="20" y={(height - 40) * 0.667 + 20} width={width - 40} height={(height - 40) * 0.333} fill="rgba(255, 184, 0, 0.08)" />
            <text x={width / 2} y={(height - 40) * 0.83 + 20} fill="#FFB800" fontSize="24" fontWeight="900" fontFamily="monospace" textAnchor="middle">
              RIGHT CHANNEL: {channels.right.pct}% ({channels.right.count} ACTIONS)
            </text>
          </g>
        )}

        {/* ── 4. MODE: PASSING NETWORK ──────────────────────────────────── */}
        {mode === 'NETWORK' && (
          <g>
            {/* Network Links */}
            {links.map((link, idx) => {
              const x1 = toSvgX(link.x1);
              const y1 = toSvgY(link.y1);
              const x2 = toSvgX(link.x2);
              const y2 = toSvgY(link.y2);
              const strokeW = Math.min(8, Math.max(1.5, link.pass_count * 0.7));

              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#00FF87"
                  strokeWidth={strokeW}
                  strokeOpacity={0.65}
                />
              );
            })}

            {/* Network Player Nodes */}
            {nodes.map((node) => {
              const cx = toSvgX(node.avg_x);
              const cy = toSvgY(node.avg_y);
              const isSelected = selectedPlayerId === node.id;
              const r = Math.min(22, Math.max(12, node.touch_count * 0.28));

              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onClick={() => onSelectPlayer && onSelectPlayer(node.id)}
                >
                  {/* Outer glow ring if selected */}
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#00FF87" strokeWidth="2" strokeDasharray="4 4" />
                  )}

                  {/* Player Node Circle */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={node.team_color || '#00FF87'}
                    stroke="#000000"
                    strokeWidth="2.5"
                  />

                  {/* Player Jersey Number */}
                  <text
                    x={cx}
                    y={cy + 4.5}
                    fill="#000000"
                    fontSize={r > 16 ? '12' : '10'}
                    fontWeight="900"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.number}
                  </text>

                  {/* Player Name Tag */}
                  <text
                    x={cx}
                    y={cy + r + 13}
                    fill="#FFFFFF"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.name.split(' ').slice(-1)[0]}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* ── 5. MODE: SHOT MAP (xG Weighted Circles) ───────────────────── */}
        {mode === 'SHOTS' && (
          <g>
            {shots.map((s) => {
              const cx = toSvgX(s.x);
              const cy = toSvgY(s.y);
              const radius = Math.min(24, Math.max(5, s.xg * 30.0));
              const isGoal = s.outcome === 'GOAL';

              return (
                <g key={s.id} className="transition-transform hover:scale-125">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={isGoal ? '#00FF87' : 'rgba(255, 51, 75, 0.7)'}
                    stroke={isGoal ? '#FFFFFF' : '#FF334B'}
                    strokeWidth={isGoal ? '2.5' : '1.5'}
                    opacity={0.85}
                  />
                  {isGoal && (
                    <text
                      x={cx}
                      y={cy + 4}
                      fill="#000000"
                      fontSize="11"
                      fontWeight="900"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ★
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}
