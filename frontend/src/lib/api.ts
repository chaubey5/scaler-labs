const API_URL = "http://localhost:8000/api";

export async function fetchForms() {
    const res = await fetch(`${API_URL}/forms/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch forms');
    return res.json();
}

export async function createForm(title: string, workspace_id?: string) {
    const payload: Record<string, unknown> = { title, status: 'draft' };
    if (workspace_id) payload.workspace_id = workspace_id;
    const res = await fetch(`${API_URL}/forms/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create form');
    return res.json();
}

export async function fetchWorkspaces() {
    const res = await fetch(`${API_URL}/workspaces/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch workspaces');
    return res.json();
}

export async function createWorkspace(name: string) {
    const res = await fetch(`${API_URL}/workspaces/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to create workspace');
    return res.json();
}

export async function renameWorkspace(id: string, name: string) {
    const res = await fetch(`${API_URL}/workspaces/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to rename workspace');
    return res.json();
}

export async function deleteWorkspace(id: string) {
    const res = await fetch(`${API_URL}/workspaces/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete workspace');
    return res.json();
}

export async function fetchForm(id: string) {
    const res = await fetch(`${API_URL}/forms/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch form');
    return res.json();
}

export async function fetchPublicForm(id: string) {
    const res = await fetch(`${API_URL}/public/forms/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch form');
    return res.json();
}

export async function submitResponse(id: string, answers: { question_id: string, value: string }[]) {
    const res = await fetch(`${API_URL}/public/forms/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
    });
    if (!res.ok) throw new Error('Failed to submit response');
    return res.json();
}

export async function fetchResponses(id: string) {
    const res = await fetch(`${API_URL}/forms/${id}/responses`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch responses');
    return res.json();
}

export async function updateForm(id: string, updates: any) {
    const res = await fetch(`${API_URL}/forms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to update form');
    return res.json();
}

export async function importFile(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const res = await fetch(`${API_URL}/import/file`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) throw new Error(await res.text() || 'Failed to import file');
    return res.json();
}

export async function duplicateForm(id: string) {
    const res = await fetch(`${API_URL}/forms/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate form');
    return res.json();
}

export async function exportResponses(id: string) {
    const res = await fetch(`${API_URL}/forms/${id}/export`);
    if (!res.ok) {
        const text = await res.text();
        throw new Error('Export failed: ' + text);
    }
    const csv = await res.text();
    return csv;
}
