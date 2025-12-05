import React, { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, RefreshCw, Image as ImageIcon, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { GeneratedImage, ImagePlanItem, TemplateType } from '../../types';

interface GenerateStepProps {
  plan: ImagePlanItem[];
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  currentGeneratingIndex: number;
  onContinue: () => void;
  onBack: () => void;
  onRegenerate: (index: number) => void;
  selectedTemplate: TemplateType;
}

const GenerateStep: React.FC<GenerateStepProps> = ({
  plan,
  generatedImages,
  isGenerating,
  currentGeneratingIndex,
  onContinue,
  onBack,
  onRegenerate,
  selectedTemplate
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generatedImages.length, currentGeneratingIndex]);

  const progress = Math.round((generatedImages.length / plan.length) * 100);
  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : 'from-red-500 to-pink-600';

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-4 md:gap-8 overflow-hidden animate-fade-in">
      
      {/* Left Sidebar: Status & Progress - Collapsible on small screens if needed, here just stacked */}
      <div className="w-full md:w-80 flex flex-col gap-4 md:gap-6 flex-shrink-0 h-1/3 md:h-full">
         
         {/* Status Card */}
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4 md:space-y-6 flex-shrink-0 relative overflow-hidden">
             <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${themeGradient}`} />
            <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mt-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="3"
                    />
                    <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={`currentColor`}
                        strokeWidth="3"
                        strokeDasharray={`${progress}, 100`}
                        strokeLinecap="round"
                        className={`transition-all duration-500 ease-out text-${themeColor}-500`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl md:text-3xl font-extrabold text-slate-800">{progress}%</span>
                </div>
            </div>
            
            <div className="hidden md:block">
                <h3 className="text-lg font-bold text-slate-800">Generating Set</h3>
                <p className="text-slate-500 text-sm font-medium">Image {Math.min(currentGeneratingIndex + 1, plan.length)} of {plan.length}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 text-left flex gap-2">
                 <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                 <p className="opacity-90">生成图片角色可能有误差，等任务完成后，可以重新生成。</p>
            </div>

            {isGenerating ? (
                 <div className={`flex items-center justify-center gap-2 text-sm font-bold text-${themeColor}-600 bg-${themeColor}-50 py-2.5 rounded-xl border border-${themeColor}-100`}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                 </div>
            ) : (
                <div className="space-y-3 pt-2">
                    <button onClick={onContinue} className={`w-full py-2.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r ${themeGradient} hover:shadow-xl transition-all`}>
                        Go to Editor <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={onBack} className="w-full py-2.5 rounded-xl font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Plan
                    </button>
                </div>
            )}
         </div>

         {/* List */}
         <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider bg-slate-50/50">Queue</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {plan.map((item, idx) => {
                    const isCompleted = idx < generatedImages.length;
                    const isCurrent = idx === currentGeneratingIndex;

                    return (
                        <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl text-sm border transition-all duration-300
                            ${isCurrent 
                                ? `bg-white border-${themeColor}-500 shadow-md transform scale-[1.02] z-10` 
                                : 'border-transparent hover:bg-slate-50'} 
                            ${isCompleted ? 'opacity-60 grayscale' : ''}`}>
                            
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border flex-shrink-0
                                ${isCompleted ? 'bg-green-100 text-green-600 border-green-200' : 
                                isCurrent ? `bg-${themeColor}-500 text-white border-${themeColor}-500` : 
                                'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold truncate ${isCurrent ? `text-${themeColor}-600` : 'text-slate-700'}`}>{item.role}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
         </div>
      </div>

      {/* Right: Gallery Grid */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-slate-100 rounded-2xl p-6 md:p-8 overflow-y-auto border border-slate-200 shadow-inner grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 content-start custom-scrollbar relative h-2/3 md:h-full"
      >
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {generatedImages.map((img, idx) => (
            <div key={img.id} className="flex flex-col gap-3 animate-fade-in-up group z-10">
                <div className="w-full aspect-[3/4] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative transition-transform hover:shadow-xl hover:-translate-y-1">
                    <img 
                        src={img.imageUrl} 
                        alt={`Generated ${idx}`} 
                        className={`w-full h-full object-cover transition-all duration-700 ${img.status === 'generating' ? 'scale-110 blur-sm brightness-110' : 'scale-100'}`} 
                    />
                    
                    {img.status === 'generating' && (
                        <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                            <div className="bg-white p-3 rounded-full shadow-lg">
                                <Loader2 className={`w-6 h-6 text-${themeColor}-600 animate-spin`} />
                            </div>
                        </div>
                    )}

                    {img.status !== 'generating' && !isGenerating && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                             <button 
                                onClick={() => onRegenerate(idx)}
                                className={`transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white hover:bg-${themeColor}-50 text-slate-800 hover:text-${themeColor}-600 px-5 py-2.5 rounded-full font-bold text-sm shadow-2xl flex items-center gap-2`}
                             >
                                <RefreshCw className="w-4 h-4" /> Regenerate
                             </button>
                        </div>
                    )}
                </div>
                
                <div className="px-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">#{idx + 1}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${img.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            {img.status}
                        </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate">{img.planItem.role}</p>
                </div>
            </div>
        ))}

        {isGenerating && (
            <div className="flex flex-col gap-3 opacity-70 z-10">
                 <div className="w-full aspect-[3/4] bg-slate-200/50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="p-4 bg-white rounded-full shadow-sm">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                    <div className="text-center">
                        <p className="text-slate-600 font-bold">Creating Image...</p>
                        <p className="text-slate-400 text-xs mt-1">Applying style & composition</p>
                    </div>
                 </div>
                 <div className="px-1 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GenerateStep;