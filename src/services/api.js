const RENDER_URL = 'https://wood-scheduler.onrender.com/optimize';

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

/**
 * Upload multiple files to the Render backend for optimization.
 * @param {File[]} files - Array of files to upload
 * @returns {{ blob: Blob, filename: string, n8nDelivery: string | null }}
 */
export async function uploadAndOptimize(files) {
    const formData = new FormData();

    // Loop through all files — key must be 'files' (plural)
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout for multiple files

    try {
        const response = await fetch(RENDER_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('Content-Type') || '';

        // ─── Check for binary Excel response ───
        const isBinaryType =
            contentType.includes('spreadsheet') ||
            contentType.includes('excel') ||
            contentType.includes('openxml') ||
            contentType.includes('octet-stream');

        if (isBinaryType) {
            const blob = await response.blob();
            let filename = 'optimized_schedule.xlsx';
            const disposition = response.headers.get('Content-Disposition');
            if (disposition) {
                const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match) filename = match[1].replace(/['"]/g, '');
            }
            return { blob, filename, n8nDelivery: null };
        }

        // ─── JSON response (expected from Render backend) ───
        const text = await response.text();

        if (!text || !text.trim()) {
            console.warn('Received empty response from backend');
            const blob = new Blob(
                ['code,item_number,description,colour,material,quantity\nNO_DATA,0,No data returned,,,'],
                { type: 'text/csv' }
            );
            return { blob, filename: 'optimized_schedule.csv', n8nDelivery: null };
        }

        // Parse as JSON
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            // Not JSON — treat as raw CSV
            console.warn('Response is not JSON, treating as CSV');
            const blob = new Blob([text], { type: 'text/csv' });
            return { blob, filename: 'optimized_schedule.csv', n8nDelivery: null };
        }

        // Extract n8n delivery status
        const n8nDelivery = json.n8n_delivery || null;

        // Extract schedule data from response.data
        let blob;
        let filename = 'optimized_schedule.csv';
        const data = json.data;

        if (Array.isArray(data)) {
            // Array of objects → convert to CSV blob
            const csvContent = arrayToCSV(data);
            blob = new Blob([csvContent], { type: 'text/csv' });
        } else if (typeof data === 'string') {
            // CSV string
            blob = new Blob([data], { type: 'text/csv' });
        } else if (data && typeof data === 'object') {
            // Could be a nested structure — try to find an array
            const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
            if (arrayKey) {
                const csvContent = arrayToCSV(data[arrayKey]);
                blob = new Blob([csvContent], { type: 'text/csv' });
            } else {
                blob = new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' });
                filename = 'optimized_schedule.json';
            }
        } else {
            // Fallback: use the entire json
            console.warn('Unexpected response structure:', Object.keys(json));
            const arrayKey = Object.keys(json).find(k => Array.isArray(json[k]));
            if (arrayKey) {
                const csvContent = arrayToCSV(json[arrayKey]);
                blob = new Blob([csvContent], { type: 'text/csv' });
            } else {
                blob = new Blob([JSON.stringify(json, null, 2)], { type: 'text/plain' });
                filename = 'optimized_schedule.json';
            }
        }

        return { blob, filename, n8nDelivery };
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
