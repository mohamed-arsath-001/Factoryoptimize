import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '../components/ui/FileUpload';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { uploadAndOptimize } from '../services/api';
import { usePlans } from '../context/PlansContext';
import { generateUUID, savePlanBlobs, extractStatsFromCSV, parseBlobToCSV, reorderCSV } from '../utils/helpers';

const REQUIRED_COLUMNS = ['code', 'item_number', 'description', 'colour', 'material', 'quantity'];

export default function CreateNewPlan() {
    const navigate = useNavigate();
    const { addPlan } = usePlans();
    const [file, setFile] = useState(null);
    const [step, setStep] = useState(1); // 1=upload, 2=optimizing, 3=done
    const [error, setError] = useState(null);
    const [optimizing, setOptimizing] = useState(false);

    async function handleOptimize() {
        if (!file) return;
        setStep(2);
        setOptimizing(true);
        setError(null);

        try {
            const { blob, filename } = await uploadAndOptimize(file);


            // Parse the optimized file (CSV or Excel) for stats
            // We use the new helper to handle binary Excel blobs
            const csvText = await parseBlobToCSV(blob);
            const stats = extractStatsFromCSV(csvText);

            // If the original blob was Excel, we might want to store the converted CSV as the optimized blob?
            // Or keep the original Excel blob for download?
            // The user wants "download csv/xlsx file in a correct order".
            // If they modify/reorder, we must generate a NEW CSV blob.

            // Let's generate a new cleaned CSV blob from the parsed text to ensure consistent format
            // This also fixes the column order if we apply reordering here
            const reorderedText = reorderCSV(csvText);
            const optimizedBlob = new Blob([reorderedText], { type: 'text/csv' });

            // Note: If the user specifically wants the Excel file as download, 
            // we should technically save the original `blob` if it was Excel.
            // However, the request asked for "correct order", implying we need to regenerate it.
            // Regenerating as CSV is safer and easier. Excel can open CSV.
            // So we'll save the reordered CSV as the optimized blob.

            const planId = generateUUID();
            const plan = {
                id: planId,
                name: file.name.replace(/\.[^/.]+$/, '') + ' — Optimized',
                uploadDate: new Date().toISOString(),
                originalFilename: file.name,
                optimizedFilename: filename.replace('.xlsx', '.csv').replace('.xls', '.csv'), // Force CSV extension for consistency
                stats,
            };

            // Save blobs to IndexedDB, metadata to localStorage
            await savePlanBlobs(planId, file, optimizedBlob);
            addPlan(plan);

            setStep(3);
            setTimeout(() => navigate(`/plans/${planId}`), 1200);
        } catch (err) {
            setError(err.message || 'Optimization failed. Please try again.');
            setStep(1);
        } finally {
            setOptimizing(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Create New Plan</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Upload your orders file and generate an optimized production schedule
                </p>
            </div>

            {/* Steps Progress */}
            <div className="flex items-center gap-3">
                {[
                    { num: 1, label: 'Upload Orders' },
                    { num: 2, label: 'Generate Schedule' },
                ].map(({ num, label }) => (
                    <div key={num} className="flex items-center gap-2">
                        <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= num
                                ? 'gradient-purple text-white shadow-lg shadow-purple-500/20'
                                : 'bg-dark-tertiary text-zinc-500 border border-dark-border'
                                }`}
                        >
                            {step > num ? <CheckCircle className="w-4 h-4" /> : num}
                        </div>
                        <span className={`text-sm font-medium ${step >= num ? 'text-zinc-300' : 'text-zinc-600'}`}>
                            {label}
                        </span>
                        {num === 1 && <div className="w-12 h-px bg-dark-border" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Upload */}
            {step <= 1 && (
                <Card hover={false} className="space-y-5 animate-slide-in">
                    <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-purple-400" />
                        <h2 className="text-sm font-semibold text-zinc-300">Upload Orders File</h2>
                    </div>

                    <FileUpload
                        selectedFile={file}
                        onFileSelect={(f) => { setFile(f); setError(null); }}
                        onClear={() => setFile(null)}
                    />

                    <div className="bg-dark-primary/50 rounded-lg p-3 border border-dark-border">
                        <p className="text-xs text-zinc-500 font-medium mb-1.5">Required columns:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {REQUIRED_COLUMNS.map((col) => (
                                <span
                                    key={col}
                                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                >
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm text-rose-300">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-xs text-rose-400 hover:text-rose-300 mt-1 underline"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleOptimize}
                        disabled={!file}
                        className="w-full"
                    >
                        <Sparkles className="w-4 h-4" />
                        Run Optimization Model
                    </Button>
                </Card>
            )}

            {/* Step 2: Optimizing */}
            {step === 2 && (
                <Card hover={false} className="animate-slide-in">
                    <div className="py-8 flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center animate-pulse-glow">
                                <Sparkles className="w-7 h-7 text-white animate-float" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-white">Optimizing Production Schedule</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                This may take a moment. Processing your orders...
                            </p>
                        </div>
                        <LoadingSpinner size="sm" text="" />
                    </div>
                </Card>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
                <Card hover={false} className="animate-slide-in">
                    <div className="py-8 flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                            <CheckCircle className="w-7 h-7 text-green-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-white">Optimization Complete!</p>
                            <p className="text-xs text-zinc-500 mt-1">Redirecting to plan details...</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
