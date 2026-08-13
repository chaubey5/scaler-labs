"use client";
import React from 'react';
import { X, PlusCircle, Type, List, CheckSquare, Mail, Hash, Star, Calendar, UploadCloud, MessageSquare, Flag } from 'lucide-react';
import { useBuilderStore } from '@/store/builderStore';
import { motion } from 'framer-motion';

const TYPES = [
  { key: 'short_text', label: 'Short Text', icon: Type },
  { key: 'long_text', label: 'Long Text', icon: MessageSquare },
  { key: 'multiple_choice', label: 'Multiple Choice', icon: List },
  { key: 'multiple_select', label: 'Multiple Select', icon: CheckSquare },
  { key: 'yes_no', label: 'Yes / No', icon: Flag },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'number', label: 'Number', icon: Hash },
  { key: 'rating', label: 'Rating', icon: Star },
  { key: 'date', label: 'Date', icon: Calendar },
  { key: 'dropdown', label: 'Dropdown', icon: List },
  { key: 'file_upload', label: 'File Upload', icon: UploadCloud },
  { key: 'statement', label: 'Statement', icon: MessageSquare },
  { key: 'end_screen', label: 'End Screen', icon: PlusCircle }
];

export default function AddContentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addQuestion = useBuilderStore((s) => s.addQuestion);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Content</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X /></button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {TYPES.map((t) => {
            const Icon = t.icon as React.ElementType;
            return (
              <button key={t.key} onClick={() => { addQuestion(t.key); onClose(); }} className="flex items-center gap-3 p-3 border rounded hover:shadow-sm hover:bg-gray-50">
                <div className="w-10 h-10 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center"><Icon size={18} /></div>
                <div className="text-left">
                  <div className="font-medium text-sm">{t.label}</div>
                  <div className="text-xs text-gray-400">Add a {t.label.toLowerCase()} question</div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
