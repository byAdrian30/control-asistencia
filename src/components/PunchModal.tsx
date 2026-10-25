'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, Clock, Play, Square, AlertTriangle, UserCheck } from 'lucide-react';
import { Employee, Attendance, Schedule } from '@/types/database';
import PinPad from './PinPad';
import { playSound, triggerVibration } from '@/lib/sound';
import { calculateMinutesLate, formatHoursWorked } from '@/lib/late-calculator';

interface PunchModalProps {
  employee: Employee;
  todayAttendance: Attendance | null;
  schedule?: Schedule | null;
  onClose: () => void;
  onPunch: (payload: {
    employeeId: string;
    action: 'in' | 'out';
    attendanceId?: string;
    minutesLate: number;
    notes?: string;
  }) => Promise<boolean>;
}

export default function PunchModal({
  employee,
  todayAttendance,
  schedule,
  onClose,
  onPunch,
}: PunchModalProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    action: 'in' | 'out';
    timeStr: string;
    minutesLate?: number;
    hoursWorked?: string;
  } | null>(null);

  const isWorking = Boolean(todayAttendance && !todayAttendance.clock_out);
  const targetAction: 'in' | 'out' = isWorking ? 'out' : 'in';

  const handleConfirmPunch = async () => {
    setErrorMsg('');

    // Validar PIN si el empleado tiene código configurado
    if (employee.code && pin !== employee.code) {
      playSound('error');
      triggerVibration([100, 100, 100]);
      setErrorMsg('Código PIN incorrecto. Intenta de nuevo.');
      setPin('');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();

    let minutesLate = 0;
    if (targetAction === 'in' && schedule) {
      const lateCalc = calculateMinutesLate(now, schedule);
      minutesLate = lateCalc.minutesLate;
    }

    try {
      const ok = await onPunch({
        employeeId: employee.id,
        action: targetAction,
        attendanceId: todayAttendance?.id,
        minutesLate,
        notes: minutesLate > 0 ? `Entrada con ${minutesLate} min de tardanza` : undefined,
      });

      if (ok) {
        if (targetAction === 'in') {
          playSound('in');
          triggerVibration([100, 50, 150]);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } else {
          playSound('out');
          triggerVibration([150, 50, 100]);
        }

        const timeStr = now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        let hoursWorked: string | undefined = undefined;
        if (targetAction === 'out' && todayAttendance?.clock_in) {
          hoursWorked = formatHoursWorked(todayAttendance.clock_in, now.toISOString());
        }

        setSuccessInfo({
          action: targetAction,
          timeStr,
          minutesLate,
          hoursWorked,
        });

        // Cierre automático después de 3.2 segundos
        setTimeout(() => {
          onClose();
        }, 3200);
      } else {
        setErrorMsg('Error al registrar la marcación. Inténtalo de nuevo.');
      }
    } catch {
      setErrorMsg('Ocurrió un error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Botón Cerrar */}
        {!successInfo && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* PANTALLA DE ÉXITO */}
        {successInfo ? (
          <div className="text-center py-6 animate-scale-up">
            <div
              className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg ${
                successInfo.action === 'in'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1">
              {successInfo.action === 'in' ? '¡Jornada Iniciada!' : '¡Jornada Finalizada!'}
            </h2>
            <p className="text-lg font-semibold text-slate-200">{employee.name}</p>

            <div className="mt-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 max-w-xs mx-auto">
              <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold text-emerald-400">
                <Clock className="w-6 h-6 text-slate-400" />
                {successInfo.timeStr}
              </div>

              {successInfo.action === 'in' && successInfo.minutesLate !== undefined && (
                <div className="mt-2 text-xs">
                  {successInfo.minutesLate > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Tardanza: +{successInfo.minutesLate} minutos
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/30">
                      ✓ A tiempo
                    </span>
                  )}
                </div>
              )}

              {successInfo.action === 'out' && successInfo.hoursWorked && (
                <p className="mt-2 text-sm text-slate-300 font-medium">
                  Tiempo trabajado hoy: <strong className="text-white">{successInfo.hoursWorked}</strong>
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-5 animate-pulse">
              Volviendo a la pantalla principal para el siguiente compañero...
            </p>
          </div>
        ) : (
          /* FORMULARIO DE MARCACIÓN */
          <div>
            {/* Header del Empleado */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-800">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md text-white border border-white/20"
                style={{ backgroundColor: employee.avatar_color || '#3b82f6' }}
              >
                {employee.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{employee.name}</h3>
                <p className="text-xs text-slate-400">{employee.role}</p>
                {schedule && (
                  <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                    Horario hoy: {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                  </p>
                )}
              </div>
            </div>

            {/* Estado actual */}
            <div className="mb-5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="text-xs text-slate-300 font-medium">
                  {isWorking ? 'Turno actualmente en curso' : 'Listo para iniciar turno'}
                </span>
              </div>
              {isWorking && todayAttendance?.clock_in && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Entrada: {new Date(todayAttendance.clock_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              )}
            </div>

            {/* Instrucción PIN */}
            <div className="text-center mb-3">
              <p className="text-sm font-semibold text-slate-200 flex items-center justify-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Ingresa tu código PIN de 4 dígitos
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                (Código por defecto de prueba: <span className="font-mono text-emerald-400 font-bold">{employee.code || '1001'}</span>)
              </p>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            {/* PinPad */}
            <PinPad
              value={pin}
              onChange={setPin}
              onSubmit={pin.length === 4 ? handleConfirmPunch : undefined}
            />

            {/* Botón Principal de Acción */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleConfirmPunch}
                disabled={isSubmitting || pin.length < 4}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                  targetAction === 'in'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white shadow-rose-600/30'
                }`}
              >
                {isSubmitting ? (
                  <span className="inline-block animate-spin mr-2">⏳</span>
                ) : targetAction === 'in' ? (
                  <Play className="w-5 h-5 fill-current" />
                ) : (
                  <Square className="w-5 h-5 fill-current" />
                )}
                <span>
                  {targetAction === 'in' ? 'INICIAR JORNADA' : 'FINALIZAR JORNADA'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
