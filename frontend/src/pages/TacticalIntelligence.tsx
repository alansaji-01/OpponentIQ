import { Brain } from 'lucide-react';

export default function TacticalIntelligence() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold">Tactical Intelligence</h2>
      </div>
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <p className="text-text-secondary text-sm">
          Attacking/defensive/formation stats, ML patterns, and AI report generator will be built in Phases 6-7.
        </p>
      </div>
    </div>
  );
}
