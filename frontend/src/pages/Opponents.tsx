import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Shield,
  Plus,
  Users,
  Swords,
  Search,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Player {
  id?: number;
  team?: number;
  full_name: string;
  jersey_number: number;
  primary_position: string;
  preferred_foot: string;
  is_active: boolean;
}

interface Team {
  id: number;
  name: string;
  short_code: string;
  logo: string | null;
  primary_color: string;
  default_formation: string;
  pressing_style: string;
  is_demo_data: boolean;
  player_count: number;
  players: Player[];
  created_at: string;
}

interface ComparisonData {
  team_a: Team;
  team_b: Team;
  h2h_summary: {
    total_meetings: number;
    team_a_wins: number;
    team_b_wins: number;
    draws: number;
  };
  h2h_matches: Array<{
    id: number;
    date: string;
    competition: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    status: string;
    is_demo_data: boolean;
  }>;
  stats: {
    team_a: Record<string, any>;
    team_b: Record<string, any>;
  };
}

const FORMATIONS = ['4-3-3', '4-2-3-1', '3-5-2', '4-4-2', '3-4-3', '5-3-2', '4-1-4-1'];
const PRESSING_STYLES = [
  { value: 'HIGH', label: 'High Press' },
  { value: 'MID', label: 'Mid Block' },
  { value: 'LOW', label: 'Low Block' },
  { value: 'MIXED', label: 'Mixed' },
];
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];

