'use client';

import { useState, useEffect } from 'react';
import { Store, Shield, RefreshCw, Smartphone } from 'lucide-react';

interface ClockHeaderProps {
  storeName: string;
  onOpenAdmin: () => void;
  isSupabaseConnected: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function ClockHeader({
  storeName,
  onOpenAdmin,
  isSupabaseConnected,
  onRefresh,
  isRefreshing = false,
}: ClockHeaderProps) {
  const [time, setTime] = useState<string>('');
  const [seconds, setSeconds] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const secs = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');

      setTime(`${formattedHours}:${minutes} ${ampm}`);
      setSeconds(`:${secs}`);

      const options: Intl.DateTimeFormatOptions = {
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
    <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800 sticky top-0 z-30">
      {/* Barra superior con estado y ajustes */}
      <div className="max-w-md mx-auto px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
              {storeName || 'Tienda Principal'}
              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium bg-emerald-500/15 text-emerald-300 rounded border border-emerald-500/30">
                <Smartphone className="w-2.5 h-2.5 mr-0.5 inline" /> Celular Tienda
              </span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isSupabaseConnected ? 'Supabase Activo' : 'Modo Local / Demo'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Recargar datos"
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={onOpenAdmin}
            title="Panel de Administración"
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors active:scale-95"
          >
            <Shield className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Reloj Grande Centralizado */}
      <div className="max-w-md mx-auto px-4 pb-3 text-center">
        <div className="inline-flex items-baseline justify-center">
          <span className="text-4xl font-extrabold tracking-tight font-mono text-white drop-shadow-sm">
            {time || '--:-- --'}
          </span>
          <span className="text-lg font-mono text-emerald-400 font-bold ml-0.5 opacity-90">
            {seconds || ':00'}
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">
          {dateStr || 'Cargando fecha...'}
        </p>
      </div>
    </header>
  );
}
