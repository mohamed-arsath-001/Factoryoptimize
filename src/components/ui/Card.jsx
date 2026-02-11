export default function Card({ children, className = '', hover = true, ...props }) {
    return (
        <div
            className={`glass-card rounded-xl p-5 transition-all duration-300 ${hover ? 'hover:scale-[1.01] hover:shadow-lg hover:shadow-purple-500/5' : ''
                } ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
