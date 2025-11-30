import React, { useState } from 'react';
import { GeneratedImage } from '../../types';
import { Download, Check, Loader2, RotateCcw } from 'lucide-react';
import JSZip from 'jszip';

interface ExportStepProps {
  images: GeneratedImage[];
  onReset: () => void;
}

const ExportStep: React.FC<ExportStepProps> = ({ images, onReset }) => {
  const [isZipping, setIsZipping] = useState(false);
  
  const downloadAll = async () => {
     if (isZipping) return;
     setIsZipping(true);
     
     try {
         const zip = new JSZip();
         const folder = zip.folder("redset_images");

         // Add generated images
         images.forEach((img, idx) => {
             // Create a filename: 01_Cover.jpg. Sanitize role name.
             const safeRole = img.planItem.role.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
             const filename = `${(idx + 1).toString().padStart(2, '0')}_${safeRole}.jpg`;
             
             if (folder) {
                folder.file(filename, img.base64Data, { base64: true });
             }
         });

         // Generate ZIP
         const content = await zip.generateAsync({ type: "blob" });
         
         // Trigger download
         const link = document.createElement('a');
         link.href = URL.createObjectURL(content);
         link.download = "redset_xiaohongshu_images.zip";
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         
         // Clean up
         setTimeout(() => URL.revokeObjectURL(link.href), 100);

     } catch (error) {
         console.error("Failed to zip images:", error);
         alert("Failed to package images. Please try again.");
     } finally {
         setIsZipping(false);
     }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-center">
        <div className="space-y-2">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Your Image Set is Ready!</h1>
            <p className="text-slate-500">Perfectly adapted for Xiaohongshu (3:4 Ratio)</p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            {images.map((img, idx) => (
                <div key={img.id} className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-sm relative group">
                     <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                     <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                         {idx + 1}
                     </div>
                </div>
            ))}
        </div>

        <div className="flex justify-center gap-4">
            <button 
                onClick={downloadAll}
                disabled={isZipping}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-xl shadow-red-500/20 flex items-center gap-3 transition-transform active:scale-95"
            >
                {isZipping ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Packaging...
                    </>
                ) : (
                    <>
                        <Download className="w-5 h-5" /> Download ZIP Pack
                    </>
                )}
            </button>
            
            <button
                onClick={onReset}
                disabled={isZipping}
                className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 transition-colors active:scale-95"
            >
                <RotateCcw className="w-5 h-5" /> Start New Project
            </button>
        </div>

        <div className="text-sm text-slate-400 mt-8">
            <p>Tip: Add your custom text in the Xiaohongshu app editor.</p>
        </div>
    </div>
  );
};

export default ExportStep;