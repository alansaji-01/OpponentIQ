import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Users,
  Search,
  Activity,
  Database
} from 'lucide-react';

interface PlayerMetric {
  id: number;
  name: string;
  jersey_number: number;
  team_name: string;
  team_code: string;
  team_color: string;
  position: string;
  preferred_foot: string;
  total_events: number;
  passes_attempted: number;
  passes_completed: number;
  pass_accuracy_pct: number;
  progressive_passes: number;
  shots: number;
  goals: number;
  xg_total: number;
  tackles: number;
  interceptions: number;
  pressure_involvements: number;
}

interface TeamFilter {
  id: number;
  name: string;
  short_code: string;
}

export default function Players() {
  const [players, setPlayers] = useState<PlayerMetric[]>([]);
  const [teams, setTeams] = useState<TeamFilter[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedPos, setSelectedPos] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get('/teams/');
        setTeams(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTeams();
  }, []);

  const fetchPlayerAnalytics = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedTeam) params.team = selectedTeam;
      if (selectedPos) params.position = selectedPos;
      const res = await api.get('/analytics/players/', { params });
      setPlayers(res.data);
    } catch (err) {
      console.error('Failed to load player analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerAnalytics();
  }, [selectedTeam, selectedPos]);

  const filteredPlayers = players.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.team_code.toLowerCase().includes(term) ||
      p.position.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Broadcast Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 panel-tactical p-4 bg-[#0B0F19] border-border-bright">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent text-black flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white">
              SQUAD ANALYTICS &amp; PLAYER PERFORMANCE RADAR
            </h1>
            <p className="text-[11px] text-text-secondary font-mono">
              INDIVIDUAL INVOLVEMENT &middot; PROGRESSIVE PASSING &middot; EXPECTED GOALS &middot; DEFENSIVE ACTIONS
            </p>
          </div>
        </div>

        {/* Telemetry Indicator */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-accent" />
            <span className="text-text-muted">ACTIVE ATHLETES:</span>
            <span className="text-accent font-bold">{players.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Sharp Industrial Controls) */}
      <div className="panel-tactical p-4 bg-[#0A0D15] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER BY PLAYER OR SQUAD..."
            className="w-full bg-[#07090E] border border-border px-3 py-2 pl-9 text-xs font-mono text-white focus:outline-none focus:border-accent"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-[#07090E] border border-border px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-accent"
          >
            <option value="">ALL CLUBS</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.short_code})
              </option>
            ))}
          </select>

          <select
            value={selectedPos}
            onChange={(e) => setSelectedPos(e.target.value)}
            className="bg-[#07090E] border border-border px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-accent"
          >
            <option value="">ALL POSITIONS</option>
            {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'].map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>

          {(selectedTeam || selectedPos || search) && (
            <button
              onClick={() => {
                setSelectedTeam('');
                setSelectedPos('');
                setSearch('');
              }}
              className="btn-tactical btn-secondary py-2 text-[10px]"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Main Players Statistical Table */}
      <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            ATHLETE PERFORMANCE DATASET ({filteredPlayers.length} ATHLETES)
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            DERIVED VIA DATABASE MATCH EVENTS
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-muted font-mono text-xs">
            COMPUTING PASSING &amp; DEFENSIVE MATRIX FROM POSTGRESQL...
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-12 text-center text-text-muted font-mono text-xs">
            NO ATHLETES MATCH THE SPECIFIED CRITERIA.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase text-[10px]">
                  <th className="py-2.5">PLAYER</th>
                  <th className="py-2.5">POS</th>
                  <th className="py-2.5">CLUB</th>
                  <th className="py-2.5 text-right">INVOLVEMENT</th>
                  <th className="py-2.5 text-right">PASS COMP/ATT</th>
                  <th className="py-2.5 text-right">PASS ACC %</th>
                  <th className="py-2.5 text-right">PROG PASSES</th>
                  <th className="py-2.5 text-right">SHOTS (GOALS)</th>
                  <th className="py-2.5 text-right">TOTAL xG</th>
                  <th className="py-2.5 text-right">TACKLES</th>
                  <th className="py-2.5 text-right">INTERCEPTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#121824] transition-colors">
                    {/* Player Info */}
                    <td className="py-3 flex items-center gap-2.5">
                      <span className="w-6 h-6 bg-[#07090E] border border-border flex items-center justify-center font-bold text-accent text-[11px]">
                        #{p.jersey_number}
                      </span>
                      <div>
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[9px] text-text-muted">{p.preferred_foot} FOOT</span>
                      </div>
                    </td>

                    {/* Position Tag */}
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 text-[10px] bg-[#07090E] border border-border font-bold text-text-secondary">
                        {p.position}
                      </span>
                    </td>

                    {/* Club */}
                    <td className="py-3">
                      <span className="font-bold" style={{ color: p.team_color || '#00FF87' }}>
                        {p.team_code}
                      </span>
                    </td>

                    {/* Total Events */}
                    <td className="py-3 text-right font-bold text-white">
                      {p.total_events}
                    </td>

                    {/* Passes */}
                    <td className="py-3 text-right text-text-secondary">
                      {p.passes_completed} / {p.passes_attempted}
                    </td>

                    {/* Pass Acc % */}
                    <td className="py-3 text-right">
                      <span
                        className={`font-bold ${
                          p.pass_accuracy_pct >= 85
                            ? 'text-accent'
                            : p.pass_accuracy_pct >= 75
                            ? 'text-info'
                            : 'text-text-muted'
                        }`}
                      >
                        {p.pass_accuracy_pct}%
                      </span>
                    </td>

                    {/* Progressive Passes */}
                    <td className="py-3 text-right text-accent font-bold">
                      {p.progressive_passes}
                    </td>

                    {/* Shots & Goals */}
                    <td className="py-3 text-right">
                      <span className="text-white font-bold">{p.shots}</span>
                      {p.goals > 0 && (
                        <span className="ml-1 px-1 text-[10px] bg-accent text-black font-black">
                          {p.goals}G
                        </span>
                      )}
                    </td>

                    {/* Total xG */}
                    <td className="py-3 text-right text-warning font-bold">
                      {p.xg_total}
                    </td>

                    {/* Tackles */}
                    <td className="py-3 text-right text-white font-bold">
                      {p.tackles}
                    </td>

                    {/* Interceptions */}
                    <td className="py-3 text-right text-text-secondary">
                      {p.interceptions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
