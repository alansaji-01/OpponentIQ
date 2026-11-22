import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Database,
  User,
  CheckCircle2,
  Lock,
  Layers,
  Award
} from 'lucide-react';

interface MLThreshold {
  name: string;
  algorithm: string;
  threshold_metric: string;
  required: number;
  current: number;
  met: boolean;
  active_model?: any;
}

interface MLModelRecord {
  id: number;
  name: string;
  algorithm: string;
  version: string;
  description: string;
  training_sample_count: number;
  metrics: Record<string, any>;
  is_active: boolean;
  trained_at: string | null;
}

export default function Settings() {
  const { user } = useAuth();
  const [thresholds, setThresholds] = useState<MLThreshold[]>([]);
  const [models, setModels] = useState<MLModelRecord[]>([]);
  const [auditInfo, setAuditInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trainingAlgorithm, setTrainingAlgorithm] = useState<string | null>(null);

  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchMLRegistry = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ml/models/');
      setThresholds(res.data.thresholds);
      setModels(res.data.registry);
      setAuditInfo(res.data.system_audit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLRegistry();
  }, []);

  const handleTrainModel = async (algorithm: string) => {
    try {
      setTrainingAlgorithm(algorithm);
      const res = await api.post('/ml/train/', { algorithm });
      if (res.data.status === 'success') {
        showNotice(`Successfully trained & calibrated ${algorithm} model!`);
      } else if (res.data.status === 'fallback_deterministic') {
        showNotice(res.data.message, 'error');
      } else {
        showNotice(res.data.message || 'Model training completed', 'error');
      }
      fetchMLRegistry();
    } catch (err: any) {
      showNotice(err.response?.data?.error || 'Training pipeline failed', 'error');
    } finally {
      setTrainingAlgorithm(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1700px] mx-auto select-none">
      {/* Broadcast Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 panel-tactical p-4 bg-[#0B0F19] border-border-bright">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent text-black flex items-center justify-center font-black">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-widest uppercase font-mono text-white">
              SYSTEM SETTINGS &amp; TACTICAL ML MODEL REGISTRY
            </h1>
            <p className="text-[11px] text-text-secondary font-mono">
              ROLE-BASED ACCESS CONTROL &middot; HONEST ML THRESHOLDS (RULE 4) &middot; ALGORITHM AUDITING
            </p>
          </div>
        </div>

        {/* Global Dataset Tag */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="panel-tactical px-3 py-1.5 bg-[#07090E] border-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-text-muted">RULE 4 HONESTY ENFORCER:</span>
            <span className="text-accent font-bold">ACTIVE</span>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`panel-tactical p-3 border flex items-center gap-2 text-xs font-mono ${
            notice.type === 'success'
              ? 'bg-accent/10 border-accent/40 text-accent'
              : 'bg-danger/10 border-danger/40 text-danger'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Grid: Operator Profile & System Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Operator RBAC Profile Card (4 cols) */}
        <div className="lg:col-span-4 panel-tactical p-4 bg-[#0A0D15] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              OPERATOR IDENTITY &amp; RBAC PERMISSIONS
            </span>
            <span className="px-1.5 py-0.5 text-[9px] bg-accent text-black font-black">
              AUTHENTICATED
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#07090E] border border-border space-y-1">
              <span className="text-[10px] text-text-muted uppercase">USERNAME</span>
              <p className="text-white font-bold text-sm">{user ? user.username : 'admin'}</p>
            </div>

            <div className="p-3 bg-[#07090E] border border-border space-y-1">
              <span className="text-[10px] text-text-muted uppercase">ASSIGNED RBAC ROLE</span>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span className="text-accent font-bold text-sm">{user ? user.role : 'ADMIN'}</span>
              </div>
              <p className="text-[10px] text-text-muted">
                Privileges: Full model calibration, manual event entry, video ingestion, report issuance.
              </p>
            </div>

            <div className="p-3 bg-[#07090E] border border-border space-y-1">
              <span className="text-[10px] text-text-muted uppercase">ORGANIZATION</span>
              <p className="text-white font-bold">{user?.organization || 'OpponentIQ Tactical Intelligence HQ'}</p>
            </div>
          </div>
        </div>

        {/* Honest ML Threshold Enforcement Card (8 cols) */}
        <div className="lg:col-span-8 panel-tactical p-4 bg-[#0A0D15] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent" />
              HONEST ML INFERENCE THRESHOLDS (RULE 4)
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              AUDITED FROM REAL POSTGRESQL MATCHES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {thresholds.map((t) => (
              <div
                key={t.algorithm}
                className={`p-3.5 border space-y-2 bg-[#07090E] ${
                  t.met ? 'border-border hover:border-accent/50' : 'border-warning/40 bg-warning/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs">{t.name}</h3>
                    <span className="text-[10px] text-text-muted uppercase">{t.algorithm}</span>
                  </div>
                  {t.met ? (
                    <span className="px-2 py-0.5 text-[9px] bg-accent/10 border border-accent/30 text-accent font-bold">
                      THRESHOLD MET
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[9px] bg-warning/20 border border-warning/40 text-warning font-bold">
                      FALLBACK ACTIVE
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                  <span className="text-text-muted">
                    {t.threshold_metric}: <span className="text-white font-bold">{t.current}</span> / {t.required} REQUIRED
                  </span>
                  <button
                    onClick={() => handleTrainModel(t.algorithm)}
                    disabled={trainingAlgorithm === t.algorithm}
                    className="btn-tactical btn-primary py-1 px-2.5 text-[9px] gap-1"
                  >
                    {trainingAlgorithm === t.algorithm ? (
                      <RotateCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    CALIBRATE
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#07090E] border border-border text-[11px] font-mono text-text-muted flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              If dataset sample count is below the minimum operational threshold, the engine automatically falls back to deterministic rule-based models.
            </span>
          </div>
        </div>
      </div>

      {/* Model Registry Audit Table */}
      <div className="panel-tactical p-4 bg-[#0A0D15] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="font-mono text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" />
            PERSISTED ML MODEL ARTIFACTS REGISTRY
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            {models.length} ACTIVE ARTIFACTS
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            QUERYING ARTIFACT REGISTRY...
          </div>
        ) : models.length === 0 ? (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            No trained models found in registry. Click 'CALIBRATE' above to train artifacts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase text-[10px]">
                  <th className="py-2.5">MODEL NAME</th>
                  <th className="py-2.5">ALGORITHM</th>
                  <th className="py-2.5">VERSION</th>
                  <th className="py-2.5 text-right">TRAINING SAMPLES</th>
                  <th className="py-2.5 text-right">EVALUATION METRICS</th>
                  <th className="py-2.5 text-center">STATUS</th>
                  <th className="py-2.5 text-right">LAST CALIBRATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-[#121824] transition-colors">
                    <td className="py-3 font-bold text-white">{m.name}</td>
                    <td className="py-3 text-text-secondary">{m.algorithm}</td>
                    <td className="py-3">
                      <span className="px-1.5 py-0.5 bg-[#07090E] border border-border text-accent font-bold">
                        v{m.version}
                      </span>
                    </td>
                    <td className="py-3 text-right text-white font-bold">{m.training_sample_count}</td>
                    <td className="py-3 text-right text-accent font-mono">
                      {JSON.stringify(m.metrics)}
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 text-[10px] bg-accent text-black font-black">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3 text-right text-text-muted">{m.trained_at || 'Recently'}</td>
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
