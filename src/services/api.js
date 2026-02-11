const WEBHOOK_URL = 'https://arsath26.app.n8n.cloud/webhook/toweb';

/**
 * Convert an array of objects to a CSV string.
 * Handles escaping of commas, quotes, and newlines within values.
 */
function arrayToCSV(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    const headers = Object.keys(arr[0]);
    const rows = arr.map(obj =>
        headers.map(h => {
            const val = obj[h] ?? '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

export async function uploadAndOptimize(file) {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('Content-Type') || '';
        let blob;
        let filename = 'optimized_schedule.csv';

        // Extract filename from Content-Disposition if available
        const disposition = response.headers.get('Content-Disposition');
        if (disposition) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match) filename = match[1].replace(/['"]/g, '');
        }

        // ─── FIX: Detect binary Excel responses BEFORE reading the body ───
        // Reading binary data with response.text() corrupts it (UTF-8 decoding).
        // We must use response.blob() or response.arrayBuffer() for binary content.
        const isBinaryType =
            contentType.includes('spreadsheet') ||
            contentType.includes('excel') ||
            contentType.includes('openxml') ||
            contentType.includes('octet-stream');

        if (isBinaryType) {
            // Preserve binary data by reading as blob directly
            blob = await response.blob();
            if (!filename.match(/\.(xlsx|xls)$/i)) {
                filename = 'optimized_schedule.xlsx';
            }
            return { blob, filename };
        }

        // ─── For text-based responses (JSON, CSV, plain text) ───
        const text = await response.text();

        if (!text || !text.trim()) {
            // Empty response — return a placeholder
            console.warn('Received empty response from webhook');
            blob = new Blob(
                ['code,item_number,description,colour,material,quantity\nNO_DATA,0,No data returned,,,'],
                { type: 'text/csv' }
            );
        } else if (contentType.includes('application/json')) {
            try {
                const json = JSON.parse(text);

                if (typeof json === 'string') {
                    // Whole JSON is a CSV string
                    blob = new Blob([json], { type: 'text/csv' });
                } else if (json.csv && typeof json.csv === 'string') {
                    blob = new Blob([json.csv], { type: 'text/csv' });
                } else if (json.data && typeof json.data === 'string') {
                    blob = new Blob([json.data], { type: 'text/csv' });
                } else if (json.output && typeof json.output === 'string') {
                    blob = new Blob([json.output], { type: 'text/csv' });
                } else if (json.result && typeof json.result === 'string') {
                    blob = new Blob([json.result], { type: 'text/csv' });
                } else if (Array.isArray(json)) {
                    // ─── FIX: Array of objects → convert to proper CSV ───
                    const csvContent = arrayToCSV(json);
                    blob = new Blob([csvContent], { type: 'text/csv' });
                } else if (json.data && Array.isArray(json.data)) {
                    const csvContent = arrayToCSV(json.data);
                    blob = new Blob([csvContent], { type: 'text/csv' });
                } else if (json.output && Array.isArray(json.output)) {
                    const csvContent = arrayToCSV(json.output);
                    blob = new Blob([csvContent], { type: 'text/csv' });
                } else if (json.result && Array.isArray(json.result)) {
                    const csvContent = arrayToCSV(json.result);
                    blob = new Blob([csvContent], { type: 'text/csv' });
                } else {
                    // Last resort: check if any top-level key holds an array
                    console.warn('Unexpected JSON structure from webhook:', Object.keys(json));
                    const arrayKey = Object.keys(json).find(k => Array.isArray(json[k]));
                    if (arrayKey) {
                        const csvContent = arrayToCSV(json[arrayKey]);
                        blob = new Blob([csvContent], { type: 'text/csv' });
                    } else {
                        // Truly unrecognized — stringify as fallback
                        blob = new Blob([JSON.stringify(json, null, 2)], { type: 'text/plain' });
                    }
                }
            } catch (e) {
                // JSON parse failed — treat the raw text as CSV
                console.warn('Failed to parse JSON response, treating as CSV:', e);
                blob = new Blob([text], { type: 'text/csv' });
            }
        } else {
            // text/csv, text/plain, or any other text content type
            blob = new Blob([text], { type: contentType || 'text/csv' });
        }

        return { blob, filename };
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. The optimization is taking too long. Please try again.');
        }
        throw error;
    }
}

// Local storage for plan metadata
const PLANS_KEY = 'factoryflow_plans';

export function getStoredPlans() {
    try {
        const raw = localStorage.getItem(PLANS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function storePlan(plan) {
    const plans = getStoredPlans();
    plans.unshift(plan);
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function getStoredPlan(id) {
    return getStoredPlans().find((p) => p.id === id) || null;
}

export function deletePlan(id) {
    const plans = getStoredPlans().filter((p) => p.id !== id);
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}
