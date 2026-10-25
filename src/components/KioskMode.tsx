'use client';

import { useState } from 'react';
import { Search, UserCheck, KeyRound, Play, Square, Check, Clock, UtensilsCrossed, Sparkles } from 'lucide-react';
import { Employee, Attendance, Schedule } from '@/types/database';
import PunchModal from './PunchModal';
import PinPad from './PinPad';
import { playSound, triggerVibration } from '@/lib/sound';

interface KioskModeProps {
  employees: Employee[];
  attendances: Attendance[];
  schedules: Schedule[];
  onPunch: (payload: {
    employeeId: string;
    action: 'in' | 'out';
    attendanceId?: string;
    minutesLate: number;
    notes?: string;
  }) => Promise<boolean>;
  onRegisterPin: (employeeId: string, newPin: string) => Promise<boolean>;
}

export default function KioskMode({
  employees,
  attendances,
  schedules,
  onPunch,
  onRegisterPin,
}: KioskModeProps) {
  const [mode, setMode] = useState<'picker' | 'pin'>('picker');
  const [areaFilter, setAreaFilter] = useState<'Todos' | 'Cocina' | 'Salón'>('Todos');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Modo teclado directo
  const [directPin, setDirectPin] = useState('');
  const [directPinError, setDirectPinError] = useState('');

  // Mapear asistencias activas
  const activeAttendanceMap = new Map<string, Attendance>();
  attendances.forEach((att) => {
    if (!att.clock_out) {
      activeAttendanceMap.set(att.employee_id, att);
    }
  });

  // Mapear horarios de hoy (0 = Domingo, 1 = Lunes, ...)
  const currentDayOfWeek = new Date().getDay();
  const todaySchedulesMap = new Map<string, Schedule>();
  schedules
    .filter((s) => s.day_of_week === currentDayOfWeek && s.is_active)
    .forEach((s) => todaySchedulesMap.set(s.employee_id, s));

  // Filtrado por área y búsqueda
  const filteredEmployees = employees
    .filter((e) => e.active)
    .filter((e) => (areaFilter === 'Todos' ? true : e.area === areaFilter))
    .filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.role.toLowerCase().includes(search.toLowerCase()) ||
        (e.code && e.code.includes(search))
    );

  const handleDirectPinSubmit = () => {
    const matched = employees.find((e) => e.active && e.has_custom_pin && e.code === directPin);
    if (matched) {
      setDirectPin('');
      setDirectPinError('');
      setSelectedEmployee(matched);
    } else {
      playSound('error');
      triggerVibration([80, 80, 80]);
      setDirectPinError('Código no reconocido o aún no has grabado tu contraseña. Selecciona tu nombre en la pestaña.');
      setDirectPin('');
    }
  };

  const countCocina = employees.filter((e) => e.area === 'Cocina').length;
  const countSalon = employees.filter((e) => e.area === 'Salón').length;

  return (
    <div className="w-full">
      {/* Selector de Modo: Seleccionar Nombre vs Código Directo */}
      <div className="bg-slate-900/90 p-1 rounded-2xl border border-slate-800 flex items-center mb-3 shadow-sm">
        <button
          type="button"
          onClick={() => {
            playSound('click');
            setMode('picker');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'picker'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Seleccionar Mi Nombre
        </button>

        <button
          type="button"
          onClick={() => {
            playSound('click');
            setMode('pin');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mode === 'pin'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Tengo mi PIN
        </button>
      </div>

      {/* MODO 1: SELECCIONAR EMPLEADO */}
      {mode === 'picker' && (
        <div>
          {/* Píldoras de filtrado por área: Cocina vs Salón */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setAreaFilter('Todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                areaFilter === 'Todos'
                  ? 'bg-slate-700 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Todos ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setAreaFilter('Cocina')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                areaFilter === 'Cocina'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🔥 Cocina ({countCocina})
            </button>
            <button
              type="button"
              onClick={() => setAreaFilter('Salón')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                areaFilter === 'Salón'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              🍽️ Salón ({countSalon})
            </button>
          </div>

          {/* Buscador de personal */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o puesto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
            />
          </div>

          {/* Lista de colaboradores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[58vh] overflow-y-auto pr-1">
            {filteredEmployees.map((emp) => {
              const activeAtt = activeAttendanceMap.get(emp.id);
              const isWorking = Boolean(activeAtt);
              const schedule = todaySchedulesMap.get(emp.id);

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    triggerVibration(30);
                    setSelectedEmployee(emp);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all active:scale-[0.98] shadow-sm flex items-center justify-between gap-3 ${
                    isWorking
                      ? 'bg-slate-900/95 border-emerald-500/40 hover:border-emerald-500/70 shadow-emerald-950/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-md border border-white/20 relative"
                      style={{ backgroundColor: emp.avatar_color || '#3b82f6' }}
                    >
                      {emp.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}

                      {isWorking && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate leading-snug">
                          {emp.name}
                        </p>
                        {!emp.has_custom_pin && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded shrink-0">
                            <Sparkles className="w-2.5 h-2.5" /> Nuevo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{emp.role}</p>
                      {schedule ? (
                        <p className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          Hoy: {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Hoy: Descanso programado
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Estado / Botón rápido de acción */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {isWorking ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                        <Square className="w-3 h-3 fill-current" />
                        Salida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                        <Play className="w-3 h-3 fill-current" />
                        Entrada
                      </span>
                    )}
                    {isWorking && activeAtt && (
                      <span className="text-[10px] text-emerald-400/90 font-mono">
                        {new Date(activeAtt.clock_in).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs bg-slate-900/40 rounded-3xl border border-slate-800">
              No se encontraron colaboradores con ese nombre o área.
            </div>
          )}
        </div>
      )}

      {/* MODO 2: TECLADO DIRECTO */}
      {mode === 'pin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-center">
          <h3 className="text-sm font-bold text-white mb-1">Marcación con Código PIN</h3>
          <p className="text-xs text-slate-400 mb-3">
            Ingresa tu código PIN de 4 dígitos para marcar
          </p>

          {directPinError && (
            <div className="mb-3 p-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium">
              {directPinError}
            </div>
          )}

          <PinPad
            value={directPin}
            onChange={(val) => {
              setDirectPin(val);
              setDirectPinError('');
            }}
            onSubmit={handleDirectPinSubmit}
          />
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN / PRIMER REGISTRO */}
      {selectedEmployee && (
        <PunchModal
          employee={selectedEmployee}
          todayAttendance={activeAttendanceMap.get(selectedEmployee.id) || null}
          schedule={todaySchedulesMap.get(selectedEmployee.id) || null}
          onClose={() => setSelectedEmployee(null)}
          onPunch={onPunch}
          onRegisterPin={onRegisterPin}
        />
      )}
    </div>
  );
}
