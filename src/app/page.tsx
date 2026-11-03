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
import { getPeruDateTime } from '@/lib/late-calculator';
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
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  const isConnected = isSupabaseConfigured();

  // Cargar datos
  const loadData = useCallback(async () => {
    setIsRefreshing(true);

    // Detección y auto-cierre automático de jornadas huérfanas de días anteriores (después de la 1:00 AM)
    const peruNow = new Date();
    const todayPeruDateStr = peruNow.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    let hasOrphanedClosures = false;

    // Filtrar marcaciones accidentales o de colaboradores excluidos
    const sanitizeAtts = (list: Attendance[]) => {
      return list
        .filter((a) => {
          if (a.employee_id === 'emp-salon-8' || a.employee_id === 'emp-cocina-1' || a.employee_id === 'emp-salon-1') {
            return false;
          }
          return true;
        })
        .map((a) => {
          // Si una marcación no tiene salida y es de un día anterior en Perú
          if (!a.clock_out && a.clock_in) {
            const punchDateStr = new Date(a.clock_in).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
            if (punchDateStr < todayPeruDateStr) {
              hasOrphanedClosures = true;
              const closeDate = new Date(a.clock_in);
              closeDate.setHours(closeDate.getHours() + 12);
              return {
                ...a,
                clock_out: closeDate.toISOString(),
                auto_closed: true,
                notes: a.notes
                  ? `${a.notes} | Cierre auto 1:00 AM`
                  : 'Cierre automático a la 1:00 AM (Personal no marcó salida)',
              };
            }
          }
          return a;
        });
    };

    const sanitizeEmps = (list: Employee[]) =>
      list.filter(
        (e: Employee) =>
          e.id !== 'emp-cocina-1' &&
          e.id !== 'emp-salon-1' &&
          e.id !== 'emp-salon-8' &&
          !e.name?.toLowerCase().includes('raquel')
      );

    // 1. Cargar estado local inmediato para evitar parpadeos
    let loadedEmps = sanitizeEmps(getLocalEmployees());
    let loadedAtts = sanitizeAtts(getLocalAttendance());
    let loadedSchs = getLocalSchedules();
    const initialLocalConfig = getLocalConfig();

    setEmployees(loadedEmps);
    setAttendances(loadedAtts);
    setSchedules(loadedSchs);
    setConfig(initialLocalConfig);

    // 2. Sincronización atómica central con la nube (/api/sync)
    try {
      const syncRes = await fetch('/api/sync', { cache: 'no-store' });
      if (syncRes.ok) {
        const cloudState = await syncRes.json();
        if (cloudState) {
          if (Array.isArray(cloudState.employees) && cloudState.employees.length > 0) {
            loadedEmps = sanitizeEmps(cloudState.employees);
            setEmployees(loadedEmps);
            saveLocalEmployees(loadedEmps);
          }

          if (Array.isArray(cloudState.schedules) && cloudState.schedules.length > 0) {
            loadedSchs = cloudState.schedules.filter(
              (s: Schedule) =>
                s.employee_id !== 'emp-cocina-1' &&
                s.employee_id !== 'emp-salon-1' &&
                s.employee_id !== 'emp-salon-8'
            );
            setSchedules(loadedSchs);
            saveLocalSchedules(loadedSchs);
          }

          if (Array.isArray(cloudState.attendances)) {
            loadedAtts = sanitizeAtts(
              cloudState.attendances.filter(
                (a: Attendance) =>
                  a.employee_id !== 'emp-cocina-1' &&
                  a.employee_id !== 'emp-salon-1' &&
                  a.employee_id !== 'emp-salon-8'
              )
            );
            setAttendances(loadedAtts);
            saveLocalAttendance(loadedAtts);
          }

          if (cloudState.config) {
            setConfig(cloudState.config);
            saveLocalConfig(cloudState.config);
          }
        }
      }
    } catch (err) {
      console.warn('Sync cloud error:', err);
    }

    // 3. Si Supabase está configurado, sincronizar también
    if (isConnected && supabase) {
      try {
        const { data: emps, error: empErr } = await supabase
          .from('employees')
          .select('*')
          .order('name');
        if (!empErr && emps && emps.length > 0) {
          loadedEmps = sanitizeEmps(emps);
          setEmployees(loadedEmps);
          saveLocalEmployees(loadedEmps);
        }

        const { data: atts } = await supabase
          .from('attendance')
          .select('*')
          .order('clock_in', { ascending: false })
          .limit(300);
        if (atts && atts.length > 0) {
          const merged = sanitizeAtts(atts);
          setAttendances(merged);
          saveLocalAttendance(merged);
          if (hasOrphanedClosures) {
            fetch('/api/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ attendances: merged }),
            }).catch(() => {});
          }
        }

        const { data: schs } = await supabase.from('schedules').select('*');
        if (schs && schs.length > 0) {
          loadedSchs = schs.filter(
            (s: Schedule) =>
              s.employee_id !== 'emp-cocina-1' &&
              s.employee_id !== 'emp-salon-1' &&
              s.employee_id !== 'emp-salon-8'
          );
          setSchedules(loadedSchs);
          saveLocalSchedules(loadedSchs);
        }
      } catch (err) {
        console.error('Supabase fetch error:', err);
      }
    }

    // Detectar si este celular ya está vinculado a un colaborador
    const curDevId = getOrCreateDeviceId();
    const curDevDesc = getDeviceDescription();
    setDeviceId(curDevId);
    setDeviceDesc(curDevDesc);

    const storedBoundId = getStoredBoundEmployeeId();
    let matched = loadedEmps.find(
      (e) => (storedBoundId && e.id === storedBoundId) || (e.registered_device_id && e.registered_device_id === curDevId)
    );

    // Fallback inteligente: Si este equipo ya marcó asistencia hoy, asociarlo automáticamente
    if (!matched) {
      const todayAtt = loadedAtts.find((a) => a.device_id === curDevId);
      if (todayAtt) {
        matched = loadedEmps.find((e) => e.id === todayAtt.employee_id);
        if (matched) {
          setStoredBoundEmployeeId(matched.id);
        }
      }
    }

    setBoundEmployee(matched || null);
    setIsRefreshing(false);
  }, [isConnected]);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      setIsMobileScreen(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    loadData();

    // Auto-sincronización en vivo cada 8 segundos con la nube central
    const interval = setInterval(() => {
      loadData();
    }, 8000);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, [loadData]);

  const handleQuickSelectEmployee = (emp: Employee) => {
    setBoundEmployee(emp);
    setStoredBoundEmployeeId(emp.id);
  };

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
            biometric_enrolled: false,
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

      // Persistir de inmediato en la base de datos central en la nube
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: updatedEmps }),
      }).catch(() => {});

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
    const newRecordId = payload.attendanceId || `att-${Date.now()}`;

    try {
      if (payload.action === 'in') {
        const newRecord: Attendance = {
          id: newRecordId,
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

        // 1. Actualización inmediata en UI y almacenamiento local
        const updated = [newRecord, ...attendances.filter((a) => a.id !== newRecordId)];
        setAttendances(updated);
        saveLocalAttendance(updated);

        // Guardar este dispositivo como terminal personal del colaborador
        setStoredBoundEmployeeId(payload.employeeId);

        // Vincular automáticamente el dispositivo si aún no estaba enlazado
        const empToUpdate = employees.find((e) => e.id === payload.employeeId);
        if (empToUpdate && empToUpdate.registered_device_id !== deviceId) {
          const updatedEmps = employees.map((e) =>
            e.id === payload.employeeId
              ? {
                  ...e,
                  registered_device_id: deviceId,
                  registered_device_name: deviceDesc,
                  registered_device_at: nowIso,
                }
              : e
          );
          setEmployees(updatedEmps);
          saveLocalEmployees(updatedEmps);
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employees: updatedEmps }),
          }).catch(() => {});

          if (isConnected && supabase) {
            (async () => {
              try {
                await supabase
                  .from('employees')
                  .update({
                    registered_device_id: deviceId,
                    registered_device_name: deviceDesc,
                    registered_device_at: nowIso,
                  })
                  .eq('id', payload.employeeId);
              } catch {}
            })();
          }
        }

        // 2. Notificación y guardado en API central (Telegram + Gist + Supabase)
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord),
        }).catch((e) => console.warn('API attendance dispatch error:', e));

        // 3. Réplica directa a Supabase con ID garantizado
        if (isConnected && supabase) {
          (async () => {
            try {
              const { error } = await supabase
                .from('attendance')
                .upsert(
                  {
                    id: newRecordId,
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
                    verified_by_biometrics: true,
                  },
                  { onConflict: 'id' }
                );
              if (error) console.warn('Supabase direct punch warning:', error.message);
            } catch (sbErr) {
              console.warn('Supabase async punch exception:', sbErr);
            }
          })();
        }
      } else {
        // Marcación de Salida
        const targetId = payload.attendanceId;
        const updated = attendances.map((a) => {
          if (a.id === targetId || (a.employee_id === payload.employeeId && !a.clock_out)) {
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

        const updatedRecord = updated.find(
          (a) => a.id === targetId || (a.employee_id === payload.employeeId && a.clock_out === nowIso)
        );

        if (updatedRecord) {
          fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRecord),
          }).catch((e) => console.warn('API attendance dispatch error:', e));

          if (isConnected && supabase) {
            (async () => {
              try {
                const { error } = await supabase
                  .from('attendance')
                  .update({
                    clock_out: nowIso,
                    clock_out_lat: payload.lat || null,
                    clock_out_lng: payload.lng || null,
                  })
                  .eq('id', updatedRecord.id);
                if (error) console.warn('Supabase direct clock-out warning:', error.message);
              } catch (sbErr) {
                console.warn('Supabase async clock-out exception:', sbErr);
              }
            })();
          }
        }
      }
      return true;
    } catch (err) {
      console.error('Error procesando marcación:', err);
      return true;
    }
  };

  // Actualizar marcación (hora de ingreso / salida / notas / tardanza) desde el Panel Admin
  const handleUpdateAttendance = async (updatedAtt: Attendance) => {
    let updated = attendances.map((a) => (a.id === updatedAtt.id ? updatedAtt : a));
    if (!attendances.some((a) => a.id === updatedAtt.id)) {
      updated = [updatedAtt, ...attendances];
    }
    setAttendances(updated);
    saveLocalAttendance(updated);

    // 1. Sincronizar en Gist central
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendances: updated }),
    }).catch(() => {});

    // 2. Persistir en Supabase
    if (isConnected && supabase) {
      try {
        await supabase.from('attendance').upsert(
          {
            id: updatedAtt.id,
            employee_id: updatedAtt.employee_id,
            clock_in: updatedAtt.clock_in,
            clock_out: updatedAtt.clock_out || null,
            auto_closed: updatedAtt.auto_closed || false,
            minutes_late: updatedAtt.minutes_late || 0,
            notes: updatedAtt.notes || null,
            device_id: updatedAtt.device_id || null,
            device_name: updatedAtt.device_name || null,
            verified_by_gps: updatedAtt.verified_by_gps !== false,
            verified_by_device: updatedAtt.verified_by_device !== false,
            verified_by_biometrics: !!updatedAtt.verified_by_biometrics,
          },
          { onConflict: 'id' }
        );
      } catch (err) {
        console.error('Error al actualizar marcación en Supabase:', err);
      }
    }
  };

  // Eliminar marcación (en caso de registro erróneo o accidental)
  const handleDeleteAttendance = async (attendanceId: string) => {
    const updated = attendances.filter((a) => a.id !== attendanceId);
    setAttendances(updated);
    saveLocalAttendance(updated);

    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendances: updated }),
    }).catch(() => {});

    if (isConnected && supabase) {
      try {
        await supabase.from('attendance').delete().eq('id', attendanceId);
      } catch (err) {
        console.error('Error al eliminar marcación en Supabase:', err);
      }
    }
  };

  const handleSaveEmployee = async (newEmp: Employee) => {
    const updated = [...employees.filter((e) => e.id !== newEmp.id), newEmp];
    setEmployees(updated);
    saveLocalEmployees(updated);

    if (boundEmployee && boundEmployee.id === newEmp.id) {
      setBoundEmployee(newEmp);
    }

    // Persistir atómicamente a la nube central
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees: updated }),
    }).catch(() => {});

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
    const updatedAtts = attendances.filter((a) => a.employee_id !== id);
    const updatedSchs = schedules.filter((s) => s.employee_id !== id);

    setEmployees(updated);
    saveLocalEmployees(updated);
    setAttendances(updatedAtts);
    saveLocalAttendance(updatedAtts);
    setSchedules(updatedSchs);
    saveLocalSchedules(updatedSchs);

    if (boundEmployee && boundEmployee.id === id) {
      setBoundEmployee(null);
      clearStoredBoundEmployeeId();
    }

    // Purgar de forma permanente de la base de datos central en la nube
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employees: updated,
        attendances: updatedAtts,
        schedules: updatedSchs,
      }),
    }).catch(() => {});

    fetch(`/api/attendance?deleteEmployeeId=${id}`, { method: 'DELETE' }).catch(() => {});

    if (isConnected && supabase) {
      try {
        await supabase.from('employees').delete().eq('id', id);
        await supabase.from('attendance').delete().eq('employee_id', id);
        await supabase.from('schedules').delete().eq('employee_id', id);
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

    // Persistir horario en la nube central
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedules: updated }),
    }).catch(() => {});

    if (isConnected && supabase) {
      try {
        await supabase.from('schedules').upsert(sch);
      } catch (e) {
        console.error('Error guardando horario en Supabase:', e);
      }
    }
  };

  const handleSaveConfig = async (newConfig: SystemConfig) => {
    setConfig(newConfig);
    saveLocalConfig(newConfig);

    // Persistir configuración en la nube central
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig }),
    }).catch(() => {});

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch {
      // Ignorar si falla la sincronización de red
    }
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
          attendances,
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

  const activeEmpIds = new Set(employees.map((e) => e.id));
  const workingNowCount = attendances.filter(
    (a) => !a.clock_out && activeEmpIds.has(a.employee_id)
  ).length;
  const completedCount = attendances.filter(
    (a) => a.clock_out && activeEmpIds.has(a.employee_id)
  ).length;
  const lateCount = attendances.filter(
    (a) => (a.minutes_late || 0) > 0 && activeEmpIds.has(a.employee_id)
  ).length;

  const [currentDayOfWeek, setCurrentDayOfWeek] = useState(1);

  useEffect(() => {
    setCurrentDayOfWeek(getPeruDateTime().dayOfWeek);
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
          onUpdateAttendance={handleUpdateAttendance}
          onDeleteAttendance={handleDeleteAttendance}
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

      {/* EN MÓVIL: SELECTOR RÁPIDO PARA IR DIRECTO A SU TECLADO PIN */}
      {isMobileScreen && !forceGeneralMode ? (
        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center pb-12 animate-fade-in">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-white">Marcación Personal</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Selecciona tu nombre para ingresar tu contraseña de 4 dígitos:
            </p>

            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
              {employees
                .filter((e) => e.active)
                .map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleQuickSelectEmployee(emp)}
                    className="w-full p-3 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800/90 hover:border-emerald-500/40 flex items-center gap-3 transition-all active:scale-[0.98] text-left group shadow-sm"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm"
                      style={{ backgroundColor: emp.avatar_color || '#3b82f6' }}
                    >
                      {emp.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {emp.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {emp.role} • <span className="text-slate-300">{emp.area}</span>
                      </p>
                    </div>
                    <div className="px-2 py-1 bg-slate-900 group-hover:bg-emerald-500 group-hover:text-slate-950 rounded-lg text-[10px] text-emerald-400 font-bold border border-slate-800 shrink-0 transition-colors">
                      Marcar PIN ›
                    </div>
                  </button>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setForceGeneralMode(true)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <Monitor className="w-3.5 h-3.5" /> Ver Quiosco General de Tienda
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-5 lg:p-6 pb-12">
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
                  return await handleBindDeviceSuccess(empId, newPin);
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
      )}

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
        onUpdateAttendance={handleUpdateAttendance}
        onDeleteAttendance={handleDeleteAttendance}
        isSupabaseConnected={isConnected}
      />
    </div>
  );
}
