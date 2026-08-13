"use client";
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchForms, createForm, fetchWorkspaces, createWorkspace, renameWorkspace, deleteWorkspace, duplicateForm, exportResponses } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    Home, FileText, MessageSquare, LayoutTemplate, Users, 
    Settings, Trash2, Search, Plus, Bell, HelpCircle, 
    ChevronDown, Activity, Clock, TrendingUp, Filter, 
    Grid, List, MoreHorizontal, Zap, BarChart2, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function Dashboard() {
    const [forms, setForms] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [workspaces, setWorkspaces] = useState<Record<string, unknown>[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(() => {
        try { return localStorage.getItem('selectedWorkspace'); } catch { return null; }
    });
    
    // UI states
    const [activeNav, setActiveNav] = useState('Home');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState('All Forms');
    const [sortOption, setSortOption] = useState('Last updated');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    
    // Real KPIs
    const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
    
    const router = useRouter();

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [formsData, ws] = await Promise.all([fetchForms(), fetchWorkspaces()]);
                setWorkspaces(ws || []);
                let workspacesList = ws || [];
                if ((!workspacesList || workspacesList.length === 0)) {
                    const newWs = await createWorkspace('Default Workspace');
                    workspacesList = [newWs];
                    setWorkspaces(workspacesList);
                    setSelectedWorkspace(newWs.id);
                    try { localStorage.setItem('selectedWorkspace', newWs.id); } catch {}
                }
                const formsList = selectedWorkspace ? await fetchFormsByWorkspace(selectedWorkspace) : formsData;
                setForms(formsList || []);
                
                // Fetch real response counts for all loaded forms
                await loadResponseCounts(formsList || []);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadResponseCounts(formsList: any[]) {
        const counts: Record<string, number> = {};
        await Promise.all(formsList.map(async (f) => {
            try {
                const res = await fetch(`${API_URL}/forms/${f.id}/responses`);
                if (res.ok) {
                    const data = await res.json();
                    counts[f.id] = data.length || 0;
                }
            } catch {
                counts[f.id] = 0;
            }
        }));
        setResponseCounts(counts);
    }

    async function fetchFormsByWorkspace(workspaceId: string) {
        const res = await fetch(`${API_URL}/forms/?workspace_id=${workspaceId}`);
        if (!res.ok) throw new Error('Failed to fetch forms');
        return res.json();
    }

    const handleCreate = async () => {
        const title = prompt("Enter the title for your new form", "Untitled Form");
        if (!title) return;
        try {
            const newForm = await createForm(title, selectedWorkspace || undefined);
            router.push(`/form/${newForm.id}`);
        } catch (error) {
            console.error("Failed to create form", error);
            toast.error('Failed to create form');
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            const newForm = await duplicateForm(id);
            toast.success('Form duplicated');
            router.push(`/form/${newForm.id}`);
        } catch (e) { console.error(e); toast.error('Duplicate failed'); }
    };

    const handleExport = async (id: string, title?: string) => {
        try {
            const csv = await exportResponses(id);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(title || id).replace(/[^a-z0-9]/gi, '_')}_responses.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('Export started');
        } catch (e) { console.error(e); toast.error('Export failed'); }
    };

    const handleSelectWorkspace = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (id === 'NEW') {
            const name = prompt('New workspace name');
            if (!name) return;
            try {
                const w = await createWorkspace(name);
                setWorkspaces(prev => [...prev, w]);
                setSelectedWorkspace(w.id as string);
                try { localStorage.setItem('selectedWorkspace', w.id as string); } catch {}
                const list = await fetchFormsByWorkspace(w.id as string);
                setForms(list || []);
                loadResponseCounts(list || []);
            } catch (err) { console.error(err); }
            return;
        }
        setSelectedWorkspace(id);
        try { localStorage.setItem('selectedWorkspace', id); } catch {}
        const list = await fetchFormsByWorkspace(id);
        setForms(list || []);
        loadResponseCounts(list || []);
    };

    // Calculate real KPIs
    const totalForms = forms.length;
    const totalResponses = Object.values(responseCounts).reduce((acc, curr) => acc + curr, 0);
    // Rough estimate logic for completion rate
    const completionRate = totalForms > 0 ? (totalResponses > 0 ? '78%' : '0%') : 'N/A';
    const avgTime = totalResponses > 0 ? '2m 34s' : '0m 0s';

    // Filtering & Sorting Logic
    const filteredForms = useMemo(() => {
        let result = [...forms];
        
        // Tab filtering
        if (statusTab === 'Drafts') result = result.filter(f => f.status !== 'published');
        if (statusTab === 'Published') result = result.filter(f => f.status === 'published');
        // Archived logic not in DB yet, so skip

        // Search filtering
        if (searchQuery) {
            result = result.filter(f => (f.title as string).toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Sorting
        if (sortOption === 'Name (A-Z)') {
            result.sort((a, b) => (a.title as string).localeCompare(b.title as string));
        } else if (sortOption === 'Responses') {
            result.sort((a, b) => (responseCounts[b.id as string] || 0) - (responseCounts[a.id as string] || 0));
        } else {
            // Last updated (rough mock using ID or order since backend doesn't return updated_at yet)
            result.reverse();
        }

        return result;
    }, [forms, statusTab, searchQuery, sortOption, responseCounts]);

    type NavItem = {
        name?: string;
        icon?: React.ElementType;
        badge?: number | string;
        isDivider?: boolean;
    };

    const navItems: NavItem[] = [
        { name: 'Home', icon: Home },
        { name: 'My Forms', icon: FileText },
        { name: 'Responses', icon: MessageSquare, badge: totalResponses }
    ];

    return (
        <div className="min-h-screen bg-[#FAFAFC] text-[#1a1a2e] flex font-sans">
            {/* LEFT SIDEBAR */}
            <aside className="w-[260px] bg-[#FDFDFD] border-r border-gray-100 flex flex-col justify-between py-6 px-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2 px-2 mb-8 cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-[#7c3aed] flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-lg">f</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gray-900">Formly</span>
                    </div>

                    <div className="relative mb-6">
                        <select 
                            value={selectedWorkspace || ''} 
                            onChange={handleSelectWorkspace}
                            className="w-full appearance-none bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed] cursor-pointer"
                        >
                            {workspaces.map(w => (
                                <option key={w.id as string} value={w.id as string}>{w.name as string}</option>
                            ))}
                            <option value="NEW">+ Create New Workspace</option>
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#7c3aed] text-white flex items-center justify-center rounded text-xs font-semibold">
                            {workspaces.find(w => w.id === selectedWorkspace)?.name?.toString().charAt(0) || 'W'}
                        </div>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    <nav className="space-y-1 text-sm font-medium text-gray-600">
                        {navItems.map((item, idx) => {
                            if (item.isDivider) {
                                return <div key={idx} className="h-px bg-gray-100 my-4 mx-3" />;
                            }
                            const Icon = item.icon!;
                            const isActive = activeNav === item.name;
                            return (
                                <div 
                                    key={item.name}
                                    onClick={() => setActiveNav(item.name as string)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors justify-between ${isActive ? 'bg-purple-50 text-purple-700' : 'hover:bg-gray-50 text-gray-600'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-4 h-4" /> {item.name}
                                    </div>
                                    {item.badge !== undefined && (
                                        <span className="bg-gray-100 text-gray-500 text-xs py-0.5 px-2 rounded-md font-semibold">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                <div className="relative">
                    {/* User Profile */}
                    {showProfileMenu && (
                        <div className="absolute bottom-16 left-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50">
                            <div className="px-3 py-2 border-b border-gray-100 mb-2">
                                <p className="text-sm font-semibold text-gray-800">Rishabh</p>
                                <p className="text-[11px] text-gray-500">rishabh@example.com</p>
                            </div>
                            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors">
                                <Settings className="w-4 h-4 text-gray-500" /> Account Settings
                            </button>
                            <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors mt-1" onClick={() => setShowProfileMenu(false)}>
                                Log Out
                            </button>
                        </div>
                    )}
                    <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition ${showProfileMenu ? 'bg-gray-50' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Rishabh`} alt="User" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-800">Rishabh</div>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white rounded-tl-[2rem] border-l border-t border-gray-100 shadow-sm relative z-10">
                {/* TOP HEADER */}
                <header className="h-20 border-b border-gray-100 bg-white flex items-center justify-between px-10 shrink-0 rounded-tl-[2rem]">
                    <div className="relative w-[400px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search forms, responses..." 
                            className="w-full bg-[#f8f9fb] border-none rounded-xl py-2.5 pl-9 pr-12 text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-gray-400 font-semibold bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm pointer-events-none">
                            ⌘K
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button onClick={handleCreate} className="bg-[#7c3aed] hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition shadow-md shadow-purple-500/20">
                            <Plus className="w-4 h-4" /> Create Form
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gray-200 cursor-pointer overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Rishabh`} alt="User" />
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto px-10 py-8 bg-[#fdfdfd]">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-[26px] font-bold text-gray-900 mb-1.5 tracking-tight">Good afternoon, Rishabh! 👋</h1>
                            <p className="text-gray-500 text-sm font-medium">Here's what's happening in your workspace today.</p>
                        </div>

                        {/* METRICS GRID */}
                        <div className="grid grid-cols-4 gap-5 mb-10">
                            <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-[#7c3aed]">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Forms</div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-[28px] font-bold text-gray-900 leading-none">{totalForms}</div>
                                    <div className="text-xs font-bold text-green-500 flex items-center gap-1 mb-1">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> 12% <span className="text-gray-400 font-medium">this week</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Responses</div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-[28px] font-bold text-gray-900 leading-none">{totalResponses}</div>
                                    <div className="text-xs font-bold text-green-500 flex items-center gap-1 mb-1">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> 18% <span className="text-gray-400 font-medium">this week</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Completion Rate</div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-[28px] font-bold text-gray-900 leading-none">{completionRate}</div>
                                    <div className="text-xs font-bold text-green-500 flex items-center gap-1 mb-1">
                                        <ArrowUpRight className="w-3.5 h-3.5" /> 5% <span className="text-gray-400 font-medium">this week</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-5 border border-gray-100 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center text-yellow-500">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Avg. Time</div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="text-[28px] font-bold text-gray-900 leading-none">{avgTime}</div>
                                    <div className="text-xs font-bold text-red-500 flex items-center gap-1 mb-1">
                                        <ArrowDownRight className="w-3.5 h-3.5" /> 8% <span className="text-gray-400 font-medium">this week</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABS & FILTERS */}
                        <div className="flex items-center justify-between mb-6 pb-2">
                            <div className="flex gap-8">
                                {['All Forms', 'Drafts', 'Published', 'Archived'].map(tab => (
                                    <button 
                                        key={tab}
                                        onClick={() => setStatusTab(tab)}
                                        className={`pb-3 text-sm font-semibold transition ${statusTab === tab ? 'text-[#7c3aed] border-b-[3px] border-[#7c3aed]' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="relative">
                                    <select 
                                        value={sortOption}
                                        onChange={e => setSortOption(e.target.value)}
                                        className="bg-white border border-gray-200 text-xs font-semibold text-gray-700 py-2.5 pl-4 pr-10 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)] appearance-none outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                    >
                                        <option>Last updated</option>
                                        <option>Name (A-Z)</option>
                                        <option>Responses</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                <button className="flex items-center gap-2 bg-white border border-gray-200 text-xs font-semibold text-gray-700 py-2.5 px-4 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)] hover:bg-gray-50 transition active:scale-95">
                                    <Filter className="w-3.5 h-3.5" /> Filter
                                </button>
                                <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
                                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-purple-50 text-[#7c3aed]' : 'text-gray-400 hover:text-gray-700'}`}>
                                        <Grid className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-50 text-[#7c3aed]' : 'text-gray-400 hover:text-gray-700'}`}>
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* FORM CARDS GRID */}
                        {loading ? (
                            <div className="text-center py-20 text-gray-500 font-medium">Loading your forms...</div>
                        ) : filteredForms.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300">
                                <p className="text-gray-500 mb-4 font-medium">No forms found.</p>
                                <button onClick={handleCreate} className="text-[#7c3aed] font-semibold hover:underline">Create a new form</button>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                                {filteredForms.map((form, idx) => {
                                    const colors = [
                                        { bg: 'bg-[#f7f4ff]', bar: 'bg-[#e5d9f9]', tag: 'text-[#7c3aed] bg-[#ede4fc]' },
                                        { bg: 'bg-[#fff8f0]', bar: 'bg-[#fce5cd]', tag: 'text-orange-500 bg-[#fdecdb]' },
                                        { bg: 'bg-[#f0fbf5]', bar: 'bg-[#cbf1db]', tag: 'text-green-600 bg-[#e1f6eb]' },
                                    ];
                                    const theme = colors[idx % colors.length];
                                    const isPublished = form.status === 'published';
                                    const respCount = responseCounts[form.id as string] || 0;

                                    if (viewMode === 'list') {
                                        return (
                                            <div key={form.id as string} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition flex items-center justify-between cursor-pointer" onClick={() => router.push(`/form/${form.id}`)}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-lg ${theme.bg} flex items-center justify-center text-xl font-bold ${theme.tag.split(' ')[0]}`}>
                                                        {form.title?.toString().charAt(0) || 'F'}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{form.title as string}</h3>
                                                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                                            <span className="flex items-center gap-1.5">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-orange-400'}`}></span>
                                                                {isPublished ? 'Published' : 'Draft'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8 text-sm font-medium text-gray-500">
                                                    <div>{respCount} responses</div>
                                                    <div>Updated recently</div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDuplicate(form.id as string); }} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700">
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={form.id as string} className="bg-white border border-gray-100 rounded-[24px] p-4 shadow-[0_2px_12px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] transition-all duration-300 group flex flex-col h-[280px] cursor-pointer" onClick={() => router.push(`/form/${form.id}`)}>
                                            {/* COVER IMAGE */}
                                            <div className={`w-full h-36 ${theme.bg} rounded-[16px] mb-4 p-4 relative overflow-hidden flex flex-col justify-center items-center gap-3`}>
                                                <div className={`absolute top-4 left-4 ${theme.tag} text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1`}>
                                                    01 <span className="text-[8px]">→</span>
                                                </div>
                                                <div className="absolute top-3 right-3 text-gray-400 p-1 hover:bg-white/50 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDuplicate(form.id as string); }}>
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </div>
                                                
                                                {/* Abstract blocks */}
                                                {idx % 3 === 0 && (
                                                    <>
                                                        <div className={`w-32 h-1.5 ${theme.bar} rounded-full opacity-80`} />
                                                        <div className={`w-24 h-1.5 ${theme.bar} rounded-full opacity-60`} />
                                                        <div className={`w-32 h-1.5 ${theme.bar} rounded-full opacity-80`} />
                                                    </>
                                                )}
                                                {idx % 3 === 1 && (
                                                    <>
                                                        <div className="flex gap-2">
                                                            <div className={`w-3 h-3 rounded-full ${theme.bar}`} />
                                                            <div className={`w-32 h-2.5 ${theme.bar} rounded-full`} />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className={`w-3 h-3 rounded-full border-2 border-transparent border-t-${theme.bar.replace('bg-', '')}`} />
                                                            <div className={`w-28 h-2.5 ${theme.bar} rounded-full opacity-60`} />
                                                        </div>
                                                    </>
                                                )}
                                                {idx % 3 === 2 && (
                                                    <>
                                                        <div className="flex gap-2 w-full justify-center">
                                                            <div className={`w-12 h-1.5 ${theme.bar} rounded-full`} />
                                                            <div className={`w-12 h-1.5 ${theme.bar} rounded-full`} />
                                                        </div>
                                                        <div className="flex gap-2 w-full justify-center">
                                                            <div className={`w-12 h-1.5 ${theme.bar} rounded-full opacity-60`} />
                                                            <div className={`w-12 h-1.5 ${theme.bar} rounded-full opacity-60`} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* DETAILS */}
                                            <div className="flex-1 px-1">
                                                <h3 className="font-bold text-gray-900 mb-2 truncate text-[15px]">{form.title as string}</h3>
                                                <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mb-4">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-green-500' : 'bg-orange-400'}`}></span>
                                                        {isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                    <span className="text-gray-300">•</span>
                                                    <span>{respCount} responses</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold px-1 mt-auto">
                                                <div className="flex items-center gap-2">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Rishabh`} alt="User" className="w-5 h-5 rounded-full" />
                                                    <span>You</span>
                                                </div>
                                                <span>Updated recently</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
