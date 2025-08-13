'use client';

import { CheckCircle, XCircle } from 'lucide-react';

export default function SimulationResult({ result }) {
  if (!result) return null;

  const isSuccess = result.result?.EvaluationResult !== undefined;

  if (isSuccess) {
    const redeemerResult = result.result.EvaluationResult[Object.keys(result.result.EvaluationResult)[0]];
    return (
      <div className="mt-4 p-4 rounded-lg bg-green-900/50 border border-green-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-400" />
          <h3 className="text-lg font-bold text-green-400">Simulation Succeeded</h3>
        </div>
        <div className="mt-2 text-sm text-slate-200 font-mono pl-8">
          <p>Memory: {redeemerResult.memory}</p>
          <p>Steps: {redeemerResult.steps}</p>
        </div>
      </div>
    );
  } else {
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
}