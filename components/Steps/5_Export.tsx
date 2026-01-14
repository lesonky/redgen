import React, { useState } from 'react';
import { GeneratedImage, TemplateType, AspectRatio } from '../../types';
import { Download, Check, Loader2, RotateCcw, ArrowLeft, FileText, Presentation } from 'lucide-react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';

interface ExportStepProps {
  images: GeneratedImage[];
  onReset: () => void;
  onBack: () => void;
  selectedTemplate: TemplateType;
  aspectRatio: AspectRatio;
}

const ExportStep: React.FC<ExportStepProps> = ({ images, onReset, onBack, selectedTemplate, aspectRatio }) => {
  const [isZipping, setIsZipping] = useState(false);
  const [isPdfing, setIsPdfing] = useState(false);
  const [isPpting, setIsPpting] = useState(false);
  
  const downloadAllAsZip = async () => {
     if (isZipping || isPdfing || isPpting) return;
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

  const downloadAllAsPDF = async () => {
    if (isZipping || isPdfing || isPpting) return;
    setIsPdfing(true);

    try {
      const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
      const orientation = ratioW > ratioH ? 'l' : 'p';
      
      // Points calculation (A4 is roughly 595x842)
      // We'll use the ratio to define a custom page size for the PDF
      const pageWidth = ratioW * 150;
      const pageHeight = ratioH * 150;

      const doc = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: [pageWidth, pageHeight]
      });

      for (let i = 0; i < images.length; i++) {
        if (i > 0) {
          doc.addPage([pageWidth, pageHeight], orientation);
        }
        
        const img = images[i];
        // addImage(imageData, format, x, y, width, height, alias, compression, rotation)
        doc.addImage(img.imageUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      doc.save(`redset_${selectedTemplate.toLowerCase()}_set.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to create PDF. Please try again.");
    } finally {
      setIsPdfing(false);
    }
  };

  const downloadAllAsPPTX = async () => {
    if (isZipping || isPdfing || isPpting) return;
    setIsPpting(true);

    try {
      const pres = new pptxgen();
      const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
      
      // PowerPoint slides use inches. Default 16:9 is 10x5.625 inches.
      // We scale the long side to 10 inches.
      let slideW, slideH;
      if (ratioW >= ratioH) {
        slideW = 10;
        slideH = (10 * ratioH) / ratioW;
      } else {
        slideH = 10;
        slideW = (10 * ratioW) / ratioH;
      }

      pres.defineLayout({ name: 'REDSET_LAYOUT', width: slideW, height: slideH });
      pres.layout = 'REDSET_LAYOUT';

      images.forEach((img) => {
        const slide = pres.addSlide();
        slide.background = { color: "000000" }; 
        slide.addImage({ 
            data: img.imageUrl, // pptxgenjs supports data URLs with prefix
            x: 0, 
            y: 0, 
            w: slideW, 
            h: slideH 
        });
      });

      await pres.writeFile({ fileName: `redset_${selectedTemplate.toLowerCase()}_deck.pptx` });
    } catch (error) {
      console.error("Failed to generate PPTX:", error);
      alert("Failed to create PPTX. Please try again.");
    } finally {
      setIsPpting(false);
    }
  };

  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : selectedTemplate === TemplateType.PPT ? 'orange' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : selectedTemplate === TemplateType.PPT
        ? 'from-orange-500 to-amber-600'
        : 'from-red-500 to-pink-600';

  const isProcessing = isZipping || isPdfing || isPpting;

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
                disabled={isProcessing}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                <ArrowLeft className="w-4 h-4" /> Back to Editor
                </button>

                <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                    onClick={onReset}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-colors text-sm disabled:opacity-50"
                >
                    <RotateCcw className="w-4 h-4" /> Start New
                </button>

                <button 
                    onClick={downloadAllAsPDF}
                    disabled={isProcessing}
                    className={`px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-colors text-sm disabled:opacity-50 ${isPdfing ? 'cursor-wait' : ''}`}
                >
                    {isPdfing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Generating PDF...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4 text-slate-500" /> Download PDF
                        </>
                    )}
                </button>

                <button 
                    onClick={downloadAllAsPPTX}
                    disabled={isProcessing}
                    className={`px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 transition-colors text-sm disabled:opacity-50 ${isPpting ? 'cursor-wait' : ''}`}
                >
                    {isPpting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Generating PPTX...
                        </>
                    ) : (
                        <>
                            <Presentation className="w-4 h-4 text-slate-500" /> Download PPTX
                        </>
                    )}
                </button>

                <button 
                    onClick={downloadAllAsZip}
                    disabled={isProcessing}
                    className={`px-8 py-3 text-white text-sm md:text-base font-bold rounded-xl shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 bg-gradient-to-r ${themeGradient} ${isZipping ? 'opacity-75 cursor-wait' : ''} disabled:opacity-50 disabled:transform-none`}
                >
                    {isZipping ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Packaging ZIP...
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