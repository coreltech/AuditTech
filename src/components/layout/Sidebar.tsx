import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Users, BookOpenCheck, BadgeDollarSign, History } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Sidebar() {
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Modo Clase', path: '/class-mode', icon: BookOpenCheck },
        { name: 'Historial', path: '/history', icon: History },
        { name: 'Cursos', path: '/courses', icon: GraduationCap },
        { name: 'Alumnos', path: '/students', icon: Users },
        { name: 'Finanzas y Pagos', path: '/finances', icon: BadgeDollarSign },
    ];

    return (
        <aside className="w-72 bg-white border-r border-slate-200 h-screen flex flex-col pt-8 pb-6 px-4 shadow-sm">
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
                    <BookOpenCheck className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">AuditTech</h1>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Instructor Pro</p>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {links.map((link) => {
                    const isActive = location.pathname === link.path;
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-50 text-blue-700 shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Icon className={cn(
                                "w-5 h-5 transition-colors duration-200",
                                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                            )} />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto px-2 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                        <span className="font-bold text-slate-600 text-sm">AL</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-slate-900 truncate">Agustín Lugo</span>
                        <span className="text-xs text-slate-500 truncate">Instructor</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
