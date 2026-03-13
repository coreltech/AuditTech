import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BadgeDollarSign, Receipt, Download, SendToBack, Trash2 } from 'lucide-react';
import type { Settlement, Payment } from '../types';
import { generateSettlementPDF } from '../lib/pdf-generator';

export function Finances() {
    const [loading, setLoading] = useState(true);
    const [unliquidatedTotal, setUnliquidatedTotal] = useState(0);
    const [unliquidatedCount, setUnliquidatedCount] = useState(0);
    const [unliquidatedClassesIds, setUnliquidatedClassesIds] = useState<string[]>([]);

    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    const [bcvRate, setBcvRate] = useState<string>('');
    const [paymentAmount, setPaymentAmount] = useState<string>('');

    const [isLiquidating, setIsLiquidating] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        try {
            setLoading(true);

            // 1. Clases sin liquidar
            const { data: classesData, error: e1 } = await supabase
                .from('classes')
                .select('*')
                .is('settlement_id', null)
                .neq('status', 'feriado'); // Ignoramos feriados porque son $0 (aunque daría igual sumar 0)

            if (e1) throw e1;

            const totalToLiquidate = classesData?.reduce((acc, curr) => acc + Number(curr.amount_generated_usd), 0) || 0;
            setUnliquidatedTotal(totalToLiquidate);
            setUnliquidatedCount(classesData?.length || 0);
            setUnliquidatedClassesIds(classesData?.map(c => c.id) || []);

            // 2. Historial de Liquidaciones
            const { data: settlementsData, error: e2 } = await supabase
                .from('settlements')
                .select('*')
                .order('date', { ascending: false });

            if (e2) throw e2;
            setSettlements(settlementsData || []);

            // 3. Historial de Pagos Recibidos
            const { data: paymentsData, error: e3 } = await supabase
                .from('payments')
                .select('*')
                .order('date', { ascending: false });

            if (e3) throw e3;
            setPayments(paymentsData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSettlement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (unliquidatedCount === 0 || unliquidatedTotal === 0) {
            alert("No hay clases pendientes con monto para liquidar.");
            return;
        }

        const rate = parseFloat(bcvRate);
        if (isNaN(rate) || rate <= 0) {
            alert("Introduce una tasa BCV válida.");
            return;
        }

        if (!window.confirm(`¿Generar corte por $${unliquidatedTotal} usando tasa ${rate} Bs?`)) return;

        try {
            setIsLiquidating(true);
            const amountBs = unliquidatedTotal * rate;
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Insertar la liquidación
            const { data: newSettlement, error: insertError } = await supabase
                .from('settlements')
                .insert([{
                    date: today,
                    amount_usd: unliquidatedTotal,
                    amount_bs: amountBs,
                    bcv_rate: rate
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // 2. Actualizar las clases
            const { error: updateError } = await supabase
                .from('classes')
                .update({ settlement_id: newSettlement.id })
                .in('id', unliquidatedClassesIds);

            if (updateError) throw updateError;

            alert("¡Liquidación generada con éxito!");
            setBcvRate('');
            fetchFinancialData();

        } catch (error: any) {
            console.error('Error generating settlement:', error);
            alert('Error al generar la liquidación: ' + error.message);
        } finally {
            setIsLiquidating(false);
        }
    };

    const handleDeleteSettlement = async (settlementId: string) => {
        if (!window.confirm('¿Estás seguro de eliminar esta liquidación? Las clases asociadas volverán a estar pendientes de cobro.')) return;

        try {
            // 1. Desvincular las clases
            const { error: updateError } = await supabase
                .from('classes')
                .update({ settlement_id: null })
                .eq('settlement_id', settlementId);

            if (updateError) throw updateError;

            // 2. Borrar la liquidación
            const { error: deleteError } = await supabase
                .from('settlements')
                .delete()
                .eq('id', settlementId);

            if (deleteError) throw deleteError;

            fetchFinancialData();
        } catch (error) {
            console.error('Error deleting settlement:', error);
            alert('Error eliminando la liquidación');
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro de pago?')) return;

        try {
            const { error } = await supabase
                .from('payments')
                .delete()
                .eq('id', paymentId);

            if (error) throw error;
            fetchFinancialData();
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert('Error eliminando el pago');
        }
    };

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Introduce un abono válido en USD.");
            return;
        }

        if (!window.confirm(`¿Abonar pago de $${amount} a la deuda viva?`)) return;

        try {
            setIsPaying(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            const { error } = await supabase
                .from('payments')
                .insert([{
                    date: today,
                    amount_usd: amount
                }]);

            if (error) throw error;

            alert("¡Pago/Abono registrado!");
            setPaymentAmount('');
            fetchFinancialData();

        } catch (error: any) {
            console.error('Error registering payment:', error);
            alert('Error registrando abono: ' + error.message);
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Finanzas y Pagos</h1>
                <p className="text-slate-500 mt-1">Genera cortes quincenales, registra pagos de la academia y descarga reportes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Panel Izquierdo: Acciones Financieras */}
                <div className="space-y-6">

                    {/* Tarjeta de Generar Liquidación */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-100/50 rounded-xl text-indigo-600">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Generar Liquidación</h2>
                                <p className="text-sm text-slate-500">Cierra las clases sueltas (Ciclo actual)</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Clases Pendientes: <span className="text-slate-900">{unliquidatedCount}</span></p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-500 font-medium">Monto del Ciclo</p>
                                <p className="text-xl font-bold text-slate-900">${unliquidatedTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        <form onSubmit={handleGenerateSettlement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tasa BCV del Día (Bs/USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ej. 65.40"
                                    required
                                    value={bcvRate}
                                    onChange={(e) => setBcvRate(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLiquidating || unliquidatedTotal === 0}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                            >
                                {isLiquidating ? 'Generando Corte...' : 'Cerrar Ciclo Quincenal'}
                            </button>
                        </form>
                    </div>

                    {/* Tarjeta de Abonar Pago */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-emerald-100/50 rounded-xl text-emerald-600">
                                <BadgeDollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Ingresar Abono/Pago</h2>
                                <p className="text-sm text-slate-500">Registrar transferencia de la academia</p>
                            </div>
                        </div>

                        <form onSubmit={handleRegisterPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto Recibido (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Ej. 25.00"
                                    required
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isPaying}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition-all shadow-sm active:scale-[0.98]"
                            >
                                {isPaying ? 'Registrando...' : 'Recibir Pago (Baja de deuda)'}
                            </button>
                            <p className="text-xs text-slate-500 text-center mt-2">
                                Los abonos se aplican a la deuda global viva mostrada en el Dashboard.
                            </p>
                        </form>
                    </div>

                </div>

                {/* Panel Derecho: Historiales */}
                <div className="space-y-6">

                    {/* Historial de Liquidaciones */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800">Historial de Liquidaciones</h3>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400">Cargando...</div>
                            ) : settlements.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No hay liquidaciones pasadas.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {settlements.map(settlement => (
                                        <li key={settlement.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-slate-900 text-sm">Corte del</span>
                                                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                                        {format(parseISO(settlement.date), "dd/MMM/yyyy", { locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium">Tasa BCV: {Number(settlement.bcv_rate).toFixed(2)} Bs</p>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="font-bold text-slate-900">${Number(settlement.amount_usd).toFixed(2)}</p>
                                                    <p className="text-xs text-slate-500">{Number(settlement.amount_bs).toFixed(2)} Bs</p>
                                                </div>
                                                {/* Botón para reporte PDF preparado para Fase 5 */}
                                                <button
                                                    onClick={() => generateSettlementPDF(settlement)}
                                                    className="p-2 text-indigo-600 hover:bg-white rounded-lg transition-colors border border-indigo-100 hover:border-indigo-200 shadow-sm"
                                                    title="Descargar Recibo en PDF"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSettlement(settlement.id)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar liquidación"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Historial de Pagos */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[300px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800">Últimos Pagos Recibidos</h3>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400">Cargando...</div>
                            ) : payments.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">Aún no hay pagos registrados.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {payments.map(payment => (
                                        <li key={payment.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                                    <SendToBack className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">
                                                    Abono en fecha: <span className="font-semibold text-slate-900">{format(parseISO(payment.date), "dd/MM/yyyy")}</span>
                                                </span>
                                            </div>
                                            <div className="text-right font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm">
                                                + ${Number(payment.amount_usd).toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => handleDeletePayment(payment.id)}
                                                className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ml-2"
                                                title="Eliminar pago"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
