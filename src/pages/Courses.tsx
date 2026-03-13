import { useEffect, useState } from 'react';
import { Plus, BookOpen, Calendar, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Course } from '../types';
import { format, parseISO, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

export function Courses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    // States for new course modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseDay, setNewCourseDay] = useState('Lunes');
    const [newCourseSchedule, setNewCourseSchedule] = useState('');
    const [newCourseDuration, setNewCourseDuration] = useState<number>(8);
    const [newCourseStart, setNewCourseStart] = useState('');

    // States for editing
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editName, setEditName] = useState('');
    const [editDay, setEditDay] = useState('');
    const [editSchedule, setEditSchedule] = useState('');
    const [editDuration, setEditDuration] = useState(8);
    const [editStart, setEditStart] = useState('');
    const [editStatus, setEditStatus] = useState<Course['status']>('activo');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCourses(data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            alert('Error cargando los cursos');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCourseName || !newCourseStart || !newCourseDay || !newCourseSchedule || !newCourseDuration) return;

        try {
            // Calcular fecha de fin automaticamente
            const startDate = parseISO(newCourseStart);
            const calculatedEndDate = addWeeks(startDate, newCourseDuration);
            const endDateString = format(calculatedEndDate, 'yyyy-MM-dd');

            const { error } = await supabase
                .from('courses')
                .insert([{
                    name: newCourseName,
                    day_of_week: newCourseDay,
                    schedule: newCourseSchedule,
                    duration_weeks: newCourseDuration,
                    start_date: newCourseStart,
                    end_date: endDateString,
                    status: 'activo'
                }]);

            if (error) throw error;

            setIsModalOpen(false);
            setNewCourseName('');
            setNewCourseDay('Lunes');
            setNewCourseSchedule('');
            setNewCourseDuration(8);
            setNewCourseStart('');
            fetchCourses();
        } catch (error) {
            console.error('Error creating course:', error);
            alert('Error creando el curso');
        }
    };

    const openEditModal = (course: Course) => {
        setEditingCourse(course);
        setEditName(course.name);
        setEditDay(course.day_of_week || 'Lunas');
        setEditSchedule(course.schedule || '');
        setEditDuration(course.duration_weeks || 8);
        setEditStart(course.start_date);
        setEditStatus(course.status);
        setIsEditModalOpen(true);
    };

    const handleUpdateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCourse || !editName || !editStart) return;

        try {
            const startDate = parseISO(editStart);
            const calculatedEndDate = addWeeks(startDate, editDuration);
            const endDateString = format(calculatedEndDate, 'yyyy-MM-dd');

            const { error } = await supabase
                .from('courses')
                .update({
                    name: editName,
                    day_of_week: editDay,
                    schedule: editSchedule,
                    duration_weeks: editDuration,
                    start_date: editStart,
                    end_date: endDateString,
                    status: editStatus
                })
                .eq('id', editingCourse.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            fetchCourses();
        } catch (error) {
            console.error('Error updating course:', error);
            alert('Error actualizando el curso');
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este curso? Se borrarán también todos sus alumnos, clases y asistencias (CASCADE).')) return;

        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);

            if (error) throw error;
            fetchCourses();
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('Error eliminando el curso');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Cursos</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestiona los periodos formativos y su estado.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nuevo Curso</span>
                </button>
            </div>

            {/* Stats row or filters can go here */}

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">Cargando cursos...</div>
                ) : courses.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                        <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No hay cursos todavía</h3>
                        <p className="mb-6 max-w-sm">Crea tu primer curso de 8 a 12 semanas para empezar a inscribir alumnos.</p>
                        <button onClick={() => setIsModalOpen(true)} className="text-blue-600 font-medium hover:text-blue-700">Crear mi primer curso</button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {courses.map(course => (
                            <div key={course.id} className="p-4 md:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer border-b border-slate-100 last:border-0">
                                <div className="flex items-start gap-3 md:gap-4 w-full">
                                    <div className={`p-2.5 md:p-3 rounded-xl mt-1 shrink-0 ${course.status === 'activo' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="text-base md:text-lg font-bold text-slate-900 truncate">{course.name}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${course.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {course.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 text-xs md:text-sm text-slate-500">
                                            {course.day_of_week && (
                                                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                    <span>{course.day_of_week} ({course.schedule})</span>
                                                    <span className="text-slate-300 hidden sm:inline">•</span>
                                                    <span className="hidden sm:inline">{course.duration_weeks} semanas</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate">
                                                    {format(parseISO(course.start_date), "dd MMM yy", { locale: es })} — {format(parseISO(course.end_date), "dd MMM yy", { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(course); }}
                                        className="flex-1 sm:flex-none p-2.5 flex justify-center items-center text-blue-600 bg-blue-50 sm:bg-transparent hover:bg-blue-100 sm:hover:bg-blue-50 rounded-xl transition-colors"
                                        title="Editar curso"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                                        className="flex-1 sm:flex-none p-2.5 flex justify-center items-center text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 sm:hover:bg-red-50 rounded-xl transition-colors"
                                        title="Eliminar curso"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <ChevronRight className="hidden sm:block w-5 h-5 text-slate-400 ml-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Crear Curso (Simplificado con Tailwind) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">Crear nuevo curso</h2>
                            <p className="text-sm text-slate-500 mt-1">Configura las fechas del periodo de clases (ej. 8 semanas).</p>
                        </div>

                        <form onSubmit={handleCreateCourse} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Proyecto/Curso</label>
                                    <input
                                        type="text"
                                        value={newCourseName}
                                        onChange={(e) => setNewCourseName(e.target.value)}
                                        placeholder="Ej. Diseño UI/UX - Cohorte 7"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Día de Clases</label>
                                        <select
                                            value={newCourseDay}
                                            onChange={(e) => setNewCourseDay(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-white"
                                        >
                                            <option value="Lunes">Lunes</option>
                                            <option value="Martes">Martes</option>
                                            <option value="Miércoles">Miércoles</option>
                                            <option value="Jueves">Jueves</option>
                                            <option value="Viernes">Viernes</option>
                                            <option value="Sábado">Sábado</option>
                                            <option value="Domingo">Domingo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Horario</label>
                                        <input
                                            type="text"
                                            value={newCourseSchedule}
                                            onChange={(e) => setNewCourseSchedule(e.target.value)}
                                            placeholder="Ej. 14:00 - 16:00"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Duración (Semanas)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newCourseDuration}
                                            onChange={(e) => setNewCourseDuration(Number(e.target.value))}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de Inicio</label>
                                        <input
                                            type="date"
                                            value={newCourseStart}
                                            onChange={(e) => setNewCourseStart(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    {/* Nota: La fecha de fin se calcula automáticamente en el submit */}
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors active:scale-[0.98]"
                                >
                                    Guardar Curso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Editar Curso */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-900">Editar curso</h2>
                            <p className="text-sm text-slate-500 mt-1">Actualiza la información del periodo lectivo.</p>
                        </div>

                        <form onSubmit={handleUpdateCourse} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre del Proyecto/Curso</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Día de Clases</label>
                                        <select
                                            value={editDay}
                                            onChange={(e) => setEditDay(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-white font-medium"
                                        >
                                            <option value="Lunes">Lunes</option>
                                            <option value="Martes">Martes</option>
                                            <option value="Miércoles">Miércoles</option>
                                            <option value="Jueves">Jueves</option>
                                            <option value="Viernes">Viernes</option>
                                            <option value="Sábado">Sábado</option>
                                            <option value="Domingo">Domingo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Horario</label>
                                        <input
                                            type="text"
                                            value={editSchedule}
                                            onChange={(e) => setEditSchedule(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Duración (Semanas)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editDuration}
                                            onChange={(e) => setEditDuration(Number(e.target.value))}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as any)}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-white font-medium"
                                        >
                                            <option value="activo">Activo</option>
                                            <option value="cerrado">Cerrado</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de Inicio</label>
                                    <input
                                        type="date"
                                        value={editStart}
                                        onChange={(e) => setEditStart(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors active:scale-[0.98]"
                                >
                                    Actualizar Curso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
