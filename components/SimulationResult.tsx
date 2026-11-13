'use client';

import { CheckCircle, XCircle } from 'lucide-react';

interface EvaluationBudget {
  memory: number;
  steps: number;
}

export interface SimResult {
  isSuccess: boolean;
  evaluationResult?: Record<string, EvaluationBudget>;
  reason?: string;
}

export default function SimulationResult({ result }: { result: SimResult | null }) {
  if (!result) return null;

  if (result.isSuccess && result.evaluationResult) {
    const redeemers = Object.entries(result.evaluationResult);
    return (
      <div className="mt-4 p-4 rounded-lg bg-green-900/50 border border-green-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-400" />
          <h3 className="text-lg font-bold text-green-400">Simulation Succeeded</h3>
        </div>
        <div className="mt-2 space-y-2 pl-8">
          {redeemers.map(([key, value]) => (
            <div key={key} className="text-sm text-slate-200 font-mono">
              {redeemers.length > 1 && <p className="text-slate-400 text-xs">{key}</p>}
              <p>Memory: {value.memory}</p>
              <p>Steps: {value.steps}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 rounded-lg bg-red-900/50 border border-red-400">
      <div className="flex items-center gap-2">
        <XCircle className="text-red-400" />
        <h3 className="text-lg font-bold text-red-400">Simulation Failed</h3>
      </div>
      <div className="mt-2 text-sm text-slate-200 font-mono pl-8">
        <p>Reason: {result.reason || 'Unknown error'}</p>
      </div>
    </div>
  );
}
