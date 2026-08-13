"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchForm, fetchResponses } from '@/lib/api';

interface Answer {
    id: string;
    question_id: string;
    value: string;
}

interface FormResponse {
    id: string;
    form_id: string;
    submitted_at: string;
    answers: Answer[];
}

interface Question {
    id: string;
    title: string;
    type: string;
}

interface Form {
    id: string;
    title: string;
    status: string;
    questions: Question[];
}

export default function ResultsDashboard() {
    const params = useParams();
    const router = useRouter();
    const [form, setForm] = useState<Form | null>(null);
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            Promise.all([
                fetchForm(params.id as string),
                fetchResponses(params.id as string)
            ])
            .then(([formData, responsesData]) => {
                setForm(formData);
                setResponses(responsesData);
                setLoading(false);
            })
            .catch(() => {
                router.push('/');
            });
        }
    }, [params.id, router]);

    if (loading || !form) return <div className="p-8 text-black">Loading results...</div>;

    const questions = form.questions || [];

    return (
        <div className="min-h-screen bg-gray-50 text-black">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="text-gray-500 hover:text-black">← Back to Workspace</button>
                    <h1 className="text-xl font-semibold">{form.title} - Results</h1>
                </div>
                <div className="text-sm text-gray-500">
                    {responses.length} total response{responses.length !== 1 ? 's' : ''}
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-8">
                {responses.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
                        <p className="text-gray-500 mb-4">No one has responded to this form yet.</p>
                        {form.status === 'published' ? (
                            <a href={`/to/${form.id}`} target="_blank" className="text-blue-600 hover:underline">View live form</a>
                        ) : (
                            <p className="text-red-500 text-sm">You need to publish the form first.</p>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Submitted At</th>
                                    {questions.map((q: Question) => (
                                        <th key={q.id} className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {q.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {responses.map((response) => (
                                    <tr key={response.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="p-4 text-sm text-gray-700 whitespace-nowrap">
                                            {new Date(response.submitted_at).toLocaleString()}
                                        </td>
                                        {questions.map((q: Question) => {
                                            const ans = response.answers.find((a: Answer) => a.question_id === q.id);
                                            return (
                                                <td key={q.id} className="p-4 text-sm text-gray-800">
                                                    {ans ? ans.value : <span className="text-gray-400 italic">Skipped</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
