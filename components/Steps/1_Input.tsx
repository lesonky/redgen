import React, { useRef, useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, PenTool, Plus, ScanLine, BrainCircuit, Wand2, Globe, ShoppingBag, BookOpen, Palette, ArrowRight, UploadCloud, CheckCircle2 } from 'lucide-react';
import { ReferenceImage, TemplateType } from '../../types';
import { fileToGenerativePart } from '../../services/gemini';

interface InputProps {
  topic: string;
  setTopic: (t: string) => void;
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (t: TemplateType) => void;
  outputLanguage: string;
  setOutputLanguage: (l: string) => void;
  onNext: () => void;
  isProcessing: boolean;
  hasGeneratedConcepts?: boolean;
  onViewExisting?: () => void;
}

const ANALYSIS_STEPS = [
    { label: "Initializing Vision...", sub: "Preparing conceptual models", icon: ScanLine },
    { label: "Analyzing References...", sub: "Extracting core style & identity", icon: Palette },
    { label: "Designing Character/Mood...", sub: "Synthesizing visual elements", icon: BrainCircuit },
    { label: "Generating Master Concepts...", sub: "Rendering high-fidelity preview", icon: Wand2 },
];

const LANGUAGES = [
    "Simplified Chinese",
    "Traditional Chinese",
    "English",
    "Japanese",
    "Korean",
    "Custom"
];

