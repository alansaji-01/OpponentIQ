import { useState, useEffect } from 'react';
import api from '../lib/api';
import TacticalPitch, {
  type ShotPoint,
  type NetworkNode,
  type NetworkLink,
  type AttackChannels,
} from '../components/TacticalPitch';
import {
  Flame,
  Share2,
  Target,
  Layers,
  Database,
  Activity
} from 'lucide-react';

interface Team {
  id: number;
  name: string;
  short_code: string;
}

interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
}

export default function Heatmaps() {
  const [activeMode, setActiveMode] = useState<'HEATMAP' | 'NETWORK' | 'SHOTS' | 'CHANNELS'>('HEATMAP');
  const [loading, setLoading] = useState(true);

  // Filters
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // Spatial Data
  const [densityGrid, setDensityGrid] = useState<number[][]>([]);
  const [maxDensity, setMaxDensity] = useState(1);
  const [shots, setShots] = useState<ShotPoint[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [channels, setChannels] = useState<AttackChannels | undefined>();
  const [totalEvents, setTotalEvents] = useState(0);

  // Selected Player for detailed inspect
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [teamsRes, matchesRes] = await Promise.all([
          api.get('/teams/'),
          api.get('/matches/'),
        ]);
        setTeams(teamsRes.data.results || teamsRes.data);
        setMatches(matchesRes.data.results || matchesRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDropdowns();
  }, []);

  const fetchSpatialData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedTeam) params.team = selectedTeam;
      if (selectedMatch) params.match = selectedMatch;
      if (selectedPeriod) params.period = selectedPeriod;

      const res = await api.get('/analytics/pitch-spatial/', { params });
      setDensityGrid(res.data.density_grid);
      setMaxDensity(res.data.max_density);
      setShots(res.data.shots);
      setNodes(res.data.passing_network.nodes);
      setLinks(res.data.passing_network.links);
      setChannels(res.data.attack_channels);
      setTotalEvents(res.data.total_events_analyzed);
    } catch (err) {
      console.error('Failed to load spatial pitch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpatialData();
  }, [selectedTeam, selectedMatch, selectedPeriod]);

  const selectedNode = nodes.find((n) => n.id === selectedPlayerId);

  return (
    <div className="p-6 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Broadcast Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 panel-tactical p-4 bg-[#0B0F19] border-border-bright">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent text-black flex items-center justify-center font-black">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white">
              INTERACTIVE PITCH VISUALIZATION &amp; SPATIAL RADAR
            </h1>
            <p className="text-[11px] text-text-secondary font-mono">
              2D GAUSSIAN HEATMAPS &middot; PASSING NETWORKS &middot; xG SHOT MAPS &middot; ATTACK CHANNELS
            </p>
          </div>
        </div>

        {/* Tactical Mode Switcher (Sharp Industrial Controls) */}
        <div className="flex items-center gap-1.5 bg-[#07090E] p-1 border border-border">
          <button
            onClick={() => setActiveMode('HEATMAP')}
            className={`btn-tactical py-1.5 px-3 text-[11px] gap-1.5 ${
              activeMode === 'HEATMAP' ? 'btn-primary' : 'btn-secondary border-transparent'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            HEATMAP
          </button>
          <button
            onClick={() => setActiveMode('NETWORK')}
            className={`btn-tactical py-1.5 px-3 text-[11px] gap-1.5 ${
              activeMode === 'NETWORK' ? 'btn-primary' : 'btn-secondary border-transparent'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            PASS NETWORK
          </button>
          <button
            onClick={() => setActiveMode('SHOTS')}
            className={`btn-tactical py-1.5 px-3 text-[11px] gap-1.5 ${
              activeMode === 'SHOTS' ? 'btn-primary' : 'btn-secondary border-transparent'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            SHOT MAP
          </button>
          <button
            onClick={() => setActiveMode('CHANNELS')}
            className={`btn-tactical py-1.5 px-3 text-[11px] gap-1.5 ${
              activeMode === 'CHANNELS' ? 'btn-primary' : 'btn-secondary border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            ATTACK CHANNELS
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel-tactical p-4 bg-[#0A0D15] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Match Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted uppercase">MATCH:</span>
            <select
              value={selectedMatch}
              onChange={(e) => setSelectedMatch(e.target.value)}
              className="bg-[#07090E] border border-border px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent"
            >
              <option value="">ALL FIXTURES</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} {m.home_team_name} vs {m.away_team_name}
                </option>
              ))}
            </select>
          </div>

          {/* Club Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted uppercase">CLUB:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-[#07090E] border border-border px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent"
            >
              <option value="">ALL CLUBS</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.short_code})
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted uppercase">PERIOD:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-[#07090E] border border-border px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-accent"
            >
              <option value="">FULL MATCH</option>
              <option value="1">1ST HALF</option>
              <option value="2">2ND HALF</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Database className="w-3.5 h-3.5 text-accent" />
          <span className="text-text-muted">EVENTS PROCESSED:</span>
          <span className="text-white font-bold">{totalEvents}</span>
        </div>
      </div>

      {/* Main Pitch Viewport & Tactical Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Pitch Canvas (8 cols) */}
        <div className="lg:col-span-8 panel-tactical p-4 bg-[#0A0D15] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              SVG TACTICAL PITCH (0–100 COORD SPACE) &middot; MODE: {activeMode}
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              ORIENTATION: ATTACKING LEFT → RIGHT
            </span>
          </div>

          {loading ? (
            <div className="p-20 text-center text-text-muted font-mono text-xs">
              COMPUTING SPATIAL MAPPINGS &amp; REPROJECTIONS...
            </div>
          ) : (
            <TacticalPitch
              mode={activeMode}
              densityGrid={densityGrid}
              maxDensity={maxDensity}
              shots={shots}
              nodes={nodes}
              links={links}
              channels={channels}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
            />
          )}

          {/* Footer Legend Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-text-muted border-t border-border">
            {activeMode === 'HEATMAP' && (
              <div className="flex items-center gap-4">
                <span>INTENSITY SCALE:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#00FF87]/30 border border-[#00FF87]" />
                  <span>LOW</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#FFB800]/70 border border-[#FFB800]" />
                  <span>MED</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#FF334B]/80 border border-[#FF334B]" />
                  <span>HIGH INTENSITY</span>
                </div>
              </div>
            )}

            {activeMode === 'SHOTS' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#00FF87] border border-white" />
                  <span className="text-white font-bold">★ GOAL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF334B]/70 border border-[#FF334B]" />
                  <span>SAVED / OFF TARGET / BLOCKED</span>
                </div>
                <span className="text-text-muted text-[10px]">
                  RADIUS PROPORTIONAL TO EXPECTED GOAL (xG)
                </span>
              </div>
            )}

            {activeMode === 'NETWORK' && (
              <div className="flex items-center gap-3">
                <span className="text-accent font-bold">NODE:</span> Average Player Touch Position &middot;{' '}
                <span className="text-accent font-bold">LINE THICKNESS:</span> Pass Volume Between Athletes
              </div>
            )}

            {activeMode === 'CHANNELS' && (
              <div className="flex items-center gap-3 text-text-secondary">
                Calculated across final third attacking entries ($X \ge 50.0$)
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry & Detail Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Active Mode Analytics Breakdown */}
          {activeMode === 'CHANNELS' && channels && (
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2 pb-2 border-b border-border">
                <Layers className="w-4 h-4 text-accent" />
                LATERAL PENETRATION BREAKDOWN
              </span>

              <div className="space-y-3 font-mono text-xs pt-1">
                <div className="p-3 bg-[#07090E] border border-border space-y-1">
                  <div className="flex items-center justify-between text-info font-bold">
                    <span>LEFT FLANK (0-33%)</span>
                    <span>{channels.left.pct}%</span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {channels.left.count} penetrations recorded
                  </div>
                </div>

                <div className="p-3 bg-[#07090E] border border-border space-y-1">
                  <div className="flex items-center justify-between text-accent font-bold">
                    <span>CENTRAL CORRIDOR (33-67%)</span>
                    <span>{channels.center.pct}%</span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {channels.center.count} penetrations recorded
                  </div>
                </div>

                <div className="p-3 bg-[#07090E] border border-border space-y-1">
                  <div className="flex items-center justify-between text-warning font-bold">
                    <span>RIGHT FLANK (67-100%)</span>
                    <span>{channels.right.pct}%</span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {channels.right.count} penetrations recorded
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMode === 'SHOTS' && (
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2 pb-2 border-b border-border">
                <Target className="w-4 h-4 text-accent" />
                SHOT TRAJECTORY LOG ({shots.length} SHOTS)
              </span>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 font-mono text-xs">
                {shots.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 border flex items-center justify-between ${
                      s.outcome === 'GOAL'
                        ? 'bg-accent/10 border-accent/40 text-white'
                        : 'bg-[#07090E] border-border text-text-secondary'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-accent">{s.minute}'</span>
                        <span className="font-bold text-white">{s.player_name}</span>
                        <span className="text-[10px] text-text-muted font-bold">({s.team_code})</span>
                      </div>
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        Dist: {s.distance_m}m &middot; xG: {s.xg}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                        s.outcome === 'GOAL'
                          ? 'bg-accent text-black'
                          : 'bg-[#161D2B] text-text-muted'
                      }`}
                    >
                      {s.outcome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMode === 'NETWORK' && (
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2 pb-2 border-b border-border">
                <Share2 className="w-4 h-4 text-accent" />
                PASSING NETWORK NODES ({nodes.length})
              </span>

              {selectedNode ? (
                <div className="p-3 bg-[#07090E] border border-accent space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <span className="font-bold text-white">
                      #{selectedNode.number} {selectedNode.name}
                    </span>
                    <span className="text-accent">{selectedNode.team_code}</span>
                  </div>
                  <div className="text-text-muted text-[11px] space-y-1">
                    <p>Average Position: X: {selectedNode.avg_x}m, Y: {selectedNode.avg_y}m</p>
                    <p>Total Ball Touches: {selectedNode.touch_count}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted font-mono p-2">
                  Click any player node on the pitch to inspect average coordinates.
                </p>
              )}

              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 font-mono text-xs">
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedPlayerId(n.id)}
                    className={`p-2 border flex items-center justify-between cursor-pointer transition-colors ${
                      selectedPlayerId === n.id
                        ? 'border-accent bg-[#121824]'
                        : 'border-border bg-[#07090E] hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-[#0D111A] border border-border flex items-center justify-center font-bold text-accent text-[10px]">
                        #{n.number}
                      </span>
                      <span className="text-white font-bold">{n.name}</span>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {n.touch_count} touches
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMode === 'HEATMAP' && (
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3 font-mono text-xs">
              <span className="font-bold uppercase text-white tracking-wider flex items-center gap-2 pb-2 border-b border-border">
                <Flame className="w-4 h-4 text-accent" />
                SPATIAL DENSITY AUDIT
              </span>
              <p className="text-text-muted text-[11px]">
                The heatmap maps event cluster densities across $20 \times 14$ tactical grid zones.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between p-2.5 bg-[#07090E] border border-border">
                  <span className="text-text-muted">MAX CELL DENSITY</span>
                  <span className="text-accent font-bold">{maxDensity} ACTIONS</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-[#07090E] border border-border">
                  <span className="text-text-muted">ACTIVE SECTORS</span>
                  <span className="text-white font-bold">280 TACTICAL BINS</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
