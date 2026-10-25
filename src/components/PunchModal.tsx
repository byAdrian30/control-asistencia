'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, Clock, Play, Square, AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react';
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
  onRegisterPin: (employeeId: string, newPin: string) => Promise<boolean>;
}

export default function PunchModal({
  employee,
  todayAttendance,
  schedule,
  onClose,
  onPunch,
  onRegisterPin,
}: PunchModalProps) {
  // ¿Es la primera vez que ingresa?
  const isFirstTime = !employee.has_custom_pin || !employee.code;

  // Estados para registro inicial de PIN (dos pasos: crear y confirmar)
  const [firstTimeStep, setFirstTimeStep] = useState<'create' | 'confirm'>('create');
  const [initialPin, setInitialPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [justRegisteredPin, setJustRegisteredPin] = useState(false);

  // Estados para marcación normal
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

  // Paso 1 de Primera Vez: Creó 4 dígitos, pasar a confirmar
  const handleFirstTimeCreate = () => {
    if (initialPin.length === 4) {
      playSound('click');
      setFirstTimeStep('confirm');
      setErrorMsg('');
    }
  };

  // Paso 2 de Primera Vez: Confirmó 4 dígitos, grabar permanentemente
  const handleFirstTimeConfirm = async () => {
    if (confirmPin !== initialPin) {
      playSound('error');
      triggerVibration([100, 100, 100]);
      setErrorMsg('Los códigos no coinciden. Por favor ingresa tu código nuevamente.');
      setInitialPin('');
      setConfirmPin('');
      setFirstTimeStep('create');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onRegisterPin(employee.id, confirmPin);
      if (ok) {
        playSound('in');
        triggerVibration([100, 50, 150]);
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.5 },
        });
        employee.code = confirmPin;
        employee.has_custom_pin = true;
        setJustRegisteredPin(true);
        setPin(confirmPin); // Ya queda pre-autenticado para este primer fichaje
      } else {
        setErrorMsg('Error al guardar tu contraseña. Intenta nuevamente.');
      }
    } catch {
      setErrorMsg('Error de conexión al grabar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Marcación regular
  const handleConfirmPunch = async () => {
    setErrorMsg('');

    // Validar PIN
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
          timeZone: 'America/Lima',
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

        setTimeout(() => {
          onClose();
        }, 3200);
      } else {
        setErrorMsg('Error al registrar la marcación.');
      }
    } catch {
      setErrorMsg('Ocurrió un error al registrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative max-h-[94vh] overflow-y-auto">
        {!successInfo && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* PANTALLA 1: ÉXITO MARCACIÓN */}
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
            <p className="text-base font-semibold text-slate-200">{employee.name}</p>

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
        ) : isFirstTime && !justRegisteredPin ? (
          /* PANTALLA 2: REGISTRO DE PIN POR PRIMERA VEZ */
          <div className="text-center py-2">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-7 h-7" />
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-2">
              ✨ Primer Ingreso al Sistema
            </span>

            <h3 className="text-lg font-black text-white">{employee.name}</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">
              {firstTimeStep === 'create'
                ? 'Elige una contraseña de 4 dígitos. Esta clave será tuya para siempre para marcar tus entradas y salidas.'
                : 'Ingresa nuevamente tu contraseña de 4 dígitos para confirmarla:'}
            </p>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium max-w-xs mx-auto">
                {errorMsg}
              </div>
            )}

            {firstTimeStep === 'create' ? (
              <div>
                <PinPad
                  value={initialPin}
                  onChange={setInitialPin}
                  onSubmit={initialPin.length === 4 ? handleFirstTimeCreate : undefined}
                />
                <button
                  type="button"
                  onClick={handleFirstTimeCreate}
                  disabled={initialPin.length < 4}
                  className="mt-4 w-full max-w-[280px] mx-auto py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-2xl transition-all disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div>
                <PinPad
                  value={confirmPin}
                  onChange={setConfirmPin}
                  onSubmit={confirmPin.length === 4 ? handleFirstTimeConfirm : undefined}
                />
                <button
                  type="button"
                  onClick={handleFirstTimeConfirm}
                  disabled={confirmPin.length < 4 || isSubmitting}
                  className="mt-4 w-full max-w-[280px] mx-auto py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-2xl transition-all disabled:opacity-40"
                >
                  {isSubmitting ? 'Guardando contraseña...' : 'Guardar y Grabar mi Contraseña'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* PANTALLA 3: MARCACIÓN HABITUAL CON PIN */
          <div>
            {/* Header del Empleado */}
            <div className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-slate-800">
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center text-lg font-bold shadow-md text-white border border-white/20 shrink-0"
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
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-white truncate">{employee.name}</h3>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                    {employee.area}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{employee.role}</p>
                {schedule && (
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                    Horario hoy: {schedule.start_time.slice(0, 5)} a {schedule.end_time.slice(0, 5)}
                  </p>
                )}
              </div>
            </div>

            {/* Aviso si acaba de crear su PIN */}
            {justRegisteredPin && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                ¡Tu contraseña fue guardada con éxito para siempre!
              </div>
            )}

            {/* Estado actual */}
            <div className="mb-4 p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="text-xs text-slate-300 font-medium">
                  {isWorking ? 'Turno actualmente en curso' : 'Listo para iniciar turno'}
                </span>
              </div>
              {isWorking && todayAttendance?.clock_in && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Entrada: {new Date(todayAttendance.clock_in).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              )}
            </div>

            {/* Instrucción PIN */}
            {!justRegisteredPin && (
              <div className="text-center mb-3">
                <p className="text-xs font-semibold text-slate-300">
                  Ingresa tu código PIN de 4 dígitos para confirmar
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="mb-3 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            {/* PinPad si no está recién registrado */}
            {!justRegisteredPin && (
              <PinPad
                value={pin}
                onChange={setPin}
                onSubmit={pin.length === 4 ? handleConfirmPunch : undefined}
              />
            )}

            {/* Botón Principal de Acción */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleConfirmPunch}
                disabled={isSubmitting || pin.length < 4}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                  targetAction === 'in'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-black shadow-rose-600/30'
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
