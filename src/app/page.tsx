'use client';

import { useState, useEffect, useCallback } from 'react';
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
import ClockHeader from '@/components/ClockHeader';
import KioskMode from '@/components/KioskMode';
import TodayFeed from '@/components/TodayFeed';
import AdminModal from '@/components/AdminModal';

export default function AttendanceHomePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [config, setConfig] = useState<SystemConfig>(getLocalConfig());
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isConnected = isSupabaseConfigured();

  // Cargar datos
  const loadData = useCallback(async () => {
    setIsRefreshing(true);

    if (isConnected && supabase) {
      try {
        const { data: emps, error: empErr } = await supabase
          .from('employees')
          .select('*')
          .order('name');
        if (!empErr && emps && emps.length > 0) {
          setEmployees(emps);
        } else {
          setEmployees(getLocalEmployees());
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const { data: atts } = await supabase
          .from('attendance')
          .select('*')
          .gte('clock_in', startOfDay);
        if (atts) {
          setAttendances(atts);
        }

        const { data: schs } = await supabase.from('schedules').select('*');
        if (schs && schs.length > 0) {
          setSchedules(schs);
        } else {
          setSchedules(getLocalSchedules());
        }
      } catch {
        setEmployees(getLocalEmployees());
        setAttendances(getLocalAttendance());
        setSchedules(getLocalSchedules());
      }
    } else {
      setEmployees(getLocalEmployees());
      setAttendances(getLocalAttendance());
      setSchedules(getLocalSchedules());
    }

    setConfig(getLocalConfig());
    setIsRefreshing(false);
  }, [isConnected]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, [loadData]);

  // Grabar contraseña por primera vez (Permanente)
  const handleRegisterPin = async (employeeId: string, newPin: string): Promise<boolean> => {
    try {
      // 1. Actualizar estado local
      const updated = employees.map((emp) =>
        emp.id === employeeId ? { ...emp, code: newPin, has_custom_pin: true } : emp
      );
      setEmployees(updated);
      saveLocalEmployees(updated);

      // 2. Si Supabase está conectado, sincronizar en la nube
      if (isConnected && supabase) {
        await supabase
          .from('employees')
          .update({ code: newPin, has_custom_pin: true })
          .eq('id', employeeId);
      }

      return true;
    } catch (err) {
      console.error('Error registrando PIN:', err);
      return false;
    }
  };

  // Manejador de Marcación (Entrada / Salida)
  const handlePunch = async (payload: {
    employeeId: string;
    action: 'in' | 'out';
    attendanceId?: string;
    minutesLate: number;
    notes?: string;
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
      // Modo Local con persistencia en dispositivo
      if (payload.action === 'in') {
        const newRecord: Attendance = {
          id: `att-${Date.now()}`,
          employee_id: payload.employeeId,
          clock_in: nowIso,
          clock_out: null,
          auto_closed: false,
          minutes_late: payload.minutesLate,
          notes: payload.notes || null,
        };
        const updated = [newRecord, ...attendances];
        setAttendances(updated);
        saveLocalAttendance(updated);
      } else {
        const updated = attendances.map((a) => {
          if (a.id === payload.attendanceId || (a.employee_id === payload.employeeId && !a.clock_out)) {
            return { ...a, clock_out: nowIso };
          }
          return a;
        });
        setAttendances(updated);
        saveLocalAttendance(updated);
      }
      return true;
    }
  };

  // Guardar Empleado desde Admin
  const handleSaveEmployee = async (newEmp: Employee) => {
    const updated = [...employees, newEmp];
    setEmployees(updated);
    saveLocalEmployees(updated);

    if (isConnected && supabase) {
      try {
        await supabase.from('employees').upsert({
          id: newEmp.id,
          name: newEmp.name,
          code: newEmp.code,
          has_custom_pin: newEmp.has_custom_pin,
          role: newEmp.role,
          area: newEmp.area,
          avatar_color: newEmp.avatar_color,
          active: newEmp.active,
        });
      } catch (e) {
        console.error('Error guardando en Supabase:', e);
      }
    }
  };

  // Eliminar Empleado
  const handleDeleteEmployee = async (id: string) => {
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    saveLocalEmployees(updated);

    if (isConnected && supabase) {
      try {
        await supabase.from('employees').delete().eq('id', id);
      } catch (e) {
        console.error('Error eliminando en Supabase:', e);
      }
    }
  };

  // Guardar Horario
  const handleSaveSchedule = async (sch: Schedule) => {
    const filtered = schedules.filter(
      (s) => !(s.employee_id === sch.employee_id && s.day_of_week === sch.day_of_week)
    );
    const updated = [...filtered, sch];
    setSchedules(updated);
    saveLocalSchedules(updated);

    if (isConnected && supabase) {
      try {
        await supabase.from('schedules').upsert({
          id: sch.id,
          employee_id: sch.employee_id,
          day_of_week: sch.day_of_week,
          start_time: sch.start_time,
          end_time: sch.end_time,
          tolerance_minutes: sch.tolerance_minutes,
          is_active: sch.is_active,
        });
      } catch (e) {
        console.error('Error guardando horario en Supabase:', e);
      }
    }
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

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin text-2xl mr-2">⏳</div>
        Cargando sistema de asistencia...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <ClockHeader
        storeName={config.store_name}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isSupabaseConnected={isConnected}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-md w-full mx-auto p-3 sm:p-4 flex flex-col gap-4 pb-12">
        <section aria-label="Terminal de Marcación">
          <KioskMode
            employees={employees}
            attendances={attendances}
            schedules={schedules}
            onPunch={handlePunch}
            onRegisterPin={handleRegisterPin}
          />
        </section>

        <section aria-label="Historial del Día">
          <TodayFeed attendances={attendances} employees={employees} />
        </section>
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
