'use client';

import { useState, useEffect } from 'react';
import { Store, Shield, RefreshCw, Smartphone, Monitor } from 'lucide-react';

interface ClockHeaderProps {
  storeName: string;
  onOpenAdmin: () => void;
  isSupabaseConnected: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
  activeCount?: number;
  totalCount?: number;
}

export default function ClockHeader({
  storeName,
  onOpenAdmin,
  isSupabaseConnected,
  onRefresh,
  isRefreshing = false,
  activeCount = 0,
  totalCount = 19,
}: ClockHeaderProps) {
  const [time, setTime] = useState<string>('');
  const [seconds, setSeconds] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const peruParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Lima',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(now);

      const getP = (t: string) => Number(peruParts.find((p) => p.type === t)?.value ?? 0);
      let hours = getP('hour');
      if (hours === 24) hours = 0;
      const minutes = getP('minute').toString().padStart(2, '0');
      const secs = getP('second').toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');

      setTime(`${formattedHours}:${minutes} ${ampm}`);
      setSeconds(`:${secs}`);

      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Lima',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      const formattedDate = now.toLocaleDateString('es-PE', options);
      setDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900/95 backdrop-blur text-white shadow-xl border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo y Nombre de Tienda */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {storeName || 'Tienda Shimaya'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 rounded-full border border-emerald-500/30">
                    <Monitor className="w-3 h-3 mr-1" /> PC / Celular
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'
                      }`}
                    />
                    Sistema Activo • {activeCount} en turno ahora
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de acción en móvil */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Recargar datos"
                className="p-2 text-slate-300 hover:text-white bg-slate-800/90 rounded-xl transition-all active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button
                onClick={onOpenAdmin}
                title="Panel de Administración"
                className="p-2 text-amber-400 bg-slate-800/90 rounded-xl transition-all active:scale-95 border border-amber-500/20"
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reloj Digital Central / Responsivo */}
          <div className="text-center py-1 sm:py-0">
            <div className="inline-flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white drop-shadow-md">
                {time || '--:-- --'}
              </span>
              <span className="text-base sm:text-lg font-mono text-emerald-400 font-bold ml-1">
                {seconds || ':00'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              {dateStr || 'Cargando fecha...'}
            </p>
          </div>

          {/* Acciones en Desktop */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="text-right mr-2 hidden md:block">
              <p className="text-xs font-bold text-slate-200">Personal Registrado</p>
              <p className="text-[11px] text-slate-400 font-mono">19 Colaboradores</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Recargar datos"
              className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-95 border border-slate-700/60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onOpenAdmin}
              className="px-3.5 py-2 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
            >
              <Shield className="w-4 h-4" />
              Panel Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
