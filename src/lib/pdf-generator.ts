import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from './supabase';
import type { Settlement } from '../types';

export async function generateSettlementPDF(settlement: Settlement) {
    try {
        // 1. Obtener las clases que pertenecen a esta liquidación
        const { data: classes, error } = await supabase
            .from('classes')
            .select('date, class_time, content, status, attendees_count, amount_generated_usd, courses(name)')
            .eq('settlement_id', settlement.id)
            .order('date', { ascending: true });

        if (error) throw error;

        // 2. Crear documento PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- ENCABEZADO ---
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('LIQUIDACIÓN DE HONORARIOS', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text('Instructor Técnico: Agustín Lugo', pageWidth / 2, 28, { align: 'center' });

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(14, 35, pageWidth - 14, 35); // Separador

        // --- DATOS DEL CORTE ---
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);

        // Fila 1
        doc.text('Fecha de Corte:', 14, 45);
        doc.setFont('helvetica', 'bold');
        doc.text(format(parseISO(settlement.date), "dd 'de' MMMM, yyyy", { locale: es }), 45, 45);

        doc.setFont('helvetica', 'normal');
        doc.text('ID Transacción:', pageWidth - 70, 45);
        doc.setFont('helvetica', 'bold');
        doc.text(settlement.id.substring(0, 8).toUpperCase(), pageWidth - 42, 45);

        // Fila 2
        doc.setFont('helvetica', 'normal');
        doc.text('Tasa BCV Aplicada:', 14, 53);
        doc.setFont('helvetica', 'bold');
        doc.text(`Bs ${Number(settlement.bcv_rate).toFixed(2)}`, 48, 53);

        // --- TABLA DE CLASES DETALLADA ---
        doc.setFontSize(14);
        doc.text('Detalle de Clases Impartidas', 14, 68);

        const tableColumn = ["Fecha/Hora", "Curso", "Contenido", "Alumnos", "Total USD"];
        const tableRows = classes?.map(c => [
            `${format(parseISO(c.date), "dd/MM")}${c.class_time ? ` - ${c.class_time.substring(0, 5)}` : ''}`,
            (c.courses as any)?.name || 'N/A',
            c.content || (c.status === 'feriado' ? 'FERIADO' : '-'),
            c.attendees_count,
            `$${Number(c.amount_generated_usd).toFixed(2)}`
        ]) || [];

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: 255, halign: 'center' },
            columnStyles: {
                0: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
            },
            styles: { fontSize: 10, cellPadding: 4, textColor: [15, 23, 42] }
        });

        // --- RESUMEN FINAL ---
        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(pageWidth - 90, finalY, 76, 35, 3, 3, 'FD');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('TOTAL A PAGAR (USD):', pageWidth - 85, finalY + 12);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${Number(settlement.amount_usd).toFixed(2)}`, pageWidth - 40, finalY + 12);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('TOTAL REFERENCIAL (BS):', pageWidth - 85, finalY + 25);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${Number(settlement.amount_bs).toFixed(2)}`, pageWidth - 40, finalY + 25);

        // --- PIE DE PÁGINA ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('Documento generado automáticamente por el Sistema de Auditoría de Honorarios.', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

        // 3. Descargar el archivo
        const fileName = `Liquidacion_Honorarios_${format(parseISO(settlement.date), "dd_MMM")}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Hubo un error generando el recibo PDF.");
    }
}
