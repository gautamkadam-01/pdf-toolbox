import React from 'react';
import {
  MousePointerClick,
  FilePlus,
  Cpu,
  Download,
  Zap,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export const WorkflowSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Select a Tool',
      desc: 'Pick from 26 specialized tools tailored for merging, splitting, converting, editing, or signing.',
      icon: MousePointerClick,
    },
    {
      num: '02',
      title: 'Add Documents',
      desc: 'Drag & drop your PDF, JPG, PNG, or text files directly into the browser workspace sandbox.',
      icon: FilePlus,
    },
    {
      num: '03',
      title: 'Process Locally',
      desc: 'High-speed JavaScript and WebAssembly algorithms transform your file inside your local device RAM.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'Instant Download',
      desc: 'Receive your clean, lossless output file immediately with zero server queues or wait times.',
      icon: Download,
    },
  ];

  return (
    <section id="workflow-timeline" className="py-20 sm:py-28 bg-white border-b border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-red-700 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <Zap size={13} />
            <span>INSTANT PIPELINE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight uppercase leading-tight">
            HOW PDF TOOLBOX WORKS.
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            A frictionless workflow designed around privacy and speed. No accounts, no waiting queues, no cloud latency.
          </p>
        </div>

        {/* 4 Steps Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-200/90 hover:border-slate-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white group-hover:bg-red-600 border border-slate-200 group-hover:border-red-600 text-slate-700 group-hover:text-white flex items-center justify-center transition-all shadow-2xs">
                      <Icon size={22} />
                    </div>

                    <span className="text-2xl font-black font-mono text-slate-300 group-hover:text-red-400 transition-colors">
                      {item.num}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-1.5 text-[11px] font-mono text-emerald-600">
                  <CheckCircle2 size={13} />
                  <span>STEP {item.num} READY</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
