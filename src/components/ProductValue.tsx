import React from 'react';
import { Check, X, Shield, Zap, Sparkles, Lock } from 'lucide-react';

export const ProductValue: React.FC = () => {
  const comparison = [
    {
      feature: 'Processing Location',
      toolbox: '100% In-Browser (Local Client-Side)',
      others: 'Uploaded to 3rd party cloud servers',
    },
    {
      feature: 'File Privacy & Retention',
      toolbox: 'Files never leave your device memory',
      others: 'Stored in server queues & temp caches',
    },
    {
      feature: 'Usage Limits & Quotas',
      toolbox: 'Unlimited files, zero daily quotas',
      others: 'Strict page limits or paywalled locks',
    },
    {
      feature: 'Execution Speed',
      toolbox: 'Instant local CPU execution (0ms upload)',
      others: 'Slow roundtrip upload & download latency',
    },
    {
      feature: 'User Account & Signup',
      toolbox: 'No login, no email required',
      others: 'Forced account sign-ups & credit cards',
    },
    {
      feature: 'Subscription Cost',
      toolbox: '100% Free & Open forever',
      others: '$12–$29 / month recurring fees',
    },
  ];

  return (
    <section id="product-value" className="py-20 sm:py-28 bg-[#FBF9F5] border-b border-slate-200 bg-paper-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <span>ARCHITECTURAL ADVANTAGE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight uppercase leading-tight">
            ONE TOOLBOX.
            <br />
            <span className="text-red-600">WITHOUT THE CLUTTER.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            See how PDF Toolbox compares against traditional online document converters.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-4">Capability</th>
                  <th className="py-4 px-4 bg-red-600/15 text-red-400 font-bold rounded-t-xl">
                    PDF Toolbox (Local)
                  </th>
                  <th className="py-4 px-4 text-slate-400">Typical Cloud Services</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {comparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-200">{row.feature}</td>
                    <td className="py-4 px-4 bg-red-600/5 text-emerald-400">
                      <span className="inline-flex items-center gap-2 font-mono">
                        <Check size={15} className="text-emerald-400 shrink-0" />
                        {row.toolbox}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      <span className="inline-flex items-center gap-2 font-mono text-slate-400">
                        <X size={15} className="text-rose-400 shrink-0" />
                        {row.others}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" />
              <span>Safe for confidential enterprise & legal documents</span>
            </div>
            <span>ZERO SERVER FOOTPRINT</span>
          </div>
        </div>
      </div>
    </section>
  );
};
