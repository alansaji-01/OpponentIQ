import { FileText } from 'lucide-react';

export default function Reports() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold">Reports</h2>
      </div>
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <p className="text-text-secondary text-sm">
          Saved evidence-cited tactical briefs with export/print will be built in Phase 7.
        </p>
      </div>
    </div>
  );
}
