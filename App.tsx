import React, { useState, useEffect } from 'react';
import { AppStep, ImagePlanItem, PlanAnalysis, ReferenceImage, GeneratedImage, TemplateType } from './types';
import { InputStep } from './components/Steps/1_Input';
import ConceptStep from './components/Steps/1b_Concept';
import PlanStep from './components/Steps/2_Plan';
import GenerateStep from './components/Steps/3_Generate';
import EditorStep from './components/Steps/4_Editor';
import ExportStep from './components/Steps/5_Export';
import { generatePlan, generateImageFromPlan, generateConcept } from './services/gemini';
import { Sparkles, KeyRound, ExternalLink, BookOpen, ChevronRight, Check, Layout, ArrowLeft } from 'lucide-react';

const STEPS = [
  { id: AppStep.INPUT, label: 'Start' },
  { id: AppStep.CONCEPT, label: 'Concept' },
  { id: AppStep.PLAN_REVIEW, label: 'Plan' },
  { id: AppStep.GENERATING, label: 'Create' },
  { id: AppStep.EDITOR, label: 'Edit' },
  { id: AppStep.EXPORT, label: 'Finish' },
];

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data
  const [topic, setTopic] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(TemplateType.XIAOHONGSHU);
  const [outputLanguage, setOutputLanguage] = useState("Simplified Chinese");
  
  // Concept Data
  const [conceptAnalysis, setConceptAnalysis] = useState("");
  const [generatedConcepts, setGeneratedConcepts] = useState<ReferenceImage[]>([]);

  const [analysis, setAnalysis] = useState<PlanAnalysis | null>(null);
  const [plan, setPlan] = useState<ImagePlanItem[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Check API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for dev environments without the studio wrapper
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (e) {
        console.error("API Key selection failed", e);
      }
    }
  };

  // Handlers
  const handleGenerateConcept = async () => {
    setIsProcessing(true);
    try {
        const result = await generateConcept(topic, referenceImages, selectedTemplate);
        
        // Convert base64 to ReferenceImage objects
        const newConcepts: ReferenceImage[] = result.conceptImages.map(b64 => ({
            id: crypto.randomUUID(),
            base64: b64,
            mimeType: "image/jpeg",
            previewUrl: `data:image/jpeg;base64,${b64}`,
            isMaterial: true,
            isStyle: true
        }));

        setConceptAnalysis(result.analysisText);
        setGeneratedConcepts(newConcepts);
        setStep(AppStep.CONCEPT);
    } catch (e) {
        alert("Failed to generate concepts. Please check your API key or try again.");
        console.error("Concept generation error:", e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleViewExistingConcept = () => {
    setStep(AppStep.CONCEPT);
  };

  const handleConfirmConcept = async (selectedConcept: ReferenceImage) => {
    setIsProcessing(true);
    try {
      // Prioritize the selected concept by putting it first in the list
      const allReferences = [selectedConcept, ...referenceImages];
      
      const result = await generatePlan(topic, allReferences, selectedTemplate, outputLanguage);
      
      // Update the main reference list to include the approved concept
      setReferenceImages(allReferences);
      
      setAnalysis(result.analysis);
      setPlan(result.plan);
      setStep(AppStep.PLAN_REVIEW);
    } catch (e) {
      alert("Failed to generate plan. Please try again.");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartGeneration = async () => {
    setStep(AppStep.GENERATING);
    setGeneratedImages([]); // Clear previous
    setIsProcessing(true);

    const currentImages: GeneratedImage[] = [];

    for (let i = 0; i < plan.length; i++) {
        const item = plan[i];
        try {
            const previousImage = i > 0 ? currentImages[i-1] : undefined;
            const previousImageBase64 = previousImage ? previousImage.base64Data : undefined;
            
            const base64Data = await generateImageFromPlan(
              item, 
              referenceImages,
              previousImageBase64, 
              analysis || undefined,
              selectedTemplate,
              outputLanguage
            );
            const imageUrl = `data:image/jpeg;base64,${base64Data}`;

            const newImage: GeneratedImage = {
                id: item.id,
                planItem: item,
                imageUrl,
                base64Data,
                status: 'completed',
                editHistory: []
            };

            currentImages.push(newImage);
            setGeneratedImages([...currentImages]); // Update React state

        } catch (error) {
            console.error(`Error generating image ${i+1}`, error);
        }
    }

    setIsProcessing(false);
  };

  const handleRegeneratePlan = async () => {
      setIsProcessing(true);
      try {
        const result = await generatePlan(topic, referenceImages, selectedTemplate, outputLanguage);
        setAnalysis(result.analysis);
        setPlan(result.plan);
      } catch (e) {
          alert("Failed to regenerate plan.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleRegenerateSingleImage = async (index: number) => {
    if (index < 0 || index >= plan.length) return;

    setGeneratedImages(prev => prev.map((img, i) => 
        i === index ? { ...img, status: 'generating' } : img
    ));

    const item = plan[index];
    const previousImage = index > 0 ? generatedImages[index - 1] : undefined;
    const previousImageBase64 = previousImage ? previousImage.base64Data : undefined;

    try {
        const base64Data = await generateImageFromPlan(
          item, 
          referenceImages, 
          previousImageBase64, 
          analysis || undefined,
          selectedTemplate,
          outputLanguage
        );
        const imageUrl = `data:image/jpeg;base64,${base64Data}`;

        const newImage: GeneratedImage = {
            id: item.id,
            planItem: item,
            imageUrl,
            base64Data,
            status: 'completed',
            editHistory: []
        };

        setGeneratedImages(prev => prev.map((img, i) => 
            i === index ? newImage : img
        ));

    } catch (error) {
        console.error("Regeneration failed", error);
        setGeneratedImages(prev => prev.map((img, i) => 
            i === index ? { ...img, status: 'completed' } : img
        ));
        alert("Failed to regenerate image. Please try again.");
    }
  };

  const handleReset = () => {
    setTopic("");
    setReferenceImages([]);
    setAnalysis(null);
    setPlan([]);
    setGeneratedImages([]);
    setGeneratedConcepts([]);
    setConceptAnalysis("");
    setIsProcessing(false);
    setStep(AppStep.INPUT);
  };

  const handleBack = () => {
    if (isProcessing) return;
    
    switch (step) {
      case AppStep.CONCEPT:
        setStep(AppStep.INPUT);
        break;
      case AppStep.PLAN_REVIEW:
        setStep(AppStep.CONCEPT);
        break;
      case AppStep.GENERATING:
        setStep(AppStep.PLAN_REVIEW);
        break;
      case AppStep.EDITOR:
        setStep(AppStep.GENERATING);
        break;
      case AppStep.EXPORT:
        setStep(AppStep.EDITOR);
        break;
      default:
        break;
    }
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl space-y-6 border border-slate-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <KeyRound className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Connect Google AI</h1>
            <p className="text-slate-500 mb-4">
              To use the high-quality <strong>Gemini 3.0 Pro</strong> image models, you need to select a paid API key from a Google Cloud project.
            </p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-red-500 hover:underline flex items-center justify-center gap-1"
            >
              Billing Documentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <button
            onClick={handleSelectKey}
            className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === step);
  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : 'red';

  return (
    <div className="h-screen bg-slate-50 flex flex-col text-slate-800 font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex-shrink-0 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition-colors duration-500 ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-red-500 to-pink-600'}`}>
                {selectedTemplate === TemplateType.SCIENCE_COMIC ? <BookOpen className="w-5 h-5" /> : <Layout className="w-5 h-5" />}
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 hidden sm:block">RedSet Gen</span>
        </div>
        
        {/* Unified Stepper */}
        <div className="flex items-center">
          <div className="flex items-center bg-slate-100 rounded-full p-1 overflow-x-auto max-w-[60vw] scrollbar-hide">
            {STEPS.map((s, idx) => {
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;
              
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-white shadow-sm' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors duration-300 flex-shrink-0
                      ${isActive 
                          ? `border-${themeColor}-500 text-${themeColor}-500` 
                          : isCompleted 
                              ? `bg-${themeColor}-500 border-${themeColor}-500 text-white` 
                              : 'border-slate-300 text-slate-300'}`}>
                      {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    {/* Label: Always show active, hide others on small screens to save space */}
                    <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? `text-${themeColor}-600` : isCompleted ? 'text-slate-800' : 'text-slate-400 hidden sm:block'}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                     <div className="w-4 sm:w-6 h-px bg-slate-200 mx-1 min-w-[10px]" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                Gemini 3 Pro
            </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Container */}
      <main className="flex-1 overflow-hidden relative w-full bg-slate-50">
        <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 flex justify-center">
            {/* Centered container with full width capability */}
            <div className="w-full h-full max-w-7xl flex flex-col">
            
            {step === AppStep.INPUT && (
                <InputStep 
                    topic={topic}
                    setTopic={setTopic}
                    referenceImages={referenceImages}
                    setReferenceImages={setReferenceImages}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    outputLanguage={outputLanguage}
                    setOutputLanguage={setOutputLanguage}
                    onNext={handleGenerateConcept}
                    isProcessing={isProcessing}
                    hasGeneratedConcepts={generatedConcepts.length > 0}
                    onViewExisting={handleViewExistingConcept}
                />
            )}

            {step === AppStep.CONCEPT && (
                <ConceptStep 
                    analysisText={conceptAnalysis}
                    conceptImages={generatedConcepts}
                    selectedTemplate={selectedTemplate}
                    onConfirm={handleConfirmConcept}
                    onRegenerate={handleGenerateConcept}
                    isProcessing={isProcessing}
                    onBack={handleBack}
                />
            )}

            {step === AppStep.PLAN_REVIEW && analysis && (
                <PlanStep 
                    plan={plan}
                    setPlan={setPlan}
                    analysis={analysis}
                    onBack={handleBack}
                    onNext={handleStartGeneration}
                    onRegenerate={handleRegeneratePlan}
                    isRegenerating={isProcessing}
                    selectedTemplate={selectedTemplate}
                />
            )}

            {step === AppStep.GENERATING && (
                <GenerateStep 
                    plan={plan}
                    generatedImages={generatedImages}
                    isGenerating={isProcessing}
                    currentGeneratingIndex={generatedImages.length}
                    onContinue={() => setStep(AppStep.EDITOR)}
                    onBack={handleBack}
                    onRegenerate={handleRegenerateSingleImage}
                    selectedTemplate={selectedTemplate}
                />
            )}

            {step === AppStep.EDITOR && (
                <EditorStep 
                    images={generatedImages}
                    setImages={setGeneratedImages}
                    onFinish={() => setStep(AppStep.EXPORT)}
                    onBack={handleBack}
                    selectedTemplate={selectedTemplate}
                />
            )}

            {step === AppStep.EXPORT && (
                <ExportStep 
                    images={generatedImages} 
                    onReset={handleReset} 
                    onBack={handleBack}
                    selectedTemplate={selectedTemplate}
                />
            )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;