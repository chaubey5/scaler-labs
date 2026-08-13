"use client";
import React, { useState, useRef } from 'react';
import { importFile } from '@/lib/api';
import { useBuilderStore } from '@/store/builderStore';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type DetectedQuestion = {
  type: string;
  title: string;
  description?: string | null;
  is_required?: boolean;
  order_index?: number;
  options?: string[];
  include?: boolean;
};

export default function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedQuestion[]>([]);
  const addQuestionWithData = useBuilderStore((s) => s.addQuestionWithData);

  if (!open) return null;

  const handleChoose = () => fileRef.current?.click();

  const upload = async (file?: File) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const resp = await importFile(file);
      const mapped = (resp || []).map((q: Partial<DetectedQuestion>, i: number) => ({ ...q, include: true, order_index: i }));
      setDetected(mapped as DetectedQuestion[]);
    } catch (e: unknown) {
      setError((e as Error).message || 'Import failed');
    }
    setLoading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const addSelected = () => {
    detected.filter(d => d.include).forEach((d) => {
      addQuestionWithData({ type: d.type, title: d.title, description: d.description || '', is_required: !!d.is_required, options: d.options || [], order_index: undefined });
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">✨ Import Questions with AI</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X /></button>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded p-6 mb-4" onDrop={onDrop} onDragOver={(e)=>e.preventDefault()}>
          <p className="text-sm text-gray-500">Drag & drop a PDF, DOCX or TXT file here to extract questions.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={handleChoose} className="px-3 py-2 bg-gray-100 rounded">Choose file</button>
            <input ref={fileRef} type="file" className="hidden" onChange={(e)=>upload(e.target.files?.[0])} accept=".pdf,.docx,.txt" />
            {loading && <div className="text-sm text-gray-500">Analyzing...</div>}
            {error && <div className="text-sm text-red-500">{error}</div>}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {detected.length === 0 && <p className="text-sm text-gray-400">No questions detected yet.</p>}
          {detected.map((d, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border-b last:border-b-0">
              <input type="checkbox" checked={!!d.include} onChange={(e)=>{ const copy = [...detected]; copy[i] = { ...copy[i], include: e.target.checked }; setDetected(copy); }} />
              <div className="flex-1">
                <input className="w-full text-sm font-medium mb-1" value={d.title} onChange={(e)=>{ const copy = [...detected]; copy[i] = { ...copy[i], title: e.target.value }; setDetected(copy); }} />
                <div className="flex gap-2 items-center">
                  <select value={d.type} onChange={(e)=>{ const copy = [...detected]; copy[i] = { ...copy[i], type: e.target.value }; setDetected(copy); }} className="text-xs border rounded p-1">
                    <option value="short_text">Short Text</option>
                    <option value="long_text">Long Text</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                    <option value="yes_no">Yes/No</option>
                    <option value="rating">Rating</option>
                  </select>
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={!!d.is_required} onChange={(e)=>{ const copy = [...detected]; copy[i] = { ...copy[i], is_required: e.target.checked }; setDetected(copy); }} /> Required</label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button onClick={addSelected} className="px-4 py-2 bg-black text-white rounded">Add Selected</button>
        </div>
      </motion.div>
    </div>
  );
}
