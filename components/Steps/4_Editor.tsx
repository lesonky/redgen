import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage } from '../../types';
import { Download, MessageSquare, Send, Loader2, Sparkles, User } from 'lucide-react';
import { editGeneratedImage } from '../../services/gemini';

interface EditorStepProps {
  images: GeneratedImage[];
  setImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  onFinish: () => void;
}

const EditorStep: React.FC<EditorStepProps> = ({ images, setImages, onFinish }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-select first image on mount
  useEffect(() => {
    if (images.length > 0 && !selectedId) {
        setSelectedId(images[0].id);
    }
  }, [images]);

  // Scroll chat to bottom when history updates
  const selectedImage = images.find(img => img.id === selectedId);
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedImage?.editHistory, isEditing]);

  const handleEdit = async () => {
    if (!selectedImage || !chatInput.trim() || isEditing) return;

    setIsEditing(true);
    const prompt = chatInput; // Capture current input
    setChatInput(""); // Clear input immediately for UX

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

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col gap-4">
       {/* TOP SECTION: WORKSPACE */}
       <div className="flex-1 flex gap-4 min-h-0">
           
           {/* Left: Canvas */}
           <div className="flex-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                {selectedImage ? (
                    <div className="relative h-[90%] aspect-[3/4] shadow-2xl rounded-lg overflow-hidden ring-1 ring-slate-900/5 transition-all">
                        <img src={selectedImage.imageUrl} alt="Editing" className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 shadow-sm">
                            #{images.findIndex(img => img.id === selectedId) + 1} {selectedImage.planItem.role}
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                        <p>Select an image to start editing</p>
                    </div>
                )}
           </div>

           {/* Right: Sidebar (Chat) */}
           <div className="w-[480px] bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden flex-shrink-0">
                {selectedImage ? (
                    <>
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-red-500" /> AI Editor
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selectedImage.planItem.description}</p>
                        </div>

                        {/* Chat History */}
                        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                            {/* Initial State Message */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="bg-slate-100 text-slate-800 text-sm p-3 rounded-2xl rounded-tl-none">
                                    <p>Ready to edit! What would you like to change?</p>
                                </div>
                            </div>

                            {selectedImage.editHistory.map((hist, i) => (
                                <React.Fragment key={i}>
                                    {/* User Request */}
                                    <div className="flex flex-row-reverse gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-slate-600" />
                                        </div>
                                        <div className="bg-red-500 text-white text-sm p-3 rounded-2xl rounded-tr-none shadow-sm">
                                            <p>{hist}</p>
                                        </div>
                                    </div>
                                    
                                    {/* AI Response (Implicit success) */}
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-4 h-4 text-red-500" />
                                        </div>
                                        <div className="bg-slate-100 text-slate-800 text-sm p-3 rounded-2xl rounded-tl-none border border-slate-200">
                                            <p>Updated image based on your request.</p>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                            
                            {isEditing && (
                                <div className="flex gap-3 animate-pulse">
                                     <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                                    </div>
                                    <div className="bg-slate-50 text-slate-500 text-sm p-3 rounded-2xl rounded-tl-none italic">
                                        Generating changes...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                                    placeholder="Make it brighter, remove the cup..."
                                    disabled={isEditing}
                                    className="w-full text-sm pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-sm disabled:bg-slate-50 text-slate-900 placeholder:text-slate-400 bg-white"
                                />
                                <button 
                                    onClick={handleEdit}
                                    disabled={isEditing || !chatInput.trim()}
                                    className="absolute right-2 top-2 p-1.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white rounded-lg transition-colors"
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

       {/* BOTTOM SECTION: FILMSTRIP */}
       <div className="h-48 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">Image Sequence</h3>
                <button 
                    onClick={onFinish}
                    className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-slate-900/10"
                >
                    <Download className="w-4 h-4" /> Export Set
                </button>
            </div>
            
            <div className="flex-1 overflow-x-auto flex items-center gap-3 pb-2">
                {images.map((img, idx) => (
                    <button 
                        key={img.id}
                        onClick={() => setSelectedId(img.id)}
                        className={`flex-shrink-0 relative group h-full aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200
                        ${selectedId === img.id ? 'border-red-500 ring-2 ring-red-500 ring-offset-2 scale-105 shadow-lg z-10' : 'border-transparent hover:border-red-200 opacity-80 hover:opacity-100 hover:scale-105'}`}
                    >
                        <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                             <span className="text-white text-[10px] font-medium block truncate">#{idx + 1} {img.planItem.role}</span>
                        </div>
                    </button>
                ))}
            </div>
       </div>
    </div>
  );
};

export default EditorStep;