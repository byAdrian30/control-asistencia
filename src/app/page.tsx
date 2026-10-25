'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Clock, AlertTriangle, CheckCircle2, Smartphone, ShieldCheck, Sparkles, Store, Monitor } from 'lucide-react';
import { Employee, Attendance, Schedule, SystemConfig } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
import {
  getOrCreateDeviceId,
  getDeviceDescription,
  getStoredBoundEmployeeId,
  setStoredBoundEmployeeId,
  clearStoredBoundEmployeeId,
} from '@/lib/device';
import ClockHeader from '@/components/ClockHeader';
import KioskMode from '@/components/KioskMode';
import TodayFeed from '@/components/TodayFeed';
import AdminModal from '@/components/AdminModal';
import PersonalDeviceKiosk from '@/components/PersonalDeviceKiosk';
import DeviceBindingModal from '@/components/DeviceBindingModal';
import confetti from 'canvas-confetti';

export default function AttendanceHomePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [config, setConfig] = useState<SystemConfig>(getLocalConfig());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Detección de Dispositivo
  const [deviceId, setDeviceId] = useState('');
  const [deviceDesc, setDeviceDesc] = useState('');
  const [boundEmployee, setBoundEmployee] = useState<Employee | null>(null);
  const [forceGeneralMode, setForceGeneralMode] = useState(false);

  // Modal para vincular equipo por primera vez
  const [bindingCandidate, setBindingCandidate] = useState<Employee | null>(null);
  const [bindingError, setBindingError] = useState<string | null>(null);

  const isConnected = isSupabaseConfigured();

  // Cargar datos
  const loadData = useCallback(async () => {
    setIsRefreshing(true);

    let loadedEmps: Employee[] = [];
    let loadedAtts: Attendance[] = [];
    let loadedSchs: Schedule[] = [];

    if (isConnected && supabase) {
      try {
        const { data: emps, error: empErr } = await supabase
          .from('employees')
          .select('*')
          .order('name');
        if (!empErr && emps && emps.length > 0) {
          loadedEmps = emps;
        } else {
          loadedEmps = getLocalEmployees();
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const { data: atts } = await supabase
          .from('attendance')
          .select('*')
          .gte('clock_in', startOfDay);
        if (atts) loadedAtts = atts;

        const { data: schs } = await supabase.from('schedules').select('*');
        if (schs && schs.length > 0) loadedSchs = schs;
        else loadedSchs = getLocalSchedules();
      } catch {
        loadedEmps = getLocalEmployees();
        loadedAtts = getLocalAttendance();
        loadedSchs = getLocalSchedules();
      }
    } else {
      loadedEmps = getLocalEmployees();
      loadedAtts = getLocalAttendance();
      loadedSchs = getLocalSchedules();
    }

    setEmployees(loadedEmps);
    setAttendances(loadedAtts);
    setSchedules(loadedSchs);
    setConfig(getLocalConfig());

    // Detectar si este celular ya está vinculado a un colaborador
    const curDevId = getOrCreateDeviceId();
    const curDevDesc = getDeviceDescription();
    setDeviceId(curDevId);
    setDeviceDesc(curDevDesc);

    const storedBoundId = getStoredBoundEmployeeId();
    const matched = loadedEmps.find(
      (e) => (storedBoundId && e.id === storedBoundId) || (e.registered_device_id && e.registered_device_id === curDevId)
    );

    setBoundEmployee(matched || null);
    setIsRefreshing(false);
  }, [isConnected]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, [loadData]);

  // VINCULAR CELULAR POR PRIMERA VEZ (1 SOLO LINK PARA TODOS)
  const handleBindDeviceSuccess = async (employeeId: string, newPin: string): Promise<boolean> => {
    try {
      const curDevId = getOrCreateDeviceId();
      const curDevDesc = getDeviceDescription();

      const updatedEmps = employees.map((emp) => {
        if (emp.id === employeeId) {
          return {
            ...emp,
            code: newPin,
            has_custom_pin: true,
            registered_device_id: curDevId,
            registered_device_name: curDevDesc,
            registered_device_at: new Date().toISOString(),
            biometric_enrolled: true,
          };
        }
        return emp;
      });

      setEmployees(updatedEmps);
      saveLocalEmployees(updatedEmps);
      setStoredBoundEmployeeId(employeeId);

      const target = updatedEmps.find((e) => e.id === employeeId) || null;
      setBoundEmployee(target);
      setBindingCandidate(null);

      if (isConnected && supabase) {
        await supabase
          .from('employees')
          .update({
            code: newPin,
            has_custom_pin: true,
            registered_device_id: curDevId,
            registered_device_name: curDevDesc,
            registered_device_at: new Date().toISOString(),
          })
          .eq('id', employeeId);
      }

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
      return true;
    } catch {
      return false;
    }
  };

  // Intentar seleccionar colaborador para vincular este teléfono
  const handleSelectEmployeeForBinding = (emp: Employee) => {
    setBindingError(null);
    const curDevId = getOrCreateDeviceId();

    // Si el colaborador ya tiene otro teléfono registrado
    if (emp.registered_device_id && emp.registered_device_id !== curDevId) {
      setBindingError(
        `${emp.name} ya tiene un celular registrado (${emp.registered_device_name || 'Otro equipo'}). Para evitar suplantaciones, solo puedes marcar desde tu equipo registrado. Si compraste un teléfono nuevo, solicita a tu supervisor que desvincule tu celular anterior en el Panel Admin.`
      );
      return;
    }

    setBindingCandidate(emp);
  };

  // Desvincular teléfono localmente
  const handleSwitchToGeneral = () => {
    setForceGeneralMode(true);
  };

  const handleReturnToPersonalPhone = () => {
    setForceGeneralMode(false);
  };

  // Manejador de Marcación con GPS y verificación de dispositivo
  const handlePunch = async (payload: {
    employeeId: string;
    action: 'in' | 'out';
    attendanceId?: string;
    minutesLate: number;
    notes?: string;
    lat?: number;
    lng?: number;
    distance?: number;
  }): Promise<boolean> => {
    const nowIso = new Date().toISOString();

    if (isConnected && supabase) {
      try {
        if (payload.action === 'in') {
          const { data, error } = await supabase
            .from('attendance')
            .insert({
              employee_id: payload.employeeId,
              clock_in: nowIso,
              minutes_late: payload.minutesLate,
              notes: payload.notes || null,
              clock_in_lat: payload.lat || null,
              clock_in_lng: payload.lng || null,
              clock_in_distance_meters: payload.distance || null,
              device_id: deviceId,
              device_name: deviceDesc,
              verified_by_gps: true,
              verified_by_device: true,
            })
            .select()
            .single();

          if (error) return false;
          if (data) setAttendances((prev) => [data, ...prev]);
        } else {
          const attId = payload.attendanceId;
          if (!attId) return false;

          const { error } = await supabase
            .from('attendance')
            .update({
              clock_out: nowIso,
              clock_out_lat: payload.lat || null,
              clock_out_lng: payload.lng || null,
            })
            .eq('id', attId);

          if (error) return false;

          setAttendances((prev) =>
            prev.map((a) => (a.id === attId ? { ...a, clock_out: nowIso } : a))
          );
        }
        return true;
      } catch (err) {
        console.error('Error en marcación:', err);
        return false;
      }
    } else {
      // Modo Local con almacenamiento persistente
      if (payload.action === 'in') {
        const newRecord: Attendance = {
          id: `att-${Date.now()}`,
          employee_id: payload.employeeId,
          clock_in: nowIso,
          clock_out: null,
          auto_closed: false,
          minutes_late: payload.minutesLate,
          notes: payload.notes || 'Marcación celular verificada',
          clock_in_lat: payload.lat || null,
          clock_in_lng: payload.lng || null,
          clock_in_distance_meters: payload.distance || null,
          device_id: deviceId,
          device_name: deviceDesc,
          verified_by_gps: true,
          verified_by_device: true,
          verified_by_biometrics: true,
        };
        const updated = [newRecord, ...attendances];
        setAttendances(updated);
        saveLocalAttendance(updated);
      } else {
        const updated = attendances.map((a) => {
          if (a.id === payload.attendanceId || (a.employee_id === payload.employeeId && !a.clock_out)) {
            return {
              ...a,
              clock_out: nowIso,
              clock_out_lat: payload.lat || null,
              clock_out_lng: payload.lng || null,
            };
          }
          return a;
        });
        setAttendances(updated);
        saveLocalAttendance(updated);
      }
      return true;
    }
  };

  const handleSaveEmployee = async (newEmp: Employee) => {
    const updated = [...employees.filter((e) => e.id !== newEmp.id), newEmp];
    setEmployees(updated);
    saveLocalEmployees(updated);

    if (boundEmployee && boundEmployee.id === newEmp.id) {
      setBoundEmployee(newEmp);
    }

    if (isConnected && supabase) {
      try {
        await supabase.from('employees').upsert({
          id: newEmp.id,
          name: newEmp.name,
          slug: newEmp.slug,
          code: newEmp.code,
          has_custom_pin: newEmp.has_custom_pin,
          role: newEmp.role,
          area: newEmp.area,
          avatar_color: newEmp.avatar_color,
          active: newEmp.active,
          registered_device_id: newEmp.registered_device_id || null,
          registered_device_name: newEmp.registered_device_name || null,
          registered_device_at: newEmp.registered_device_at || null,
        });
      } catch (e) {
        console.error('Error guardando en Supabase:', e);
      }
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveLocalEmployees(updated);

    if (boundEmployee && boundEmployee.id === id) {
      setBoundEmployee(null);
      clearStoredBoundEmployeeId();
    }

    if (isConnected && supabase) {
      try {
        await supabase.from('employees').delete().eq('id', id);
      } catch (e) {
        console.error('Error eliminando en Supabase:', e);
      }
    }
  };

  const handleSaveSchedule = async (sch: Schedule) => {
    const filtered = schedules.filter(
      (s) => !(s.employee_id === sch.employee_id && s.day_of_week === sch.day_of_week)
    );
    const updated = [...filtered, sch];
    setSchedules(updated);
    saveLocalSchedules(updated);
  };

  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
    saveLocalConfig(newConfig);
  };

  const handleTriggerAutoCheckout = async (): Promise<string> => {
    try {
      const res = await fetch('/api/cron/auto-checkout?manual=1');
      const data = await res.json();
      await loadData();
      return data.message || 'Auto-deslogueo completado.';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Error: ${msg}`;
    }
  };

  const handleTriggerTelegramReport = async (): Promise<string> => {
    try {
      const res = await fetch('/api/cron/telegram-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.telegram_bot_token,
          chatId: config.telegram_chat_id,
          storeName: config.store_name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar reporte');
      return data.message || 'Reporte enviado a Telegram.';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  };

  const workingNowCount = attendances.filter((a) => !a.clock_out).length;
  const completedCount = attendances.filter((a) => a.clock_out).length;
  const lateCount = attendances.filter((a) => a.minutes_late > 0).length;

  const [currentDayOfWeek, setCurrentDayOfWeek] = useState(1);

  useEffect(() => {
    setCurrentDayOfWeek(new Date().getDay());
  }, []);

  const boundSchedule = boundEmployee
    ? schedules.find((s) => s.employee_id === boundEmployee.id && s.day_of_week === currentDayOfWeek && s.is_active)
    : null;

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin text-2xl mr-2">⏳</div>
        Iniciando sistema Shimaya...
      </div>
    );
  }

  // ==============================================================
  // VISTA 1: CELULAR VINCULADO (EL COLABORADOR ABRE EL ENLACE Y EL TELÉFONO LO RECONOCE AL INSTANTE)
  // ==============================================================
  if (boundEmployee && !forceGeneralMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
        <ClockHeader
          storeName={config.store_name}
          onOpenAdmin={() => setIsAdminOpen(true)}
          isSupabaseConnected={isConnected}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          activeCount={workingNowCount}
          totalCount={employees.length}
        />

        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center pb-12">
          <PersonalDeviceKiosk
            employee={boundEmployee}
            attendances={attendances.filter((a) => a.employee_id === boundEmployee.id)}
            schedule={boundSchedule}
            config={config}
            currentDeviceId={deviceId}
            currentDeviceDesc={deviceDesc}
            onPunch={handlePunch}
            onSwitchToGeneralMode={handleSwitchToGeneral}
          />
        </main>

        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          employees={employees}
          schedules={schedules}
          attendances={attendances}
          config={config}
          onSaveEmployee={handleSaveEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onSaveSchedule={handleSaveSchedule}
          onSaveConfig={handleSaveConfig}
          onTriggerAutoCheckout={handleTriggerAutoCheckout}
          onTriggerTelegramReport={handleTriggerTelegramReport}
          isSupabaseConnected={isConnected}
        />
      </div>
    );
  }

  // ==============================================================
  // VISTA 2: PRIMER INGRESO (VINCULAR CELULAR + CREAR PIN) O MODO GENERAL
  // ==============================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <ClockHeader
        storeName={config.store_name}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isSupabaseConnected={isConnected}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        activeCount={workingNowCount}
        totalCount={employees.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-5 lg:p-6 pb-12">
        {/* Banner de Aviso de Primer Ingreso en Celular */}
        {!boundEmployee && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-slate-900 border border-emerald-500/30 text-center shadow-lg">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-white">
              📱 Vinculación de Celular por Primera Vez
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto mt-1 leading-relaxed">
              Selecciona tu nombre abajo para <strong>vincular este celular a tu cuenta y crear tu PIN</strong>. A partir de ese momento, este celular será el único con el que podrás marcar en Mall Aventura.
            </p>
            <p className="text-[10px] text-emerald-400 font-mono mt-1.5 font-bold">
              Equipo detectado: {deviceDesc}
            </p>
          </div>
        )}

        {/* Si el usuario cambió a modo general y quiere volver a su celular personal */}
        {boundEmployee && forceGeneralMode && (
          <div className="max-w-md mx-auto mb-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300">
              Estás en Modo General. Tu cuenta: <strong>{boundEmployee.name.split(' ')[0]}</strong>
            </span>
            <button
              onClick={handleReturnToPersonalPhone}
              className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Volver a mi Celular
            </button>
          </div>
        )}

        {/* Mensaje de error de vinculación si otro intentó marcar */}
        {bindingError && (
          <div className="max-w-md mx-auto mb-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white mb-0.5">Dispositivo no permitido</p>
              <p className="leading-relaxed">{bindingError}</p>
            </div>
          </div>
        )}

        {/* Panel Superior de Estadísticas (Desktop) */}
        <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Personal Registrado</p>
              <p className="text-2xl font-black text-white">{employees.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">En Tienda Ahora</p>
              <p className="text-2xl font-black text-emerald-400">{workingNowCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Jornadas Terminadas</p>
              <p className="text-2xl font-black text-slate-200">{completedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 font-medium">Tardanzas Detectadas</p>
              <p className={`text-2xl font-black ${lateCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {lateCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Layout en 2 columnas (PC) o vertical (Móvil) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          <section className="lg:col-span-8 w-full" aria-label="Terminal de Marcación">
            <KioskMode
              employees={employees}
              attendances={attendances}
              schedules={schedules}
              onPunch={handlePunch}
              onRegisterPin={async (empId, newPin) => {
                const emp = employees.find((e) => e.id === empId);
                if (emp) handleSelectEmployeeForBinding(emp);
                return true;
              }}
            />
          </section>

          <section className="lg:col-span-4 w-full" aria-label="Historial del Día">
            <div className="lg:sticky lg:top-24">
              <TodayFeed attendances={attendances} employees={employees} />
            </div>
          </section>
        </div>
      </main>

      {/* Modal para Vincular Dispositivo por Primera Vez */}
      {bindingCandidate && (
        <DeviceBindingModal
          employee={bindingCandidate}
          deviceId={deviceId}
          deviceDesc={deviceDesc}
          onClose={() => setBindingCandidate(null)}
          onBindSuccess={handleBindDeviceSuccess}
        />
      )}

      {/* Modal de Administración */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        employees={employees}
        schedules={schedules}
        attendances={attendances}
        config={config}
        onSaveEmployee={handleSaveEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onSaveSchedule={handleSaveSchedule}
        onSaveConfig={handleSaveConfig}
        onTriggerAutoCheckout={handleTriggerAutoCheckout}
        onTriggerTelegramReport={handleTriggerTelegramReport}
        isSupabaseConnected={isConnected}
      />
    </div>
  );
}
