import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { validateFile } from '../../utils/helpers';

export default function FileUpload({ onFileSelect, selectedFile, onClear }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState(null);

    function handleFile(file) {
        const result = validateFile(file);
        if (!result.valid) {
            setError(result.error);
            return;
        }
        setError(null);
        onFileSelect(file);
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    function handleChange(e) {
        const file = e.target.files[0];
        if (file) handleFile(file);
    }

    return (
        <div className="space-y-2">
            <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${dragOver
                    ? 'border-purple-500 bg-purple-500/10'
                    : selectedFile
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'border-dark-border hover:border-purple-500/40 hover:bg-dark-hover/50'
                    }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleChange}
                    className="hidden"
                />

                {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-green-400" />
                        <div className="text-left">
                            <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                            <p className="text-xs text-zinc-500">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                                setError(null);
                            }}
                            className="ml-3 p-1.5 rounded-lg hover:bg-dark-hover text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="mx-auto w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-300">
                                Drag & drop your file here
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
                        </div>
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs text-rose-400 ml-1">{error}</p>
            )}
        </div>
    );
}
