import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import FileUpload from '../components/ui/FileUpload';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { uploadAndOptimize } from '../services/api';
import { usePlans } from '../context/PlansContext';
import { generateUUID, savePlanBlobs, extractStatsFromCSV, parseBlobToCSV } from '../utils/helpers';

const REQUIRED_COLUMNS = ['code', 'item_number', 'description', 'colour', 'material', 'quantity'];

export default function CreateNewPlan() {
    const navigate = useNavigate();
    const { addPlan } = usePlans();
    const [files, setFiles] = useState([]);
    const [step, setStep] = useState(1); // 1=upload, 2=optimizing, 3=done
    const [error, setError] = useState(null);
    const [optimizing, setOptimizing] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    async function handleOptimize() {
        if (files.length === 0) return;
        setStep(2);
        setOptimizing(true);
        setError(null);
        setEmailSent(false);

        try {
            // Step 1: Upload files and get optimized response from Render backend
            let blob, filename, n8nDelivery;
            try {
                const result = await uploadAndOptimize(files);
                blob = result.blob;
                filename = result.filename;
                n8nDelivery = result.n8nDelivery;
            } catch (apiErr) {
                throw new Error(`Backend request failed: ${apiErr.message || 'Unknown network error'}`);
            }

            if (!blob) {
                throw new Error('No data received from the optimization server.');
            }

            // Check email delivery status
            if (n8nDelivery && n8nDelivery.includes('Email Sent')) {
                setEmailSent(true);
            }

            // Step 2: Parse the first sheet for stats display only
            let stats = null;
            try {
                const csvText = await parseBlobToCSV(blob);
                if (csvText && csvText.trim()) {
                    stats = extractStatsFromCSV(csvText);
                }
            } catch (statsErr) {
                console.warn('Stats extraction failed (non-critical):', statsErr);
            }

            // Step 3: Save blob to IndexedDB
            const planId = generateUUID();
            const planName = files.length === 1
                ? files[0].name.replace(/\.[^/.]+$/, '') + ' — Optimized'
                : `${files.length} Files — Optimized`;

            const plan = {
                id: planId,
                name: planName,
                uploadDate: new Date().toISOString(),
                originalFilename: files.map(f => f.name).join(', '),
                optimizedFilename: filename,
                stats,
            };

            try {
                // Save the first file as the "original" and the optimized blob
                await savePlanBlobs(planId, files[0], blob);
            } catch (dbErr) {
                console.error('IndexedDB save failed:', dbErr);
                throw new Error('Failed to save plan data locally. Please ensure browser storage is available.');
            }

            addPlan(plan);

            setStep(3);
            setTimeout(() => navigate(`/plans/${planId}`), 1800);
        } catch (err) {
            console.error('Plan generation error:', err);
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
                    Upload your orders files and generate an optimized production schedule
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
                        <h2 className="text-sm font-semibold text-zinc-300">Upload Orders Files</h2>
                    </div>

                    <FileUpload
                        selectedFiles={files}
                        onFilesSelect={(f) => { setFiles(f); setError(null); }}
                        onClear={() => setFiles([])}
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
                        disabled={files.length === 0}
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
                            <p className="text-sm font-semibold text-white">Calibrating with Master Database & Optimizing Schedule...</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Processing {files.length} file{files.length > 1 ? 's' : ''}. This may take a moment.
                            </p>
                        </div>
                        <LoadingSpinner size="sm" text="" />
                    </div>
                </Card>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
                <div className="space-y-4 animate-slide-in">
                    <Card hover={false}>
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

                    {/* Email success toast */}
                    {emailSent && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-slide-in">
                            <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-green-300">✅ Optimization Complete</p>
                                <p className="text-xs text-green-400/70">Schedule has been emailed to the Production Manager.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
