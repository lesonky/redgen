import React, { useState } from 'react';
import { ArrowRight, Layout, Edit3, Type, Palette, RefreshCw, Loader2, Save, X, ArrowLeft, GripVertical, FileText, Check } from 'lucide-react';
import { ImagePlanItem, PlanAnalysis, TemplateType } from '../../types';

interface PlanStepProps {
  plan: ImagePlanItem[];
  setPlan: React.Dispatch<React.SetStateAction<ImagePlanItem[]>>;
  analysis: PlanAnalysis;
  onNext: () => void;
  onBack: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  selectedTemplate: TemplateType;
}

const PlanStep: React.FC<PlanStepProps> = ({ plan, setPlan, analysis, onNext, onBack, onRegenerate, isRegenerating, selectedTemplate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ImagePlanItem>>({});

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= plan.length) return;
    const newPlan = [...plan];
    const [movedItem] = newPlan.splice(fromIndex, 1);
    newPlan.splice(toIndex, 0, movedItem);
    const reordered = newPlan.map((item, idx) => ({ ...item, order: idx + 1 }));
    setPlan(reordered);
  };

  const startEdit = (item: ImagePlanItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    setPlan(prev => prev.map(item => item.id === editingId ? { ...item, ...editForm } as ImagePlanItem : item));
    setEditingId(null);
    setEditForm({});
  };

  const handleInputChange = (field: keyof ImagePlanItem, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
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

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto w-full">
                
                {/* Header & Analysis Summary */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-3xl font-extrabold text-slate-900">Review Generation Plan</h2>
                        
                        <button 
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="text-xs font-bold px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors flex items-center gap-2 shadow-sm self-start md:self-auto"
                        >
                            {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Redraft Plan
                        </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Content Direction</span>
                            <p className="text-sm font-medium text-slate-800 leading-relaxed">{analysis.contentDirection}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Visual Style</span>
                            <p className="text-sm font-medium text-slate-800 leading-relaxed">{analysis.styleAnalysis}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Keywords</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {analysis.keywords.map(k => (
                                    <span key={k} className={`px-2 py-0.5 bg-${themeColor}-100/50 text-${themeColor}-700 text-xs rounded-md font-medium border border-${themeColor}-100`}>{k}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan List */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Image Sequence ({plan.length})</h3>

                    <div className="space-y-4">
                    {plan.map((item, index) => {
                        const isEditing = editingId === item.id;

                        return (
                            <div key={item.id} className={`group flex items-start gap-4 bg-white p-5 rounded-xl border transition-all duration-200
                                ${isEditing ? `border-${themeColor}-500 ring-1 ring-${themeColor}-500 shadow-lg z-10` : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                            
                            {/* Drag Handle & Order */}
                            <div className="flex flex-col items-center gap-1 pt-1 pr-2 border-r border-slate-100 min-w-[3rem]">
                                <span className={`font-mono font-bold text-lg ${isEditing ? `text-${themeColor}-500` : 'text-slate-300'}`}>
                                    {(index + 1).toString().padStart(2, '0')}
                                </span>
                                {!isEditing && (
                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => moveItem(index, index - 1)} disabled={index === 0} className="hover:text-slate-800 text-slate-400 disabled:opacity-30 p-1 hover:bg-slate-100 rounded">▲</button>
                                        <button onClick={() => moveItem(index, index + 1)} disabled={index === plan.length - 1} className="hover:text-slate-800 text-slate-400 disabled:opacity-30 p-1 hover:bg-slate-100 rounded">▼</button>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-3 min-w-0">
                                {isEditing ? (
                                    // --- EDIT MODE ---
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                                                <input 
                                                    value={editForm.role || ''}
                                                    onChange={(e) => handleInputChange('role', e.target.value)}
                                                    className={`w-full text-sm font-bold bg-${themeColor}-50 text-${themeColor}-700 border border-${themeColor}-100 rounded-lg px-3 py-2 outline-none focus:border-${themeColor}-500`}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Inherit Focus</label>
                                                <input 
                                                    value={(editForm.inheritanceFocus || []).join(', ')}
                                                    onChange={(e) => handleInputChange('inheritanceFocus', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                                            <textarea 
                                                value={editForm.description || ''}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                                rows={3}
                                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-400 resize-none"
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Composition</label>
                                                <textarea 
                                                    value={editForm.composition || ''}
                                                    onChange={(e) => handleInputChange('composition', e.target.value)}
                                                    rows={2}
                                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-slate-400 resize-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Layout Suggestion</label>
                                                <textarea 
                                                    value={editForm.layoutSuggestion || ''}
                                                    onChange={(e) => handleInputChange('layoutSuggestion', e.target.value)}
                                                    rows={2}
                                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-slate-400 resize-none"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Copywriting</label>
                                            <input 
                                                value={editForm.copywriting || ''}
                                                onChange={(e) => handleInputChange('copywriting', e.target.value)}
                                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-400"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 pt-2">
                                            <button onClick={saveEdit} className={`flex items-center gap-1.5 px-3 py-1.5 bg-${themeColor}-500 hover:bg-${themeColor}-600 text-white rounded-lg text-xs font-bold transition-colors`}>
                                                <Save className="w-3.5 h-3.5" /> Save Changes
                                            </button>
                                            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">
                                                <X className="w-3.5 h-3.5" /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // --- VIEW MODE ---
                                    <div className="relative">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                                    {item.role}
                                                    {item.inheritanceFocus && item.inheritanceFocus.length > 0 && (
                                                       <span className="text-[10px] font-normal text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                                          Inherits: {item.inheritanceFocus.slice(0, 2).join(', ')}
                                                       </span>
                                                    )}
                                                </h4>
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                                            </div>
                                            <button 
                                                onClick={() => startEdit(item)}
                                                className={`opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-${themeColor}-500 hover:bg-${themeColor}-50 rounded-lg transition-all`}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                                             <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                <div className="flex items-center gap-1.5 text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">
                                                    <Layout className="w-3 h-3" /> Layout
                                                </div>
                                                <p className="text-slate-700 line-clamp-2">{item.composition}</p>
                                             </div>
                                             <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                                <div className="flex items-center gap-1.5 text-slate-400 mb-1 font-bold uppercase tracking-wider text-[10px]">
                                                    <Type className="w-3 h-3" /> Copy
                                                </div>
                                                <p className="text-slate-700 line-clamp-2 italic">"{item.copywriting}"</p>
                                             </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        )
                    })}
                    </div>
                </div>
            </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center z-10">
             <button
                onClick={onBack}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors flex items-center gap-2"
             >
                <ArrowLeft className="w-4 h-4" /> Back
             </button>

             <button
                onClick={onNext}
                disabled={!!editingId}
                className={`px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 bg-gradient-to-r ${themeGradient}`}
             >
                Start Generating <ArrowRight className="w-4 h-4" />
             </button>
        </div>
    </div>
  );
};

export default PlanStep;