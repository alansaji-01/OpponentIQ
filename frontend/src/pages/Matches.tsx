import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  CalendarDays,
  Plus,
  X,
  Trophy,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface MatchTeam {
  id: number;
  team: number;
  team_name: string;
  team_code: string;
  team_color: string;
  is_home: boolean;
  formation_used: string;
  possession_pct: number;
  ppda: number;
  shots: number;
  shots_on_target: number;
  passes_completed: number;
  passes_attempted: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  corners: number;
}

interface MatchEvent {
  id: number;
  minute: number;
  second: number;
  period: number;
  team_code: string;
  team_name: string;
  player_name: string | null;
  event_type: string;
  outcome: string;
  start_x: string | null;
  start_y: string | null;
  xg_value: string | null;
  under_pressure: boolean;
}

interface Match {
  id: number;
  home_team: number;
  home_team_name: string;
  home_team_code: string;
  home_team_color: string;
  away_team: number;
  away_team_name: string;
  away_team_code: string;
  away_team_color: string;
  match_date: string;
  competition: string;
  home_score: number;
  away_score: number;
  status: string;
  venue: string;
  is_demo_data: boolean;
  event_count: number;
}

interface MatchDetail extends Match {
  match_teams: MatchTeam[];
  events: MatchEvent[];
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetail | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Match creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teams, setTeams] = useState<Array<{ id: number; name: string; short_code: string }>>([]);
  const [form, setForm] = useState({
    home_team: '',
    away_team: '',
    match_date: new Date().toISOString().slice(0, 16),
    competition: 'Premier League',
    venue: '',
    home_score: 0,
    away_score: 0,
    status: 'COMPLETED',
    is_demo_data: false,
  });

  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/matches/');
      const list = res.data.results || res.data;
      setMatches(list);
      if (list.length > 0 && !selectedMatch) {
        fetchMatchDetail(list[0].id);
      }
    } catch (err: any) {
      showNotice('Failed to load match registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await api.get('/teams/');
      setTeams(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMatchDetail = async (matchId: number) => {
    try {
      setTimelineLoading(true);
      const res = await api.get(`/matches/${matchId}/`);
      setSelectedMatch(res.data);
    } catch (err) {
      showNotice('Could not load match event breakdown', 'error');
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.home_team === form.away_team) {
      showNotice('Home and away teams must be different', 'error');
      return;
    }
    try {
      await api.post('/matches/', form);
      showNotice('Match created successfully');
      setIsModalOpen(false);
      fetchMatches();
    } catch (err: any) {
      showNotice(JSON.stringify(err.response?.data || 'Failed to create match'), 'error');
    }
  };

  const filteredEvents = selectedMatch?.events.filter((ev) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'SHOTS') return ev.event_type === 'SHOT';
    if (filterType === 'PASSES') return ev.event_type === 'PASS';
    if (filterType === 'DEFENSE') return ['TACKLE', 'INTERCEPTION', 'FOUL'].includes(ev.event_type);
    return true;
  }) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">Match Intelligence &amp; Registry</h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Real fixture logs, tactical possession benchmarks, and granular event timelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Match
          </button>
        </div>
      </div>

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

      {/* Main Grid: Match List vs Match Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Match List Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-semibold uppercase text-text-secondary tracking-wider">
              Fixtures ({matches.length})
            </h2>
            <span className="text-[11px] text-text-muted">Live PostgreSQL Records</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm bg-bg-card rounded-xl border border-border">
              Loading match records...
            </div>
          ) : matches.length === 0 ? (
            <div className="p-8 text-center bg-bg-card rounded-xl border border-border">
              <CalendarDays className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-secondary">No matches found in database</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[800px] overflow-y-auto pr-1">
              {matches.map((m) => {
                const isSelected = selectedMatch?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => fetchMatchDetail(m.id)}
                    className={`bg-bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-accent/60 ${
                      isSelected ? 'border-accent ring-1 ring-accent bg-bg-card/90' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-accent" />
                        <span>{m.competition}</span>
                        {m.is_demo_data && (
                          <span className="text-[9px] font-mono bg-warning/10 text-warning px-1.5 py-0.2 rounded border border-warning/20">
                            DEMO
                          </span>
                        )}
                      </div>
                      <span className="font-mono">{m.match_date ? m.match_date.slice(0, 10) : ''}</span>
                    </div>

                    <div className="flex items-center justify-between my-2">
                      <div className="flex items-center gap-2.5 w-5/12">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: m.home_team_color || '#10B981' }}
                        />
                        <span className="font-bold text-sm text-text-primary truncate">{m.home_team_name}</span>
                      </div>

                      <div className="px-3 py-1 rounded bg-bg-primary border border-border font-mono font-bold text-base text-accent shrink-0">
                        {m.home_score} - {m.away_score}
                      </div>

                      <div className="flex items-center gap-2.5 w-5/12 justify-end">
                        <span className="font-bold text-sm text-text-primary truncate text-right">
                          {m.away_team_name}
                        </span>
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: m.away_team_color || '#3B82F6' }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-text-muted">
                      <span className="truncate max-w-[200px]">{m.venue || 'Main Stadium'}</span>
                      <span className="font-mono text-accent flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {m.event_count} events
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Match Detail & Granular Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {timelineLoading ? (
            <div className="p-12 text-center text-text-muted bg-bg-card rounded-xl border border-border">
              Querying match timeline from PostgreSQL...
            </div>
          ) : selectedMatch ? (
            <div className="space-y-4">
              {/* Top Scorecard & Stats Card */}
              <div className="bg-bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">
                      {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {selectedMatch.competition} &middot; {selectedMatch.venue} &middot;{' '}
                      {selectedMatch.match_date ? selectedMatch.match_date.slice(0, 10) : ''}
                    </p>
                  </div>
                  <span className="text-xs bg-accent/10 border border-accent/30 text-accent font-semibold px-2.5 py-1 rounded">
                    {selectedMatch.status}
                  </span>
                </div>

                {/* MatchTeam In-Match Aggregates */}
                {selectedMatch.match_teams && selectedMatch.match_teams.length >= 2 && (
                  <div className="mt-4 pt-2">
                    <div className="grid grid-cols-3 text-center text-xs mb-2 text-text-muted uppercase">
                      <span className="font-bold text-text-primary text-left">
                        {selectedMatch.match_teams[0].team_code}
                      </span>
                      <span>Tactical Metric</span>
                      <span className="font-bold text-text-primary text-right">
                        {selectedMatch.match_teams[1].team_code}
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-accent font-bold">
                          {selectedMatch.match_teams[0].possession_pct}%
                        </span>
                        <span className="text-text-secondary font-sans">Possession</span>
                        <span className="text-info font-bold">
                          {selectedMatch.match_teams[1].possession_pct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span>{selectedMatch.match_teams[0].shots}</span>
                        <span className="text-text-secondary font-sans">Total Shots</span>
                        <span>{selectedMatch.match_teams[1].shots}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span className="text-accent font-bold">
                          {selectedMatch.match_teams[0].ppda}
                        </span>
                        <span className="text-text-secondary font-sans">PPDA (High Press)</span>
                        <span className="text-info font-bold">
                          {selectedMatch.match_teams[1].ppda}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <span>{selectedMatch.match_teams[0].passes_completed} / {selectedMatch.match_teams[0].passes_attempted}</span>
                        <span className="text-text-secondary font-sans">Passes Comp/Att</span>
                        <span>{selectedMatch.match_teams[1].passes_completed} / {selectedMatch.match_teams[1].passes_attempted}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>{selectedMatch.match_teams[0].tackles}</span>
                        <span className="text-text-secondary font-sans">Tackles</span>
                        <span>{selectedMatch.match_teams[1].tackles}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Event Timeline Breakdown */}
              <div className="bg-bg-card border border-border rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <h4 className="text-sm font-semibold uppercase text-text-secondary tracking-wider">
                    Event Timeline ({filteredEvents.length} events)
                  </h4>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-bg-primary p-1 rounded-lg border border-border">
                    {['ALL', 'SHOTS', 'PASSES', 'DEFENSE'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${
                          filterType === t
                            ? 'bg-accent text-bg-primary font-bold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1 mt-3">
                  {filteredEvents.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-8">
                      No events match selected filter.
                    </p>
                  ) : (
                    filteredEvents.map((ev) => {
                      const isGoal = ev.outcome === 'GOAL';
                      const isShot = ev.event_type === 'SHOT';
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-colors ${
                            isGoal
                              ? 'bg-accent/10 border-accent/40 text-text-primary'
                              : isShot
                              ? 'bg-warning/5 border-warning/30 text-text-primary'
                              : 'bg-bg-primary border-border text-text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-accent w-8 shrink-0">
                              {ev.minute}'
                            </span>
                            <span className="font-bold px-1.5 py-0.5 rounded bg-bg-card border border-border shrink-0">
                              {ev.team_code}
                            </span>
                            <span className="font-sans font-medium text-text-primary">
                              {ev.player_name || 'Unassigned'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isGoal
                                  ? 'bg-accent text-bg-primary'
                                  : isShot
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-bg-card text-text-muted'
                              }`}
                            >
                              {ev.event_type} {isGoal ? '★ GOAL' : `(${ev.outcome})`}
                            </span>
                            {ev.xg_value && (
                              <span className="text-[10px] text-text-muted font-mono">
                                xG: {parseFloat(ev.xg_value).toFixed(2)}
                              </span>
                            )}
                            {ev.under_pressure && (
                              <span className="text-[9px] bg-danger/10 text-danger px-1 py-0.2 rounded font-sans">
                                Pressured
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-text-muted bg-bg-card rounded-xl border border-border">
              Select a match to view tactical stats and full event breakdown.
            </div>
          )}
        </div>
      </div>

      {/* CREATE MATCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg text-text-primary">Register New Match</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Home Club
                  </label>
                  <select
                    value={form.home_team}
                    onChange={(e) => setForm({ ...form, home_team: e.target.value })}
                    required
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.short_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Away Club
                  </label>
                  <select
                    value={form.away_team}
                    onChange={(e) => setForm({ ...form, away_team: e.target.value })}
                    required
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select Team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.short_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Home Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.home_score}
                    onChange={(e) => setForm({ ...form, home_score: parseInt(e.target.value) || 0 })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Away Score
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.away_score}
                    onChange={(e) => setForm({ ...form, away_score: parseInt(e.target.value) || 0 })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Competition &middot; Tournament
                </label>
                <input
                  type="text"
                  value={form.competition}
                  onChange={(e) => setForm({ ...form, competition: e.target.value })}
                  placeholder="e.g. Premier League"
                  required
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Date &amp; Kickoff
                  </label>
                  <input
                    type="datetime-local"
                    value={form.match_date}
                    onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                    required
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder="e.g. Emirates Stadium"
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="match_demo"
                  checked={form.is_demo_data}
                  onChange={(e) => setForm({ ...form, is_demo_data: e.target.checked })}
                  className="rounded border-border bg-bg-primary text-accent focus:ring-accent"
                />
                <label htmlFor="match_demo" className="text-xs text-text-secondary">
                  Tag fixture as Demo Dataset
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-bg-primary text-sm font-semibold transition-colors"
                >
                  Save Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
