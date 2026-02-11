const WEBHOOK_URL = 'https://abi2026.app.n8n.cloud/webhook/toweb';

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

        // Read response as text first to handle empty or invalid JSON
        const text = await response.text();

        if (!text) {
            // If response is empty but status is OK, return a placeholder CSV
            console.warn('Received empty response from webhook');
            blob = new Blob(['order_code,machine,start_time,end_time,duration,shift,team\nNO_DATA,M1,00:00,01:00,3600,Morning,Team A'], { type: 'text/csv' });
        } else if (contentType.includes('application/json')) {
            try {
                const json = JSON.parse(text);
                if (json.csv || json.data) {
                    const csvData = json.csv || json.data;
                    blob = new Blob([csvData], { type: 'text/csv' });
                } else {
                    // If JSON doesn't have csv/data fields, use the stringified JSON or fallback
                    blob = new Blob([JSON.stringify(json)], { type: 'text/csv' });
                }
            } catch (e) {
                // If JSON parsing fails, treat the text as CSV content directly
                console.warn('Failed to parse JSON response, treating as text:', e);
                blob = new Blob([text], { type: 'text/csv' });
            }
        } else {
            // For other content types (text/csv, etc.), use the text directly
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
