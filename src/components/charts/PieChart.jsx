import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../ui/Card';

const COLORS = ['#8b5cf6', '#22d3ee', '#4ade80', '#fbbf24', '#fb7185', '#a78bfa'];

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-dark-secondary border border-dark-border rounded-lg px-3 py-2 shadow-xl">
            <p className="text-xs text-zinc-400">{payload[0].name}</p>
            <p className="text-sm font-semibold text-white">{payload[0].value} orders</p>
        </div>
    );
}

function CustomLegend({ payload }) {
    return (
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {payload?.map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-xs text-zinc-400">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

const RADIAN = Math.PI / 180;
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
    if (percent < 0.08) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
}

export default function PieChartComponent({ data = [], title = 'Shift Distribution' }) {
    const chartData = data.length > 0 ? data : [
        { name: 'Night', value: 25 },
        { name: 'Morning', value: 30 },
        { name: 'Afternoon', value: 25 },
        { name: 'Evening', value: 20 },
    ];

    return (
        <Card className="h-full">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            labelLine={false}
                            label={renderLabel}
                        >
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                    </RechartsPie>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
