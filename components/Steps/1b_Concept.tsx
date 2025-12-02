import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, ArrowRight, Loader2, ArrowLeft, Wand2 } from 'lucide-react';
import { ReferenceImage, TemplateType } from '../../types';

interface ConceptStepProps {
  analysisText: string;
  conceptImages: ReferenceImage[];
  selectedTemplate: TemplateType;
  onConfirm: (selectedConceptImage: ReferenceImage) => void;
  onRegenerate: () => void;
  onBack: () => void;
  isProcessing: boolean;
}

const ConceptStep: React.FC<ConceptStepProps> = ({
  analysisText,
  conceptImages,
  selectedTemplate,
  onConfirm,
  onRegenerate,
  onBack,
  isProcessing
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    conceptImages.length > 0 ? conceptImages[0].id : null
  );
  
  const [loadingAction, setLoadingAction] = useState<'regenerate' | 'confirm' | null>(null);

  useEffect(() => {
    if (!isProcessing) {
      setLoadingAction(null);
    }
  }, [isProcessing]);

  const handleConfirm = () => {
    const selected = conceptImages.find(img => img.id === selectedId);
    if (selected) {
      setLoadingAction('confirm');
      onConfirm(selected);
    }
  };

  const handleRegenerate = () => {
    setLoadingAction('regenerate');
    onRegenerate();
  };

  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : 'from-red-500 to-pink-600';

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
         <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${themeGradient} z-10`} />
         
         <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto w-full">
                {/* Analysis Box */}
                <div className="space-y-6 text-center max-w-3xl mx-auto">
                    <div className="space-y-2">
                        <div className={`mx-auto w-12 h-12 rounded-2xl bg-${themeColor}-50 flex items-center justify-center text-${themeColor}-500 mb-4 shadow-sm`}>
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900">Review AI Concept</h2>
                        <p className="text-slate-500">We've analyzed your request. Choose the best style direction below.</p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl text-slate-700 leading-relaxed text-sm border border-slate-200 text-left shadow-sm">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                            <Sparkles className={`w-4 h-4 text-${themeColor}-500`} />
                            <span className="font-bold uppercase text-xs tracking-wider text-slate-900">AI Visual Analysis</span>
                        </div>
                        {analysisText}
                    </div>
                </div>

                {/* Selection Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-lg font-bold text-slate-800">Select Master Style</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {conceptImages.map((img, idx) => {
                        const isSelected = selectedId === img.id;
                        return (
                        <div 
                            key={img.id}
                            onClick={() => setSelectedId(img.id)}
                            className={`relative group rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 shadow-sm bg-white
                            ${isSelected 
                                ? `border-${themeColor}-500 ring-4 ring-${themeColor}-500/10 shadow-xl scale-[1.01]` 
                                : 'border-transparent hover:shadow-lg'}`}
                        >
                            <div className="aspect-[3/4] bg-slate-100 relative">
                               <img src={img.previewUrl} alt={`Concept ${idx + 1}`} className="w-full h-full object-cover" />
                               {/* Hover Overlay */}
                               <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors ${isSelected ? 'bg-transparent' : ''}`} />
                            </div>
                            
                            <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg scale-0 group-hover:scale-100
                            ${isSelected 
                                ? `scale-100 bg-${themeColor}-500 text-white` 
                                : 'bg-white text-slate-300'}`}>
                               <CheckCircle2 className="w-6 h-6" />
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-16">
                               <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-white/90'}`}>Concept Option {idx + 1}</span>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
            </div>
         </div>

         {/* Fixed Footer */}
         <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center z-10">
             <div className="flex items-center gap-3">
                 <button
                    onClick={onBack}
                    disabled={isProcessing}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
                 >
                    <ArrowLeft className="w-4 h-4" /> Back
                 </button>

                 <button
                    onClick={handleRegenerate}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm"
                 >
                    {isProcessing && loadingAction === 'regenerate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Regenerate
                 </button>
             </div>

             <button
                onClick={handleConfirm}
                disabled={isProcessing || !selectedId}
                className={`px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 bg-gradient-to-r ${themeGradient}`}
             >
                {isProcessing && loadingAction === 'confirm' ? (
                    <>Designing Plan... <Loader2 className="w-4 h-4 animate-spin" /></>
                ) : (
                    <>Confirm & Plan <ArrowRight className="w-4 h-4" /></>
                )}
             </button>
         </div>
    </div>
  );
};

export default ConceptStep;