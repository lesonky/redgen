import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage, TemplateType, AspectRatio, ImageSize } from '../../types';
import { Download, MessageSquare, Send, Loader2, Sparkles, User, ArrowLeft, Wand2 } from 'lucide-react';
import { editGeneratedImage, optimizeEditPrompt } from '../../services/gemini';

interface EditorStepProps {
  images: GeneratedImage[];
  setImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  onFinish: () => void;
  onBack: () => void;
  selectedTemplate: TemplateType;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}

const EditorStep: React.FC<EditorStepProps> = ({ images, setImages, onFinish, onBack, selectedTemplate, aspectRatio, imageSize }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fix: Move selectedImage declaration before its usage in useEffect
  const selectedImage = images.find(img => img.id === selectedId);

  useEffect(() => {
    if (images.length > 0 && !selectedId) {
        setSelectedId(images[0].id);
    }
  }, [images]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedImage?.editHistory, isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [chatInput]);

  const handleEdit = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || chatInput;
    if (!selectedImage || !promptToUse.trim() || isEditing) return;

    setIsEditing(true);
    setChatInput("");

    try {
        const newBase64 = await editGeneratedImage(selectedImage.base64Data, promptToUse, aspectRatio, imageSize);
        const newImageUrl = `data:image/jpeg;base64,${newBase64}`;

        setImages(prev => prev.map(img => {
            if (img.id === selectedId) {
                return {
                    ...img,
                    imageUrl: newImageUrl,
                    base64Data: newBase64,
                    editHistory: [...img.editHistory, promptToUse]
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

  const handleOptimize = async () => {
    if (!chatInput.trim() || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const enhanced = await optimizeEditPrompt(chatInput);
      setChatInput(enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleEdit();
    }
  };

  const themeColor = selectedTemplate === TemplateType.SCIENCE_COMIC ? 'blue' : selectedTemplate === TemplateType.PPT ? 'orange' : 'red';
  const themeGradient = selectedTemplate === TemplateType.SCIENCE_COMIC 
    ? 'from-blue-500 to-indigo-600' 
    : selectedTemplate === TemplateType.PPT
        ? 'from-orange-500 to-amber-600'
        : 'from-red-500 to-pink-600';

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 animate-fade-in w-full">
       
       <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
           
           {/* Canvas (Center) */}
           <div className="flex-1 bg-slate-900 rounded-3xl shadow-lg flex items-center justify-center relative overflow-hidden order-2 md:order-1 min-h-[300px] p-4 md:p-8">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                
                {selectedImage ? (
                    <div className="relative max-w-full max-h-full shadow-2xl rounded-sm overflow-hidden ring-1 ring-white/10 transition-all bg-black" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
                        <img src={selectedImage.imageUrl} alt="Editing" className="w-full h-full object-contain" />
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
           <div className="w-full md:w-[400px] xl:w-[450px] bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden flex-shrink-0 order-1 md:order-2 h-1/2 md:h-full">
                {selectedImage ? (
                    <>
                        <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                    <Sparkles className={`w-4 h-4 text-${themeColor}-500`} /> AI Magic Editor
                                </h3>
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{selectedImage.planItem.description}</p>
                            </div>
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
                                            <p>Update completed.</p>
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
                                        Processing request...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area - Studio Inspired */}
                        <div className="p-4 bg-white border-t border-slate-100">
                            <div className={`relative bg-slate-50 rounded-2xl border transition-all duration-200 ${isEditing ? 'opacity-50 pointer-events-none' : 'focus-within:bg-white focus-within:border-slate-300 focus-within:shadow-md'}`}>
                                <textarea
                                    ref={textareaRef}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add a llama, make it brighter..."
                                    rows={1}
                                    className="w-full bg-transparent border-none outline-none resize-none p-4 pr-12 text-sm text-slate-800 placeholder:text-slate-400 min-h-[56px] max-h-[120px] custom-scrollbar"
                                />
                                
                                {/* Action Buttons Inside Input */}
                                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100/50">
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={handleOptimize}
                                            disabled={!chatInput.trim() || isOptimizing}
                                            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${isOptimizing ? 'text-purple-500 bg-purple-50' : 'text-slate-400 hover:text-purple-500 hover:bg-purple-50'}`}
                                            title="Optimize Prompt with AI"
                                        >
                                            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                                            {chatInput.trim() ? "Refine" : ""}
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => handleEdit()}
                                        disabled={isEditing || !chatInput.trim()}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!chatInput.trim() ? 'bg-slate-200 text-white' : `bg-${themeColor}-500 text-white shadow-md hover:shadow-lg active:scale-95`}`}
                                    >
                                        {isEditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                        Send
                                    </button>
                                </div>
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
       <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 flex flex-col md:flex-row gap-6 items-center flex-shrink-0">
            <div className="flex-1 w-full overflow-x-auto flex items-center gap-3 custom-scrollbar py-2">
                {images.map((img, idx) => (
                    <button 
                        key={img.id}
                        onClick={() => setSelectedId(img.id)}
                        className={`flex-shrink-0 relative group h-20 md:h-24 rounded-xl overflow-hidden border-2 transition-all duration-200
                        ${selectedId === img.id 
                            ? `border-${themeColor}-500 ring-2 ring-${themeColor}-500/20 scale-105 shadow-md z-10` 
                            : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'}`}
                        style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                    >
                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-center">
                             <span className="text-white text-[9px] font-bold block truncate">#{idx + 1}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-4 md:pl-6 md:border-l border-slate-100">
                 <button onClick={onBack} className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                 </button>
                 <button onClick={onFinish} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform shadow-lg hover:-translate-y-0.5 text-sm">
                    Export All <Download className="w-4 h-4" />
                </button>
            </div>
       </div>
    </div>
  );
};

export default EditorStep;