export default function Opponents() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Modal controls
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    short_code: '',
    primary_color: '#10B981',
    default_formation: '4-3-3',
    pressing_style: 'MID',
    is_demo_data: false,
  });

  // Player Modal
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerForm, setPlayerForm] = useState({
    full_name: '',
    jersey_number: 1,
    primary_position: 'CM',
    preferred_foot: 'RIGHT',
    is_active: true,
  });

  // H2H Comparison View
  const [compareMode, setCompareMode] = useState(false);
  const [teamAId, setTeamAId] = useState<number | string>('');
  const [teamBId, setTeamBId] = useState<number | string>('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Status message
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/teams/', { params: { search: search || undefined } });
      setTeams(res.data.results || res.data);
      if (selectedTeam) {
        const updated = (res.data.results || res.data).find((t: Team) => t.id === selectedTeam.id);
        setSelectedTeam(updated || null);
      }
    } catch (err: any) {
      console.error(err);
      showNotice(err.response?.data?.detail || 'Failed to fetch teams. Please authenticate.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [search]);

  // Handle Team Submit
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}/`, teamForm);
        showNotice(`Updated team ${teamForm.name}`);
      } else {
        await api.post('/teams/', teamForm);
        showNotice(`Created team ${teamForm.name}`);
      }
      setIsTeamModalOpen(false);
      setEditingTeam(null);
      fetchTeams();
    } catch (err: any) {
      const msg = JSON.stringify(err.response?.data || 'Failed to save team');
      showNotice(msg, 'error');
    }
  };

  const handleDeleteTeam = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/teams/${id}/`);
      showNotice(`Deleted ${name}`);
      if (selectedTeam?.id === id) setSelectedTeam(null);
      fetchTeams();
    } catch (err: any) {
      showNotice('Failed to delete team', 'error');
    }
  };

  // Handle Player Submit
  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    try {
      await api.post('/players/', { ...playerForm, team: selectedTeam.id });
      showNotice(`Added #${playerForm.jersey_number} ${playerForm.full_name}`);
      setIsPlayerModalOpen(false);
      setPlayerForm({
        full_name: '',
        jersey_number: 1,
        primary_position: 'CM',
        preferred_foot: 'RIGHT',
        is_active: true,
      });
      fetchTeams();
    } catch (err: any) {
      const msg = JSON.stringify(err.response?.data || 'Failed to save player');
      showNotice(msg, 'error');
    }
  };

  const handleDeletePlayer = async (playerId: number, playerName: string) => {
    if (!window.confirm(`Remove player ${playerName}?`)) return;
    try {
      await api.delete(`/players/${playerId}/`);
      showNotice(`Removed ${playerName}`);
      fetchTeams();
    } catch (err: any) {
      showNotice('Failed to delete player', 'error');
    }
  };

  // Run Real H2H Comparison from PostgreSQL API
  const handleRunComparison = async () => {
    if (!teamAId || !teamBId) {
      showNotice('Select two teams to compare', 'error');
      return;
    }
    if (teamAId === teamBId) {
      showNotice('Choose two different teams', 'error');
      return;
    }
    setCompareLoading(true);
    try {
      const res = await api.get('/teams/compare/', {
        params: { team_a: teamAId, team_b: teamBId }
      });
      setComparison(res.data);
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Comparison query failed', 'error');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">Opponents Intelligence</h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage clubs, squad registries, formations, and run live head-to-head tactical queries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setComparison(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
              compareMode
                ? 'bg-accent text-bg-primary border-accent'
                : 'bg-bg-card hover:bg-bg-hover text-text-primary border-border'
            }`}
          >
            <Swords className="w-4 h-4" />
            {compareMode ? 'Exit Comparison' : 'Head-to-Head Compare'}
          </button>

          <button
            onClick={() => {
              setEditingTeam(null);
              setTeamForm({
                name: '',
                short_code: '',
                primary_color: '#10B981',
                default_formation: '4-3-3',
                pressing_style: 'MID',
                is_demo_data: false,
              });
              setIsTeamModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div
          className={`p-3 rounded-lg border flex items-center gap-2 text-sm ${
            notice.type === 'success'
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* COMPARISON VIEW */}
      {compareMode ? (
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-text-primary">
              <Swords className="w-5 h-5 text-accent" />
              Direct Head-to-Head Tactical Query
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Team A (Primary Club)
                </label>
                <select
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select Team A...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.short_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Team B (Opponent)
                </label>
                <select
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select Team B...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.short_code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunComparison}
                disabled={compareLoading || !teamAId || !teamBId}
                className="w-full bg-accent hover:bg-accent-hover text-bg-primary py-2 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {compareLoading ? 'Querying PostgreSQL...' : 'Compare Tactical Stats'}
              </button>
            </div>
          </div>

          {comparison && (
            <div className="space-y-6">
              {/* Top Banner H2H */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Team A Card */}
                <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-2 text-bg-primary"
                    style={{ backgroundColor: comparison.team_a.primary_color || '#10B981' }}
                  >
                    {comparison.team_a.short_code}
                  </div>
                  <h3 className="text-lg font-bold">{comparison.team_a.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-bg-primary px-2.5 py-1 rounded border border-border">
                      {comparison.team_a.default_formation}
                    </span>
                    <span className="text-xs bg-bg-primary px-2.5 py-1 rounded border border-border text-accent">
                      {comparison.team_a.pressing_style} Press
                    </span>
                  </div>
                </div>

                {/* H2H Meetings */}
                <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col justify-center items-center text-center">
                  <p className="text-xs text-text-muted uppercase tracking-widest">Historical Meetings</p>
                  <p className="text-3xl font-extrabold font-mono mt-1 text-text-primary">
                    {comparison.h2h_summary.total_meetings}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-mono">
                    <span className="text-accent">{comparison.h2h_summary.team_a_wins} Wins</span>
                    <span className="text-text-muted">{comparison.h2h_summary.draws} Draws</span>
                    <span className="text-danger">{comparison.h2h_summary.team_b_wins} Wins</span>
                  </div>
                </div>

                {/* Team B Card */}
                <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl mb-2 text-bg-primary"
                    style={{ backgroundColor: comparison.team_b.primary_color || '#3B82F6' }}
                  >
                    {comparison.team_b.short_code}
                  </div>
                  <h3 className="text-lg font-bold">{comparison.team_b.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-bg-primary px-2.5 py-1 rounded border border-border">
                      {comparison.team_b.default_formation}
                    </span>
                    <span className="text-xs bg-bg-primary px-2.5 py-1 rounded border border-border text-info">
                      {comparison.team_b.pressing_style} Press
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Aggregates Comparison Table */}
              <div className="bg-bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold uppercase text-text-secondary mb-4">
                  Aggregated Tactical Benchmarks (Calculated from Match Records)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-muted text-xs uppercase">
                        <th className="py-2 text-left font-mono">{comparison.team_a.short_code}</th>
                        <th className="py-2 text-center">Tactical Metric</th>
                        <th className="py-2 text-right font-mono">{comparison.team_b.short_code}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      <tr>
                        <td className="py-3 text-left text-accent font-semibold">
                          {comparison.stats.team_a.avg_possession}%
                        </td>
                        <td className="py-3 text-center text-text-secondary font-sans font-medium">
                          Avg Possession
                        </td>
                        <td className="py-3 text-right text-info font-semibold">
                          {comparison.stats.team_b.avg_possession}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 text-left text-accent font-semibold">
                          {comparison.stats.team_a.avg_ppda}
                        </td>
                        <td className="py-3 text-center text-text-secondary font-sans font-medium">
                          PPDA (Defensive Pressure)
                        </td>
                        <td className="py-3 text-right text-info font-semibold">
                          {comparison.stats.team_b.avg_ppda}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 text-left">{comparison.stats.team_a.pass_accuracy_pct}%</td>
                        <td className="py-3 text-center text-text-secondary font-sans font-medium">
                          Pass Accuracy
                        </td>
                        <td className="py-3 text-right">{comparison.stats.team_b.pass_accuracy_pct}%</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-left">{comparison.stats.team_a.total_shots}</td>
                        <td className="py-3 text-center text-text-secondary font-sans font-medium">
                          Total Shots Recorded
                        </td>
                        <td className="py-3 text-right">{comparison.stats.team_b.total_shots}</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-left">{comparison.stats.team_a.total_tackles}</td>
                        <td className="py-3 text-center text-text-secondary font-sans font-medium">
                          Total Tackles
                        </td>
                        <td className="py-3 text-right">{comparison.stats.team_b.total_tackles}</td>
                      </tr>
                      <tr>
                        <td className="py-3 text-left">{comparison.stats.team_a.total_interceptions}</td>
                        <td className="py-3 text-center text-text-secondary font-sans font-medium">
                          Total Interceptions
                        </td>
                        <td className="py-3 text-right">{comparison.stats.team_b.total_interceptions}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* H2H Match Log */}
              <div className="bg-bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold uppercase text-text-secondary mb-3">
                  Match History Between Clubs
                </h3>
                {comparison.h2h_matches.length === 0 ? (
                  <p className="text-xs text-text-muted py-4 text-center">
                    No completed head-to-head matches found in database. Matches will populate via Phase 3 seeder.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {comparison.h2h_matches.map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-text-muted">{m.date}</span>
                          <span className="text-xs bg-bg-primary px-2 py-0.5 rounded border border-border">
                            {m.competition || 'League'}
                          </span>
                          {m.is_demo_data && (
                            <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded font-mono">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="font-semibold flex items-center gap-3">
                          <span>{m.home_team}</span>
                          <span className="font-mono bg-bg-primary px-2 py-0.5 rounded border border-border text-accent">
                            {m.home_score} - {m.away_score}
                          </span>
                          <span>{m.away_team}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STANDARD OPPONENTS DIRECTORY VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams Directory List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams by name or code..."
                className="w-full bg-bg-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            {loading ? (
              <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-muted text-sm">
                Loading teams from PostgreSQL...
              </div>
            ) : teams.length === 0 ? (
              <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
                <Shield className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-primary font-semibold">No teams found</p>
                <p className="text-text-muted text-xs mt-1">
                  Click "Add Team" to create one or seed demo dataset in Phase 3.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTeam(t)}
                    className={`bg-bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-accent/60 ${
                      selectedTeam?.id === t.id ? 'border-accent ring-1 ring-accent' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg text-bg-primary shadow-sm"
                          style={{ backgroundColor: t.primary_color || '#10B981' }}
                        >
                          {t.short_code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-text-primary text-base">{t.name}</h3>
                            {t.is_demo_data && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                                DEMO DATASET
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            Code: <span className="font-mono text-text-secondary">{t.short_code}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam(t);
                            setTeamForm({
                              name: t.name,
                              short_code: t.short_code,
                              primary_color: t.primary_color,
                              default_formation: t.default_formation,
                              pressing_style: t.pressing_style,
                              is_demo_data: t.is_demo_data,
                            });
                            setIsTeamModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeam(t.id, t.name);
                          }}
                          className="p-1.5 rounded hover:bg-danger/20 text-text-muted hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-bg-primary px-2 py-0.5 rounded border border-border text-text-secondary font-mono">
                          {t.default_formation}
                        </span>
                        <span className="bg-bg-primary px-2 py-0.5 rounded border border-border text-accent font-medium">
                          {t.pressing_style}
                        </span>
                      </div>
                      <span className="text-text-muted font-mono flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {t.player_count || t.players?.length || 0} players
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Detail & Player Registry Sidebar */}
          <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col h-fit">
            {selectedTeam ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{selectedTeam.name}</h3>
                    <p className="text-xs text-text-muted font-mono">
                      Formation: {selectedTeam.default_formation} &middot; Press: {selectedTeam.pressing_style}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setPlayerForm({
                        full_name: '',
                        jersey_number: (selectedTeam.players?.length || 0) + 1,
                        primary_position: 'CM',
                        preferred_foot: 'RIGHT',
                        is_active: true,
                      });
                      setIsPlayerModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-bg-primary text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Player
                  </button>
                </div>

                {/* Squad list */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-text-secondary tracking-wider mb-2">
                    Squad Registry ({selectedTeam.players?.length || 0})
                  </h4>
                  {!selectedTeam.players || selectedTeam.players.length === 0 ? (
                    <p className="text-xs text-text-muted py-4 text-center">
                      No players registered for {selectedTeam.short_code}. Click "Add Player" to register.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                      {selectedTeam.players.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-bg-primary border border-border text-sm hover:border-accent/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded bg-bg-card border border-border flex items-center justify-center font-mono text-xs font-bold text-accent">
                              {p.jersey_number}
                            </span>
                            <div>
                              <p className="font-medium text-xs text-text-primary leading-tight">{p.full_name}</p>
                              <span className="text-[10px] text-text-muted font-mono">
                                {p.primary_position} &middot; {p.preferred_foot} foot
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => p.id && handleDeletePlayer(p.id, p.full_name)}
                            className="p-1 text-text-muted hover:text-danger rounded hover:bg-danger/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-text-muted">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-text-secondary">Select a team</p>
                <p className="text-xs mt-1">Click any club card on the left to view and edit its squad roster.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEAM MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg text-text-primary">
                {editingTeam ? 'Edit Opponent' : 'Create Opponent Club'}
              </h3>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Club Name
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="e.g. Manchester City"
                  required
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Short Code
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={teamForm.short_code}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, short_code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. MCI"
                    required
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Primary Hex Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={teamForm.primary_color}
                      onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                      className="w-9 h-9 rounded border border-border bg-transparent cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={teamForm.primary_color}
                      onChange={(e) => setTeamForm({ ...teamForm, primary_color: e.target.value })}
                      className="w-full bg-bg-primary border border-border rounded-lg px-2 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Default Formation
                  </label>
                  <select
                    value={teamForm.default_formation}
                    onChange={(e) => setTeamForm({ ...teamForm, default_formation: e.target.value })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {FORMATIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Pressing Style
                  </label>
                  <select
                    value={teamForm.pressing_style}
                    onChange={(e) => setTeamForm({ ...teamForm, pressing_style: e.target.value })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {PRESSING_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="demo_data"
                  checked={teamForm.is_demo_data}
                  onChange={(e) => setTeamForm({ ...teamForm, is_demo_data: e.target.checked })}
                  className="rounded border-border bg-bg-primary text-accent focus:ring-accent"
                />
                <label htmlFor="demo_data" className="text-xs text-text-secondary">
                  Mark as Demo Dataset entity
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary text-sm font-semibold transition-colors"
                >
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAYER MODAL */}
      {isPlayerModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-base text-text-primary">
                Add Player to {selectedTeam?.short_code}
              </h3>
              <button
                onClick={() => setIsPlayerModalOpen(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={playerForm.full_name}
                  onChange={(e) => setPlayerForm({ ...playerForm, full_name: e.target.value })}
                  placeholder="e.g. Kevin De Bruyne"
                  required
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Jersey #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={playerForm.jersey_number}
                    onChange={(e) =>
                      setPlayerForm({ ...playerForm, jersey_number: parseInt(e.target.value) || 1 })
                    }
                    required
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Position
                  </label>
                  <select
                    value={playerForm.primary_position}
                    onChange={(e) => setPlayerForm({ ...playerForm, primary_position: e.target.value })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Preferred Foot
                </label>
                <select
                  value={playerForm.preferred_foot}
                  onChange={(e) => setPlayerForm({ ...playerForm, preferred_foot: e.target.value })}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="RIGHT">Right Foot</option>
                  <option value="LEFT">Left Foot</option>
                  <option value="BOTH">Both Feet</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPlayerModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary text-sm font-semibold transition-colors"
                >
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
