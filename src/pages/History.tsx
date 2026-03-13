import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ClassSession, Course } from '../types';
import { Search, Calendar, Clock, BookOpen, Trash2, Pencil, AlertCircle, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';


export function History() {
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

    // States for editing
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassSession | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editStatus, setEditStatus] = useState<ClassSession['status']>('normal');

    useEffect(() => {
        fetchCourses();
        fetchClasses();
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        const { data } = await supabase.from('courses').select('*').order('name');
        setCourses(data || []);
    };

    const fetchClasses = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('classes')
                .select('*, courses(name)')
                .order('date', { ascending: false });

            if (selectedCourseId !== 'all') {
                query = query.eq('course_id', selectedCourseId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClass = async (id: string, settlement_id: string | null) => {
        if (settlement_id) {
            alert('No se puede eliminar una clase que ya ha sido liquidada. Elimina primero la liquidación en Finanzas.');
            return;
        }

        if (!window.confirm('¿Estás seguro de eliminar este registro de clase?')) return;

        try {
            const { error } = await supabase.from('classes').delete().eq('id', id);
            if (error) throw error;
            fetchClasses();
        } catch (error) {
            console.error('Error deleting class:', error);
            alert('Error al eliminar la clase');
        }
    };

    const openEditModal = (cls: ClassSession) => {
        if (cls.settlement_id) {
            alert('No se puede editar una clase que ya ha sido liquidada.');
            return;
        }
        setEditingClass(cls);
        setEditDate(cls.date);
        setEditTime(cls.class_time || '00:00');
        setEditContent(cls.content || '');
        setEditStatus(cls.status);
        setIsEditModalOpen(true);
    };

    const handleUpdateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClass) return;

        try {
            const { error } = await supabase
                .from('classes')
                .update({
                    date: editDate,
                    class_time: editTime,
                    content: editContent,
                    status: editStatus
                })
                .eq('id', editingClass.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            fetchClasses();
        } catch (error) {
            console.error('Error updating class:', error);
            alert('Error al actualizar la clase');
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-1 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Historial de Clases</h1>
                    <p className="text-sm text-slate-500 mt-1">Revisa, edita o elimina registros de clases pasadas.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 md:p-2.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
                    <Search className="w-5 h-5 text-slate-400 ml-2" />
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 pr-8 cursor-pointer outline-none"
                    >
                        <option value="all">Ver todos los cursos</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 font-medium">Cargando historial...</div>
                ) : classes.length === 0 ? (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center">
                        <Calendar className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Sin registros</h3>
                        <p className="max-w-xs text-slate-500">No se encontraron clases registradas para este filtro.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] md:text-[11px] font-bold tracking-wider">
                                    <th className="px-5 py-4 border-b border-slate-100">Fecha y Hora</th>
                                    <th className="px-5 py-4 border-b border-slate-100">Curso</th>
                                    <th className="px-5 py-4 border-b border-slate-100">Contenido</th>
                                    <th className="px-5 py-4 border-b border-slate-100 text-center">Alum.</th>
                                    <th className="px-5 py-4 border-b border-slate-100">Pago</th>
                                    <th className="px-5 py-4 border-b border-slate-100 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {classes.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {format(parseISO(cls.date), "dd/MM/yyyy")}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                    <Clock className="w-3 h-3" /> {cls.class_time?.substring(0, 5) || '--:--'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="font-bold text-slate-700 text-xs">{(cls as any).courses?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 max-w-[150px] md:max-w-xs">
                                            <p className="text-xs text-slate-600 truncate italic" title={cls.content || 'Sin descripción'}>
                                                {cls.content || <span className="text-slate-300">Sin descripción</span>}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold text-xs w-7 h-7 rounded-lg border border-blue-100">
                                                {cls.attendees_count}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[9px] font-black uppercase w-fit px-1.5 py-0.5 rounded shadow-sm ${cls.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {cls.status}
                                                </span>
                                                {cls.settlement_id ? (
                                                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 font-bold">
                                                        <AlertCircle className="w-2.5 h-2.5" /> LIQUIDADA
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-amber-600 font-black tracking-tighter">PENDIENTE</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(cls)}
                                                    disabled={!!cls.settlement_id}
                                                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title="Editar clase"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClass(cls.id, cls.settlement_id)}
                                                    className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title="Eliminar clase"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Editar Clase */}
            {
                isEditModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900">Modificar Clase</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {(editingClass as any).courses?.name} - {format(parseISO(editingClass?.date || ''), "dd/MM")}
                                </p>
                            </div>

                            <form onSubmit={handleUpdateClass} className="p-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fecha</label>
                                            <input
                                                type="date"
                                                value={editDate}
                                                onChange={(e) => setEditDate(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Hora</label>
                                            <input
                                                type="time"
                                                value={editTime}
                                                onChange={(e) => setEditTime(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estado</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as any)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-white font-medium text-sm"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="feriado">Feriado / Cancelada</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Contenido Dictado</label>
                                        <div className="relative">
                                            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm min-h-[100px]"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 border border-amber-100">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                            <strong>Atención:</strong> Si cambias el estado de la clase de "Feriado" a "Normal" (o viceversa), el monto generado no se recalculará automáticamente para evitar descuadres. Se recomienda borrar y volver a registrar si hubo cambios en la asistencia.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors active:scale-[0.98]"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
