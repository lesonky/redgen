import React from 'react';
import { ArrowRight, Layout, Edit3, Type, Palette, RefreshCw, Loader2 } from 'lucide-react';
import { ImagePlanItem, PlanAnalysis } from '../../types';

interface PlanStepProps {
  plan: ImagePlanItem[];
  setPlan: React.Dispatch<React.SetStateAction<ImagePlanItem[]>>;
  analysis: PlanAnalysis;
  onNext: () => void;
  onBack: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const PlanStep: React.FC<PlanStepProps> = ({ plan, setPlan, analysis, onNext, onBack, onRegenerate, isRegenerating }) => {

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= plan.length) return;
    const newPlan = [...plan];
    const [movedItem] = newPlan.splice(fromIndex, 1);
    newPlan.splice(toIndex, 0, movedItem);
    // Update order numbers
    const reordered = newPlan.map((item, idx) => ({ ...item, order: idx + 1 }));
    setPlan(reordered);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Analysis Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
           <Layout className="w-5 h-5 text-red-500" /> AI Analysis
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-xs font-bold text-slate-400 uppercase">Direction</span>
            <p className="text-sm text-slate-700 mt-1">{analysis.contentDirection}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-xs font-bold text-slate-400 uppercase">Style</span>
            <p className="text-sm text-slate-700 mt-1">{analysis.styleAnalysis}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-xs font-bold text-slate-400 uppercase">Keywords</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {analysis.keywords.map(k => (
                <span key={k} className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">{k}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The Plan List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Generation Plan ({plan.length} Images)</h2>
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">Drag to reorder</span>
                <button 
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
                >
                    {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Regenerate Plan
                </button>
            </div>
        </div>

        <div className="space-y-3">
          {plan.map((item, index) => (
            <div key={item.id} className="group flex items-start gap-4 bg-white p-5 rounded-xl border border-slate-200 hover:border-red-300 transition-colors shadow-sm relative overflow-hidden">
               {/* Decorative Side Bar */}
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500/20 to-transparent" />

               {/* Order/Drag Handle */}
              <div className="flex flex-col items-center gap-2 pt-1 text-slate-400 pl-2">
                <span className="font-mono font-bold text-lg text-slate-300 w-6 text-center">{index + 1}</span>
                 <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveItem(index, index - 1)} disabled={index === 0} className="hover:text-red-500 disabled:opacity-30">▲</button>
                    <button onClick={() => moveItem(index, index + 1)} disabled={index === plan.length - 1} className="hover:text-red-500 disabled:opacity-30">▼</button>
                 </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                {/* Header: Role & Focus */}
                <div className="flex items-center flex-wrap gap-2">
                    <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-red-100 shadow-sm">{item.role}</span>
                    <span className="text-xs text-slate-400 border border-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Palette className="w-3 h-3" /> Inherit: {(item.inheritanceFocus || []).join(', ')}
                    </span>
                </div>

                {/* Main Description */}
                <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50/50 p-3 rounded-lg border border-slate-100/50">
                    {item.description}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-500">
                    <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                        <Layout className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                        <div>
                            <span className="font-semibold text-slate-600 block mb-0.5">Composition & Layout</span>
                            {item.composition}
                            {item.layoutSuggestion && (
                                <span className="block mt-1 text-slate-400 italic border-t border-slate-100 pt-1">
                                    {item.layoutSuggestion}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {item.copywriting && (
                        <div className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                            <Type className="w-3.5 h-3.5 mt-0.5 text-slate-400" />
                             <div>
                                <span className="font-semibold text-slate-600 block mb-0.5">Copywriting</span>
                                <span className="text-red-500 font-medium">{item.copywriting}</span>
                            </div>
                        </div>
                    )}
                </div>
              </div>

              {/* Edit Action (Mock) */}
              <button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button 
            onClick={onBack}
            className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
        >
            Back
        </button>
        <button
            onClick={onNext}
            disabled={isRegenerating}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20 flex justify-center items-center gap-2"
        >
            Start Generation <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PlanStep;