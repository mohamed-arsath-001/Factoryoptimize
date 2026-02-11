import { Loader2 } from 'lucide-react';

export default function Button({
    children,
    variant = 'primary',
    loading = false,
    disabled = false,
    className = '',
    ...props
}) {
    const base =
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500/40';

    const variants = {
        primary:
            'gradient-purple text-white hover:brightness-110 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.97]',
        secondary:
            'bg-transparent border border-dark-border text-zinc-300 hover:bg-dark-hover hover:border-purple-500/30 hover:text-white active:scale-[0.97]',
        ghost:
            'bg-transparent text-zinc-400 hover:text-white hover:bg-dark-hover',
    };

    return (
        <button
            className={`${base} ${variants[variant]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}
