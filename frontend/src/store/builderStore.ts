import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type Question = {
    id: string;
    type: string;
    title: string;
    description: string;
    is_required: boolean;
    order_index: number;
    options: string[];
};

type BuilderState = {
    formId: string | null;
    workspaceId: string | null;
    title: string;
    questions: Question[];
    activeQuestionId: string | null;
    selectedQuestionIds: string[];
    setForm: (id: string, title: string, questions: Question[], workspaceId?: string | null) => void;
    setQuestions: (questions: Question[]) => void;
    setTitle: (title: string) => void;
    addQuestion: (type: string) => void;
    addQuestionWithData: (q: Partial<Question> & { id?: string }) => void;
    updateQuestion: (id: string, updates: Partial<Question>) => void;
    deleteQuestion: (id: string) => void;
    duplicateQuestion: (id: string) => void;
    toggleSelectQuestion: (id: string) => void;
    deleteSelected: () => void;
    setActiveQuestion: (id: string | null) => void;
    reorderQuestions: (startIndex: number, endIndex: number) => void;
};

export const useBuilderStore = create<BuilderState>((set) => ({
    formId: null,
    workspaceId: null,
    title: "",
    questions: [],
    activeQuestionId: null,
    
    setForm: (id, title, questions, workspaceId = null) => set({ formId: id, title, questions, workspaceId, activeQuestionId: questions.length > 0 ? questions[0].id : null }),
    
    setQuestions: (questions) => set({ questions }),

    setTitle: (title) => set({ title }),
    
    addQuestion: (type) => set((state) => {
        const newQ: Question = {
            id: uuidv4(),
            type,
            title: "",
            description: "",
            is_required: false,
            order_index: state.questions.length,
            options: type === 'multiple_choice' ? ["Option 1"] : (type === 'dropdown' ? ["Option 1"] : (type === 'multiple_select' ? ["Option 1"] : []))
        };
        return { 
            questions: [...state.questions, newQ],
            activeQuestionId: newQ.id
        };
    }),

    addQuestionWithData: (q) => set((state) => {
        const id = q.id || uuidv4();
        const newQ: Question = {
            id,
            type: q.type || 'short_text',
            title: q.title || '',
            description: q.description || '',
            is_required: q.is_required || false,
            order_index: typeof q.order_index === 'number' ? q.order_index : state.questions.length,
            options: q.options || []
        };
        return { questions: [...state.questions, newQ], activeQuestionId: newQ.id };
    }),

    selectedQuestionIds: [],

    duplicateQuestion: (id) => set((state) => {
        const q = state.questions.find(x => x.id === id);
        if (!q) return {} as Partial<BuilderState>;
        const copy = { ...q, id: uuidv4(), title: q.title ? `${q.title} (copy)` : 'Copy', order_index: state.questions.length } as Question;
        return { questions: [...state.questions, copy], activeQuestionId: copy.id };
    }),

    toggleSelectQuestion: (id) => set((state) => {
        const exists = state.selectedQuestionIds.includes(id);
        return { selectedQuestionIds: exists ? state.selectedQuestionIds.filter(x => x !== id) : [...state.selectedQuestionIds, id] };
    }),

    deleteSelected: () => set((state) => {
        const remaining = state.questions.filter(q => !state.selectedQuestionIds.includes(q.id));
        return { questions: remaining, selectedQuestionIds: [], activeQuestionId: remaining.length > 0 ? remaining[0].id : null };
    }),
    
    updateQuestion: (id, updates) => set((state) => ({
        questions: state.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    })),
    
    deleteQuestion: (id) => set((state) => {
        const newQs = state.questions.filter(q => q.id !== id);
        return {
            questions: newQs,
            activeQuestionId: state.activeQuestionId === id ? (newQs.length > 0 ? newQs[0].id : null) : state.activeQuestionId
        };
    }),
    
    setActiveQuestion: (id) => set({ activeQuestionId: id }),
    
    reorderQuestions: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.questions);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        
        // Update order_index for all
        const reordered = result.map((q, idx) => ({ ...q, order_index: idx }));
        return { questions: reordered };
    }),
}));
