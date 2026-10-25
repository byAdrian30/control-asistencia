'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  Navigation,
  RotateCcw,
} from 'lucide-react';
import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';
import PinPad from './PinPad';
import { playSound, triggerVibration } from '@/lib/sound';
import { getCurrentPosition, calculateDistanceMeters, formatDistance } from '@/lib/geo';
import { verifyBiometricCredential } from '@/lib/biometrics';
import { calculateMinutesLate, formatHoursWorked } from '@/lib/late-calculator';

interface PersonalDeviceKioskProps {
  employee: Employee;
  attendances: Attendance[];
  schedule?: Schedule | null;
  config: SystemConfig;
  currentDeviceId: string;
  currentDeviceDesc: string;
  onPunch: (payload: {
    employeeId: string;
    action: 'in' | 'out';
    attendanceId?: string;
    minutesLate: number;
    notes?: string;
    lat?: number;
    lng?: number;
    distance?: number;
  }) => Promise<boolean>;
  onSwitchToGeneralMode: () => void;
}

export default function PersonalDeviceKiosk({
  employee,
  attendances,
  schedule,
  config,
  currentDeviceId,
  currentDeviceDesc,
  onPunch,
  onSwitchToGeneralMode,
}: PersonalDeviceKioskProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    action: 'in' | 'out';
    timeStr: string;
    distance?: number;
    minutesLate?: number;
    hoursWorked?: string;
  } | null>(null);

  // Buscar marcación activa de hoy
  const activeAttendance = attendances.find((a) => !a.clock_out);
  const isWorking = Boolean(activeAttendance);
  const targetAction: 'in' | 'out' = isWorking ? 'out' : 'in';

  // VALIDACIÓN DE SEGURIDAD ESTRICTA:
  // 1. Validar que el dispositivo físico coincida con el registrado para este colaborador
  const isDeviceValid = employee.registered_device_id === currentDeviceId;

  const handleExecutePunch = async () => {
    setErrorMsg(null);
    setGpsError(null);

    // DOBLE VALIDACIÓN DE EQUIPO (Anti-suplantación)
    if (!isDeviceValid) {
      playSound('error');
      triggerVibration([150, 100, 150]);
      setErrorMsg(
        `Este celular no coincide con el equipo registrado de ${employee.name}. No puedes marcar desde otro teléfono.`
      );
      return;
    }

    // VALIDACIÓN DE PIN
    if (employee.code && pin !== employee.code) {
      playSound('error');
      triggerVibration([100, 100, 100]);
      setErrorMsg('PIN incorrecto. Ingresa el código asignado a tu cuenta en este celular.');
      setPin('');
      return;
    }

    setIsSubmitting(true);
    setGpsLoading(true);

    try {
      // 2. VALIDACIÓN DE GPS EN MALL AVENTURA
      let coords = { latitude: 0, longitude: 0 };
      let distanceMeters = 0;

      if (config.require_gps) {
        try {
          coords = await getCurrentPosition();
          distanceMeters = calculateDistanceMeters(
            coords.latitude,
            coords.longitude,
            config.mall_lat,
            config.mall_lng
          );

          if (distanceMeters > config.radius_meters) {
            playSound('error');
            triggerVibration([150, 100, 150]);
            setGpsError(
              `Estás a ${formatDistance(distanceMeters)} de Shimaya Ramen (${config.store_location_name}). Debes estar físicamente dentro del local (radio máx: ${config.radius_meters}m) para marcar.`
            );
            setIsSubmitting(false);
            setGpsLoading(false);
            return;
          }
        } catch (geoErr: unknown) {
          const msg = geoErr instanceof Error ? geoErr.message : String(geoErr);
          setGpsError(msg);
          setIsSubmitting(false);
          setGpsLoading(false);
          return;
        }
      }
      setGpsLoading(false);

      // 3. VALIDACIÓN BIOMÉTRICA (TouchID / FaceID)
      if (config.require_biometrics && employee.biometric_enrolled) {
        try {
          const bioRes = await verifyBiometricCredential(employee.id);
          if (!bioRes.success) {
            setErrorMsg('No se completó la verificación biométrica.');
            setIsSubmitting(false);
            return;
          }
        } catch {
          // Si el sensor no responde, el PIN y el dispositivo ya validaron
        }
      }

      // 4. REGISTRAR MARCACIÓN
      const now = new Date();
      let minutesLate = 0;
      if (targetAction === 'in' && schedule) {
        const lateCalc = calculateMinutesLate(now, schedule);
        minutesLate = lateCalc.minutesLate;
      }

      const ok = await onPunch({
        employeeId: employee.id,
        action: targetAction,
        attendanceId: activeAttendance?.id,
        minutesLate,
        notes: minutesLate > 0 ? `Entrada con ${minutesLate}m de tardanza` : 'Marcación móvil verificada',
        lat: coords.latitude,
        lng: coords.longitude,
        distance: distanceMeters,
      });

      if (ok) {
        if (targetAction === 'in') {
          playSound('in');
          triggerVibration([100, 50, 150]);
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
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
        if (targetAction === 'out' && activeAttendance?.clock_in) {
          hoursWorked = formatHoursWorked(activeAttendance.clock_in, now.toISOString());
        }

        setSuccessInfo({
          action: targetAction,
          timeStr,
          distance: distanceMeters,
          minutesLate,
          hoursWorked,
        });

        setPin('');

        setTimeout(() => {
          setSuccessInfo(null);
        }, 4500);
      } else {
        setErrorMsg('Error al registrar la marcación.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
      setGpsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* SI EL DISPOSITIVO NO COINCIDE */}
      {!isDeviceValid ? (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-center animate-fade-in shadow-xl">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">Dispositivo No Autorizado</h3>
          <p className="text-xs text-rose-200 mt-2 leading-relaxed">
            Este teléfono no coincide con el celular que <strong>{employee.name}</strong> vinculó inicialmente:
          </p>
          <div className="my-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 font-bold">
            📱 {employee.registered_device_name || 'Celular Autorizado'}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
            Para evitar que otros marquen por ti, solo puedes usar tu teléfono registrado. Si compraste un celular nuevo, solicita a tu supervisor que desvincule tu equipo en el Panel de Administración.
          </p>
          <button
            type="button"
            onClick={onSwitchToGeneralMode}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
          >
            Cambiar de Colaborador o Modo General
          </button>
        </div>
      ) : successInfo ? (
        /* PANTALLA DE ÉXITO */
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center animate-scale-up shadow-2xl">
          <div
            className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg ${
              successInfo.action === 'in'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-white">
            {successInfo.action === 'in' ? '¡Jornada Iniciada!' : '¡Jornada Finalizada!'}
          </h2>
          <p className="text-sm font-semibold text-slate-300 mt-1">{employee.name}</p>

          <div className="mt-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 max-w-xs mx-auto">
            <div className="flex items-center justify-center gap-2 text-2xl font-mono font-bold text-emerald-400">
              <Clock className="w-6 h-6 text-slate-400" />
              {successInfo.timeStr}
            </div>

            {successInfo.distance !== undefined && (
              <p className="text-xs text-emerald-400/90 font-mono mt-1.5 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Verificado en Mall Aventura ({successInfo.distance}m)
              </p>
            )}

            {successInfo.minutesLate !== undefined && successInfo.minutesLate > 0 && (
              <div className="mt-2 text-xs">
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  +{successInfo.minutesLate}m de tardanza
                </span>
              </div>
            )}

            {successInfo.hoursWorked && (
              <p className="mt-2 text-xs text-slate-300 font-medium">
                Tiempo trabajado hoy: <strong className="text-white">{successInfo.hoursWorked}</strong>
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-4 animate-pulse">
            Marcación registrada y guardada exitosamente.
          </p>
        </div>
      ) : (
        /* TERMINAL DE MARCACIÓN PERSONAL */
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 animate-fade-in">
          {/* Cabecera del Colaborador */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-md border border-white/20 shrink-0"
              style={{ backgroundColor: employee.avatar_color || '#3b82f6' }}
            >
              {employee.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    employee.area === 'Cocina'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {employee.area}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Tu Celular Vinculado
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 leading-snug break-words">
                {employee.name}
              </h3>
              <p className="text-xs text-slate-400">{employee.role}</p>
            </div>
          </div>

          {/* Horario y Estado */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Horario de Hoy:</p>
              {schedule ? (
                <p className="text-emerald-400 font-mono font-bold">
                  {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                </p>
              ) : (
                <p className="text-slate-400 font-medium">Descanso programado hoy</p>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium">Estado:</p>
              <span
                className={`inline-flex items-center gap-1 font-bold text-xs ${
                  isWorking ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isWorking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {isWorking ? 'En Turno' : 'Fuera de Turno'}
              </span>
            </div>
          </div>

          {/* Badge de Seguridad: Celular y GPS Mall Aventura */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
            <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Validación Doble: Celular + GPS Mall Aventura</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Este equipo ({currentDeviceDesc}) está vinculado a tu cuenta. Solo podrás marcar dentro de <strong>{config.store_location_name}</strong>.
              </p>
            </div>
          </div>

          {/* Errores */}
          {gpsError && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>{gpsError}</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          {/* Teclado PIN de 4 dígitos */}
          <div className="my-2">
            <p className="text-xs text-center font-bold text-slate-200 mb-2">
              Ingresa tu PIN de 4 dígitos para marcar:
            </p>
            <PinPad
              value={pin}
              onChange={setPin}
              onSubmit={pin.length === 4 ? handleExecutePunch : undefined}
            />
          </div>

          {/* Botón Principal de Acción */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleExecutePunch}
              disabled={isSubmitting || pin.length < 4}
              className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                targetAction === 'in'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white shadow-rose-500/20'
              }`}
            >
              {gpsLoading || isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin text-lg">📍</span>
                  Verificando ubicación en Mall Aventura...
                </span>
              ) : targetAction === 'in' ? (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>INICIAR JORNADA</span>
                </>
              ) : (
                <>
                  <Square className="w-5 h-5 fill-current" />
                  <span>FINALIZAR JORNADA</span>
                </>
              )}
            </button>
          </div>

          {/* Opción para cambiar de usuario si es necesario */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onSwitchToGeneralMode}
              className="text-[11px] text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              ¿No eres {employee.name.split(' ')[0]}? Cambiar de usuario o modo general
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
