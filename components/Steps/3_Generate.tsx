import React, { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { GeneratedImage, ImagePlanItem } from '../../types';

interface GenerateStepProps {
  plan: ImagePlanItem[];
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  currentGeneratingIndex: number;
  onContinue: () => void;
  onCancel: () => void;
  onRegenerate: (index: number) => void;
}

const GenerateStep: React.FC<GenerateStepProps> = ({
  plan,
  generatedImages,
  isGenerating,
  currentGeneratingIndex,
  onContinue,
  onCancel,
  onRegenerate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the latest image
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generatedImages.length, currentGeneratingIndex]);

  const progress = Math.round((generatedImages.length / plan.length) * 100);

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex gap-6">
      
      {/* Left: Progress & Status */}
      <div className="w-64 flex flex-col gap-4">
         <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="3"
                    />
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeDasharray={`${progress}, 100`}
                        className="animate-[spin_1s_ease-out_reverse]"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-slate-800">{progress}%</span>
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-slate-800">Generating Set</h3>
                <p className="text-sm text-slate-500">Image {currentGeneratingIndex + 1} of {plan.length}</p>
            </div>
            {isGenerating ? (
                 <div className="flex items-center justify-center gap-2 text-sm text-red-500 font-medium bg-red-50 py-2 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                 </div>
            ) : (
                <button onClick={onContinue} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm hover:bg-slate-900 shadow-lg shadow-slate-800/20">
                    Continue to Editor
                </button>
            )}
         </div>

         <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {plan.map((item, idx) => {
                const isCompleted = idx < generatedImages.length;
                const isCurrent = idx === currentGeneratingIndex;
                const isPending = idx > currentGeneratingIndex;

                return (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg text-sm border ${isCurrent ? 'bg-white border-red-500 shadow-sm' : 'border-transparent'} ${isCompleted ? 'opacity-50' : ''}`}>
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border 
                            ${isCompleted ? 'bg-green-100 text-green-600 border-green-200' : 
                              isCurrent ? 'bg-red-500 text-white border-red-500' : 
                              'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="font-medium truncate text-slate-700">{item.role}</p>
                             <p className="text-xs text-slate-400 truncate">{(item.inheritanceFocus || []).join('+')}</p>
                         </div>
                    </div>
                )
            })}
         </div>
      </div>

      {/* Right: Real-time Canvas */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-slate-100 rounded-2xl p-8 overflow-y-auto border border-slate-200 shadow-inner flex flex-wrap content-start gap-6 justify-center"
      >
        {generatedImages.map((img, idx) => (
            <div key={img.id} className="w-[240px] flex-shrink-0 animate-fade-in-up group relative">
                <div className="aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden border border-white relative">
                    <img 
                        src={img.imageUrl} 
                        alt={`Generated ${idx}`} 
                        className={`w-full h-full object-cover transition-all duration-300 ${img.status === 'generating' ? 'scale-105 blur-sm brightness-110' : 'group-hover:scale-105'}`} 
                    />
                    
                    {/* Regenerate Loading State */}
                    {img.status === 'generating' && (
                        <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                            <span className="text-xs font-bold text-red-600 bg-white/80 px-2 py-1 rounded-full">Redrawing...</span>
                        </div>
                    )}

                    {/* Hover Actions (Only if not generating) */}
                    {img.status !== 'generating' && !isGenerating && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <button 
                                onClick={() => onRegenerate(idx)}
                                className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white hover:bg-red-50 text-slate-800 hover:text-red-500 px-4 py-2 rounded-full font-medium text-sm shadow-xl flex items-center gap-2"
                             >
                                <RefreshCw className="w-4 h-4" /> Regenerate
                             </button>
                        </div>
                    )}
                </div>
                <div className="mt-2 text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">#{idx + 1} {img.planItem.role}</span>
                </div>
            </div>
        ))}

        {isGenerating && (
            <div className="w-[240px] flex-shrink-0 opacity-50">
                 <div className="aspect-[3/4] bg-slate-200 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-3 animate-pulse">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    <span className="text-sm text-slate-500 font-medium">Painting...</span>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GenerateStep;