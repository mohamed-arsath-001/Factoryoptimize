import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...', overlay = false, size = 'md' }) {
    const sizes = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const spinner = (
        <div className="flex flex-col items-center gap-3">
            <Loader2 className={`${sizes[size]} animate-spin text-purple-500`} />
            {text && <p className="text-sm text-zinc-400 font-medium">{text}</p>}
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-primary/80 backdrop-blur-sm">
                {spinner}
            </div>
        );
    }

    return <div className="flex items-center justify-center py-12">{spinner}</div>;
}
