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
        <div className="max-w-4xl mx-auto px-1 md:px-0">
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Modo Clase</h1>
                <p className="text-sm text-slate-500 mt-1">Control de asistencia rápido y cálculo de honorarios.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
                {/* Columna Izquierda / Central: Selección y Lista */}
                <div className="flex-1 space-y-6">
                    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex flex-col gap-4">
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 uppercase ml-1">
                                    Curso:
                                </label>
                                <div className="relative">
                                    <BookOpenCheck className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <select
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer text-sm"
                                        value={selectedCourseId}
                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                    >
                                        <option value="" disabled>Seleccionar curso...</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.name} {course.day_of_week ? `(${course.day_of_week})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700 uppercase ml-1">Fecha:</label>
                                    <div className="relative">
                                        <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="date"
                                            value={classDate}
                                            onChange={(e) => setClassDate(e.target.value)}
                                            className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-slate-700 uppercase ml-1">Hora:</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="time"
                                            value={classTime}
                                            onChange={(e) => setClassTime(e.target.value)}
                                            className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <label className="block text-sm font-bold text-slate-700 uppercase ml-1">Contenido Dictado:</label>
                            <div className="relative">
                                <FileText className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                <textarea
                                    placeholder="¿Qué contenido se dio en esta clase?"
                                    value={classContent}
                                    onChange={(e) => setClassContent(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all min-h-[100px] text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {selectedCourseId && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 px-6 border-b border-slate-100 bg-slate-50">
                                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Lista de Asistencia</h2>
                            </div>
                            {loading ? (
                                <div className="p-12 text-center text-slate-500 font-medium italic">Cargando alumnos...</div>
                            ) : students.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
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
                                                className={`p-4 px-6 flex items-center justify-between cursor-pointer transition-all active:bg-blue-100 ${attended ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${attended ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                        {student.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className={`font-bold text-sm ${attended ? 'text-slate-900' : 'text-slate-400 line-through decoration-slate-300'}`}>
                                                        {student.name}
                                                    </span>
                                                </div>
                                                <div className="shrink-0">
                                                    {attended ? (
                                                        <div className="bg-blue-100 p-1 rounded-full text-blue-600">
                                                            <CheckCircle2 className="w-6 h-6" />
                                                        </div>
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-slate-200" />
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
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl lg:sticky lg:top-8 border border-white/5">
                        <h3 className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-6">Resumen de Clase</h3>

                        <div className="mb-8">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-5xl font-black tracking-tighter text-blue-400">${amountGenerated.toFixed(2)}</span>
                                <span className="text-slate-500 font-bold text-sm italic">USD</span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium">Honorarios generados hoy</p>
                        </div>

                        <div className="space-y-4 bg-white/5 rounded-2xl p-5 mb-8 border border-white/5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Alumnos:</span>
                                <span className="font-bold text-slate-100">{attendeesCount} de {students.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Regla:</span>
                                <span className="font-bold text-blue-400">
                                    {attendeesCount >= 2 ? '$4.5 x c/u' : (attendeesCount === 1 ? '$5.5 única' : 'Base $5.5')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => handleSaveClass('normal')}
                                disabled={saving || students.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] text-sm"
                            >
                                {saving ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Guardando...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" /> Registrar Clase
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleSaveClass('feriado')}
                                disabled={saving || students.length === 0}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] text-sm"
                            >
                                <CalendarOff className="w-4 h-4" /> Cancelada / Feriado
                            </button>
                        </div>

                        <div className="mt-8 flex gap-3 items-start bg-blue-500/10 p-4 rounded-2xl border border-blue-500/10">
                            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-300/80 leading-relaxed font-medium">
                                El sistema aplica automáticamente las "Reglas de Oro" basadas en la asistencia actual.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
