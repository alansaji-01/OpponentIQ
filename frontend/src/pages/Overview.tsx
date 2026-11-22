import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  LayoutDashboard,
  CalendarDays,
  Activity,
  Crosshair,
  TrendingUp,
  Target,
  Database,
  BarChart2,
  Trophy
} from 'lucide-react';

interface SummaryKPIs {
  total_teams: number;
  total_players: number;
  total_matches: number;
  total_events: number;
  total_shots: number;
  total_goals: number;
  total_xg: number;
  shot_conversion_pct: number;
  total_passes: number;
  pass_accuracy_pct: number;
  total_defensive_actions: number;
  high_press_regains: number;
}

interface ClubStanding {
  id: number;
  name: string;
  code: string;
  color: string;
  formation: string;
  pressing_style: string;
  matches_played: number;
  avg_possession: number;
  avg_ppda: number;
  total_shots: number;
  total_tackles: number;
}

interface RecentMatch {
  id: number;
  date: string;
  competition: string;
  home_team: string;
  home_code: string;
  home_color: string;
  away_team: string;
  away_code: string;
  away_color: string;
  score: string;
  event_count: number;
  is_demo_data: boolean;
}

export default function Overview() {
  const [kpis, setKpis] = useState<SummaryKPIs | null>(null);
  const [standings, setStandings] = useState<ClubStanding[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<Array<{ event_type: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const res = await api.get('/analytics/overview/');
        setKpis(res.data.summary_kpis);
        setStandings(res.data.club_standings);
        setRecentMatches(res.data.recent_matches);
        setEventBreakdown(res.data.event_breakdown);
      } catch (err) {
        console.error('Failed to load live overview metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Broadcast Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 panel-tactical p-4 bg-[#0B0F19] border-border-bright">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent text-black flex items-center justify-center font-black">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white">
              TACTICAL OVERVIEW &amp; PERFORMANCE BENCHMARKS
            </h1>
            <p className="text-[11px] text-text-secondary font-mono">
              REAL-TIME DATABASE AGGREGATES &middot; ZERO SYNTHETIC ESTIMATION &middot; AUDITED POSTGRESQL ENGINE
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-accent" />
            <span className="text-text-muted">SOURCE:</span>
            <span className="text-white font-bold">POSTGRESQL 19</span>
          </div>
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span className="text-accent font-bold">LIVE TELEMETRY</span>
          </div>
        </div>
      </div>

      {loading || !kpis ? (
        <div className="panel-tactical p-12 text-center text-text-muted font-mono text-xs">
          QUERYING LIVE STATISTICAL AGGREGATES FROM DATABASE...
        </div>
      ) : (
        <>
          {/* Top 4 Primary KPI Telemetry Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Events Ingested */}
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-2 border-l-4 border-l-accent">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>INGESTED EVENTS</span>
                <Activity className="w-4 h-4 text-accent" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {kpis.total_events.toLocaleString()}
                </span>
                <span className="text-[11px] font-mono text-accent">
                  {kpis.total_matches} MATCHES
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                PASSES, SHOTS, TACKLES, INTERCEPTIONS
              </p>
            </div>

            {/* Passing Volume & Accuracy */}
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-2 border-l-4 border-l-info">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>PASS ACCURACY</span>
                <TrendingUp className="w-4 h-4 text-info" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {kpis.pass_accuracy_pct}%
                </span>
                <span className="text-[11px] font-mono text-info">
                  {kpis.total_passes} PASSES
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                GROUND, HIGH &amp; PROGRESSIVE DRIFT
              </p>
            </div>

            {/* Expected Goals & Shot Efficiency */}
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-2 border-l-4 border-l-warning">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>EXPECTED GOALS (xG)</span>
                <Target className="w-4 h-4 text-warning" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {kpis.total_xg}
                </span>
                <span className="text-[11px] font-mono text-warning">
                  {kpis.total_goals} GOALS ({kpis.shot_conversion_pct}%)
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                {kpis.total_shots} SHOTS AUDITED
              </p>
            </div>

            {/* Defensive Pressure & High Regains */}
            <div className="panel-tactical p-4 bg-[#0A0D15] space-y-2 border-l-4 border-l-danger">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted">
                <span>HIGH PRESS REGAINS</span>
                <Crosshair className="w-4 h-4 text-danger" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {kpis.high_press_regains}
                </span>
                <span className="text-[11px] font-mono text-danger">
                  {kpis.total_defensive_actions} ACTIONS
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                FINAL 40% PITCH ZONE TURNOVERS
              </p>
            </div>
          </div>

          {/* Main Grid: Club Standings & Granular Event Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Club Standings & Possession Benchmark (7 cols) */}
            <div className="lg:col-span-7 panel-tactical p-4 bg-[#0A0D15] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent" />
                  CLUB TACTICAL BENCHMARKS (DERIVED FROM DATABASE)
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  SORTED BY AVG POSSESSION
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted uppercase text-[10px]">
                      <th className="py-2">CLUB</th>
                      <th className="py-2">FORMATION</th>
                      <th className="py-2 text-center">PRESS STYLE</th>
                      <th className="py-2 text-right">POSS %</th>
                      <th className="py-2 text-right">PPDA</th>
                      <th className="py-2 text-right">SHOTS</th>
                      <th className="py-2 text-right">TACKLES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {standings.map((c) => (
                      <tr key={c.id} className="hover:bg-[#121824] transition-colors">
                        <td className="py-3 flex items-center gap-2">
                          <div
                            className="w-3 h-3 shrink-0"
                            style={{ backgroundColor: c.color || '#00FF87' }}
                          />
                          <span className="font-bold text-white">{c.name}</span>
                          <span className="text-[10px] text-text-muted">({c.code})</span>
                        </td>
                        <td className="py-3 text-text-secondary">{c.formation}</td>
                        <td className="py-3 text-center">
                          <span className="px-1.5 py-0.5 text-[9px] bg-[#161D2B] border border-border text-accent">
                            {c.pressing_style}
                          </span>
                        </td>
                        <td className="py-3 text-right text-accent font-bold">
                          {c.avg_possession}%
                        </td>
                        <td className="py-3 text-right text-info font-bold">{c.avg_ppda}</td>
                        <td className="py-3 text-right text-white">{c.total_shots}</td>
                        <td className="py-3 text-right text-text-secondary">{c.total_tackles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Event Type Distribution Breakdown (5 cols) */}
            <div className="lg:col-span-5 panel-tactical p-4 bg-[#0A0D15] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-accent" />
                  DATABASE EVENT TYPE DISTRIBUTION
                </span>
                <span className="text-[10px] font-mono text-accent">
                  {kpis.total_events} TOTAL
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {eventBreakdown.map((ev) => {
                  const pct = Math.round((ev.count / Math.max(1, kpis.total_events)) * 100);
                  return (
                    <div key={ev.event_type} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white font-bold">{ev.event_type}</span>
                        <span className="text-text-muted">
                          {ev.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#07090E] h-2 border border-border overflow-hidden">
                        <div
                          className="bg-accent h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Matches Timeline Strip */}
          <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-accent" />
                RECENT AUDITED FIXTURES IN DATABASE
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                SHOWING LAST 5 COMPLETED MATCHES
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="panel-tactical p-3 bg-[#07090E] border-border space-y-2 hover:border-accent/60 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>{m.date}</span>
                    {m.is_demo_data && (
                      <span className="text-[9px] px-1 bg-warning/10 text-warning border border-warning/30">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-white">{m.home_code}</span>
                    <span className="px-2 py-0.5 bg-[#161D2B] border border-border text-accent font-black">
                      {m.score}
                    </span>
                    <span className="font-bold text-white">{m.away_code}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted border-t border-border pt-1.5">
                    <span className="truncate">{m.competition}</span>
                    <span className="text-accent">{m.event_count} evs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
