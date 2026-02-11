import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from '../ui/Card';

const COLORS = ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#c4b5fd', '#ddd6fe'];

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-dark-secondary border border-dark-border rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="text-sm font-semibold text-white">{payload[0].value} tasks</p>
        </div>
    );
}

export default function BarChartComponent({ data = [], title = 'Machine Utilization' }) {
    const chartData = data.length > 0 ? data : [
        { name: 'M1', count: 12 },
        { name: 'M2', count: 8 },
        { name: 'M3', count: 15 },
        { name: 'M4', count: 6 },
        { name: 'M5', count: 10 },
    ];

    return (
        <Card className="h-full">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsBar data={chartData} barSize={32} radius={[6, 6, 0, 0]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            axisLine={{ stroke: '#27272a' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: '#71717a', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </RechartsBar>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
