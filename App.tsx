import React, { useState, useEffect } from 'react';
import { AppStep, ImagePlanItem, PlanAnalysis, ReferenceImage, GeneratedImage, TemplateType } from './types';
import { InputStep } from './components/Steps/1_Input';
import PlanStep from './components/Steps/2_Plan';
import GenerateStep from './components/Steps/3_Generate';
import EditorStep from './components/Steps/4_Editor';
import ExportStep from './components/Steps/5_Export';
import { generatePlan, generateImageFromPlan } from './services/gemini';
import { Sparkles, KeyRound, ExternalLink, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [isProcessing, setIsProcessing] = useState(false);

  // Data
  const [topic, setTopic] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(TemplateType.XIAOHONGSHU);
  
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
  const handleGeneratePlan = async () => {
    setIsProcessing(true);
    try {
      const result = await generatePlan(topic, referenceImages, selectedTemplate);
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

    // We use a mutable array for immediate loop access to previous images
    const currentImages: GeneratedImage[] = [];

    for (let i = 0; i < plan.length; i++) {
        const item = plan[i];
        try {
            // Fix: Check if previous image exists before accessing properties
            const previousImage = i > 0 ? currentImages[i-1] : undefined;
            const previousImageBase64 = previousImage ? previousImage.base64Data : undefined;
            
            // Call API with Analysis Context and All Reference Images
            const base64Data = await generateImageFromPlan(
              item, 
              referenceImages, 
              previousImageBase64, 
              analysis || undefined,
              selectedTemplate
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
            // We continue to the next image even if one fails
        }
    }

    setIsProcessing(false);
  };

  const handleRegenerateSingleImage = async (index: number) => {
    if (index < 0 || index >= plan.length) return;

    // Set status to generating to show spinner
    setGeneratedImages(prev => prev.map((img, i) => 
        i === index ? { ...img, status: 'generating' } : img
    ));

    const item = plan[index];
    
    // Use the *current* previous image as context
    const previousImage = index > 0 ? generatedImages[index - 1] : undefined;
    const previousImageBase64 = previousImage ? previousImage.base64Data : undefined;

    try {
        // Call API with Analysis Context
        const base64Data = await generateImageFromPlan(
          item, 
          referenceImages, 
          previousImageBase64, 
          analysis || undefined,
          selectedTemplate
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
        // Revert status to completed to hide spinner
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
    setIsProcessing(false);
    // Don't reset selectedTemplate to persist user preference
    setStep(AppStep.INPUT);
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl space-y-6">
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-md ${selectedTemplate === TemplateType.SCIENCE_COMIC ? 'bg-gradient-to-br from-blue-500 to-indigo-500' : 'bg-gradient-to-br from-red-500 to-pink-500'}`}>
                {selectedTemplate === TemplateType.SCIENCE_COMIC ? <BookOpen className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <span className="font-bold text-lg tracking-tight">RedSet Gen</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            <span>GEMINI 3 PRO PREVIEW</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-hidden">
        {step === AppStep.INPUT && (
            <InputStep 
                topic={topic}
                setTopic={setTopic}
                referenceImages={referenceImages}
                setReferenceImages={setReferenceImages}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                onNext={handleGeneratePlan}
                isProcessing={isProcessing}
            />
        )}

        {step === AppStep.PLAN_REVIEW && analysis && (
            <PlanStep 
                plan={plan}
                setPlan={setPlan}
                analysis={analysis}
                onBack={() => setStep(AppStep.INPUT)}
                onNext={handleStartGeneration}
                onRegenerate={handleGeneratePlan}
                isRegenerating={isProcessing}
            />
        )}

        {step === AppStep.GENERATING && (
            <GenerateStep 
                plan={plan}
                generatedImages={generatedImages}
                isGenerating={isProcessing}
                currentGeneratingIndex={generatedImages.length}
                onContinue={() => setStep(AppStep.EDITOR)}
                onCancel={() => setIsProcessing(false)}
                onRegenerate={handleRegenerateSingleImage}
            />
        )}

        {step === AppStep.EDITOR && (
            <EditorStep 
                images={generatedImages}
                setImages={setGeneratedImages}
                onFinish={() => setStep(AppStep.EXPORT)}
            />
        )}

        {step === AppStep.EXPORT && (
            <ExportStep images={generatedImages} onReset={handleReset} />
        )}
      </main>
    </div>
  );
};

export default App;