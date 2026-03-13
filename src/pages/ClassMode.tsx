import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Course, Student } from '../types';
import { BookOpenCheck, CheckCircle2, Circle, AlertTriangle, Save, CalendarOff, Clock, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { format, parseISO, getDay } from 'date-fns';

export function ClassMode() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form states
    const [classDate, setClassDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [classTime, setClassTime] = useState(format(new Date(), 'HH:mm'));
    const [classContent, setClassContent] = useState('');

    // State for attendance tracking: a set of student IDs that attended
    const [attendedStudents, setAttendedStudents] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchActiveStudents(selectedCourseId);
        } else {
            setStudents([]);
            setAttendedStudents(new Set());
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        try {
            // Solo traemos cursos activos
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('status', 'activo')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCourses(data || []);

            if (data && data.length > 0) {
                setSelectedCourseId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchActiveStudents = async (courseId: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('course_id', courseId)
                .eq('status', 'activo') // Only active students
                .order('name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);

            // By default, assume everyone attended to make it faster
            const allIds = new Set((data || []).map(s => s.id));
            setAttendedStudents(allIds);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = (studentId: string) => {
        setAttendedStudents(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    // Cálculo Reglas de Oro
    const attendeesCount = attendedStudents.size;
    let amountGenerated = 0;

    if (attendeesCount >= 2) {
        amountGenerated = attendeesCount * 4.5; // Regla 1
    } else if (attendeesCount === 1) {
        amountGenerated = 5.5; // Regla 2
    } else if (attendeesCount === 0 && students.length > 0) {
        amountGenerated = 5.5; // Regla 2.5: Asiste el profe pero 0 alumnos = $5.5
    }

    const handleSaveClass = async (type: 'normal' | 'feriado') => {
        if (!selectedCourseId) return;
        if (students.length === 0) {
            alert('No puedes registrar una clase sin alumnos activos en el curso.');
            return;
        }

        // 1. Validar que la fecha coincida con el día del curso
        const course = courses.find(c => c.id === selectedCourseId);
        if (course?.day_of_week) {
            const selectedDayNum = getDay(parseISO(classDate)); // 0 = Domingo, 1 = Lunes...
            const daysMap: Record<string, number> = {
                'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
            };

            if (daysMap[course.day_of_week] !== selectedDayNum) {
                if (!window.confirm(`La fecha seleccionada no es ${course.day_of_week}. ¿Deseas continuar de todas formas?`)) {
                    return;
                }
            }
        }

        if (type === 'normal' && !classContent.trim()) {
            if (!window.confirm('No has ingresado contenido para esta clase. ¿Deseas guardarla así?')) {
                return;
            }
        }

        if (type === 'feriado') {
            if (!window.confirm('¿Seguro quieres marcar hoy como Feriado / Cancelada? No generará ingresos y la clase se aplaza.')) return;
        } else {
            if (!window.confirm(`Registrar clase el ${classDate} a las ${classTime} con ${attendeesCount} alumno(s) generando $${amountGenerated}?`)) return;
        }

        try {
            setSaving(true);
            const finalAmount = type === 'feriado' ? 0 : amountGenerated;
            const finalAttendees = type === 'feriado' ? 0 : attendeesCount;

            // 1. Insertar la Clase
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .insert([{
                    course_id: selectedCourseId,
                    date: classDate,
                    class_time: classTime,
                    content: classContent,
                    status: type,
                    attendees_count: finalAttendees,
                    amount_generated_usd: finalAmount
                }])
                .select()
                .single();

            if (classError) throw classError;

            // 2. Insertar registros de asistencia en lote (solo si no es feriado)
            if (type === 'normal') {
                const attendanceRecords = students.map(student => ({
                    class_id: classData.id,
                    student_id: student.id,
                    attended: attendedStudents.has(student.id)
                }));

                const { error: attendancesError } = await supabase
                    .from('attendances')
                    .insert(attendanceRecords);

                if (attendancesError) throw attendancesError;
            }

            alert(type === 'feriado' ? 'Feriado registrado. $0 generados.' : `¡Clase Registrada! Ganancia: $${amountGenerated}`);
            // Refresh form completely or keep it (Usually you navigate away or just disable button)
            window.location.href = '/'; // Redirigir al dashboard

        } catch (error: any) {
            console.error('Error saving class:', error);
            alert('Hubo un error guardando la clase: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Modo Clase</h1>
                <p className="text-slate-500 mt-1">Control de asistencia rápido y cálculo automático de honorarios.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Izquierda / Central: Selección y Lista */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-slate-700">
                                    Selecciona el curso:
                                </label>
                                <div className="relative">
                                    <BookOpenCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer text-sm"
                                        value={selectedCourseId}
                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                    >
                                        <option value="" disabled>Mis Cursos Activos...</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.name} {course.day_of_week ? `(${course.day_of_week})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700">Fecha de Clase:</label>
                                    <div className="relative">
                                        <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="date"
                                            value={classDate}
                                            onChange={(e) => setClassDate(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700">Hora:</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="time"
                                            value={classTime}
                                            onChange={(e) => setClassTime(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            <label className="block text-sm font-semibold text-slate-700">Contenido Dictado:</label>
                            <div className="relative">
                                <FileText className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                                <textarea
                                    placeholder="Ej. Introducción a componentes de React y Props..."
                                    value={classContent}
                                    onChange={(e) => setClassContent(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all min-h-[80px] text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {selectedCourseId && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                <h2 className="font-semibold text-slate-800">Lista de Asistencia (Activos)</h2>
                            </div>
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">Cargando alumnos...</div>
                            ) : students.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    No hay alumnos activos inscritos en este curso.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {students.map(student => {
                                        const attended = attendedStudents.has(student.id);
                                        return (
                                            <div
                                                key={student.id}
                                                onClick={() => toggleAttendance(student.id)}
                                                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${attended ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${attended ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                        {student.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className={`font-medium ${attended ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                                                        {student.name}
                                                    </span>
                                                </div>
                                                <div>
                                                    {attended ? (
                                                        <CheckCircle2 className="w-6 h-6 text-blue-600 drop-shadow-sm" />
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-slate-300" />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Columna Derecha: Panel de Acción y Cálculos */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl sticky top-8">
                        <h3 className="text-slate-400 font-medium text-sm mb-4 uppercase tracking-wider">Resumen de Clase</h3>

                        <div className="mb-6">
                            <div className="flex items-end gap-2 mb-1">
                                <span className="text-4xl font-bold tracking-tight">${amountGenerated.toFixed(2)}</span>
                                <span className="text-slate-400 font-medium pb-1">USD</span>
                            </div>
                            <p className="text-slate-400 text-sm">Ganancia estimada por hoy</p>
                        </div>

                        <div className="space-y-3 bg-slate-800/50 rounded-2xl p-4 mb-8">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300">Asistentes:</span>
                                <span className="font-semibold">{attendeesCount} de {students.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-300">Regla aplicada:</span>
                                <span className="font-semibold text-blue-400">
                                    {attendeesCount >= 2 ? '$4.5 x alumno' : (attendeesCount === 1 ? 'Tarifa única ($5.5)' : 'Tarifa base ($5.5)')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleSaveClass('normal')}
                                disabled={saving || students.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                            >
                                {saving ? 'Guardando...' : (
                                    <>
                                        <Save className="w-5 h-5" /> Registrar Clase
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleSaveClass('feriado')}
                                disabled={saving || students.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-transparent border border-slate-700 hover:border-slate-500 disabled:border-slate-800 disabled:text-slate-600 text-slate-300 py-3 rounded-xl font-medium transition-all active:scale-[0.98]"
                            >
                                <CalendarOff className="w-4 h-4" /> Cancelada / Feriado
                            </button>
                        </div>

                        <div className="mt-6 flex gap-2 items-start bg-blue-950/30 p-3 rounded-xl border border-blue-900/30">
                            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-200/70 leading-relaxed">
                                Si asisten 0 alumnos y registras clase normal, ganarás $5.5 (Regla asistencia sin quorum).
                                Si marcas "Feriado", ganarás $0 y la clase se extiende una semana más.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
