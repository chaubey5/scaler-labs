"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchForm, updateForm, importFile } from '@/lib/api';
import { useBuilderStore } from '@/store/builderStore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/builder/SortableItem';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import AddContentModal from '@/components/builder/AddContentModal';
import { Grid3X3, Zap, LayoutTemplate, Users, HelpCircle, User } from 'lucide-react';

const ImportModal = dynamic(() => import('@/components/builder/ImportModal'), { ssr: false });

export default function FormBuilder() {
    const params = useParams();
    const router = useRouter();
    const { title, questions, activeQuestionId, setForm, addQuestion, updateQuestion, deleteQuestion, setActiveQuestion, reorderQuestions, selectedQuestionIds, workspaceId, setQuestions } = useBuilderStore();
    const duplicateQuestion = useBuilderStore((s) => s.duplicateQuestion);
    const toggleSelectQuestion = useBuilderStore((s) => s.toggleSelectQuestion);
    const deleteSelected = useBuilderStore((s) => s.deleteSelected);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        toast.loading('Parsing file...', { id: 'import' });
        try {
            const importedQuestions = await importFile(file);
            if (!importedQuestions || importedQuestions.length === 0) {
                toast.error('No questions detected in file', { id: 'import' });
                return;
            }
            const newQuestions = importedQuestions.map((q: Record<string, unknown>) => ({ ...q, id: Date.now().toString() + Math.random().toString() }));
            const updated = [...questions, ...newQuestions];
            setQuestions(updated);
            await updateForm(params.id as string, { questions: updated });
            toast.success(`Imported ${newQuestions.length} questions!`, { id: 'import' });
        } catch (err: any) {
            toast.error('Import failed: ' + err.message, { id: 'import' });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const [isSaving, setIsSaving] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [rightTab, setRightTab] = useState<'question'|'design'|'logic'>('question');
    const [design, setDesign] = useState<{ theme: 'light'|'dark', fontSize: number }>({ theme: 'light', fontSize: 16 });
    const [logicRules, setLogicRules] = useState<Record<string, unknown>[]>([]);
    const saveTimer = useRef<number | null>(null);

    useEffect(() => {
        if (params.id) {
            fetchForm(params.id as string)
                .then(data => {
                    setForm(data.id, data.title, data.questions || [], data.workspace_id || null);
                    setDesign(data.design || { theme: data.theme || 'light', fontSize: data.font_size || 16 });
                    setLogicRules(data.logic || []);
                })
                .catch(() => router.push('/'));
        }
    }, [params.id, router, setForm]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = questions.findIndex((q) => q.id === active.id);
            const newIndex = questions.findIndex((q) => q.id === over?.id);
            reorderQuestions(oldIndex, newIndex);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
            try {
                await updateForm(params.id as string, { title, status: 'published', questions, workspace_id: workspaceId });
            toast.success("Form published successfully!");
        } catch {
            toast.error("Error saving form");
        }
        setIsSaving(false);
    };

    // Autosave (debounced) — saves draft (status=draft)
    useEffect(() => {
        if (!params.id) return;
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(async () => {
                try {
                await updateForm(params.id as string, { title, status: 'draft', questions, workspace_id: workspaceId });
                toast.success('Autosaved');
            } catch {
                toast.error('Autosave failed');
            }
        }, 1200) as unknown as number;
        return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    }, [title, questions, params.id, workspaceId]);

    if (!title && questions.length === 0) return <div className="p-8 text-black">Loading builder...</div>;

    const activeQuestion = questions.find(q => q.id === activeQuestionId);

    return (
        <div className="flex h-screen bg-gray-50 text-black">
            <div className="flex">
                <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4">
                    <button onClick={() => setRightTab('question')} className={`p-2 rounded-md transition-colors ${rightTab === 'question' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-500'}`} title="Questions"><Grid3X3 size={18} /></button>
                    <button onClick={() => setRightTab('logic')} className={`p-2 rounded-md transition-colors ${rightTab === 'logic' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-500'}`} title="Logic"><Zap size={18} /></button>
                    <button onClick={() => setRightTab('design')} className={`p-2 rounded-md transition-colors ${rightTab === 'design' ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-500'}`} title="Design"><LayoutTemplate size={18} /></button>
                    <button onClick={() => {
                        if (!params.id) return;
                        fetchForm(params.id as string).then(f => {
                            if (f.status === 'published') {
                                const url = `${window.location.origin}/to/${params.id}`;
                                try { navigator.clipboard.writeText(url); toast.success('Share link copied'); }
                                catch { prompt('Copy this link', url); }
                            } else {
                                toast('Form is not published. Publish now to share.');
                            }
                        }).catch(() => toast.error('Unable to check publish status'));
                    }} className="p-2 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors" title="Share"><Users size={18} /></button>
                    <button onClick={() => toast('Help coming soon')} className="mt-auto p-2 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors" title="Help"><HelpCircle size={18} /></button>
                </div>

                {/* Content list */}
                <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 font-semibold flex items-center gap-2">
                        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-black">←</button>
                        <div>
                            <div className="text-xs text-gray-400">My workspace</div>
                            <div className="text-sm font-medium">{title || 'Untitled Form'}</div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                {questions.map((q, idx) => (
                                            <div key={q.id} className="flex items-center gap-3">
                                                <div className="w-8 text-sm text-gray-400">{idx + 1}</div>
                                                <SortableItem
                                                    id={q.id}
                                                    title={q.title}
                                                    type={q.type}
                                                    isActive={activeQuestionId === q.id}
                                                    onClick={() => setActiveQuestion(q.id)}
                                                    onDelete={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                                                    onDuplicate={(e: React.MouseEvent) => { e.stopPropagation(); duplicateQuestion(q.id); }}
                                                    onSelect={(e: React.ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); toggleSelectQuestion(q.id); }}
                                                    selected={selectedQuestionIds.includes(q.id)}
                                                />
                                            </div>
                                        ))}
                            </SortableContext>
                        </DndContext>
                        {questions.length === 0 && <p className="text-sm text-gray-500 mb-4 text-center mt-8">No questions yet.</p>}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => addQuestion('short_text')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Short Text</button>
                                <button onClick={() => addQuestion('long_text')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Long Text</button>
                                <button onClick={() => addQuestion('multiple_choice')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Multiple Choice</button>
                                <button onClick={() => addQuestion('dropdown')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Dropdown</button>
                                <button onClick={() => addQuestion('email')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Email</button>
                                <button onClick={() => addQuestion('number')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Number</button>
                                <button onClick={() => addQuestion('yes_no')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Yes / No</button>
                                <button onClick={() => addQuestion('rating')} className="bg-white border border-gray-100 hover:bg-gray-50 py-2 rounded text-xs font-medium">Rating</button>
                            </div>
                            <div className="mt-3 space-y-2">
                                <button onClick={() => setAddOpen(true)} className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition">+ Add question</button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.pdf,.docx,.csv" onChange={handleImportFile} />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full border border-purple-600 text-purple-600 py-2 rounded-md font-medium text-sm hover:bg-purple-50 transition">Import from File/CSV</button>
                            </div>
                        </div>
                    <div className="p-3 border-t flex gap-2">
                        <button onClick={() => deleteSelected()} className="text-sm text-red-600">Delete selected</button>
                        <div className="flex-1" />
                        <button onClick={() => setAddOpen(true)} className="text-sm text-purple-600">+ Add question</button>
                    </div>
                </div>
            </div>

            {/* Center Preview */}
            <div className="flex-1 flex flex-col">
                <div className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setRightTab('question')} className={`text-sm ${!previewMode ? 'text-black' : 'text-gray-400'}`}>Create</button>
                        <button onClick={() => { toast('Connectors coming soon'); }} className="text-sm text-gray-400">Connect</button>
                        <button onClick={() => {
                            if (!params.id) return;
                            fetchForm(params.id as string).then(f => {
                                if (f.status === 'published') {
                                    const url = `${window.location.origin}/to/${params.id}`;
                                    try { navigator.clipboard.writeText(url); toast.success('Share link copied'); }
                                    catch { prompt('Copy this link', url); }
                                } else {
                                    toast('Form is not published. Publish now to share.');
                                }
                            }).catch(() => toast.error('Unable to check publish status'));
                        }} className="text-sm text-gray-400">Share</button>
                        <button onClick={() => setPreviewMode(p => !p)} className={`text-sm ${previewMode ? 'text-black' : 'text-gray-400'}`}>{previewMode ? 'Exit preview' : 'Preview'}</button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setRightTab('design')} className="text-sm text-gray-400">Design</button>
                            <button onClick={() => setRightTab('logic')} className="text-sm text-gray-400">Logic</button>
                        </div>
                        <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-4 py-1.5 rounded-md text-sm hover:bg-gray-800 transition">
                            {isSaving ? 'Saving...' : 'Publish'}
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><User size={16} /></div>
                    </div>
                </div>

                <div className="flex-1 bg-gradient-to-b from-purple-50 to-white p-10 flex items-center justify-center">
                    <div 
                        className={`w-full max-w-3xl rounded-2xl shadow-lg border border-transparent p-12 transition-colors duration-300 ${design.theme === 'dark' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-black'}`} 
                        style={{ minHeight: 420, fontSize: `${design.fontSize}px` }}
                    >
                        {previewMode ? (
                            (() => {
                                const q = questions[0] || null;
                                return q ? (
                                    <div>
                                        <div className="text-sm text-purple-600 mb-4">Preview</div>
                                        <h1 className="text-3xl font-semibold mb-3">{q.title || 'Untitled question'}</h1>
                                        <div className="text-gray-500 mb-6">{q.description || ''}</div>
                                        <div className="mb-6">
                                            {q.type === 'short_text' && <input disabled className="w-full border-b border-gray-200 py-3" placeholder={q.title || 'Answer'} />}
                                            {q.type === 'multiple_choice' && <div className="space-y-2">{(q.options||[]).map((opt,i)=>(<label key={i} className="flex items-center gap-2"><input disabled type="radio"/> <span>{opt}</span></label>))}</div>}
                                        </div>
                                        <button onClick={() => setPreviewMode(false)} className="bg-purple-600 text-white px-4 py-2 rounded">Exit Preview</button>
                                    </div>
                                ) : <div className="text-gray-400 text-center text-xl font-light">No questions to preview.</div>;
                            })()
                        ) : activeQuestion ? (
                            <div className="h-full flex flex-col justify-between">
                                <div>
                                    <div className="text-sm text-purple-600 mb-4">01 →</div>
                                    <input 
                                        type="text"
                                        className="w-full text-3xl font-semibold mb-3 bg-transparent border-none outline-none placeholder:text-gray-300 focus:ring-0"
                                        placeholder="Untitled question"
                                        value={activeQuestion.title}
                                        onChange={(e) => updateQuestion(activeQuestion.id, { title: e.target.value })}
                                    />
                                    <input 
                                        type="text"
                                        className="w-full text-lg text-gray-500 mb-6 bg-transparent border-none outline-none placeholder:text-gray-300 focus:ring-0"
                                        placeholder="Description (optional)"
                                        value={activeQuestion.description || ''}
                                        onChange={(e) => updateQuestion(activeQuestion.id, { description: e.target.value })}
                                    />
                                    <div className="mb-6">
                                        {/* Render different input types based on question.type */}
                                        {activeQuestion.type === 'short_text' && (
                                            <input className="w-full border-b border-gray-200 py-3 placeholder:text-gray-300" placeholder={activeQuestion.title || 'Type your answer here...'} />
                                        )}
                                        {activeQuestion.type === 'long_text' && (
                                            <textarea className="w-full border rounded p-3 h-32" placeholder={activeQuestion.title || ''}></textarea>
                                        )}
                                        {activeQuestion.type === 'multiple_choice' && (
                                            <div className="space-y-2">
                                                {(activeQuestion.options || []).map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-2"><input type="radio" name={activeQuestion.id} /> <span>{opt}</span></label>
                                                ))}
                                            </div>
                                        )}
                                        {activeQuestion.type === 'multiple_select' && (
                                            <div className="space-y-2">
                                                {(activeQuestion.options || []).map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-2"><input type="checkbox" /> <span>{opt}</span></label>
                                                ))}
                                            </div>
                                        )}
                                        {activeQuestion.type === 'email' && (
                                            <input type="email" className="w-full border-b border-gray-200 py-3" placeholder="name@example.com" />
                                        )}
                                        {activeQuestion.type === 'number' && (
                                            <input type="number" className="w-full border-b border-gray-200 py-3" placeholder="0" />
                                        )}
                                        {activeQuestion.type === 'rating' && (
                                            <div className="flex gap-2"><span>☆ ☆ ☆ ☆ ☆</span></div>
                                        )}
                                        {activeQuestion.type === 'date' && (
                                            <input type="date" className="w-full border-b border-gray-200 py-2" />
                                        )}
                                        {activeQuestion.type === 'dropdown' && (
                                            <select className="w-full border p-2">
                                                {(activeQuestion.options || []).map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                                            </select>
                                        )}
                                        {activeQuestion.type === 'file_upload' && (
                                            <input type="file" className="w-full" />
                                        )}
                                        {activeQuestion.type === 'statement' && (
                                            <div className="p-4 bg-gray-50 rounded">{activeQuestion.title}</div>
                                        )}
                                        {activeQuestion.type === 'end_screen' && (
                                            <div className="text-center py-12">
                                                <h2 className="text-2xl font-semibold">{activeQuestion.title || 'Thank you!'}</h2>
                                                <p className="text-gray-500">{activeQuestion.description || 'Your response has been recorded.'}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button className="bg-purple-600 text-white px-4 py-2 rounded-md shadow">OK ✓</button>
                                        <div className="text-sm text-gray-400">press Enter ↵</div>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <div className="progress-track w-full">
                                        <div className="progress-fill" style={{ width: `${Math.min(100, (questions.indexOf(activeQuestion) + 1) / Math.max(1, questions.length) * 100)}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                                        <div>{Math.round(((questions.indexOf(activeQuestion) + 1) / Math.max(1, questions.length)) * 100)}% completed</div>
                                        <div className="flex gap-2">
                                            <button className="p-2 bg-white border rounded">^</button>
                                            <button className="p-2 bg-white border rounded">v</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center text-xl font-light">Select or add a question to preview.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Settings */}
            <div className="w-80 bg-white border-l border-gray-200 p-6 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <h3 className="font-semibold">{rightTab === 'question' ? 'Question' : rightTab === 'design' ? 'Design' : 'Logic'}</h3>
                    <div className="text-sm text-gray-400">Question · Design · Logic</div>
                </div>
                {rightTab === 'question' ? (
                    activeQuestion ? (
                    <div>
                        <div className="mb-4">
                            <label className="block text-xs text-gray-500">Type</label>
                            <div className="mt-2 text-sm">{activeQuestion.type.replace('_', ' ')}</div>
                        </div>

                        <div className="mb-4">
                            <label className="flex items-center justify-between text-sm">
                                <span>Required</span>
                                <input type="checkbox" checked={activeQuestion.is_required} onChange={(e) => updateQuestion(activeQuestion.id, { is_required: e.target.checked })} />
                            </label>
                        </div>

                        {activeQuestion.type === 'multiple_choice' && (
                            <div className="mt-6 border-t pt-4">
                                <label className="text-xs font-semibold uppercase text-gray-500 mb-2 block">Options</label>
                                {(activeQuestion.options || []).map((opt, i) => (
                                    <input 
                                        key={i} 
                                        className="w-full text-sm border rounded p-2 mb-2 outline-none focus:border-black"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...(activeQuestion.options || [])];
                                            newOpts[i] = e.target.value;
                                            updateQuestion(activeQuestion.id, { options: newOpts });
                                        }}
                                    />
                                ))}
                                <button 
                                    className="text-xs text-purple-600 font-medium"
                                    onClick={() => updateQuestion(activeQuestion.id, { options: [...(activeQuestion.options || []), `Option ${(activeQuestion.options?.length || 0) + 1}`] })}
                                >
                                    + Add Option
                                </button>
                            </div>
                        )}
                        {activeQuestion.type === 'multiple_select' && (
                            <div className="mt-6 border-t pt-4">
                                <label className="text-xs font-semibold uppercase text-gray-500 mb-2 block">Options (multiple)</label>
                                {(activeQuestion.options || []).map((opt, i) => (
                                    <div key={i} className="flex gap-2 items-center mb-2">
                                        <input 
                                            className="flex-1 text-sm border rounded p-2 outline-none focus:border-black"
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...(activeQuestion.options || [])];
                                                newOpts[i] = e.target.value;
                                                updateQuestion(activeQuestion.id, { options: newOpts });
                                            }}
                                        />
                                        <button className="text-sm text-red-600" onClick={() => {
                                            const newOpts = [...(activeQuestion.options || [])];
                                            newOpts.splice(i, 1);
                                            updateQuestion(activeQuestion.id, { options: newOpts });
                                        }}>Remove</button>
                                    </div>
                                ))}
                                <button 
                                    className="text-xs text-purple-600 font-medium"
                                    onClick={() => updateQuestion(activeQuestion.id, { options: [...(activeQuestion.options || []), `Option ${(activeQuestion.options?.length || 0) + 1}`] })}
                                >
                                    + Add Option
                                </button>
                            </div>
                        )}

                        {activeQuestion.type === 'dropdown' && (
                            <div className="mt-6 border-t pt-4">
                                <label className="text-xs font-semibold uppercase text-gray-500 mb-2 block">Dropdown Options</label>
                                {(activeQuestion.options || []).map((opt, i) => (
                                    <div key={i} className="flex gap-2 items-center mb-2">
                                        <input 
                                            className="flex-1 text-sm border rounded p-2 outline-none focus:border-black"
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...(activeQuestion.options || [])];
                                                newOpts[i] = e.target.value;
                                                updateQuestion(activeQuestion.id, { options: newOpts });
                                            }}
                                        />
                                        <button className="text-sm text-red-600" onClick={() => {
                                            const newOpts = [...(activeQuestion.options || [])];
                                            newOpts.splice(i, 1);
                                            updateQuestion(activeQuestion.id, { options: newOpts });
                                        }}>Remove</button>
                                    </div>
                                ))}
                                <button 
                                    className="text-xs text-purple-600 font-medium"
                                    onClick={() => updateQuestion(activeQuestion.id, { options: [...(activeQuestion.options || []), `Option ${(activeQuestion.options?.length || 0) + 1}`] })}
                                >
                                    + Add Option
                                </button>
                            </div>
                        )}
                    </div>
                    ) : (
                        <p className="text-sm text-gray-500">Select a question to edit its settings.</p>
                    )
                ) : rightTab === 'design' ? (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Theme</label>
                            <div className="flex gap-3">
                                <button onClick={() => setDesign(d => ({ ...d, theme: 'light' }))} className={`flex-1 py-2.5 border rounded-xl font-medium text-sm transition-all ${design.theme === 'light' ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>Light</button>
                                <button onClick={() => setDesign(d => ({ ...d, theme: 'dark' }))} className={`flex-1 py-2.5 border rounded-xl font-medium text-sm transition-all ${design.theme === 'dark' ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-white hover:bg-gray-50 text-gray-600'}`}>Dark</button>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-semibold text-gray-700">Font Size</label>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{design.fontSize}px</span>
                            </div>
                            <input value={design.fontSize} onChange={(e) => setDesign(d => ({ ...d, fontSize: Number(e.target.value) }))} type="range" min={12} max={24} className="w-full accent-purple-600" />
                        </div>
                        <div className="pt-4 border-t border-gray-100 flex gap-3">
                            <button onClick={async () => {
                                try {
                                    await updateForm(params.id as string, { design, logic: logicRules, title, questions, workspace_id: workspaceId, status: 'draft' });
                                    toast.success('Design saved');
                                } catch { toast.error('Failed to save design'); }
                            }} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">Save Design</button>
                            <button onClick={() => { setDesign({ theme: 'light', fontSize: 16 }); toast('Design reset'); }} className="px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl transition-colors shadow-sm">Reset</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full min-h-0">
                        <p className="text-sm text-gray-500 mb-5 leading-relaxed">Add conditional logic to show or skip questions based on previous answers.</p>
                        
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                            {logicRules.length === 0 && <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200"><span className="text-sm text-gray-400 font-medium">No logic rules yet.</span></div>}
                            {logicRules.map((r, i) => (
                                <div key={r.id as string} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3 relative group">
                                    <button onClick={() => { setLogicRules(ls => ls.filter(x => x.id !== r.id)); }} className="absolute top-3 right-3 text-[11px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">When</label>
                                        <input value={r.when as string} onChange={(e) => { const copy = [...logicRules]; copy[i] = { ...copy[i], when: e.target.value }; setLogicRules(copy); }} className="w-full text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white shadow-sm transition-all" placeholder="e.g. q1 == 'Yes'" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Then</label>
                                        <input value={r.then as string} onChange={(e) => { const copy = [...logicRules]; copy[i] = { ...copy[i], then: e.target.value }; setLogicRules(copy); }} className="w-full text-sm p-2.5 border border-gray-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white shadow-sm transition-all" placeholder="e.g. show q2" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex gap-3 mt-auto">
                            <button onClick={() => setLogicRules(r => [...r, { id: Date.now().toString(), when: '', then: '' }])} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-sm">Add Rule</button>
                            <button onClick={async () => {
                                try { await updateForm(params.id as string, { design, logic: logicRules, title, questions, workspace_id: workspaceId, status: 'draft' }); toast.success('Logic saved'); }
                                catch { toast.error('Failed to save logic'); }
                            }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-sm">Save Rules</button>
                        </div>
                    </div>
                )}
            </div>
            <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
            {/* Add Content modal */}
            {addOpen && (
                <> {/* dynamic import not necessary */}
                    <AddContentModal open={addOpen} onClose={() => setAddOpen(false)} />
                </>
            )}
        </div>
    );
}
