import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { ReferenceImage, TemplateType } from '../../types';

interface ConceptStepProps {
  analysisText: string;
  conceptImages: ReferenceImage[];
  selectedTemplate: TemplateType;
  onConfirm: (selectedConceptImage: ReferenceImage) => void;
  onRegenerate: () => void;
  isProcessing: boolean;
}

const ConceptStep: React.FC<ConceptStepProps> = ({
  analysisText,
  conceptImages,
  selectedTemplate,
  onConfirm,
  onRegenerate,
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

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      {/* Header & Analysis */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className={`w-6 h-6 ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-500' : 'text-red-500'}`} />
          Concept Analysis & Visual Style
        </h2>
        <div className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed text-sm border border-slate-100">
           {analysisText}
        </div>
      </div>

      {/* Generated Concepts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-700">Choose Your Master Reference</h3>
        <p className="text-slate-500 text-sm">
           Select the image that best captures the character/product and vibe you want for the entire set.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {conceptImages.map((img, idx) => {
            const isSelected = selectedId === img.id;
            return (
              <div 
                key={img.id}
                onClick={() => setSelectedId(img.id)}
                className={`relative group rounded-2xl overflow-hidden cursor-pointer border-4 transition-all duration-300 shadow-md hover:shadow-xl
                  ${isSelected 
                    ? (selectedTemplate === TemplateType.SCIENCE_COMIC ? 'border-blue-500 scale-[1.02]' : 'border-red-500 scale-[1.02]') 
                    : 'border-white hover:border-slate-200 opacity-80 hover:opacity-100'}`}
              >
                <div className="aspect-[3/4]">
                   <img src={img.previewUrl} alt={`Concept ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
                
                {/* Selection Indicator */}
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${isSelected 
                     ? (selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-500 text-white' : 'bg-red-500 text-white') 
                     : 'bg-black/30 text-white/50 group-hover:bg-black/50'}`}>
                   <CheckCircle2 className="w-5 h-5" />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                   <span className="text-white font-bold text-lg">Option {idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 pb-8">
         <button
            onClick={handleRegenerate}
            disabled={isProcessing}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm"
         >
            {isProcessing && loadingAction === 'regenerate' ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            Regenerate Concepts
         </button>
         
         <button
            onClick={handleConfirm}
            disabled={isProcessing || !selectedId}
            className={`flex-1 py-4 text-white font-bold rounded-xl transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3
               ${selectedTemplate === TemplateType.SCIENCE_COMIC 
                   ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20' 
                   : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/20'}`}
         >
            {isProcessing && loadingAction === 'confirm' ? (
                <>Generating Plan... <Loader2 className="w-6 h-6 animate-spin" /></>
            ) : (
                <>Confirm & Generate Plan <ArrowRight className="w-6 h-6" /></>
            )}
         </button>
      </div>
    </div>
  );
};

export default ConceptStep;