import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
    LayoutDashboard,
    FilePlus,
    History,
    ChevronDown,
    ChevronRight,
    FileText,
    Factory,
    LogOut,
} from 'lucide-react';
import { usePlans } from '../../context/PlansContext';
import { groupPlansByMonth, formatDate } from '../../utils/helpers';

export default function Sidebar() {
    const { plans } = usePlans();
    const [historyOpen, setHistoryOpen] = useState(true);
    const location = useLocation();
    const grouped = groupPlansByMonth(plans);

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/create-plan', icon: FilePlus, label: 'Create New Plan' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-dark-secondary border-r border-dark-border flex flex-col z-40">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-dark-border">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg gradient-purple flex items-center justify-center gradient-purple-glow">
                        <Factory className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight">FactoryFlow</h1>
                        <p className="text-[10px] text-zinc-500 leading-none mt-0.5">Production Optimizer</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
                <div className="space-y-0.5">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium sidebar-transition ${isActive
                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-dark-hover border border-transparent'
                                }`
                            }
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </div>

                {/* Previous Plans */}
                <div className="mt-4">
                    <button
                        onClick={() => setHistoryOpen(!historyOpen)}
                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-dark-hover sidebar-transition"
                    >
                        <span className="flex items-center gap-3">
                            <History className="w-4 h-4 shrink-0" />
                            Previous Plans
                        </span>
                        {historyOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                        )}
                    </button>

                    {historyOpen && (
                        <div className="mt-1 space-y-2 pl-2">
                            {Object.keys(grouped).length === 0 ? (
                                <p className="text-xs text-zinc-600 px-3 py-2">No plans yet</p>
                            ) : (
                                Object.entries(grouped).map(([month, monthPlans]) => (
                                    <div key={month}>
                                        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold px-3 py-1">
                                            {month}
                                        </p>
                                        {monthPlans.map((plan) => (
                                            <NavLink
                                                key={plan.id}
                                                to={`/plans/${plan.id}`}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sidebar-transition ${isActive
                                                        ? 'bg-purple-500/10 text-purple-400'
                                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-dark-hover'
                                                    }`
                                                }
                                            >
                                                <FileText className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{plan.name || formatDate(plan.uploadDate)}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* User Section */}
            <div className="px-3 py-3 border-t border-dark-border">
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full gradient-purple flex items-center justify-center text-xs font-bold text-white">
                        PL
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-300 truncate">Planner</p>
                        <p className="text-[10px] text-zinc-600 truncate">planner@factoryflow.com</p>
                    </div>
                    <LogOut className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors" />
                </div>
            </div>
        </aside>
    );
}
