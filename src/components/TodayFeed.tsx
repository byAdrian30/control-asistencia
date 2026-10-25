'use client';

import { useState } from 'react';
import { Search, Clock, LogIn, LogOut, AlertCircle, Bot } from 'lucide-react';
import { Attendance, Employee } from '@/types/database';

interface TodayFeedProps {
  attendances: Attendance[];
  employees: Employee[];
}

export default function TodayFeed({ attendances, employees }: TodayFeedProps) {
  const [filter, setFilter] = useState('');

  const employeeMap = new Map<string, Employee>();
  employees.forEach((e) => employeeMap.set(e.id, e));

  // Ordenar los más recientes primero
  const sorted = [...attendances].sort(
    (a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime()
  );

  const filtered = sorted.filter((item) => {
    const emp = employeeMap.get(item.employee_id);
    const name = emp ? emp.name.toLowerCase() : '';
    return name.includes(filter.toLowerCase());
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Movimientos de Hoy
        </h3>
        <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-0.5 rounded-full border border-slate-700">
          {attendances.length} registro(s)
        </span>
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            {attendances.length === 0
              ? 'Aún no hay marcaciones registradas hoy.'
              : 'No se encontraron resultados con ese nombre.'}
          </div>
        ) : (
          filtered.map((record) => {
            const emp = employeeMap.get(record.employee_id);
            const empName = emp ? emp.name : 'Colaborador';
            const inTime = new Date(record.clock_in).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const outTime = record.clock_out
              ? new Date(record.clock_out).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })
              : null;

            return (
              <div
                key={record.id}
                className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: emp?.avatar_color || '#3b82f6' }}
                  >
                    {empName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-100 truncate">{empName}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-medium">
                        <LogIn className="w-3 h-3" />
                        {inTime}
                      </span>

                      {outTime && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <LogOut className="w-3 h-3 text-rose-400" />
                          {outTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges de estado / tardanza */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {record.minutes_late > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      +{record.minutes_late}m
                    </span>
                  )}

                  {record.auto_closed && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full" title="Cierre automático por no marcar salida">
                      <Bot className="w-3 h-3" />
                      Auto-cierre
                    </span>
                  )}

                  {!record.clock_out && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      En turno
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
