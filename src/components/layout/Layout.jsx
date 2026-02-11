import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <div className="min-h-screen bg-dark-primary">
            <Sidebar />
            <main className="ml-64 min-h-screen">
                <div className="p-6 lg:p-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
