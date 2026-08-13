import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  type: string;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate?: (e: React.MouseEvent) => void;
  onSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selected?: boolean;
}

export function SortableItem({ id, title, type, isActive, onClick, onDelete, onDuplicate, onSelect, selected }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`group flex items-center gap-3 p-3 mb-3 rounded-md cursor-pointer border ${
        isActive ? 'border-transparent bg-white shadow-sm' : 'border-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={!!selected} onChange={(e)=>{ e.stopPropagation(); onSelect?.(e); }} className="accent-purple-600" />
      </div>
      <div className="w-8 h-8 rounded-md flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700 font-semibold">{/* icon */}
        <span className="text-sm">{/* empty */}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium text-gray-800 truncate">{title || 'Untitled Question'}</p>
        <p className="text-xs text-gray-400 capitalize">{type.replace('_', ' ')}</p>
      </div>
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 mr-2">
        <GripVertical size={16} />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); onDelete?.(e); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1">
          <Trash2 size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(e); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-700 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6 2a2 2 0 00-2 2v2h2V4h8v8h-2v2h2a2 2 0 002-2V4a2 2 0 00-2-2H6z" />
            <path d="M4 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
