import React, { useRef, useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, PenTool, Plus, ScanLine, BrainCircuit, Wand2, Globe, ShoppingBag, BookOpen, Palette, ArrowRight, UploadCloud, CheckCircle2, Presentation, Ratio, Layers, AlignLeft, Loader2 } from 'lucide-react';
import { ReferenceImage, TemplateType, AspectRatio } from '../../types';
import { fileToGenerativePart, generateInputSuggestions } from '../../services/gemini';

interface InputProps {
  mainTopic: string;
  setMainTopic: (t: string) => void;
  styleInput: string;
  setStyleInput: (t: string) => void;
  contentInput: string;
  setContentInput: (t: string) => void;
  
  referenceImages: ReferenceImage[];
  setReferenceImages: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (t: TemplateType) => void;
  outputLanguage: string;
  setOutputLanguage: (l: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (r: AspectRatio) => void;
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

const ASPECT_RATIOS: AspectRatio[] = ["3:4", "9:16", "1:1", "4:3", "16:9"];

export const InputStep: React.FC<InputProps> = ({
  mainTopic,
  setMainTopic,
  styleInput,
  setStyleInput,
  contentInput,
  setContentInput,

  referenceImages,
  setReferenceImages,
  selectedTemplate,
  setSelectedTemplate,
  outputLanguage,
  setOutputLanguage,
  aspectRatio,
  setAspectRatio,
  onNext,
  isProcessing,
  hasGeneratedConcepts = false,
  onViewExisting
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [isCustomLang, setIsCustomLang] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

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

  const handleTemplateSelect = (template: TemplateType) => {
      setSelectedTemplate(template);
      // Auto-set default aspect ratio based on template
      if (template === TemplateType.XIAOHONGSHU || template === TemplateType.SCIENCE_COMIC) {
          setAspectRatio("3:4");
      } else if (template === TemplateType.PPT) {
          setAspectRatio("16:9");
      }
  };

  const handleAutoFill = async () => {
    if (!mainTopic.trim() && referenceImages.length === 0) {
        alert("Please enter a Topic or upload an image first.");
        return;
    }
    
    setIsAutoFilling(true);
    try {
        const result = await generateInputSuggestions(mainTopic, referenceImages, selectedTemplate);
        if (result.style) setStyleInput(result.style);
        if (result.content) setContentInput(result.content);
    } catch (e) {
        console.error(e);
        alert("Failed to auto-generate suggestions.");
    } finally {
        setIsAutoFilling(false);
    }
  };

  const getPlaceholders = () => {
    switch (selectedTemplate) {
        case TemplateType.SCIENCE_COMIC:
            return {
                topic: "e.g., Photosynthesis Process",
                style: "e.g., Western cartoon style, thick outlines, bright colors",
                content: "e.g., Sunlight, Water molecules, Oxygen bubbles, Chloroplast characters"
            };
        case TemplateType.PPT:
            return {
                topic: "e.g., AI Technology Trends in 2025",
                style: "e.g., Tech Blue, Futuristic, Clean, Minimalist",
                content: "e.g., Introduction, LLM architecture, Agent workflows, Future outlook"
            };
        default: // Xiaohongshu
            return {
                topic: "e.g., A minimalist home office setup",
                style: "e.g., Warm lighting, beige tones, wooden texture, cozy atmosphere",
                content: "e.g., Wooden desk, ceramic coffee cup, laptop, green plant"
            };
    }
  };

  const ph = getPlaceholders();
  const CurrentIcon = ANALYSIS_STEPS[analysisStepIndex].icon;
  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : selectedTemplate === TemplateType.PPT ? 'orange' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : selectedTemplate === TemplateType.PPT
        ? 'from-orange-500 to-amber-600'
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
                <div className="grid md:grid-cols-3 gap-6">
                     <button 
                        onClick={() => handleTemplateSelect(TemplateType.XIAOHONGSHU)}
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
                            <p className="text-xs text-slate-500 mt-1">Product, Lifestyle, Brand Visuals.</p>
                        </div>
                        {selectedTemplate === TemplateType.XIAOHONGSHU && (
                            <div className="absolute top-4 right-4 text-red-500"><CheckCircle2 className="w-6 h-6" /></div>
                        )}
                     </button>

                     <button 
                        onClick={() => handleTemplateSelect(TemplateType.PPT)}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.PPT 
                            ? 'border-orange-500 bg-orange-50/30 ring-4 ring-orange-500/10 shadow-lg' 
                            : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'}`}
                     >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.PPT ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-orange-500'}`}>
                            <Presentation className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.PPT ? 'text-orange-900' : 'text-slate-700'}`}>PPT Slides</h3>
                            <p className="text-xs text-slate-500 mt-1">Presentation Deck, Tech, Business.</p>
                        </div>
                        {selectedTemplate === TemplateType.PPT && (
                            <div className="absolute top-4 right-4 text-orange-500"><CheckCircle2 className="w-6 h-6" /></div>
                        )}
                     </button>

                     <button 
                        onClick={() => handleTemplateSelect(TemplateType.SCIENCE_COMIC)}
                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col gap-4 group
                        ${selectedTemplate === TemplateType.SCIENCE_COMIC 
                            ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-lg' 
                            : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}
                     >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'text-blue-900' : 'text-slate-700'}`}>Comic</h3>
                            <p className="text-xs text-slate-500 mt-1">Education, Storyboard, Panels.</p>
                        </div>
                        {selectedTemplate === TemplateType.SCIENCE_COMIC && (
                            <div className="absolute top-4 right-4 text-blue-500"><CheckCircle2 className="w-6 h-6" /></div>
                        )}
                     </button>
                </div>

                {/* 2. Topic Input Area - Split into 3 */}
                <div className="space-y-6">
                    {/* Header Row with Selectors */}
                    <div className="flex flex-wrap items-center justify-between gap-y-2">
                         <div className="flex items-center gap-3">
                             <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <PenTool className={`w-4 h-4 text-${themeColor}-500`} /> Project Details
                             </h3>
                             
                             <button
                                onClick={handleAutoFill}
                                disabled={isAutoFilling || (!mainTopic.trim() && referenceImages.length === 0)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all
                                ${!mainTopic.trim() && referenceImages.length === 0 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : `bg-${themeColor}-50 text-${themeColor}-600 hover:bg-${themeColor}-100 border border-${themeColor}-200`}`}
                                title="Auto-generate Style & Content based on Topic"
                             >
                                {isAutoFilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Auto-Fill with AI
                             </button>
                         </div>
                         
                         <div className="flex items-center gap-2">
                             {/* Aspect Ratio Selector */}
                            <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-300">
                                <Ratio className="w-3.5 h-3.5 text-slate-500" />
                                <select 
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                    className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer border-none p-0 focus:ring-0 appearance-none pr-1"
                                >
                                    {ASPECT_RATIOS.map(ratio => (
                                        <option key={ratio} value={ratio}>{ratio}</option>
                                    ))}
                                </select>
                            </div>

                             {/* Language Selector */}
                             <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group-focus-within:ring-2 border border-transparent hover:border-slate-300">
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
                    </div>

                    <div className="grid gap-6">
                        {/* Field 1: Topic */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Topic / Subject <span className="text-red-500">*</span></label>
                            <input
                                value={mainTopic}
                                onChange={(e) => setMainTopic(e.target.value)}
                                placeholder={ph.topic}
                                className={`w-full p-4 rounded-xl border-2 bg-slate-50 outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium text-lg
                                ${mainTopic.trim() ? 'bg-white' : ''}
                                focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                            />
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                             {/* Field 3: Content (Main Input) - Takes 2/3 width */}
                             <div className="md:col-span-2 space-y-2 h-full flex flex-col">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <AlignLeft className="w-3.5 h-3.5" /> Core Content / Details <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={contentInput}
                                    onChange={(e) => setContentInput(e.target.value)}
                                    placeholder={ph.content}
                                    rows={5}
                                    className={`w-full p-4 rounded-xl border-2 bg-slate-50 outline-none transition-all resize-none text-slate-800 placeholder:text-slate-400 text-sm flex-1 min-h-[160px]
                                    ${contentInput.trim() ? 'bg-white' : ''}
                                    focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                                />
                             </div>

                             {/* Field 2: Style (Secondary) - Takes 1/3 width */}
                             <div className="md:col-span-1 space-y-2 h-full flex flex-col">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Palette className="w-3.5 h-3.5" /> Art Style
                                </label>
                                <textarea
                                    value={styleInput}
                                    onChange={(e) => setStyleInput(e.target.value)}
                                    placeholder={ph.style}
                                    rows={5}
                                    className={`w-full p-4 rounded-xl border-2 bg-slate-50 outline-none transition-all resize-none text-slate-800 placeholder:text-slate-400 text-sm flex-1 min-h-[160px]
                                    ${styleInput.trim() ? 'bg-white' : ''}
                                    focus:bg-white focus:border-${themeColor}-500 focus:shadow-lg focus:shadow-${themeColor}-500/5 border-slate-200`}
                                />
                             </div>
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
                disabled={(!mainTopic.trim() && !contentInput.trim()) || isProcessing}
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
