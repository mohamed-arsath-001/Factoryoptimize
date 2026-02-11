import { useState, useEffect } from 'react';
import { ClipboardList, Package, Timer, Users } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import BarChartComponent from '../components/charts/BarChart';
import PieChartComponent from '../components/charts/PieChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { usePlans } from '../context/PlansContext';
import { getPlanBlobs, extractStatsFromCSV } from '../utils/helpers';

export default function Dashboard() {
    const { plans } = usePlans();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            setLoading(true);
            try {
                // aggregate stats from the latest plan if available
                if (plans.length > 0) {
                    const latest = plans[0];
                    if (latest.stats) {
                        setStats(latest.stats);
                    } else {
                        const blobs = await getPlanBlobs(latest.id);
                        if (blobs?.optimizedBlob) {
                            const text = await blobs.optimizedBlob.text();
                            const parsed = extractStatsFromCSV(text);
                            setStats(parsed);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [plans]);

    const statCards = [
        {
            title: 'Total Orders',
            value: stats?.totalOrders ?? 128,
            icon: ClipboardList,
            color: 'purple',
        },
        {
            title: 'Total Units',
            value: stats?.totalUnits ? stats.totalUnits.toLocaleString() : '4,256',
            icon: Package,
            color: 'blue',
        },
        {
            title: 'Avg Batch Duration',
            value: stats?.avgBatchDuration ? `${Math.round(stats.avgBatchDuration)}m` : '45m',
            icon: Timer,
            color: 'green',
        },
        {
            title: 'Orders With Teams',
            value: stats?.ordersWithTeams ?? 96,
            icon: Users,
            color: 'amber',
        },
    ];

    if (loading) return <LoadingSpinner text="Loading dashboard..." />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Production Plan Optimizer</h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Overview of your latest production data & insights
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <StatCard key={card.title} {...card} delay={i * 80} />
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BarChartComponent
                    data={stats?.machineUtilization}
                    title="Machine Utilization"
                />
                <PieChartComponent
                    data={stats?.shiftDistribution}
                    title="Shift Distribution"
                />
            </div>

            {/* Quick Info */}
            {plans.length > 0 && (
                <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Latest Plan</p>
                        <p className="text-sm font-medium text-zinc-300 mt-0.5">
                            {plans[0].name || 'Untitled Plan'}
                        </p>
                    </div>
                    <div className="text-xs text-zinc-600">
                        {plans.length} plan{plans.length !== 1 ? 's' : ''} created
                    </div>
                </div>
            )}
        </div>
    );
}