export const InputStep: React.FC<InputProps> = ({
  topic,
  setTopic,
  referenceImages,
  setReferenceImages,
  selectedTemplate,
  setSelectedTemplate,
  outputLanguage,
  setOutputLanguage,
  onNext,
  isProcessing,
  hasGeneratedConcepts = false,
  onViewExisting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [isCustomLang, setIsCustomLang] = useState(false);

  // Simulation of analysis steps
  useEffect(() => {
    if (isProcessing) {
        setAnalysisStepIndex(0);
        const interval = setInterval(() => {
            setAnalysisStepIndex(prev => {
                if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
                return prev;
            });
        }, 3000); 
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
          mimeType: file.type,
          previewUrl: URL.createObjectURL(file),
          base64,
          isMaterial: true, 
          isStyle: true
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === "Custom") {
          setIsCustomLang(true);
          setOutputLanguage("");
      } else {
          setIsCustomLang(false);
          setOutputLanguage(val);
      }
  };

  const CurrentIcon = ANALYSIS_STEPS[analysisStepIndex].icon;
  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : 'from-red-500 to-pink-600';

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative animate-fade-in">
        {/* Top Accent */}
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${themeGradient} z-10 transition-colors duration-500`} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 md:p-12 max-w-4xl mx-auto w-full space-y-12">
                
                {/* Header Section */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Create Your Set</h1>
                    <p className="text-slate-500 text-lg max-w-lg mx-auto">Define your vision to generate consistent, high-quality image series.</p>
                </div>

                {/* 1. Style Selection Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                     <button 
                        onClick={() => setSelectedTemplate(TemplateType.XIAOHONGSHU)}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.XIAOHONGSHU 
                            ? 'border-red-500 bg-red-50/30 ring-4 ring-red-500/10 shadow-lg' 
                            : 'border-slate-200 hover:border-red-200 hover:bg-slate-50'}`}
                     >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.XIAOHONGSHU ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-red-500'}`}>
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.XIAOHONGSHU ? 'text-red-900' : 'text-slate-700'}`}>Commercial</h3>
                            <p className="text-sm text-slate-500 mt-1">Product showcases, brand storytelling, and lifestyle aesthetics.</p>
                        </div>
                        {selectedTemplate === TemplateType.XIAOHONGSHU && (
                            <div className="absolute top-4 right-4 text-red-500"><CheckCircle2 className="w-6 h-6" /></div>
                        )}
                     </button>

                     <button 
                        onClick={() => setSelectedTemplate(TemplateType.SCIENCE_COMIC)}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.SCIENCE_COMIC 
                            ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-lg' 
                            : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                     >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-900' : 'text-slate-700'}`}>Science Comic</h3>
                            <p className="text-sm text-slate-500 mt-1">Educational panels, consistent characters, and clear storytelling.</p>
                        </div>
                        {selectedTemplate === TemplateType.SCIENCE_COMIC && (
                            <div className="absolute top-4 right-4 text-blue-500"><CheckCircle2 className="w-6 h-6" /></div>
                        )}
                     </button>
                </div>

                {/* 2. Topic Input Area */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <PenTool className={`w-4 h-4 text-${themeColor}-500`} /> Project Topic
                         </label>
                         
                         {/* Language Selector */}
                         <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group-focus-within:ring-2">
                                <Globe className="w-3.5 h-3.5 text-slate-500" />
                                {isCustomLang ? (
                                    <input 
                                        type="text" 
                                        value={outputLanguage}
                                        onChange={(e) => setOutputLanguage(e.target.value)}
                                        placeholder="Language..."
                                        className="text-xs bg-transparent border-none outline-none w-24 text-slate-700 placeholder:text-slate-400 font-medium"
                                        autoFocus
                                    />
                                ) : (
                                    <select 
                                        value={LANGUAGES.includes(outputLanguage) ? outputLanguage : "Custom"}
                                        onChange={handleLanguageChange}
                                        className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none pr-4"
                                    >
                                        {LANGUAGES.map(lang => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                    </div>

                    <div className={`relative group transition-all duration-300`}>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={selectedTemplate === TemplateType.SCIENCE_COMIC 
                                ? "E.g., Topic: Photosynthesis\nAudience: Middle School Students\nKey Points: Sunlight, Water, Oxygen, Chlorophyll..." 
                                : "E.g., A minimalist home office setup with warm lighting, beige tones, wooden desk, coffee cup details, and a cozy atmosphere..."}
                            className={`w-full min-h-[180px] p-6 rounded-2xl border-2 bg-slate-50 outline-none transition-all resize-none text-slate-800 placeholder:text-slate-400 text-lg leading-relaxed
                            ${topic.trim() ? 'bg-white' : ''}
                            focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                        />
                        <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
                            <PenTool className={`w-5 h-5 text-${themeColor}-200`} />
                        </div>
                    </div>
                </div>

                {/* 3. Reference Upload Area */}
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ImageIcon className={`w-4 h-4 text-${themeColor}-500`} /> Visual References <span className="text-slate-400 font-normal ml-1">(Optional)</span>
                    </label>

                    {/* Drag & Drop Zone */}
                    <div 
                        className={`w-full rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden group
                        ${dragActive 
                            ? `border-${themeColor}-500 bg-${themeColor}-50/50 scale-[1.01]` 
                            : `border-slate-200 bg-slate-50 hover:bg-white hover:border-${themeColor}-300`}`}
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
                        
                        <div className="py-10 flex flex-col items-center justify-center gap-4 text-center">
                            <div className={`w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform group-hover:scale-110 group-hover:shadow-md border border-slate-100`}>
                                <UploadCloud className={`w-8 h-8 text-${themeColor}-500`} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-slate-700 font-bold">Click to upload or drag images here</p>
                                <p className="text-xs text-slate-400">Supports JPG, PNG, WEBP</p>
                            </div>
                        </div>
                    </div>

                    {/* Image Grid */}
                    {referenceImages.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pt-2">
                            {referenceImages.map((img) => (
                                <div key={img.id} className="relative group aspect-[3/4] rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <img src={img.previewUrl} alt="ref" className="w-full h-full object-cover" />
                                    
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-1 backdrop-blur-[1px]">
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleTag(img.id, 'isMaterial'); }}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 shadow-sm border ${img.isMaterial ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/20 text-white border-white/40 hover:bg-white/40'}`}
                                                title="Use as Subject Material"
                                            >M</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleTag(img.id, 'isStyle'); }}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 shadow-sm border ${img.isStyle ? 'bg-purple-500 text-white border-purple-400' : 'bg-white/20 text-white border-white/40 hover:bg-white/40'}`}
                                                title="Use as Style Reference"
                                            >S</button>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                            className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors mt-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    
                                    {/* Tag Indicators (visible when not hovering) */}
                                    <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-100 group-hover:opacity-0 transition-opacity">
                                        {img.isMaterial && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm ring-1 ring-white" />}
                                        {img.isStyle && <div className="w-2 h-2 rounded-full bg-purple-500 shadow-sm ring-1 ring-white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-5 border-t border-slate-100 bg-white/80 backdrop-blur-md flex justify-end items-center z-20 gap-4">
            {hasGeneratedConcepts && onViewExisting && !isProcessing && (
                <button
                    onClick={onViewExisting}
                    className="px-6 py-3.5 text-slate-600 font-bold rounded-xl transition-all hover:bg-slate-100 flex items-center gap-2"
                >
                    View Last Concept
                </button>
            )}

            <button
                onClick={onNext}
                disabled={!topic.trim() || isProcessing}
                className={`px-10 py-3.5 text-white text-base font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-3 bg-gradient-to-r ${themeGradient}`}
            >
                {hasGeneratedConcepts ? "Regenerate Concept" : "Generate Concept"} <ArrowRight className="w-5 h-5" />
            </button>
        </div>

        {/* Analysis Loading Overlay */}
        {isProcessing && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-[50] flex flex-col items-center justify-center animate-fade-in px-4">
                <div className="w-full max-w-sm space-y-8 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100 text-center ring-4 ring-slate-50">
                    <div className={`mx-auto w-20 h-20 rounded-full bg-${themeColor}-50 flex items-center justify-center relative`}>
                         <div className={`absolute inset-0 rounded-full border-4 border-${themeColor}-100 border-t-${themeColor}-500 animate-spin`}></div>
                        <CurrentIcon className={`w-8 h-8 text-${themeColor}-500`} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{ANALYSIS_STEPS[analysisStepIndex].label}</h2>
                        <p className="text-sm text-slate-500 font-medium">{ANALYSIS_STEPS[analysisStepIndex].sub}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ease-out bg-gradient-to-r ${themeGradient}`}
                            style={{ width: `${((analysisStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};