"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetchPublicForm, submitResponse } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Question {
    id: string;
    title: string;
    description?: string;
    type: string;
    is_required?: boolean;
    options?: string[];
}

interface Form {
    id: string;
    title: string;
    status: string;
    questions: Question[];
}

export default function PublicForm() {
    const params = useParams();
    const [form, setForm] = useState<Form | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (params.id) {
            fetchPublicForm(params.id as string)
                .then(setForm)
                .catch(() => setError("Form not found or not published."));
        }
    }, [params.id]);

    const handleNextRef = useRef<() => void>(undefined);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleNextRef.current?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        // Auto focus input when question changes
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentIndex, form]);

    const questions = form?.questions || [];
    const currentQuestion = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : '';

    const handleNext = async () => {
        if (!currentQuestion) return;
        if (currentQuestion.is_required && !currentAnswer) {
            toast.error("This question is required!");
            return;
        }

        if (isLast) {
            try {
                const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({ question_id: qId, value: val }));
                await submitResponse(form!.id as string, formattedAnswers);
                setSubmitted(true);
            } catch {
                toast.error("Failed to submit");
            }
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    useEffect(() => {
        handleNextRef.current = handleNext;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleNextRef.current?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (error) return <div className="h-screen flex items-center justify-center text-red-500 font-semibold">{error}</div>;
    if (!form) return <div className="h-screen flex items-center justify-center">Loading...</div>;
    if (submitted) return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-screen flex items-center justify-center text-3xl font-light">
            Thank you for completing this form!
        </motion.div>
    );
    if (questions.length === 0) return <div className="h-screen flex items-center justify-center">This form has no questions.</div>;

    const handleAnswerChange = (val: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
    };

    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-[#fdfafb] text-black flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 relative flex flex-col justify-between" style={{ minHeight: '60vh' }}>
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestion.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="w-full"
                        >
                            <div className="flex items-start gap-4 mb-8">
                                <span className="text-[#7c3aed] font-medium text-lg mt-1">{String(currentIndex + 1).padStart(2, '0')} →</span>
                                <div>
                                    <h1 className="text-3xl font-semibold text-gray-900 leading-tight">
                                        {currentQuestion.title || 'Untitled question'}
                                        {currentQuestion.is_required && <span className="text-red-500 ml-2">*</span>}
                                    </h1>
                                    {currentQuestion.description && (
                                        <p className="text-lg text-gray-500 mt-2 font-light">{currentQuestion.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="pl-12">
                                {currentQuestion.type === 'multiple_choice' ? (
                                    <div className="space-y-3">
                                        {(currentQuestion.options || []).map((opt: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => { handleAnswerChange(opt); setTimeout(() => handleNextRef.current?.(), 300); }}
                                                className={`block w-full max-w-md text-left px-6 py-4 rounded-lg border-2 transition-all ${currentAnswer === opt ? 'border-[#7c3aed] bg-purple-50 text-purple-900 font-medium' : 'border-gray-200 hover:border-[#7c3aed] hover:bg-purple-50'}`}
                                            >
                                                <span className="inline-block w-6 text-sm font-semibold text-gray-400 mr-2">{String.fromCharCode(65 + i)}</span>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                ) : currentQuestion.type === 'yes_no' ? (
                                    <div className="flex gap-4">
                                        {['Yes', 'No'].map((opt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { handleAnswerChange(opt); setTimeout(() => handleNextRef.current?.(), 300); }}
                                                className={`px-8 py-4 rounded-lg border-2 font-medium text-lg transition-all ${currentAnswer === opt ? 'border-[#7c3aed] bg-purple-50 text-purple-900' : 'border-gray-200 hover:border-[#7c3aed] hover:bg-purple-50'}`}
                                            >
                                                <span className="text-gray-400 mr-2 text-sm">{opt.charAt(0)}</span> {opt}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        ref={inputRef}
                                        type={currentQuestion.type === 'number' ? 'number' : 'text'}
                                        className="w-full text-2xl text-gray-800 border-b border-gray-300 focus:border-[#7c3aed] outline-none pb-3 bg-transparent transition-colors placeholder:text-gray-300"
                                        placeholder="Type your answer here..."
                                        value={currentAnswer}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="pl-12 mt-10 flex items-center gap-4">
                                <button
                                    onClick={handleNext}
                                    className="bg-[#7c3aed] text-white font-medium px-6 py-2.5 rounded hover:bg-[#6d28d9] transition flex items-center gap-2 text-lg shadow-sm"
                                >
                                    {isLast ? 'Submit' : 'OK ✓'}
                                </button>
                                <span className="text-sm text-gray-400 font-medium">press Enter ↵</span>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mt-12 pl-12">
                    <div className="h-2 bg-gray-100 w-full rounded-full overflow-hidden relative">
                        <div
                            className="h-full bg-[#7c3aed] absolute left-0 top-0 transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <span className="text-sm text-gray-400 font-medium">{Math.round(progress)}% completed</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                            >
                                ↑
                            </button>
                            <button 
                                onClick={handleNext}
                                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50"
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
