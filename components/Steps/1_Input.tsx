import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Sparkles, PenTool, Plus, ScanLine, BrainCircuit, LayoutTemplate, Palette, CheckCircle2, Box, Paintbrush, BookOpen, ShoppingBag } from 'lucide-react';
import { ReferenceImage, TemplateType } from '../../types';
import { fileToGenerativePart } from '../../services/gemini';

interface InputProps {
  topic: string;
  setTopic: (t: string) => void;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (t: TemplateType) => void;
  onNext: () => void;
  isProcessing: boolean;
}

const ANALYSIS_STEPS = [
    { label: "Scanning Reference Images...", sub: "Extracting features & composition", icon: ScanLine },
    { label: "Analyzing Visual Identity...", sub: "Detecting color palette & lighting", icon: Palette },
    { label: "Decoding Mood & Vibe...", sub: "Understanding emotional resonance", icon: BrainCircuit },
    { label: "Structuring Narrative Flow...", sub: "Planning sequence & layout", icon: LayoutTemplate },
    { label: "Finalizing Creative Brief...", sub: "Generating prompts & layout", icon: Sparkles },
];

export const InputStep: React.FC<InputProps> = ({
  topic,
  setTopic,
  referenceImages,
  setReferenceImages,
  selectedTemplate,
  setSelectedTemplate,
  onNext,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);

  // Simulation of analysis steps
  useEffect(() => {
    if (isProcessing) {
        setAnalysisStepIndex(0);
        const interval = setInterval(() => {
            setAnalysisStepIndex(prev => {
                if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
                return prev;
            });
        }, 2500); // Advance every 2.5 seconds
        return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newImages: ReferenceImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      try {
        const base64 = await fileToGenerativePart(file);
        newImages.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          isMaterial: true, // Default enabled
          isStyle: true     // Default enabled
        });
      } catch (e) {
        console.error("Error processing file", file.name, e);
      }
    }
    setReferenceImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  };

  const toggleTag = (id: string, tag: 'isMaterial' | 'isStyle') => {
    setReferenceImages(prev => prev.map(img => {
      if (img.id === id) {
        return { ...img, [tag]: !img[tag] };
      }
      return img;
    }));
  };

  // Get current step icon
  const CurrentIcon = ANALYSIS_STEPS[analysisStepIndex].icon;

  return (
    <div className="relative">
      <div className="max-w-4xl mx-auto relative animate-fade-in">
        {/* Decorative Background Blob */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-50 -z-10 animate-pulse" />
        <div className="absolute top-40 -right-20 w-72 h-72 bg-pink-100 rounded-full blur-3xl opacity-50 -z-10" />

        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600 tracking-tight flex items-center justify-center gap-3">
            RedSet Gen <Sparkles className="w-8 h-8 text-pink-500" />
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
            Create stunning image sets with AI-powered visual storytelling.
          </p>
        </div>

        {/* Template Selector */}
        <div className="max-w-xl mx-auto mb-8 bg-slate-100 p-1 rounded-xl flex shadow-inner">
            <button 
                onClick={() => setSelectedTemplate(TemplateType.XIAOHONGSHU)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${selectedTemplate === TemplateType.XIAOHONGSHU ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <ShoppingBag className="w-4 h-4" /> Xiaohongshu Commercial
            </button>
            <button 
                onClick={() => setSelectedTemplate(TemplateType.SCIENCE_COMIC)}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <BookOpen className="w-4 h-4" /> Science Comic
            </button>
        </div>

        <div className="grid gap-8">
          {/* Topic Input Card */}
          <div className={`bg-white p-6 rounded-3xl shadow-sm border relative group transition-all hover:shadow-md ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'border-blue-100' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                      <PenTool className="w-5 h-5" />
                  </div>
                  <label className="text-lg font-bold text-slate-800">
                    {selectedTemplate === TemplateType.SCIENCE_COMIC ? "Subject & Knowledge Points" : "Topic & Vibe"}
                  </label>
              </div>
              
              <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={
                    selectedTemplate === TemplateType.SCIENCE_COMIC 
                    ? "e.g., Photosynthesis. Audience: Middle school students. Character: Dr. Leaf. Points: Light absorption, water transport, oxygen release."
                    : "Describe your vision... e.g., 'A minimalist home office setup with warm morning light, beige tones, coffee cup details.'"
                  }
                  className={`w-full h-40 p-5 rounded-2xl border bg-slate-50/50 outline-none transition-all resize-none text-slate-900 placeholder:text-slate-400 text-lg leading-relaxed
                    ${selectedTemplate === TemplateType.SCIENCE_COMIC 
                        ? 'border-blue-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' 
                        : 'border-slate-200 focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10'}`}
              />
          </div>

          {/* Reference Images Card */}
          <div className={`bg-white p-6 rounded-3xl shadow-sm border relative group transition-all hover:shadow-md ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'border-blue-100' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                          <ImageIcon className="w-5 h-5" />
                      </div>
                      <label className="text-lg font-bold text-slate-800">
                        {selectedTemplate === TemplateType.SCIENCE_COMIC ? "Character Refs (Optional)" : "Style References (Optional)"} 
                      </label>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 bg-slate-100 rounded-full text-slate-500">
                      {referenceImages.length} / 5 Uploaded
                  </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {/* Upload Button */}
                  <div 
                      className={`aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300
                      ${dragActive 
                        ? (selectedTemplate === TemplateType.SCIENCE_COMIC ? 'border-blue-500 bg-blue-50/50 scale-95' : 'border-red-500 bg-red-50/50 scale-95') 
                        : (selectedTemplate === TemplateType.SCIENCE_COMIC ? 'border-blue-100 hover:border-blue-400 hover:bg-blue-50/30' : 'border-slate-200 hover:border-red-400 hover:bg-red-50/30')}`}
                      onDragEnter={() => setDragActive(true)}
                      onDragLeave={() => setDragActive(false)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                  >
                      <input 
                          type="file" 
                          multiple 
                          accept="image/*"
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={(e) => handleFiles(e.target.files)}
                      />
                      <div className={`w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-500' : 'text-red-500'}`}>
                          <Plus className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-medium text-slate-400">Add Image</span>
                  </div>

                  {/* Image Previews */}
                  {referenceImages.map((img) => (
                      <div key={img.id} className="relative group aspect-[3/4] rounded-2xl border border-slate-100 shadow-sm bg-white cursor-default flex flex-col overflow-hidden">
                          {/* Image Area */}
                          <div className="relative flex-1 overflow-hidden">
                            <img src={img.previewUrl} alt="ref" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm hover:bg-red-500 text-slate-600 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm transform hover:scale-110 z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Control Bar */}
                          <div className="h-10 border-t border-slate-100 bg-slate-50/50 flex items-center justify-around px-1">
                              <button
                                onClick={() => toggleTag(img.id, 'isMaterial')}
                                title="Material Source (Subject)"
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${img.isMaterial ? 'bg-blue-100 text-blue-600' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                <Box className="w-3 h-3" /> Material
                              </button>
                              <div className="w-px h-4 bg-slate-200" />
                              <button
                                onClick={() => toggleTag(img.id, 'isStyle')}
                                title="Style Reference (Look)"
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${img.isStyle ? 'bg-purple-100 text-purple-600' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                <Paintbrush className="w-3 h-3" /> Style
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Generate Button */}
          <div className="pt-4 pb-8">
              <button
                  onClick={onNext}
                  disabled={!topic.trim() || isProcessing}
                  className={`w-full py-5 text-white text-xl font-bold rounded-2xl transition-all shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3
                    ${selectedTemplate === TemplateType.SCIENCE_COMIC 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/20 hover:shadow-blue-500/30 disabled:from-slate-300 disabled:to-slate-300'
                        : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/20 hover:shadow-red-500/30 disabled:from-slate-300 disabled:to-slate-300'
                    }`}
              >
                  <Sparkles className="w-6 h-6" />
                  {selectedTemplate === TemplateType.SCIENCE_COMIC ? "Generate Comic Script" : "Generate Commercial Plan"}
              </button>
              <p className="text-center text-slate-400 text-sm mt-4">
                  Powered by Gemini 3.0 Pro • {selectedTemplate === TemplateType.SCIENCE_COMIC ? "Educational Storytelling" : "Xiaohongshu Visual Intelligence"}
              </p>
          </div>
        </div>
      </div>

      {/* Analysis Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-fade-in px-4">
            <div className="w-full max-w-md space-y-8">
                {/* Central Icon */}
                <div className="relative w-24 h-24 mx-auto">
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-100' : 'bg-red-100'}`}></div>
                    <div className={`relative bg-white p-6 rounded-full shadow-xl border flex items-center justify-center ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'border-blue-100' : 'border-red-100'}`}>
                        <CurrentIcon className={`w-10 h-10 animate-pulse ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-500' : 'text-red-500'}`} />
                    </div>
                </div>

                {/* Text Progress */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800 animate-fade-in-up transition-all duration-300">
                        {ANALYSIS_STEPS[analysisStepIndex].label}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {ANALYSIS_STEPS[analysisStepIndex].sub}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ease-out ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-gradient-to-r from-blue-400 to-indigo-600' : 'bg-gradient-to-r from-red-400 to-pink-600'}`}
                        style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Steps List */}
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                    {ANALYSIS_STEPS.map((step, idx) => {
                        const isCompleted = idx < analysisStepIndex;
                        const isCurrent = idx === analysisStepIndex;
                        
                        return (
                            <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${isCurrent ? 'opacity-100 translate-x-2' : isCompleted ? 'opacity-40' : 'opacity-30'}`}>
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                ) : isCurrent ? (
                                    <Loader2 className={`w-5 h-5 animate-spin flex-shrink-0 ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-500' : 'text-red-500'}`} />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                                )}
                                <span className={`font-medium ${isCurrent ? 'text-slate-800' : 'text-slate-500'}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};