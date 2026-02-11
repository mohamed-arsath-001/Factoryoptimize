import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    ClipboardList,
    Package,
    Timer,
    Users,
    Calendar,
    Hash,
    Layers,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import BarChartComponent from '../components/charts/BarChart';
import PieChartComponent from '../components/charts/PieChart';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getStoredPlan } from '../services/api';
import { getPlanBlobs, downloadBlob, formatDate, extractStatsFromCSV, parseAllSheets } from '../utils/helpers';

export default function PlanDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null);
    const [stats, setStats] = useState(null);
    const [sheets, setSheets] = useState([]); // Array of { name, headers, rows }
    const [activeSheet, setActiveSheet] = useState(0);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        async function loadPlan() {
            setLoading(true);
            const meta = getStoredPlan(id);
            if (!meta) {
                setLoading(false);
                return;
            }
            setPlan(meta);

            // Try to load stats from metadata first
            if (meta.stats) {
                setStats(meta.stats);
            }

            try {
                const blobs = await getPlanBlobs(id);
                if (blobs?.optimizedBlob) {
                    // Parse ALL sheets from the Excel blob for display
                    const allSheets = await parseAllSheets(blobs.optimizedBlob);

                    if (allSheets.length > 0) {
                        // Build display data for each sheet
                        const displaySheets = allSheets.map(sheet => {
                            const lines = sheet.csv.trim().split('\n');
                            let headers = [];
                            let rows = [];

                            if (lines.length > 1) {
                                headers = lines[0].split(',').map(h => h.trim());
                                rows = lines.slice(1, 51).map(line =>
                                    line.split(',').map(c => c.trim())
                                );
                            }

                            return {
                                name: sheet.name,
                                headers,
                                rows,
                                totalRows: lines.length - 1,
                            };
                        });

                        setSheets(displaySheets);

                        // Extract stats from the first sheet (production schedule)
                        if (!meta.stats) {
                            const parsed = extractStatsFromCSV(allSheets[0].csv);
                            if (parsed) setStats(parsed);
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading plan data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadPlan();
    }, [id]);

    async function handleDownload() {
        setDownloading(true);
        try {
            const blobs = await getPlanBlobs(id);
            if (blobs?.optimizedBlob) {
                // Download the ORIGINAL blob directly — preserves all sheets & formatting
                const filename = plan?.optimizedFilename || 'optimized_schedule.xlsx';
                downloadBlob(blobs.optimizedBlob, filename);
            }
        } catch (err) {
            console.error('Download error:', err);
        } finally {
            setDownloading(false);
        }
    }

    if (loading) return <LoadingSpinner text="Loading plan details..." />;

    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-zinc-500">Plan not found</p>
                <Button variant="secondary" onClick={() => navigate('/')}>
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    // Determine download button label based on file extension
    const isExcel = plan.optimizedFilename && /\.(xlsx|xls)$/i.test(plan.optimizedFilename);
    const downloadLabel = isExcel ? 'Download Excel' : 'Download CSV';

    const statCards = [
        { title: 'Total Orders', value: stats?.totalOrders ?? '–', icon: ClipboardList, color: 'purple' },
        { title: 'Total Units', value: stats?.totalUnits?.toLocaleString() ?? '–', icon: Package, color: 'blue' },
        { title: 'Avg Batch Duration', value: stats?.avgBatchDuration ? `${Math.round(stats.avgBatchDuration)}m` : '–', icon: Timer, color: 'green' },
        { title: 'Orders With Teams', value: stats?.ordersWithTeams ?? '–', icon: Users, color: 'amber' },
    ];

    const currentSheet = sheets[activeSheet];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg hover:bg-dark-hover text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{plan.name || 'Plan Details'}</h1>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Calendar className="w-3 h-3" />
                                {formatDate(plan.uploadDate)}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                <Hash className="w-3 h-3" />
                                {plan.id.slice(0, 8)}
                            </span>
                            {sheets.length > 1 && (
                                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                    <Layers className="w-3 h-3" />
                                    {sheets.length} sheets
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Button onClick={handleDownload} loading={downloading}>
                    <Download className="w-4 h-4" />
                    {downloadLabel}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <StatCard key={card.title} {...card} delay={i * 80} />
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BarChartComponent data={stats?.machineUtilization} title="Machine Utilization" />
                <PieChartComponent data={stats?.shiftDistribution} title="Shift Distribution" />
            </div>

            {/* Sheet Tabs + Table */}
            {sheets.length > 0 && (
                <Card hover={false}>
                    {/* Sheet Tabs */}
                    {sheets.length > 1 && (
                        <div className="flex items-center gap-1 mb-4 border-b border-dark-border pb-3">
                            {sheets.map((sheet, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveSheet(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${activeSheet === idx
                                            ? 'gradient-purple text-white shadow-md shadow-purple-500/20'
                                            : 'text-zinc-400 hover:text-white hover:bg-dark-hover border border-transparent hover:border-dark-border'
                                        }`}
                                >
                                    {sheet.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Table Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-300">
                            {sheets.length > 1 ? currentSheet?.name : 'Machine Assignments'}
                            <span className="ml-2 text-xs text-zinc-600 font-normal">
                                ({currentSheet?.rows.length ?? 0} rows{currentSheet?.totalRows > 50 ? ` of ${currentSheet.totalRows}` : ''})
                            </span>
                        </h3>
                    </div>

                    {/* Table */}
                    {currentSheet && currentSheet.rows.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-dark-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-dark-tertiary/50">
                                        {currentSheet.headers.map((h, hi) => (
                                            <th key={hi} className="px-3 py-2.5 text-left font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border">
                                    {currentSheet.rows.map((row, ri) => (
                                        <tr key={ri} className="hover:bg-dark-hover/50 transition-colors">
                                            {row.map((cell, ci) => (
                                                <td key={ci} className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                                    {cell || '–'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-600 text-center py-4">No data in this sheet</p>
                    )}
                </Card>
            )}
        </div>
    );
}
