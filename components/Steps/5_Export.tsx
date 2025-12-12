import React, { useState } from 'react';
import { GeneratedImage, TemplateType, AspectRatio } from '../../types';
import { Download, Check, Loader2, RotateCcw, ArrowLeft, Share2 } from 'lucide-react';
import JSZip from 'jszip';

interface ExportStepProps {
  images: GeneratedImage[];
  onReset: () => void;
  onBack: () => void;
  selectedTemplate: TemplateType;
  aspectRatio: AspectRatio;
}

const ExportStep: React.FC<ExportStepProps> = ({ images, onReset, onBack, selectedTemplate, aspectRatio }) => {
  const [isZipping, setIsZipping] = useState(false);
  
  const downloadAll = async () => {
     if (isZipping) return;
     setIsZipping(true);
     
     try {
         const zip = new JSZip();
         const folder = zip.folder("redset_images");

         images.forEach((img, idx) => {
             const safeRole = img.planItem.role.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
             const filename = `${(idx + 1).toString().padStart(2, '0')}_${safeRole}.jpg`;
             if (folder) {
                folder.file(filename, img.base64Data, { base64: true });
             }
         });

         const content = await zip.generateAsync({ type: "blob" });
         const link = document.createElement('a');
         link.href = URL.createObjectURL(content);
         link.download = `redset_${selectedTemplate.toLowerCase()}_images.zip`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         setTimeout(() => URL.revokeObjectURL(link.href), 100);

     } catch (error) {
         console.error("Failed to zip images:", error);
         alert("Failed to package images. Please try again.");
     } finally {
         setIsZipping(false);
     }
  };

  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : selectedTemplate === TemplateType.PPT ? 'orange' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : selectedTemplate === TemplateType.PPT
        ? 'from-orange-500 to-amber-600'
        : 'from-red-500 to-pink-600';

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
       <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${themeGradient} z-10`} />
       
       {/* Main Card */}
       <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 md:p-12 space-y-12 max-w-5xl mx-auto w-full flex flex-col items-center">
                
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow shadow-lg shadow-green-100">
                        <Check className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Set Complete!</h1>
                    <p className="text-slate-500 text-lg">Your images are ready for publication.</p>
                </div>

                {/* Grid Preview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 w-full">
                    {images.map((img, idx) => (
                        <div key={img.id} className="bg-white rounded-xl overflow-hidden shadow-sm relative group border border-slate-100 transform transition-transform hover:-translate-y-1 hover:shadow-md" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
                            <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                #{idx + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
       </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
                <button
                onClick={onBack}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
                >
                <ArrowLeft className="w-4 h-4" /> Back to Editor
                </button>

                <div className="flex items-center gap-4">
                <button
                    onClick={onReset}
                    disabled={isZipping}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-colors text-sm"
                >
                    <RotateCcw className="w-4 h-4" /> Start New
                </button>

                <button 
                    onClick={downloadAll}
                    disabled={isZipping}
                    className={`px-8 py-3 text-white text-sm md:text-base font-bold rounded-xl shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 bg-gradient-to-r ${themeGradient} ${isZipping ? 'opacity-75 cursor-wait' : ''}`}
                >
                    {isZipping ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Packaging...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" /> Download ZIP
                        </>
                    )}
                </button>
                </div>
        </div>
    </div>
  );
};

export default ExportStep;