import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage, TemplateType } from '../../types';
import { Download, MessageSquare, Send, Loader2, Sparkles, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { editGeneratedImage } from '../../services/gemini';

interface EditorStepProps {
  images: GeneratedImage[];
  setImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  onFinish: () => void;
  onBack: () => void;
  selectedTemplate: TemplateType;
}

const EditorStep: React.FC<EditorStepProps> = ({ images, setImages, onFinish, onBack, selectedTemplate }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (images.length > 0 && !selectedId) {
        setSelectedId(images[0].id);
    }
  }, [images]);

  const selectedImage = images.find(img => img.id === selectedId);
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedImage?.editHistory, isEditing]);

  const handleEdit = async () => {
    if (!selectedImage || !chatInput.trim() || isEditing) return;

    setIsEditing(true);
    const prompt = chatInput;
    setChatInput("");

    try {
        const newBase64 = await editGeneratedImage(selectedImage.base64Data, prompt);
        const newImageUrl = `data:image/jpeg;base64,${newBase64}`;

        setImages(prev => prev.map(img => {
            if (img.id === selectedId) {
                return {
                    ...img,
                    imageUrl: newImageUrl,
                    base64Data: newBase64,
                    editHistory: [...img.editHistory, prompt]
                };
            }
            return img;
        }));
    } catch (error) {
        console.error(error);
        alert("Failed to edit image. Please try again.");
    } finally {
        setIsEditing(false);
    }
  };

  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : 'from-red-500 to-pink-600';

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 animate-fade-in w-full">
       
       {/* Editor Workspace */}
       <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
           
           {/* Canvas (Center) */}
           <div className="flex-1 bg-slate-900 rounded-2xl shadow-lg flex items-center justify-center relative overflow-hidden order-2 md:order-1 min-h-[300px] p-4 md:p-8">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                
                {selectedImage ? (
                    <div className="relative max-w-full max-h-full aspect-[3/4] shadow-2xl rounded-sm overflow-hidden ring-1 ring-white/10 transition-all bg-black">
                        <img src={selectedImage.imageUrl} alt="Editing" className="w-full h-full object-contain" />
                        
                        {/* Status Overlay */}
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 shadow-lg flex items-center gap-2 pointer-events-none">
                            <span className={`w-2 h-2 rounded-full bg-${themeColor}-500 animate-pulse`}></span>
                            {selectedImage.planItem.role}
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-500 flex flex-col items-center">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p>Select an image to start editing</p>
                    </div>
                )}
           </div>

           {/* Sidebar (Chat) */}
           <div className="w-full md:w-[400px] xl:w-[450px] bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden flex-shrink-0 order-1 md:order-2 h-1/3 md:h-full">
                {selectedImage ? (
                    <>
                        <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <Sparkles className={`w-5 h-5 text-${themeColor}-500`} /> AI Magic Editor
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{selectedImage.planItem.description}</p>
                        </div>

                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white custom-scrollbar">
                            <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full bg-${themeColor}-50 flex items-center justify-center flex-shrink-0`}>
                                    <Sparkles className={`w-4 h-4 text-${themeColor}-500`} />
                                </div>
                                <div className="bg-slate-100 text-slate-700 text-sm p-3.5 rounded-2xl rounded-tl-none leading-relaxed">
                                    <p>I'm ready! Describe what needs to be changed for this image.</p>
                                </div>
                            </div>

                            {selectedImage.editHistory.map((hist, i) => (
                                <React.Fragment key={i}>
                                    <div className="flex flex-row-reverse gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div className={`bg-${themeColor}-500 text-white text-sm p-3.5 rounded-2xl rounded-tr-none shadow-md leading-relaxed`}>
                                            <p>{hist}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-full bg-${themeColor}-50 flex items-center justify-center flex-shrink-0`}>
                                            <Sparkles className={`w-4 h-4 text-${themeColor}-500`} />
                                        </div>
                                        <div className="bg-slate-100 text-slate-700 text-sm p-3.5 rounded-2xl rounded-tl-none border border-slate-200">
                                            <p>Done. Check the update.</p>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                            
                            {isEditing && (
                                <div className="flex gap-3 animate-pulse">
                                     <div className={`w-8 h-8 rounded-full bg-${themeColor}-50 flex items-center justify-center flex-shrink-0`}>
                                        <Loader2 className={`w-4 h-4 text-${themeColor}-500 animate-spin`} />
                                    </div>
                                    <div className="bg-slate-50 text-slate-400 text-sm p-3 rounded-2xl rounded-tl-none italic">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-white">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                                    placeholder="Make it brighter, change background..."
                                    disabled={isEditing}
                                    className={`w-full text-sm pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-${themeColor}-500 focus:ring-1 focus:ring-${themeColor}-500 transition-all shadow-sm disabled:bg-slate-50 text-slate-900 placeholder:text-slate-400 bg-slate-50 focus:bg-white`}
                                />
                                <button 
                                    onClick={handleEdit}
                                    disabled={isEditing || !chatInput.trim()}
                                    className={`absolute right-2 top-1.5 p-1.5 bg-${themeColor}-500 hover:bg-${themeColor}-600 disabled:bg-slate-200 text-white rounded-lg transition-colors`}
                                >
                                    {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <p>No image selected</p>
                    </div>
                )}
           </div>
       </div>

       {/* Bottom Bar: Thumbnails & Actions */}
       <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-6 items-center flex-shrink-0">
            
            {/* Thumbnails */}
            <div className="flex-1 w-full overflow-x-auto flex items-center gap-3 custom-scrollbar py-2">
                {images.map((img, idx) => (
                    <button 
                        key={img.id}
                        onClick={() => setSelectedId(img.id)}
                        className={`flex-shrink-0 relative group h-20 md:h-24 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200
                        ${selectedId === img.id 
                            ? `border-${themeColor}-500 ring-2 ring-${themeColor}-500 ring-offset-2 scale-105 shadow-md z-10` 
                            : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'}`}
                    >
                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-center">
                             <span className="text-white text-[9px] font-bold block truncate">#{idx + 1}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-4 md:pl-6 md:border-l border-slate-100">
                 <button
                    onClick={onBack}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
                 >
                    <ArrowLeft className="w-4 h-4" /> Back
                 </button>

                 <button 
                    onClick={onFinish}
                    className={`bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-transform shadow-xl shadow-slate-900/10 hover:-translate-y-0.5 text-sm`}
                 >
                    Export All <Download className="w-4 h-4" />
                </button>
            </div>
       </div>
    </div>
  );
};

export default EditorStep;