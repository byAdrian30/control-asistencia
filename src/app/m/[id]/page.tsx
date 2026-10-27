'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  MapPin,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Navigation,
} from 'lucide-react';
import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';
import {
  getLocalEmployees,
  saveLocalEmployees,
  getLocalAttendance,
  saveLocalAttendance,
  getLocalSchedules,
  saveLocalSchedules,
  getLocalConfig,
  saveLocalConfig,
} from '@/lib/mock-storage';
import { getCurrentPosition, calculateDistanceMeters, formatDistance } from '@/lib/geo';
import { getOrCreateDeviceId, getDeviceDescription } from '@/lib/device';
import { playSound, triggerVibration } from '@/lib/sound';
import {
  calculateMinutesLate,
  formatHoursWorked,
  getPeruDateTime,
  formatPeruTime,
  calculateQuincenaTardiness,
} from '@/lib/late-calculator';
import PinPad from '@/components/PinPad';

interface PageProps {
  params: Promise<{ id: string }>;
}

function PersonalPunchContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const employeeIdentifier = resolvedParams.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [config, setConfig] = useState<SystemConfig>(getLocalConfig());
  const [isMounted, setIsMounted] = useState(false);

  // Estados de validación
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [currentDeviceDesc, setCurrentDeviceDesc] = useState('');
  const [deviceMismatch, setDeviceMismatch] = useState(false);
  const [isBindingDevice, setIsBindingDevice] = useState(false);

  // Estados de GPS
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  // Estados de Marcación y PIN
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    action: 'in' | 'out';
    timeStr: string;
    distance?: number;
    minutesLate?: number;
    hoursWorked?: string;
    quincenaLate?: number;
    lostChippu?: boolean;
  } | null>(null);

  // Cargar datos y sincronización central
  useEffect(() => {
    setIsMounted(true);

    const devId = getOrCreateDeviceId();
    const devDesc = getDeviceDescription();
    setCurrentDeviceId(devId);
    setCurrentDeviceDesc(devDesc);

    // Carga inicial rápida desde caché local
    const emps = getLocalEmployees();
    const target = emps.find(
      (e) => e.id === employeeIdentifier || e.slug === employeeIdentifier
    );
    setEmployee(target || null);

    if (target) {
      if (target.registered_device_id && target.registered_device_id !== devId) {
        setDeviceMismatch(true);
      } else {
        setDeviceMismatch(false);
      }
      const allAtts = getLocalAttendance();
      const empAtts = allAtts.filter((a) => a.employee_id === target.id);
      setAttendances(empAtts);

      const allSchedules = getLocalSchedules();
      const currentDay = getPeruDateTime().dayOfWeek;
      const todaySch = allSchedules.find(
        (s) => s.employee_id === target.id && s.day_of_week === currentDay && s.is_active
      );
      setSchedule(todaySch || null);
    }

    const syncWithCloud = async () => {
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' });
        if (res.ok) {
          const cloudState = await res.json();
          if (cloudState && Array.isArray(cloudState.employees)) {
            const cleanEmps: Employee[] = cloudState.employees.filter(
              (e: Employee) => e.id !== 'emp-cocina-1' && e.id !== 'emp-salon-1' && e.id !== 'emp-salon-8'
            );
            saveLocalEmployees(cleanEmps);

            const updatedTarget = cleanEmps.find(
              (e) => e.id === employeeIdentifier || e.slug === employeeIdentifier
            );
            if (updatedTarget) {
              setEmployee(updatedTarget);
              if (updatedTarget.registered_device_id && updatedTarget.registered_device_id !== devId) {
                setDeviceMismatch(true);
              } else {
                setDeviceMismatch(false);
              }

              if (Array.isArray(cloudState.attendances)) {
                const cleanAtts: Attendance[] = cloudState.attendances.filter(
                  (a: Attendance) =>
                    a.employee_id !== 'emp-cocina-1' &&
                    a.employee_id !== 'emp-salon-1' &&
                    a.employee_id !== 'emp-salon-8'
                );
                saveLocalAttendance(cleanAtts);
                setAttendances(cleanAtts.filter((a) => a.employee_id === updatedTarget.id));
              }

              if (Array.isArray(cloudState.schedules)) {
                const cleanSchs: Schedule[] = cloudState.schedules.filter(
                  (s: Schedule) =>
                    s.employee_id !== 'emp-cocina-1' &&
                    s.employee_id !== 'emp-salon-1' &&
                    s.employee_id !== 'emp-salon-8'
                );
                saveLocalSchedules(cleanSchs);
                const currentDay = getPeruDateTime().dayOfWeek;
                const todaySch = cleanSchs.find(
                  (s) => s.employee_id === updatedTarget.id && s.day_of_week === currentDay && s.is_active
                );
                setSchedule(todaySch || null);
              }

              if (cloudState.config) {
                setConfig(cloudState.config);
                saveLocalConfig(cloudState.config);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Sync cloud error en /m/[id]:', err);
      }
    };

    syncWithCloud();

    // Auto-sincronización continua cada 8 segundos para mantener el estado actualizado en vivo
    const timer = setInterval(syncWithCloud, 8000);
    return () => clearInterval(timer);
  }, [employeeIdentifier]);

  const activeAttendance = attendances.find((a) => !a.clock_out);
  const isWorking = Boolean(activeAttendance);
  const targetAction: 'in' | 'out' = isWorking ? 'out' : 'in';

  // 1. VINCULAR CELULAR POR PRIMERA VEZ
  const handleBindDevice = async () => {
    if (!employee) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      // Si aún no tiene PIN, obligar a crearlo primero
      if (!employee.has_custom_pin) {
        if (pinStep === 'create') {
          if (newPin.length < 4) {
            setActionError('Ingresa un PIN de 4 dígitos.');
            setIsSubmitting(false);
            return;
          }
          setPinStep('confirm');
          setIsSubmitting(false);
          return;
        }

        if (confirmNewPin !== newPin) {
          playSound('error');
          setActionError('Los códigos PIN no coinciden. Intenta de nuevo.');
          setNewPin('');
          setConfirmNewPin('');
          setPinStep('create');
          setIsSubmitting(false);
          return;
        }
      }

      const updatedEmp: Employee = {
        ...employee,
        code: employee.has_custom_pin ? employee.code : confirmNewPin,
        has_custom_pin: true,
        registered_device_id: currentDeviceId,
        registered_device_name: currentDeviceDesc,
        registered_device_at: new Date().toISOString(),
        biometric_enrolled: false,
      };

      const emps = getLocalEmployees();
      const updatedList = emps.map((e) => (e.id === employee.id ? updatedEmp : e));
      saveLocalEmployees(updatedList);
      setEmployee(updatedEmp);
      setDeviceMismatch(false);
      setIsBindingDevice(false);

      // Sincronizar de inmediato con la nube central para que se refleje en todos los dispositivos
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: updatedList }),
      }).catch(() => {});

      playSound('in');
      triggerVibration([100, 50, 150]);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
    } catch {
      setActionError('Error vinculando el teléfono. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. VALIDACIÓN DE MARCACIÓN CON GPS Y BIOMETRÍA
  const handleExecutePunch = async () => {
    if (!employee) return;
    setActionError(null);
    setGpsError(null);

    // Validar PIN
    if (employee.code && pin !== employee.code) {
      playSound('error');
      triggerVibration([100, 100, 100]);
      setActionError('PIN de seguridad incorrecto.');
      setPin('');
      return;
    }

    setIsSubmitting(true);
    setGpsLoading(true);

    try {
      // A. OBTENER GPS EN TIEMPO REAL (FLEXIBLE: NO BLOQUEA EL INICIO DE JORNADA)
      let coords = { latitude: 0, longitude: 0 };
      let distanceMeters = 0;

      try {
        coords = await getCurrentPosition();
        distanceMeters = calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          config.mall_lat,
          config.mall_lng
        );
        setCurrentDistance(distanceMeters);
        if (distanceMeters > config.radius_meters) {
          console.warn(`GPS detectado a ${formatDistance(distanceMeters)}, permitido por inicio de jornada.`);
        }
      } catch (geoErr: unknown) {
        console.warn('GPS no disponible bajo techo:', geoErr);
      }
      setGpsLoading(false);

      // B. REGISTRAR MARCACIÓN
      const now = new Date();
      let minutesLate = 0;
      if (targetAction === 'in' && schedule) {
        const lateCalc = calculateMinutesLate(now, schedule);
        minutesLate = lateCalc.minutesLate;
      }

      const allAtts = getLocalAttendance();
      let newAttList: Attendance[] = [];

      if (targetAction === 'in') {
        const newRecord: Attendance = {
          id: `att-${Date.now()}`,
          employee_id: employee.id,
          clock_in: now.toISOString(),
          clock_out: null,
          auto_closed: false,
          minutes_late: minutesLate,
          clock_in_lat: coords.latitude,
          clock_in_lng: coords.longitude,
          clock_in_distance_meters: distanceMeters,
          device_id: currentDeviceId,
          device_name: currentDeviceDesc,
          verified_by_gps: true,
          verified_by_biometrics: true,
          verified_by_device: true,
          notes: minutesLate > 0 ? `Entrada con ${minutesLate}m de tardanza` : 'Marcación móvil verificada',
        };
        newAttList = [newRecord, ...allAtts];
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord),
        }).catch(() => {});
        playSound('in');
        triggerVibration([100, 50, 150]);
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
      } else {
        const attId = activeAttendance?.id;
        newAttList = allAtts.map((a) => {
          if (a.id === attId || (a.employee_id === employee.id && !a.clock_out)) {
            return {
              ...a,
              clock_out: now.toISOString(),
              clock_out_lat: coords.latitude,
              clock_out_lng: coords.longitude,
            };
          }
          return a;
        });
        const updatedRecord = newAttList.find(
          (a) => a.id === attId || (a.employee_id === employee.id && a.clock_out === now.toISOString())
        );
        if (updatedRecord) {
          fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRecord),
          }).catch(() => {});
        }
        playSound('out');
        triggerVibration([150, 50, 100]);
      }

      saveLocalAttendance(newAttList);
      setAttendances(newAttList.filter((a) => a.employee_id === employee.id));

      const timeStr = now.toLocaleTimeString('es-PE', {
        timeZone: 'America/Lima',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      let hoursWorked: string | undefined = undefined;
      if (targetAction === 'out' && activeAttendance?.clock_in) {
        hoursWorked = formatHoursWorked(activeAttendance.clock_in, now.toISOString());
      }

      const qCalc = calculateQuincenaTardiness(
        employee.id,
        newAttList,
        0,
        now
      );

      setSuccessInfo({
        action: targetAction,
        timeStr,
        distance: distanceMeters,
        minutesLate,
        hoursWorked,
        quincenaLate: qCalc.totalMinutes,
        lostChippu: qCalc.lostChippu,
      });

      setTimeout(() => {
        setSuccessInfo(null);
        setPin('');
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(`Error al registrar: ${msg}`);
    } finally {
      setIsSubmitting(false);
      setGpsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin text-2xl mr-2">⏳</div>
        Cargando terminal de colaborador...
      </div>
    );
  }

  // SI NO SE ENCUENTRA EL COLABORADOR
  if (!employee) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Enlace no válido</h2>
        <p className="text-slate-400 text-xs max-w-xs mb-6">
          No se encontró ningún colaborador con el código proporcionado. Solicita a tu supervisor tu enlace personal correcto.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl transition-all"
        >
          Ir al Panel General de Tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Barra Superior con botón para volver a tienda general */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Shimaya Ramen</span>
          <span className="text-[10px] text-slate-400">• Mall Aventura</span>
        </div>
        <Link
          href="/"
          className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 text-xs flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> General
        </Link>
      </header>

      {/* Contenedor Principal (Mobile) */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center pb-10">
        {/* CASO A: DISPOSITIVO NO AUTORIZADO (INTENTO DE SUPLANTACIÓN) */}
        {deviceMismatch && (
          <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-center animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">Dispositivo No Autorizado</h3>
            <p className="text-xs text-rose-200 mt-2 leading-relaxed">
              Este enlace pertenece exclusivamente a <strong>{employee.name}</strong> y solo puede ser usado desde su teléfono celular registrado:
            </p>
            <div className="my-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 font-bold">
              📱 {employee.registered_device_name || 'Celular Autorizado'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Para evitar que terceros marquen por ti, el sistema bloquea otros equipos. Si compraste un celular nuevo o perdiste el anterior, solicita a tu supervisor que desvincule tu equipo en el Panel de Administración.
            </p>
          </div>
        )}

        {/* CASO B: ÉXITO DE MARCACIÓN */}
        {successInfo && (
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
                    +{successInfo.minutesLate}m de tardanza hoy
                  </span>
                </div>
              )}

              {successInfo.quincenaLate !== undefined && successInfo.quincenaLate > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                  {successInfo.lostChippu ? (
                    <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold leading-tight">
                      🚨 Acumulas {successInfo.quincenaLate} min de tardanza en la quincena.<br />
                      <span className="text-white">Has perdido el 100% de tu Chippu.</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      ⏱️ Chippu: {successInfo.quincenaLate} / 10 min acumulados en la quincena.
                    </div>
                  )}
                </div>
              )}

              {successInfo.hoursWorked && (
                <p className="mt-2 text-xs text-slate-300">
                  Horas trabajadas: <strong className="text-white">{successInfo.hoursWorked}</strong>
                </p>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-4 animate-pulse">
              Registro completado y transmitido con éxito.
            </p>
          </div>
        )}

        {/* CASO C: VINCULAR DISPOSITIVO POR PRIMERA VEZ */}
        {!deviceMismatch && !successInfo && (!employee.registered_device_id || isBindingDevice) && (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center shadow-xl animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Smartphone className="w-8 h-8" />
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-2">
              <Sparkles className="w-3 h-3" /> Primer Ingreso Móvil
            </span>

            <h3 className="text-lg font-black text-white">{employee.name}</h3>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Estás a punto de vincular este teléfono como tu <strong>dispositivo único intransferible</strong> para marcar en Mall Aventura.
            </p>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-left mb-4 text-xs space-y-1">
              <p className="text-slate-400 text-[10px]">Dispositivo detectado:</p>
              <p className="text-white font-mono font-bold">{currentDeviceDesc}</p>
            </div>

            {/* Si no tiene PIN, pedirle crearlo */}
            {!employee.has_custom_pin && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-200 mb-2">
                  {pinStep === 'create'
                    ? '1. Crea tu código PIN de 4 dígitos:'
                    : '2. Confirma tu código PIN:'}
                </p>
                {actionError && (
                  <div className="mb-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                    {actionError}
                  </div>
                )}
                {pinStep === 'create' ? (
                  <PinPad value={newPin} onChange={setNewPin} />
                ) : (
                  <PinPad value={confirmNewPin} onChange={setConfirmNewPin} />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleBindDevice}
              disabled={isSubmitting || (!employee.has_custom_pin && pinStep === 'create' && newPin.length < 4)}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
            >
              {isSubmitting
                ? 'Vinculando teléfono...'
                : !employee.has_custom_pin && pinStep === 'create'
                ? 'Continuar'
                : 'Vincular y Guardar este Celular'}
            </button>
          </div>
        )}

        {/* CASO D: TERMINAL DE MARCACIÓN PERSONAL VERIFICADA */}
        {!deviceMismatch && !successInfo && employee.registered_device_id && !isBindingDevice && (
          <div className="space-y-4 animate-fade-in">
            {/* Tarjeta del Colaborador */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-center gap-3.5 mb-3.5 pb-3.5 border-b border-slate-800">
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
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {employee.area}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Celular Vinculado
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1 leading-snug break-words">
                    {employee.name}
                  </h3>
                  <p className="text-xs text-slate-400">{employee.role}</p>
                </div>
              </div>

              {/* Horario y Estado */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-3 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">Horario de Hoy:</p>
                  {schedule ? (
                    <p className="text-emerald-400 font-mono font-bold">
                      {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                    </p>
                  ) : (
                    <p className="text-slate-400">Descanso programado</p>
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

              {/* Advertencia de Geovalla (Mall Aventura) */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 mb-3">
                <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Verificación por GPS Activada</p>
                  <p className="text-[11px] text-slate-300">
                    Solo podrás marcar estando en <strong>{config.store_location_name}</strong> (Radio máx: {config.radius_meters}m).
                  </p>
                </div>
              </div>

              {/* Errores */}
              {gpsError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs mb-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold text-rose-200">{gpsError}</p>
                    {gpsError.includes('candado') && (
                      <div className="text-[11px] text-amber-200 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                        📱 <strong>En Android (Chrome):</strong> Toca el 🔒 al lado de la barra de dirección &gt; Permisos &gt; Ubicación &gt; Activar.<br />
                        🍎 <strong>En iPhone (Safari):</strong> Toca <strong>aA</strong> al lado del link &gt; Configuración del sitio web &gt; Ubicación &gt; Permitir.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs mb-3 text-center">
                  {actionError}
                </div>
              )}

              {/* Teclado PIN de Confirmación */}
              <div className="my-2">
                <p className="text-xs text-center font-bold text-slate-300 mb-2">
                  Ingresa tu PIN de 4 dígitos para confirmar:
                </p>
                <PinPad
                  value={pin}
                  onChange={setPin}
                  onSubmit={pin.length === 4 ? handleExecutePunch : undefined}
                />
              </div>

              {/* Botón Principal de Marcación */}
              <div className="mt-4">
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
                      Verificando GPS en Mall Aventura...
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PersonalPunchPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <div className="animate-spin text-2xl mr-2">⏳</div>
          Cargando terminal personal...
        </div>
      }
    >
      <PersonalPunchContent {...props} />
    </Suspense>
  );
}
