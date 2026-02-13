
import { read, utils } from 'xlsx';

export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export function groupPlansByMonth(plans) {
    const grouped = {};
    plans.forEach((plan) => {
        const date = new Date(plan.uploadDate);
        const key = `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(plan);
    });
    return grouped;
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Detect if a blob is an Excel file by MIME type or binary signature.
 */
async function isExcelBlob(blob) {
    if (!blob) return false;

    const typeCheck = blob.type.includes('spreadsheet') || blob.type.includes('excel') || blob.type.includes('openxml');
    if (typeCheck) return true;

    // Check for binary signatures
    try {
        const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer());

        // XLSX signature: PK.. (0x50 0x4B 0x03 0x04)
        const isXLSX = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04;

        // XLS signature: D0 CF 11 E0 A1 B1 1A E1
        const isXLS = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;

        return isXLSX || isXLS;
    } catch {
        return false;
    }
}

/**
 * Parse a blob into CSV text (first sheet only).
 * Used for stats extraction and simple display.
 */
export async function parseBlobToCSV(blob) {
    if (!blob) return '';

    try {
        if (await isExcelBlob(blob)) {
            return await parseExcelFirstSheet(blob);
        }
        // Default: treat as text/CSV
        return await blob.text();
    } catch (e) {
        console.error('Error in parseBlobToCSV:', e);
        try {
            return await blob.text();
        } catch (e2) {
            return '';
        }
    }
}

/**
 * Parse ALL sheets from an Excel blob.
 * Returns an array of { name: string, csv: string } objects.
 * For CSV/text blobs, returns a single-element array.
 */
export async function parseAllSheets(blob) {
    if (!blob) return [];

    try {
        if (await isExcelBlob(blob)) {
            const data = await blob.arrayBuffer();
            const workbook = read(data);

            return workbook.SheetNames.map(sheetName => ({
                name: sheetName,
                csv: utils.sheet_to_csv(workbook.Sheets[sheetName]),
                json: utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }),
            }));
        }

        // Plain text/CSV — return as a single "sheet"
        const text = await blob.text();
        return [{ name: 'Sheet 1', csv: text, json: null }];
    } catch (e) {
        console.error('Error in parseAllSheets:', e);
        // Fallback: try reading as plain text
        try {
            const text = await blob.text();
            return [{ name: 'Sheet 1', csv: text, json: null }];
        } catch (e2) {
            return [];
        }
    }
}

async function parseExcelFirstSheet(blob) {
    try {
        const data = await blob.arrayBuffer();
        const workbook = read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return utils.sheet_to_csv(worksheet);
    } catch (e) {
        console.error('Failed to parse Excel file, falling back to text:', e);
        try {
            return await blob.text();
        } catch (e2) {
            return '';
        }
    }
}

export function validateFile(file) {
    if (!file) return { valid: false, error: 'No file selected' };
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const lowerName = file.name.toLowerCase();
    if (!validExtensions.some(ext => lowerName.endsWith(ext))) {
        return { valid: false, error: 'Only CSV and Excel files are accepted' };
    }
    if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File size must be less than 10MB' };
    return { valid: true, error: null };
}

export function formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '–';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Find a key in an object by partial match (case-insensitive).
 */
function findKey(obj, ...candidates) {
    const keys = Object.keys(obj);
    for (const cand of candidates) {
        const found = keys.find(k => k.toLowerCase() === cand);
        if (found) return found;
    }
    for (const cand of candidates) {
        const found = keys.find(k => k.toLowerCase().includes(cand));
        if (found) return found;
    }
    return null;
}

/**
 * Extract stats from JSON objects (from sheet_to_json).
 * This avoids CSV column misalignment issues.
 */
export function extractStatsFromJSON(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    try {
        const sample = rows[0];
        const codeKey = findKey(sample, 'code', 'order_code', 'order_id');
        const qtyKey = findKey(sample, 'quantity', 'qty');
        const machineKey = findKey(sample, 'machine');
        const durationKey = findKey(sample, 'duration_mins', 'duration', 'time');
        const shiftKey = findKey(sample, 'shift');
        const teamKey = findKey(sample, 'assigned_team', 'team');

        const uniqueOrders = new Set();
        let totalUnits = 0;
        let totalDuration = 0;
        let withTeams = 0;
        const machines = {};
        const shifts = {};

        rows.forEach(row => {
            if (codeKey && row[codeKey]) uniqueOrders.add(String(row[codeKey]));
            if (qtyKey) totalUnits += parseInt(row[qtyKey]) || 0;
            if (durationKey) totalDuration += parseFloat(row[durationKey]) || 0;
            if (teamKey && row[teamKey]) withTeams++;
            if (machineKey && row[machineKey]) {
                const m = String(row[machineKey]);
                machines[m] = (machines[m] || 0) + 1;
            }
            if (shiftKey && row[shiftKey]) {
                const s = String(row[shiftKey]);
                shifts[s] = (shifts[s] || 0) + 1;
            }
        });

        // Group shifts into canonical categories: Night, Morning, Afternoon, Evening
        const SHIFT_CATEGORIES = ['night', 'morning', 'afternoon', 'evening'];
        const groupedShifts = {};
        Object.entries(shifts).forEach(([name, count]) => {
            const lower = name.toLowerCase().trim();
            const match = SHIFT_CATEGORIES.find(cat => lower.includes(cat));
            if (match) {
                const label = match.charAt(0).toUpperCase() + match.slice(1);
                groupedShifts[label] = (groupedShifts[label] || 0) + count;
            }
        });

        return {
            totalOrders: uniqueOrders.size || rows.length,
            totalUnits,
            avgBatchDuration: rows.length > 0 ? totalDuration / rows.length : 0,
            ordersWithTeams: withTeams,
            machineUtilization: Object.entries(machines).map(([name, count]) => ({ name, count })),
            shiftDistribution: Object.entries(groupedShifts).map(([name, value]) => ({ name, value })),
            totalRows: rows.length,
        };
    } catch (e) {
        console.error('Error extracting stats from JSON:', e);
        return null;
    }
}

export function extractStatsFromCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') return null;

    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return null;

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const rows = lines.slice(1).filter((l) => l.trim());

        if (rows.length === 0) return null;

        const codeIdx = headers.findIndex((h) => h === 'code' || h === 'order_code');
        const qtyIdx = headers.findIndex((h) => h === 'quantity' || h === 'qty');
        const machineIdx = headers.findIndex((h) => h.includes('machine'));
        const durationIdx = headers.findIndex((h) => h.includes('duration') || h.includes('time'));
        const shiftIdx = headers.findIndex((h) => h.includes('shift'));
        const teamIdx = headers.findIndex((h) => h.includes('team'));

        const uniqueOrders = new Set();
        let totalUnits = 0;
        let totalDuration = 0;
        let withTeams = 0;
        const machines = {};
        const shifts = {};

        rows.forEach((row) => {
            try {
                const cols = row.split(',').map((c) => c.trim());
                if (codeIdx >= 0) uniqueOrders.add(cols[codeIdx]);
                if (qtyIdx >= 0) totalUnits += parseInt(cols[qtyIdx]) || 0;
                if (durationIdx >= 0) totalDuration += parseFloat(cols[durationIdx]) || 0;
                if (teamIdx >= 0 && cols[teamIdx]) withTeams++;
                if (machineIdx >= 0 && cols[machineIdx]) {
                    const m = cols[machineIdx];
                    machines[m] = (machines[m] || 0) + 1;
                }
                if (shiftIdx >= 0 && cols[shiftIdx]) {
                    const s = cols[shiftIdx];
                    shifts[s] = (shifts[s] || 0) + 1;
                }
            } catch (rowErr) {
                // Skip malformed rows
                console.warn('Skipping malformed CSV row:', row, rowErr);
            }
        });

        // Group shifts into canonical categories: Night, Morning, Afternoon, Evening
        const SHIFT_CATEGORIES = ['night', 'morning', 'afternoon', 'evening'];
        const groupedShifts = {};
        Object.entries(shifts).forEach(([name, count]) => {
            const lower = name.toLowerCase().trim();
            const match = SHIFT_CATEGORIES.find(cat => lower.includes(cat));
            if (match) {
                const label = match.charAt(0).toUpperCase() + match.slice(1);
                groupedShifts[label] = (groupedShifts[label] || 0) + count;
            }
        });

        return {
            totalOrders: uniqueOrders.size || rows.length,
            totalUnits,
            avgBatchDuration: rows.length > 0 ? totalDuration / rows.length : 0,
            ordersWithTeams: withTeams,
            machineUtilization: Object.entries(machines).map(([name, count]) => ({ name, count })),
            shiftDistribution: Object.entries(groupedShifts).map(([name, value]) => ({ name, value })),
            totalRows: rows.length,
        };
    } catch (e) {
        console.error('Error extracting stats from CSV:', e);
        return null;
    }
}

export function reorderCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') return csvText || '';

    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return csvText;

        const currentHeaders = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Define desired column order
        const desiredOrder = [
            'code', 'order_code',
            'item_number',
            'description',
            'colour', 'color',
            'material',
            'quantity', 'qty',
            'machine',
            'start_time',
            'end_time',
            'duration',
            'shift',
            'team'
        ];

        // Find indices for desired columns in the current CSV
        const map = [];
        const usedHeaders = new Set();

        // First pass: find columns that match desired order
        desiredOrder.forEach(key => {
            const idx = currentHeaders.findIndex(h => h === key || h.includes(key));
            if (idx !== -1 && !usedHeaders.has(currentHeaders[idx])) {
                map.push({ index: idx, name: currentHeaders[idx] });
                usedHeaders.add(currentHeaders[idx]);
            }
        });

        // Second pass: add any remaining columns
        currentHeaders.forEach((h, idx) => {
            if (!usedHeaders.has(h)) {
                map.push({ index: idx, name: h });
            }
        });

        // If no columns matched at all, return original
        if (map.length === 0) return csvText;

        // Reconstruct CSV
        const newHeaders = map.map(m => m.name).join(',');
        const newRows = lines.slice(1).map(line => {
            const cols = line.split(',').map(c => c.trim());
            return map.map(m => cols[m.index] || '').join(',');
        });

        return [newHeaders, ...newRows].join('\n');
    } catch (e) {
        console.error('Error reordering CSV:', e);
        return csvText || '';
    }
}

// --- IndexedDB Utilities ---
const DB_NAME = 'FactoryFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'planBlobs';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function savePlanBlobs(planId, originalBlob, optimizedBlob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ id: planId, originalBlob, optimizedBlob });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getPlanBlobs(planId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(planId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function deletePlanBlobs(planId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(planId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
