export type CourseStatus = 'activo' | 'cerrado';
export type StudentStatus = 'activo' | 'retirado';
export type ClassStatus = 'normal' | 'feriado' | 'cancelada';

export interface Course {
    id: string;
    name: string;
    day_of_week?: string;
    schedule?: string;
    duration_weeks?: number;
    start_date: string;
    end_date: string;
    status: CourseStatus;
    created_at?: string;
}

export interface Student {
    id: string;
    course_id: string;
    name: string;
    cedula?: string;
    phone?: string;
    email?: string;
    status: StudentStatus;
    created_at?: string;
    // Join fields
    course?: Course;
}

export interface Settlement {
    id: string;
    date: string;
    amount_usd: number;
    amount_bs: number;
    bcv_rate: number;
    created_at?: string;
}

export interface ClassSession {
    id: string;
    course_id: string;
    date: string;
    class_time?: string;
    content?: string;
    status: ClassStatus;
    attendees_count: number;
    amount_generated_usd: number;
    settlement_id: string | null;
    created_at?: string;
    // Join fields
    course?: Course;
}

export interface Attendance {
    id: string;
    class_id: string;
    student_id: string;
    attended: boolean;
    created_at?: string;
}

export interface Payment {
    id: string;
    date: string;
    amount_usd: number;
    created_at?: string;
}
