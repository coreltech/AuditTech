import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Clock, BookOpen, WalletCards } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [unliquidatedAmount, setUnliquidatedAmount] = useState(0); // Por cobrar ciclo actual
    const [liquidatedDebt, setLiquidatedDebt] = useState(0); // Deuda vieja (Liquidado - Pagado)
    const [recentClasses, setRecentClasses] = useState<any[]>([]);
    const [activeCoursesCount, setActiveCoursesCount] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Obtener "Saldo por liquidar" (Clases sin settlement_id)
            const { data: unliquidatedClasses, error: e1 } = await supabase
                .from('classes')
                .select('amount_generated_usd')
                .is('settlement_id', null);
            if (e1) throw e1;

            const cycleTotal = unliquidatedClasses?.reduce((acc, curr) => acc + Number(curr.amount_generated_usd), 0) || 0;
            setUnliquidatedAmount(cycleTotal);

            // 2. Obtener total histórico liquidado
            const { data: settlements, error: e2 } = await supabase
                .from('settlements')
                .select('amount_usd');
            if (e2) throw e2;
            const totalLiquidated = settlements?.reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0;

            // 3. Obtener total histórico pagado (Abonos de la academia)
            const { data: payments, error: e3 } = await supabase
                .from('payments')
                .select('amount_usd');
            if (e3) throw e3;
            const totalPaid = payments?.reduce((acc, curr) => acc + Number(curr.amount_usd), 0) || 0;

            // 4. Deuda viva liquidada
            setLiquidatedDebt(totalLiquidated - totalPaid);

            // 5. Historial de clases recientes (para tabla pequeña)
            const { data: recent, error: e4 } = await supabase
                .from('classes')
                .select(`
            id, date, status, attendees_count, amount_generated_usd,
            courses ( name )
        `)
                .order('date', { ascending: false })
                .limit(5);
            if (e4) throw e4;
            setRecentClasses(recent || []);

            // 6. Cursos activos
            const { count: cCount, error: e5 } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'activo');
            if (e5) throw e5;
            setActiveCoursesCount(cCount || 0);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalDebt = unliquidatedAmount + liquidatedDebt;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido al Dashboard</h1>
                <p className="text-slate-500 mt-1">Resumen financiero y auditoría general de tus clases impartidas.</p>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500">Cargando datos...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {/* Tarjeta Deuda Total */}
                        <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl p-5 md:p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden group">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-500/30 rounded-lg">
                                        <DollarSign className="w-6 h-6 text-indigo-200" />
                                    </div>
                                    <h3 className="font-medium text-indigo-100 text-xs md:text-sm tracking-wide uppercase">Total Deuda a Favor</h3>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl md:text-4xl font-bold tracking-tight">${totalDebt.toFixed(2)}</span>
                                </div>
                                <p className="text-[10px] md:text-xs text-indigo-300 mt-2">Saldo vivo total que debe la academia</p>
                            </div>
                        </div>

                        {/* Tarjeta Ciclo Actual */}
                        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Clock className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="font-medium text-slate-600 text-xs md:text-sm tracking-wide uppercase">Ciclo Actual</h3>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl md:text-3xl font-bold text-slate-900">${unliquidatedAmount.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-2">Dinero generado desde el último corte</p>
                        </div>

                        {/* Tarjeta Deuda Atrasada */}
                        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-rose-100 rounded-lg">
                                    <WalletCards className="w-6 h-6 text-rose-600" />
                                </div>
                                <h3 className="font-medium text-slate-600 text-xs md:text-sm tracking-wide uppercase">Por Cobrar</h3>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl md:text-3xl font-bold text-slate-900">${liquidatedDebt.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-2">Cortes pasados aún no pagados</p>
                        </div>

                        {/* Cursos Activos */}
                        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <BookOpen className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-medium text-slate-600 text-xs md:text-sm tracking-wide uppercase">Cursos Activos</h3>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl md:text-3xl font-bold text-slate-900">{activeCoursesCount}</span>
                            </div>
                            <Link to="/courses" className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
                                Ver lista →
                            </Link>
                        </div>
                    </div>

                    {/* Tabla de últimas clases */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm mt-8">
                        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <h2 className="text-lg md:text-xl font-bold text-slate-900">Actividad Reciente</h2>
                            <Link to="/class-mode" className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl transition-colors">Dictar Nueva Clase</Link>
                        </div>
                        {recentClasses.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                Aún no has registrado ninguna clase. Ve al "Modo Clase" para empezar.
                            </div>
                        ) : (
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                                        <tr>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Curso</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-center">Asistentes</th>
                                            <th className="px-6 py-4 text-right">Ganancia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {recentClasses.map((cl) => (
                                            <tr key={cl.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {format(parseISO(cl.date), "dd MMM yyyy", { locale: es })}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{cl.courses?.name || 'Desconocido'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${cl.status === 'normal' ? 'bg-blue-100 text-blue-700' :
                                                        cl.status === 'feriado' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {cl.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center text-slate-600 font-medium">
                                                    {cl.status === 'feriado' ? '-' : cl.attendees_count}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    ${Number(cl.amount_generated_usd).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
