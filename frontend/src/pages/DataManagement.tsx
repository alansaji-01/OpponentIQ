import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Database,
  Upload,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

interface Team {
  id: number;
  name: string;
  short_code: string;
  players?: Array<{ id: number; full_name: string; jersey_number: number }>;
}

interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
}

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState<'BATCH' | 'MANUAL'>('BATCH');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch Importer State
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Manual Event Form State
  const [eventForm, setEventForm] = useState({
    match: '',
    team: '',
    player: '',
    period: 1,
    minute: 1,
    second: 0,
    event_type: 'PASS',
    outcome: 'SUCCESS',
    start_x: '50.0',
    start_y: '50.0',
    end_x: '65.0',
    end_y: '50.0',
    under_pressure: false,
    xg_value: '',
  });

  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, matchesRes] = await Promise.all([
          api.get('/teams/'),
          api.get('/matches/')
        ]);
        setTeams(teamsRes.data.results || teamsRes.data);
        setMatches(matchesRes.data.results || matchesRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Handle Batch File Upload
  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showNotice('Please select a CSV or JSON file to upload', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setImportResult(null);
    try {
      const res = await api.post('/events/batch-import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      showNotice(`Successfully ingested ${res.data.successfully_inserted} events!`);
    } catch (err: any) {
      if (err.response?.data) {
        setImportResult(err.response.data);
        showNotice(`Import completed with errors: ${err.response.data.error_count || 1} issues`, 'error');
      } else {
        showNotice('Failed to connect to batch import endpoint', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Event Creation
  const handleManualEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        ...eventForm,
        period: Number(eventForm.period),
        minute: Number(eventForm.minute),
        second: Number(eventForm.second),
        start_x: Number(eventForm.start_x),
        start_y: Number(eventForm.start_y),
        end_x: Number(eventForm.end_x),
        end_y: Number(eventForm.end_y),
        player: eventForm.player ? Number(eventForm.player) : null,
        xg_value: eventForm.xg_value ? Number(eventForm.xg_value) : null,
      };
      await api.post('/events/', payload);
      showNotice(`Recorded event: ${eventForm.event_type} at ${eventForm.minute}'`);
      setEventForm({
        ...eventForm,
        minute: eventForm.minute + 1,
        xg_value: '',
      });
    } catch (err: any) {
      showNotice(JSON.stringify(err.response?.data || 'Failed to save event'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedTeamPlayers = teams.find((t) => String(t.id) === String(eventForm.team))?.players || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Database className="w-7 h-7 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">Data Management &amp; Ingestion</h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Batch import validated CSV/JSON event files with row-level error reporting, or log real-time tactical events manually.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-bg-card p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('BATCH')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'BATCH'
                ? 'bg-accent text-bg-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Upload className="w-4 h-4" />
            Batch Importer
          </button>
          <button
            onClick={() => setActiveTab('MANUAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'MANUAL'
                ? 'bg-accent text-bg-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Plus className="w-4 h-4" />
            Manual Event Entry
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

      {/* TAB 1: BATCH IMPORTER */}
      {activeTab === 'BATCH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload card */}
          <div className="lg:col-span-5 bg-bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
              <h2 className="text-base font-bold text-text-primary">Upload CSV or JSON Event Dataset</h2>
            </div>
            <p className="text-xs text-text-secondary">
              Upload matches event logs for batch ingestion. Coordinates must be bounded between <span className="font-mono text-accent">0.0 and 100.0</span>.
            </p>

            <form onSubmit={handleBatchUpload} className="space-y-4">
              <div className="border-2 border-dashed border-border hover:border-accent/60 rounded-xl p-8 text-center transition-colors">
                <input
                  type="file"
                  id="batch_file"
                  accept=".csv,.json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="batch_file" className="cursor-pointer block">
                  <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm font-semibold text-text-primary">
                    {file ? file.name : 'Select or drop CSV / JSON file'}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports .csv and .json array'}
                  </p>
                </label>
              </div>

              <div className="bg-bg-primary border border-border rounded-lg p-3 text-xs space-y-1.5 font-mono text-text-muted">
                <p className="font-bold text-text-secondary font-sans">Supported CSV Headers:</p>
                <p>match_id, team_code, minute, second, event_type, outcome, start_x, start_y, end_x, end_y, under_pressure, xg_value</p>
              </div>

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full bg-accent hover:bg-accent-hover text-bg-primary py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Ingesting & Validating...' : 'Run Validated Batch Import'}
              </button>
            </form>
          </div>

          {/* Results & Row-Level Error Reporting */}
          <div className="lg:col-span-7 bg-bg-card border border-border rounded-xl p-6 flex flex-col">
            <h2 className="text-base font-bold text-text-primary pb-2 border-b border-border mb-4 flex items-center justify-between">
              <span>Ingestion Report &amp; Row Validation</span>
              {importResult && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                    importResult.status === 'success'
                      ? 'bg-accent/10 text-accent'
                      : importResult.status === 'partial_success'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {importResult.status?.toUpperCase()}
                </span>
              )}
            </h2>

            {importResult ? (
              <div className="space-y-4 flex-1">
                {/* Metric Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-primary border border-border rounded-lg p-3 text-center">
                    <p className="text-[10px] text-text-muted uppercase">Total Rows</p>
                    <p className="text-xl font-bold font-mono text-text-primary">
                      {importResult.total_submitted}
                    </p>
                  </div>
                  <div className="bg-bg-primary border border-border rounded-lg p-3 text-center">
                    <p className="text-[10px] text-text-muted uppercase">Inserted</p>
                    <p className="text-xl font-bold font-mono text-accent">
                      {importResult.successfully_inserted}
                    </p>
                  </div>
                  <div className="bg-bg-primary border border-border rounded-lg p-3 text-center">
                    <p className="text-[10px] text-text-muted uppercase">Errors</p>
                    <p className="text-xl font-bold font-mono text-danger">
                      {importResult.error_count}
                    </p>
                  </div>
                </div>

                {/* Error Table */}
                {importResult.row_errors && importResult.row_errors.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-danger mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Row-Level Validation Rejections
                    </h3>
                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                      {importResult.row_errors.map((errItem: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-danger/5 border border-danger/30 rounded-lg p-3 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-mono font-bold text-danger">
                            <span>Row #{errItem.row_index}</span>
                          </div>
                          <ul className="list-disc list-inside text-text-secondary space-y-0.5">
                            {errItem.errors.map((msg: string, i: number) => (
                              <li key={i} className="text-danger/90">{msg}</li>
                            ))}
                          </ul>
                          <div className="mt-1 pt-1 border-t border-danger/20 font-mono text-[10px] text-text-muted truncate">
                            Data: {JSON.stringify(errItem.row_data)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-bg-primary rounded-lg border border-border">
                    <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-2" />
                    <p className="text-sm font-semibold text-text-primary">100% Clean Ingestion</p>
                    <p className="text-xs text-text-muted mt-1">
                      All event rows passed coordinate bounds, match reference, and player schema validation.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-muted">
                <Layers className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm text-text-secondary">No batch has been executed yet</p>
                <p className="text-xs mt-1">Upload a file on the left to see live row validation logs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL EVENT ENTRY */}
      {activeTab === 'MANUAL' && (
        <div className="bg-bg-card border border-border rounded-xl p-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-border mb-5">
            <Plus className="w-5 h-5 text-accent" />
            <h2 className="text-base font-bold text-text-primary">Log Real-Time Match Event</h2>
          </div>

          <form onSubmit={handleManualEventSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Target Match
                </label>
                <select
                  value={eventForm.match}
                  onChange={(e) => setEventForm({ ...eventForm, match: e.target.value })}
                  required
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select Match...</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} &middot; {m.home_team_name} vs {m.away_team_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Acting Team
                </label>
                <select
                  value={eventForm.team}
                  onChange={(e) => setEventForm({ ...eventForm, team: e.target.value, player: '' })}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Player
                </label>
                <select
                  value={eventForm.player}
                  onChange={(e) => setEventForm({ ...eventForm, player: e.target.value })}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="">Select Player (Optional)...</option>
                  {selectedTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.jersey_number} {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Period &amp; Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={eventForm.period}
                    onChange={(e) => setEventForm({ ...eventForm, period: parseInt(e.target.value) || 1 })}
                    className="bg-bg-primary border border-border rounded-lg px-2 py-2 text-xs text-text-primary"
                  >
                    <option value={1}>1st</option>
                    <option value={2}>2nd</option>
                    <option value={3}>ET1</option>
                    <option value={4}>ET2</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={130}
                    value={eventForm.minute}
                    onChange={(e) => setEventForm({ ...eventForm, minute: parseInt(e.target.value) || 0 })}
                    placeholder="Min"
                    className="bg-bg-primary border border-border rounded-lg px-2 py-2 text-xs text-text-primary font-mono text-center"
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={eventForm.second}
                    onChange={(e) => setEventForm({ ...eventForm, second: parseInt(e.target.value) || 0 })}
                    placeholder="Sec"
                    className="bg-bg-primary border border-border rounded-lg px-2 py-2 text-xs text-text-primary font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Event Type
                </label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="PASS">Pass</option>
                  <option value="SHOT">Shot</option>
                  <option value="GOAL">Goal</option>
                  <option value="TACKLE">Tackle</option>
                  <option value="INTERCEPTION">Interception</option>
                  <option value="FOUL">Foul</option>
                  <option value="CORNER">Corner</option>
                  <option value="TURNOVER">Turnover</option>
                </select>
              </div>
            </div>

            {/* Coordinates 0–100 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-bg-primary p-3 rounded-xl border border-border">
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1">Start X (0-100)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={eventForm.start_x}
                  onChange={(e) => setEventForm({ ...eventForm, start_x: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1">Start Y (0-100)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={eventForm.start_y}
                  onChange={(e) => setEventForm({ ...eventForm, start_y: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1">End X (0-100)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={eventForm.end_x}
                  onChange={(e) => setEventForm({ ...eventForm, end_x: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted mb-1">End Y (0-100)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={eventForm.end_y}
                  onChange={(e) => setEventForm({ ...eventForm, end_y: e.target.value })}
                  className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  Outcome
                </label>
                <select
                  value={eventForm.outcome}
                  onChange={(e) => setEventForm({ ...eventForm, outcome: e.target.value })}
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                >
                  <option value="SUCCESS">Success</option>
                  <option value="FAIL">Fail</option>
                  <option value="SAVED">Saved</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="OFF_TARGET">Off Target</option>
                  <option value="GOAL">Goal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-text-secondary mb-1">
                  xG Value (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={eventForm.xg_value}
                  onChange={(e) => setEventForm({ ...eventForm, xg_value: e.target.value })}
                  placeholder="e.g. 0.35"
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="under_pressure"
                  checked={eventForm.under_pressure}
                  onChange={(e) => setEventForm({ ...eventForm, under_pressure: e.target.checked })}
                  className="rounded border-border bg-bg-primary text-accent focus:ring-accent"
                />
                <label htmlFor="under_pressure" className="text-xs text-text-secondary cursor-pointer">
                  Under Defensive Pressure
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !eventForm.match || !eventForm.team}
              className="w-full bg-accent hover:bg-accent-hover text-bg-primary py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Recording to PostgreSQL...' : 'Submit Event to Match Log'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
