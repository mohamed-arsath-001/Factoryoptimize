import { useRef, useState } from 'react';
import { Upload, FileText, X, Files } from 'lucide-react';
import { validateFile } from '../../utils/helpers';

export default function FileUpload({ onFilesSelect, selectedFiles = [], onClear }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState(null);

    function handleFiles(fileList) {
        const filesArray = Array.from(fileList);
        if (filesArray.length === 0) return;

        const errors = [];
        const validFiles = [];

        filesArray.forEach((file) => {
            const result = validateFile(file);
            if (!result.valid) {
                errors.push(`${file.name}: ${result.error}`);
            } else {
                validFiles.push(file);
            }
        });

        if (errors.length > 0 && validFiles.length === 0) {
            setError(errors.join('; '));
            return;
        }

        if (errors.length > 0) {
            setError(`Some files skipped: ${errors.join('; ')}`);
        } else {
            setError(null);
        }

        onFilesSelect(validFiles);
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    }

    function handleChange(e) {
        handleFiles(e.target.files);
        // Reset input value so re-selecting the same files triggers onChange
        e.target.value = '';
    }

    const hasFiles = selectedFiles.length > 0;
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

    return (
        <div className="space-y-2">
            <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${dragOver
                    ? 'border-purple-500 bg-purple-500/10'
                    : hasFiles
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
                    multiple
                    onChange={handleChange}
                    className="hidden"
                />

                {hasFiles ? (
                    <div className="flex items-center justify-center gap-3">
                        <Files className="w-8 h-8 text-green-400 shrink-0" />
                        <div className="text-left min-w-0">
                            <p className="text-sm font-medium text-white">
                                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                            </p>
                            <p className="text-xs text-zinc-500">
                                {(totalSize / 1024).toFixed(1)} KB total
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
                                Drag & drop your files here
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">or click to browse · multiple files supported</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Selected files list */}
            {hasFiles && (
                <div className="space-y-1 px-1">
                    {selectedFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-xs">
                            <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="text-zinc-300 truncate">{file.name}</span>
                            <span className="text-zinc-600 shrink-0">
                                ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <p className="text-xs text-rose-400 ml-1">{error}</p>
            )}
        </div>
    );
}
