'use client';

import { useState, useEffect } from 'react';
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
  Smartphone,
  MapPin,
  ExternalLink,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Navigation,
} from 'lucide-react';
import { Employee, Schedule, SystemConfig, Attendance } from '@/types/database';
import PinPad from './PinPad';
import { getCurrentPosition } from '@/lib/geo';

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

  // Tabs
  const [activeTab, setActiveTab] = useState<
    'links' | 'geofence' | 'employees' | 'schedules' | 'telegram' | 'autoclose' | 'supabase'
  >('links');

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
  const [storeName, setStoreName] = useState(config.store_name || 'Shimaya Ramen');
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Estados de GPS Mall Aventura (Por defecto: Mall Aventura Chiclayo)
  const [mallLat, setMallLat] = useState(config.mall_lat || -6.76329);
  const [mallLng, setMallLng] = useState(config.mall_lng || -79.86164);
  const [mallRadius, setMallRadius] = useState(config.radius_meters || 250);
  const [mallName, setMallName] = useState(config.store_location_name || 'Shimaya Ramen - Mall Aventura Chiclayo');
  const [calibratingGps, setCalibratingGps] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (config.mall_lat) setMallLat(config.mall_lat);
    if (config.mall_lng) setMallLng(config.mall_lng);
    if (config.radius_meters) setMallRadius(config.radius_meters);
    if (config.store_location_name) setMallName(config.store_location_name);
  }, [config]);

  const MALL_PRESETS = [
    {
      name: 'Mall Aventura Chiclayo (Actual)',
      lat: -6.76329,
      lng: -79.86164,
      radius: 250,
      fullName: 'Shimaya Ramen - Mall Aventura Chiclayo',
    },
    {
      name: 'Mall Aventura Santa Anita (Lima)',
      lat: -12.0558,
      lng: -76.9715,
      radius: 250,
      fullName: 'Shimaya Ramen - Mall Aventura Santa Anita',
    },
    {
      name: 'Mall Aventura SJL (Lima)',
      lat: -11.9961,
      lng: -76.9942,
      radius: 250,
      fullName: 'Shimaya Ramen - Mall Aventura SJL',
    },
    {
      name: 'Mall Aventura Arequipa',
      lat: -16.4258,
      lng: -71.5167,
      radius: 250,
      fullName: 'Shimaya Ramen - Mall Aventura Arequipa',
    },
  ];

  const handleApplyPreset = (preset: (typeof MALL_PRESETS)[0]) => {
    setMallLat(preset.lat);
    setMallLng(preset.lng);
    setMallRadius(preset.radius);
    setMallName(preset.fullName);
    const newConfig: SystemConfig = {
      ...config,
      mall_lat: preset.lat,
      mall_lng: preset.lng,
      radius_meters: preset.radius,
      store_location_name: preset.fullName,
    };
    onSaveConfig(newConfig);
    setGeoStatusMsg(`✅ Ubicación configurada a: ${preset.name}`);
    setTimeout(() => setGeoStatusMsg(null), 3500);
  };

  // Copiado de links
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<string | null>(null);

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

    const slug = newEmpName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const hasPin = Boolean(newEmpCode.trim());
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      slug: slug || `emp-${Date.now()}`,
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

  // Reset PIN
  const handleResetPin = (emp: Employee) => {
    const updated = { ...emp, code: '', has_custom_pin: false };
    onSaveEmployee(updated);
  };

  // Desvincular Celular para que pueda anexar uno nuevo
  const handleUnbindDevice = (emp: Employee) => {
    const updated = {
      ...emp,
      registered_device_id: null,
      registered_device_name: null,
      registered_device_at: null,
      biometric_enrolled: false,
    };
    onSaveEmployee(updated);
  };

  // Calibrar GPS con la ubicación actual del supervisor
  const handleCalibrateCurrentGps = async () => {
    setCalibratingGps(true);
    setGeoStatusMsg('Obteniendo coordenadas satelitales exactas...');
    try {
      const pos = await getCurrentPosition();
      setMallLat(pos.latitude);
      setMallLng(pos.longitude);
      const newConfig: SystemConfig = {
        ...config,
        mall_lat: pos.latitude,
        mall_lng: pos.longitude,
        radius_meters: mallRadius,
        store_location_name: mallName,
      };
      onSaveConfig(newConfig);
      setGeoStatusMsg(`✅ ¡Ubicación calibrada con éxito! [Lat: ${pos.latitude.toFixed(6)}, Lng: ${pos.longitude.toFixed(6)}]`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeoStatusMsg(`❌ Error: ${msg}`);
    } finally {
      setCalibratingGps(false);
    }
  };

  const handleSaveGeoSettings = () => {
    const newConfig: SystemConfig = {
      ...config,
      mall_lat: Number(mallLat),
      mall_lng: Number(mallLng),
      radius_meters: Number(mallRadius),
      store_location_name: mallName,
    };
    onSaveConfig(newConfig);
    setGeoStatusMsg('Configuración de GPS y Geovalla guardada.');
    setTimeout(() => setGeoStatusMsg(null), 3000);
  };

  const getPersonalLink = (emp: Employee) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://asistencia-tienda.vercel.app';
    return `${origin}/m/${emp.slug || emp.id}`;
  };

  const handleCopyLink = (emp: Employee) => {
    const link = getPersonalLink(emp);
    navigator.clipboard.writeText(link);
    setCopiedLinkIndex(emp.id);
    setTimeout(() => setCopiedLinkIndex(null), 2500);
  };

  const handleShareWhatsApp = (emp: Employee) => {
    const link = getPersonalLink(emp);
    const message = `Hola ${emp.name}, este es tu link personal e intransferible para marcar asistencia en Shimaya Ramen (Mall Aventura):%0A%0A${link}%0A%0AAbrelo desde tu celular para vincular tu equipo.`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-4 sm:p-6 text-white shadow-2xl relative max-h-[94vh] flex flex-col">
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
                Panel de Administración Shimaya
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                  Admin
                </span>
              </h2>
            </div>

            {/* Pestañas de Navegación */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'links'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Links Personales ({employees.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('geofence')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-all ${
                  activeTab === 'geofence'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                GPS Mall Aventura
              </button>

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
                Personal
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
            </div>

            {/* CONTENIDO DE PESTAÑAS */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs">
              {/* TAB 1: LINKS PERSONALES Y CELULARES VINCULADOS */}
              {activeTab === 'links' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                    <p className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Control de Dispositivo Único e Intransferible
                    </p>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Cada colaborador tiene su <strong>enlace personal único</strong>. La primera vez que lo abran en su celular, el sistema anexará ese teléfono y sus datos biométricos. A partir de ese momento, <strong>ningún tercero podrá marcar por ellos desde otro teléfono</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {employees.map((emp) => {
                      const link = getPersonalLink(emp);
                      const isLinked = Boolean(emp.registered_device_id);

                      return (
                        <div
                          key={emp.id}
                          className="p-3 rounded-2xl bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0"
                                style={{ backgroundColor: emp.avatar_color || '#3b82f6' }}
                              >
                                {emp.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-white truncate text-xs">{emp.name}</p>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                    {emp.area}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  {isLinked ? (
                                    <span className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                      <Smartphone className="w-3 h-3" />
                                      {emp.registered_device_name || 'Celular Vinculado'}
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                                      ⚪ Celular no vinculado (esperando 1er ingreso)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(emp)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-[11px] flex items-center gap-1 transition-all"
                                title="Copiar enlace personal"
                              >
                                {copiedLinkIndex === emp.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Link</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(emp)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                                title="Enviar enlace directo por WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </button>

                              {isLinked && (
                                <button
                                  type="button"
                                  onClick={() => handleUnbindDevice(emp)}
                                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 font-medium text-[10px] flex items-center gap-1 transition-all border border-slate-700"
                                  title="Si el colaborador cambió de celular, desvincula el anterior para que registre el nuevo"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Desvincular
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: GPS GEOVALLA (MALL AVENTURA) */}
              {activeTab === 'geofence' && (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      Geolocalización Obligatoria (Mall Aventura)
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      El sistema solo permite marcar cuando el celular del colaborador se encuentra físicamente dentro del radio de <strong>Shimaya Ramen en Mall Aventura</strong>.
                    </p>

                    {/* Presets Rápidos */}
                    <div className="pt-1">
                      <label className="text-[10px] text-slate-400 block mb-1.5 font-bold">
                        Sedes Disponibles (Seleccionar con 1 Toque):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {MALL_PRESETS.map((p) => {
                          const isSelected = Math.abs(mallLat - p.lat) < 0.001 && Math.abs(mallLng - p.lng) < 0.001;
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => handleApplyPreset(p)}
                              className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                  : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              <div>
                                <div className="text-white text-[11px] font-semibold">{p.name}</div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)} ({p.radius}m)
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Nombre del Local</label>
                        <input
                          type="text"
                          value={mallName}
                          onChange={(e) => setMallName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Radio Máximo Permitido ({mallRadius} metros)
                        </label>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          step="10"
                          value={mallRadius}
                          onChange={(e) => setMallRadius(Number(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>50m (Muy estricto)</span>
                          <span>250m (Recomendado Mall Chiclayo)</span>
                          <span>500m</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Latitud GPS</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={mallLat}
                          onChange={(e) => setMallLat(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Longitud GPS</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={mallLng}
                          onChange={(e) => setMallLng(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Botón de Calibración en 1 Clic */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCalibrateCurrentGps}
                        disabled={calibratingGps}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                      >
                        <Navigation className="w-4 h-4" />
                        {calibratingGps
                          ? 'Obteniendo GPS...'
                          : '📍 Fijar Mi Ubicación Actual como Punto Exacto de Shimaya'}
                      </button>
                      <p className="text-[10px] text-slate-400 text-center mt-1.5">
                        (Pruébalo cuando estés parado en el local para registrar el punto exacto con 1 toque).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveGeoSettings}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                    >
                      Guardar Coordenadas Manualmente
                    </button>

                    {geoStatusMsg && (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-center">
                        {geoStatusMsg}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PERSONAL */}
              {activeTab === 'employees' && (
                <div className="space-y-4">
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
                        <label className="text-[10px] text-slate-400 block mb-1">PIN Inicial (Opcional)</label>
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
                                  <span className="text-amber-400 font-bold">Sin PIN</span>
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
                                title="Resetear PIN"
                              >
                                <RotateCcw className="w-3 h-3" /> Reset PIN
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

              {/* TAB 4: MALLA HORARIA */}
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
              )}

              {/* TAB 5: TELEGRAM */}
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

              {/* TAB 6: AUTO-CIERRE */}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
