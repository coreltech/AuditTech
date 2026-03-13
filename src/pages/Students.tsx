import { useEffect, useState } from 'react';
import { Plus, UserMinus, Users, Search, BookOpen, User, IdCard, Phone, Mail, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Course, Student } from '../types';

export function Students() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentCedula, setNewStudentCedula] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');

    // Editing states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editName, setEditName] = useState('');
    const [editCedula, setEditCedula] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editStatus, setEditStatus] = useState<Student['status']>('activo');

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchStudents(selectedCourseId);
        } else {
            setStudents([]);
        }
    }, [selectedCourseId]);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCourses(data || []);

            // Auto-select the first active course if available
            if (data && data.length > 0) {
                const active = data.find(c => c.status === 'activo');
                if (active) setSelectedCourseId(active.id);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchStudents = async (courseId: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('course_id', courseId)
                .order('name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudentName || !selectedCourseId) return;

        try {
            const { error } = await supabase
                .from('students')
                .insert([{
                    name: newStudentName,
                    cedula: newStudentCedula || null,
                    phone: newStudentPhone || null,
                    email: newStudentEmail || null,
                    course_id: selectedCourseId,
                    status: 'activo'
                }]);

            if (error) throw error;

            setIsModalOpen(false);
            setNewStudentName('');
            setNewStudentCedula('');
            setNewStudentPhone('');
            setNewStudentEmail('');
            fetchStudents(selectedCourseId);
        } catch (error) {
            console.error('Error creating student:', error);
            alert('Error inscribiendo al alumno');
        }
    };

    const handleRetireStudent = async (studentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'activo' ? 'retirado' : 'activo';
        const confirmMessage = currentStatus === 'activo'
            ? '¿Estás seguro de dar de baja a este alumno?'
            : '¿Deseas reactivar a este alumno?';

        if (!window.confirm(confirmMessage)) return;

        try {
            const { error } = await supabase
                .from('students')
                .update({ status: newStatus })
                .eq('id', studentId);

            if (error) throw error;
            fetchStudents(selectedCourseId);
        } catch (error) {
            console.error('Error updating student status:', error);
            alert('Error cambiando el estado del alumno');
        }
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setEditName(student.name);
        setEditCedula(student.cedula || '');
        setEditPhone(student.phone || '');
        setEditEmail(student.email || '');
        setEditStatus(student.status);
        setIsEditModalOpen(true);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStudent || !editName) return;

        try {
            const { error } = await supabase
                .from('students')
                .update({
                    name: editName,
                    cedula: editCedula || null,
                    phone: editPhone || null,
                    email: editEmail || null,
                    status: editStatus
                })
                .eq('id', editingStudent.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            fetchStudents(selectedCourseId);
        } catch (error) {
            console.error('Error updating student:', error);
            alert('Error actualizando el alumno');
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este alumno? Se borrarán también sus registros de asistencia.')) return;

        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('id', studentId);

            if (error) throw error;
            fetchStudents(selectedCourseId);
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Error eliminando el alumno');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Alumnos</h1>
                    <p className="text-sm text-slate-500 mt-1">Inscribe alumnos y gestiona sus bajas por curso.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                        <BookOpen className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl appearance-none font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer text-sm"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                        >
                            <option value="" disabled>Seleccionar curso...</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.name} {course.status === 'cerrado' ? '(Cerrado)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        disabled={!selectedCourseId}
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98] text-sm"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo Alumno</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {!selectedCourseId ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                        <Search className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Selecciona un curso</h3>
                        <p className="max-w-sm">Debes seleccionar un curso en el menú superior para ver o agregar sus alumnos.</p>
                    </div>
                ) : loading ? (
                    <div className="p-12 text-center text-slate-500">Cargando alumnos...</div>
                ) : students.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                        <Users className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No hay alumnos inscritos</h3>
                        <p className="mb-6 max-w-sm">Agrega el primer alumno a este curso usando el botón superior.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {students.map(student => (
                            <div key={student.id} className="p-4 md:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 last:border-0">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${student.status === 'activo' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        {student.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`text-base font-bold truncate ${student.status === 'activo' ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                                            {student.name}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 mt-1.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${student.status === 'activo' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'
                                                }`}>
                                                {student.status}
                                            </span>
                                            {student.cedula && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <IdCard className="w-3 h-3 text-slate-400" />
                                                    {student.cedula}
                                                </div>
                                            )}
                                            {student.phone && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    <span className="truncate">{student.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                    <button
                                        onClick={() => openEditModal(student)}
                                        className="flex-1 sm:w-10 sm:h-10 p-2.5 sm:p-0 flex justify-center items-center rounded-xl text-blue-500 bg-blue-50 sm:bg-transparent hover:bg-blue-100 sm:hover:bg-blue-50 transition-all"
                                        title="Editar alumno"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleRetireStudent(student.id, student.status)}
                                        className={`flex-1 sm:w-10 sm:h-10 p-2.5 sm:p-0 flex justify-center items-center rounded-xl transition-all ${student.status === 'activo'
                                            ? 'text-amber-500 bg-amber-50 sm:bg-transparent hover:bg-amber-100 sm:hover:bg-amber-50'
                                            : 'text-green-600 bg-green-50 sm:bg-transparent hover:bg-green-100 sm:hover:bg-green-50'
                                            }`}
                                        title={student.status === 'activo' ? 'Dar de baja' : 'Reactivar'}
                                    >
                                        {student.status === 'activo' ? <UserMinus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteStudent(student.id)}
                                        className="flex-1 sm:w-10 sm:h-10 p-2.5 sm:p-0 flex justify-center items-center rounded-xl text-red-500 bg-red-50 sm:bg-transparent hover:bg-red-100 sm:hover:bg-red-50 transition-all"
                                        title="Eliminar alumno"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900">Inscribir alumno</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Se agregará al curso: <span className="font-semibold text-slate-700">{courses.find(c => c.id === selectedCourseId)?.name}</span>
                                </p>
                            </div>

                            <form onSubmit={handleCreateStudent} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre Completo <small className="text-blue-500">(Obligatorio)</small></label>
                                        <div className="relative">
                                            <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                            <input
                                                type="text"
                                                value={newStudentName}
                                                onChange={(e) => setNewStudentName(e.target.value)}
                                                placeholder="Ej. Juan Pérez"
                                                required
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cédula <small className="text-slate-400">(Opcional)</small></label>
                                            <div className="relative">
                                                <IdCard className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                                <input
                                                    type="text"
                                                    value={newStudentCedula}
                                                    onChange={(e) => setNewStudentCedula(e.target.value)}
                                                    placeholder="V-1234567"
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono <small className="text-slate-400">(Opcional)</small></label>
                                            <div className="relative">
                                                <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                                <input
                                                    type="text"
                                                    value={newStudentPhone}
                                                    onChange={(e) => setNewStudentPhone(e.target.value)}
                                                    placeholder="0412-0000000"
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo Electrónico <small className="text-slate-400">(Opcional)</small></label>
                                        <div className="relative">
                                            <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                            <input
                                                type="email"
                                                value={newStudentEmail}
                                                onChange={(e) => setNewStudentEmail(e.target.value)}
                                                placeholder="juan@ejemplo.com"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            />
                                        </div>
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
                                        Guardar Alumno
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Modal Editar Alumno */}
            {
                isEditModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900">Editar alumno</h2>
                                <p className="text-sm text-slate-500 mt-1">Actualiza los datos del alumno.</p>
                            </div>

                            <form onSubmit={handleUpdateStudent} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                required
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cédula</label>
                                            <div className="relative">
                                                <IdCard className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                                <input
                                                    type="text"
                                                    value={editCedula}
                                                    onChange={(e) => setEditCedula(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                                            <div className="relative">
                                                <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                                <input
                                                    type="text"
                                                    value={editPhone}
                                                    onChange={(e) => setEditPhone(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo Electrónico</label>
                                        <div className="relative">
                                            <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                            <input
                                                type="email"
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                            />
                                        </div>
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
                                            <option value="retirado">Retirado</option>
                                        </select>
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
                                        Actualizar Alumno
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
