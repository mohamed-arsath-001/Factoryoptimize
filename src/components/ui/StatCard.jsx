export default function StatCard({ title, value, icon: Icon, color = 'purple', delay = 0 }) {
    const colorMap = {
        purple: 'from-purple-600/20 to-purple-800/10 text-purple-400',
        green: 'from-green-600/20 to-green-800/10 text-green-400',
        blue: 'from-blue-600/20 to-blue-800/10 text-blue-400',
        amber: 'from-amber-600/20 to-amber-800/10 text-amber-400',
    };

    const iconBg = {
        purple: 'bg-purple-500/15 text-purple-400',
        green: 'bg-green-500/15 text-green-400',
        blue: 'bg-blue-500/15 text-blue-400',
        amber: 'bg-amber-500/15 text-amber-400',
    };

    return (
        <div
            className={`glass-card rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 animate-slide-in`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium mb-2">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                </div>
                {Icon && (
                    <div className={`p-2.5 rounded-lg ${iconBg[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>
            <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${colorMap[color]} opacity-50`} />
        </div>
    );
}
