import React, { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, RefreshCw, Image as ImageIcon } from 'lucide-react';
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
    <div className="w-full max-w-[1800px] mx-auto h-[calc(100vh-140px)] flex gap-8">
      
      {/* Left: Progress & Status */}
      <div className="w-80 flex flex-col gap-6 flex-shrink-0">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
            <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="2"
                    />
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray={`${progress}, 100`}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-slate-800">{progress}%</span>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Generating Set</h3>
                <p className="text-slate-500 font-medium">Image {Math.min(currentGeneratingIndex + 1, plan.length)} of {plan.length}</p>
            </div>
            {isGenerating ? (
                 <div className="flex items-center justify-center gap-2 text-sm text-red-600 font-semibold bg-red-50 py-3 rounded-xl border border-red-100">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                 </div>
            ) : (
                <button onClick={onContinue} className="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold hover:bg-slate-900 shadow-lg shadow-slate-800/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                    Continue to Editor
                </button>
            )}
         </div>

         <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {plan.map((item, idx) => {
                const isCompleted = idx < generatedImages.length;
                const isCurrent = idx === currentGeneratingIndex;

                return (
                    <div key={item.id} className={`flex items-start gap-3 p-4 rounded-xl text-sm border transition-all duration-300
                        ${isCurrent 
                            ? 'bg-white border-red-500 shadow-md transform scale-[1.02]' 
                            : 'border-transparent hover:bg-white/60'} 
                        ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                         
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 mt-0.5
                            ${isCompleted ? 'bg-green-100 text-green-600 border-green-200' : 
                              isCurrent ? 'bg-red-500 text-white border-red-500' : 
                              'bg-slate-200 text-slate-400 border-slate-300'}`}>
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                         </div>
                         
                         <div className="flex-1 min-w-0 space-y-0.5">
                             <p className={`font-bold truncate ${isCurrent ? 'text-red-600' : 'text-slate-700'}`}>{item.role}</p>
                             <p className="text-xs text-slate-400 truncate">{(item.inheritanceFocus || []).join(' + ')}</p>
                         </div>
                    </div>
                )
            })}
         </div>
      </div>

      {/* Right: Real-time Canvas (Grid Layout) */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-slate-100/50 rounded-3xl p-8 overflow-y-auto border border-slate-200/60 shadow-inner grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8 content-start"
      >
        {generatedImages.map((img, idx) => (
            <div key={img.id} className="flex flex-col gap-3 animate-fade-in-up group">
                <div className="w-full aspect-[3/4] bg-white rounded-2xl shadow-lg overflow-hidden border border-white/50 relative transition-transform hover:shadow-xl hover:-translate-y-1">
                    <img 
                        src={img.imageUrl} 
                        alt={`Generated ${idx}`} 
                        className={`w-full h-full object-cover transition-all duration-700 ${img.status === 'generating' ? 'scale-110 blur-md brightness-110' : 'scale-100'}`} 
                    />
                    
                    {/* Regenerate Loading State */}
                    {img.status === 'generating' && (
                        <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                            <div className="bg-white p-3 rounded-full shadow-lg">
                                <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                            </div>
                            <span className="text-xs font-bold text-red-600 bg-white/90 px-3 py-1 rounded-full shadow-sm">Redrawing...</span>
                        </div>
                    )}

                    {/* Hover Actions (Only if not generating) */}
                    {img.status !== 'generating' && !isGenerating && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                             <button 
                                onClick={() => onRegenerate(idx)}
                                className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white hover:bg-red-50 text-slate-800 hover:text-red-500 px-5 py-2.5 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2"
                             >
                                <RefreshCw className="w-4 h-4" /> Regenerate
                             </button>
                        </div>
                    )}
                </div>
                
                {/* Image Details */}
                <div className="px-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Image #{idx + 1}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${img.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            {img.status}
                        </span>
                    </div>
                    <p className="text-base font-bold text-slate-800 truncate">{img.planItem.role}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-0.5">{img.planItem.description}</p>
                </div>
            </div>
        ))}

        {isGenerating && (
            <div className="flex flex-col gap-3 opacity-70">
                 <div className="w-full aspect-[3/4] bg-slate-200/50 rounded-2xl border-3 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="text-slate-600 font-bold">Creating Image...</p>
                        <p className="text-slate-400 text-xs mt-1">Applying style & composition</p>
                    </div>
                 </div>
                 <div className="px-2 space-y-2">
                    <div className="h-5 w-1/3 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GenerateStep;