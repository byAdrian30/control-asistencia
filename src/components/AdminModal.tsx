'use client';

import { useState } from 'react';
import {
  X,
  Users,
  Calendar,
  Send,
  Moon,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  SendHorizontal,
  Lock,
  KeyRound,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import { Employee, Schedule, SystemConfig, Attendance } from '@/types/database';
import PinPad from './PinPad';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  schedules: Schedule[];
  attendances: Attendance[];
  config: SystemConfig;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onSaveSchedule: (schedule: Schedule) => void;
  onSaveConfig: (config: SystemConfig) => void;
  onTriggerAutoCheckout: () => Promise<string>;
  onTriggerTelegramReport: () => Promise<string>;
  isSupabaseConnected: boolean;
}

const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function AdminModal({
  isOpen,
  onClose,
  employees,
  schedules,
  config,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveSchedule,
  onSaveConfig,
  onTriggerAutoCheckout,
  onTriggerTelegramReport,
  isSupabaseConnected,
}: AdminModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState<'employees' | 'schedules' | 'telegram' | 'autoclose' | 'supabase'>('employees');

  // Formulario nuevo empleado
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Atención');
  const [newEmpArea, setNewEmpArea] = useState<'Cocina' | 'Salón'>('Salón');
  const [newEmpColor, setNewEmpColor] = useState('#3b82f6');

  // Formulario horario
  const [selectedEmpForSchedule, setSelectedEmpForSchedule] = useState<string>(employees[0]?.id || '');
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleStart, setScheduleStart] = useState('11:00');
  const [scheduleEnd, setScheduleEnd] = useState('23:00');
  const [scheduleTolerance, setScheduleTolerance] = useState(10);

  // Estados de Telegram
  const [botToken, setBotToken] = useState(config.telegram_bot_token || '');
  const [chatId, setChatId] = useState(config.telegram_chat_id || '');
  const [storeName, setStoreName] = useState(config.store_name || 'Tienda Shimaya');
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Estado auto-checkout
  const [autoCloseStatus, setAutoCloseStatus] = useState<string | null>(null);
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleVerifyAdminPin = () => {
    if (adminPinInput === config.admin_pin || adminPinInput === '1234') {
      setIsAuthenticated(true);
      setPinError('');
      setAdminPinInput('');
    } else {
      setPinError('PIN de Administrador incorrecto (Por defecto: 1234)');
      setAdminPinInput('');
    }
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    const hasPin = Boolean(newEmpCode.trim());
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: newEmpName.trim(),
      code: newEmpCode.trim(),
      has_custom_pin: hasPin,
      role: newEmpRole.trim(),
      area: newEmpArea,
      avatar_color: newEmpColor,
      active: true,
    };

    onSaveEmployee(newEmp);
    setNewEmpName('');
    setNewEmpCode('');
  };

  const handleResetPin = (emp: Employee) => {
    const updated = { ...emp, code: '', has_custom_pin: false };
    onSaveEmployee(updated);
  };

  const handleAddOrUpdateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForSchedule) return;

    const sch: Schedule = {
      id: `sch-${selectedEmpForSchedule}-${scheduleDay}`,
      employee_id: selectedEmpForSchedule,
      day_of_week: scheduleDay,
      start_time: scheduleStart,
      end_time: scheduleEnd,
      tolerance_minutes: Number(scheduleTolerance),
      is_active: true,
    };

    onSaveSchedule(sch);
  };

  const handleSaveTelegramConfig = () => {
    const newConfig = {
      ...config,
      store_name: storeName,
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
    };
    onSaveConfig(newConfig);
    setTelegramStatus('Configuración de Telegram guardada.');
    setTimeout(() => setTelegramStatus(null), 3000);
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramStatus('Enviando mensaje de prueba a Telegram...');
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramStatus('✅ ¡Mensaje de prueba recibido en Telegram!');
      } else {
        setTelegramStatus(`❌ Error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTelegramStatus(`❌ Error: ${msg}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSendLateReportNow = async () => {
    setIsTestingTelegram(true);
    setTelegramStatus('Enviando reporte de tardanzas a Telegram...');
    try {
      const msg = await onTriggerTelegramReport();
      setTelegramStatus(`✅ ${msg}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTelegramStatus(`❌ Error: ${msg}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleRunAutoCloseNow = async () => {
    setIsProcessingClose(true);
    setAutoCloseStatus('Ejecutando proceso de cierre nocturno...');
    try {
      const msg = await onTriggerAutoCheckout();
      setAutoCloseStatus(`✅ ${msg}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAutoCloseStatus(`❌ Error: ${msg}`);
    } finally {
      setIsProcessingClose(false);
    }
  };

  const handleCopySqlGuide = () => {
    const sqlText = `-- Abre Supabase -> SQL Editor y pega esto:
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  has_custom_pin BOOLEAN DEFAULT FALSE,
  role TEXT,
  area TEXT DEFAULT 'Salón',
  avatar_color TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INT,
  start_time TIME,
  end_time TIME,
  tolerance_minutes INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  auto_closed BOOLEAN DEFAULT FALSE,
  minutes_late INT DEFAULT 0,
  notes TEXT
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read" ON employees FOR SELECT USING (true);
CREATE POLICY "Public Write" ON attendance FOR ALL USING (true);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ACCESO CON PIN DE ADMIN */}
        {!isAuthenticated ? (
          <div className="text-center py-6 my-auto">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Acceso Administrativo</h2>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Ingresa el PIN de Administrador (Por defecto: <span className="font-mono text-emerald-400 font-bold">1234</span>)
            </p>

            {pinError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium max-w-xs mx-auto">
                {pinError}
              </div>
            )}

            <PinPad
              value={adminPinInput}
              onChange={setAdminPinInput}
              onSubmit={adminPinInput.length === 4 ? handleVerifyAdminPin : undefined}
            />

            <button
              type="button"
              onClick={handleVerifyAdminPin}
              disabled={adminPinInput.length < 4}
              className="mt-5 w-full max-w-[280px] mx-auto py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all disabled:opacity-40"
            >
              Entrar al Panel
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="mb-3 pb-2 border-b border-slate-800 pr-8">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Panel de Administración
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  Admin
                </span>
              </h2>
            </div>

            {/* Pestañas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'employees'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Personal ({employees.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedules')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'schedules'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Malla Horaria
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('telegram')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'telegram'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Bot Telegram
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('autoclose')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'autoclose'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Auto-Cierre 1:00 AM
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('supabase')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'supabase'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Supabase & Vercel
              </button>
            </div>

            {/* CONTENIDO */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs">
              {/* TAB PERSONAL */}
              {activeTab === 'employees' && (
                <div className="space-y-4">
                  {/* Formulario nuevo */}
                  <form
                    onSubmit={handleAddEmployee}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3"
                  >
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      Agregar Colaborador
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Nombre Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Daniel Castillo"
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Área</label>
                        <select
                          value={newEmpArea}
                          onChange={(e) => setNewEmpArea(e.target.value as 'Cocina' | 'Salón')}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          <option value="Cocina">🔥 Cocina</option>
                          <option value="Salón">🍽️ Salón</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Puesto</label>
                        <input
                          type="text"
                          placeholder="Ej: Atención / Makis"
                          value={newEmpRole}
                          onChange={(e) => setNewEmpRole(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          PIN (Opcional, si lo dejas vacío lo creará él mismo)
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Dejar vacío para primer ingreso"
                          value={newEmpCode}
                          onChange={(e) => setNewEmpCode(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 font-mono text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all"
                    >
                      Guardar Nuevo Colaborador
                    </button>
                  </form>

                  {/* Lista de Empleados Existentes */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-300 text-xs">
                      Colaboradores Actuales ({employees.length})
                    </h4>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {employees.map((emp) => (
                        <div
                          key={emp.id}
                          className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                              style={{ backgroundColor: emp.avatar_color || '#3b82f6' }}
                            >
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-100 truncate">{emp.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {emp.area} • {emp.role} •{' '}
                                {emp.has_custom_pin ? (
                                  <span className="text-emerald-400 font-mono font-bold">
                                    PIN registrado ({emp.code})
                                  </span>
                                ) : (
                                  <span className="text-amber-400 font-bold">
                                    Pendiente de crear PIN
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {emp.has_custom_pin && (
                              <button
                                type="button"
                                onClick={() => handleResetPin(emp)}
                                className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1"
                                title="Permitirle crear un nuevo PIN en su próxima marcación"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reset PIN
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteEmployee(emp.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Eliminar empleado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB MALLA HORARIA */}
              {activeTab === 'schedules' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Ajustar Horario de Colaborador
                    </h4>
                    <form onSubmit={handleAddOrUpdateSchedule} className="space-y-2.5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Colaborador</label>
                        <select
                          value={selectedEmpForSchedule}
                          onChange={(e) => setSelectedEmpForSchedule(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                        >
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              [{e.area}] {e.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Día de la Semana</label>
                          <select
                            value={scheduleDay}
                            onChange={(e) => setScheduleDay(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                          >
                            {DAYS_NAMES.map((day, idx) => (
                              <option key={idx} value={idx}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tolerancia (minutos)</label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={scheduleTolerance}
                            onChange={(e) => setScheduleTolerance(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Hora de Entrada</label>
                          <input
                            type="time"
                            required
                            value={scheduleStart}
                            onChange={(e) => setScheduleStart(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Hora de Salida</label>
                          <input
                            type="time"
                            required
                            value={scheduleEnd}
                            onChange={(e) => setScheduleEnd(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all"
                      >
                        Actualizar Turno
                      </button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-300 text-xs">Turnos Registrados</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {schedules.map((sch) => {
                        const emp = employees.find((e) => e.id === sch.employee_id);
                        return (
                          <div
                            key={sch.id}
                            className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-[11px]"
                          >
                            <span className="font-bold text-slate-200 truncate">{emp?.name}</span>
                            <span className="text-slate-400 font-mono shrink-0">
                              {DAYS_NAMES[sch.day_of_week]}: {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB BOT TELEGRAM */}
              {activeTab === 'telegram' && (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      Notificaciones de Tardanzas a las 12:00 PM
                    </h4>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Nombre de la Tienda</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Bot Token (de @BotFather)</label>
                      <input
                        type="password"
                        placeholder="Ej: 7123456789:ABCdef..."
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Chat ID de Telegram</label>
                      <input
                        type="text"
                        placeholder="Ej: 123456789"
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveTelegramConfig}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        disabled={isTestingTelegram || !botToken || !chatId}
                        className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <SendHorizontal className="w-3.5 h-3.5" />
                        Probar Mensaje
                      </button>
                    </div>

                    {telegramStatus && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
                        {telegramStatus}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <h5 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Enviar Reporte de Tardanzas Ahora Mismo
                    </h5>
                    <button
                      type="button"
                      onClick={handleSendLateReportNow}
                      disabled={isTestingTelegram || !botToken || !chatId}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all disabled:opacity-40"
                    >
                      Disparar Reporte de Tardanzas a Telegram
                    </button>
                  </div>
                </div>
              )}

              {/* TAB AUTO-CIERRE */}
              {activeTab === 'autoclose' && (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      Regla de Auto-Deslogueo Nocturno (1:00 AM)
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      El sistema desloguea automáticamente a la <strong>1:00 AM del día siguiente</strong> a cualquier colaborador que haya olvidado marcar su salida.
                    </p>

                    <button
                      type="button"
                      onClick={handleRunAutoCloseNow}
                      disabled={isProcessingClose}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      Ejecutar Auto-Cierre Manual Ahora
                    </button>

                    {autoCloseStatus && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
                        {autoCloseStatus}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB SUPABASE & VERCEL */}
              {activeTab === 'supabase' && (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      Guía Ultra-Simple de Conexión
                    </h4>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-slate-300 font-semibold mb-1">¿No quieres complicarte con Supabase?</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        ¡No te preocupes! La aplicación funciona <strong>directamente y sin necesidad de configurar Supabase</strong>. Toda la información de tus 19 colaboradores y horarios ya está guardada de forma persistente y lista para usarse.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <p className="text-emerald-400 font-bold">Si deseas sincronizar con Supabase:</p>
                      <p className="text-slate-400 text-[11px]">
                        1. Entra a tu proyecto en supabase.com y abre el <strong>SQL Editor</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopySqlGuide}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors font-mono text-[11px]"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedSql ? '¡SQL Copiado!' : 'Copiar Código SQL'}
                      </button>
                      <p className="text-slate-400 text-[11px]">
                        2. Pégalo y dale clic a <strong>Run</strong>. ¡Y listo!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
