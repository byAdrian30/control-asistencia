'use client';

import { Delete, RotateCcw } from 'lucide-react';
import { playSound, triggerVibration } from '@/lib/sound';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
}

export default function PinPad({
  value,
  onChange,
  onSubmit,
  maxLength = 4,
}: PinPadProps) {
  const handleDigit = (digit: string) => {
    if (value.length < maxLength) {
      playSound('click');
      triggerVibration(20);
      const nextVal = value + digit;
      onChange(nextVal);
      if (nextVal.length === maxLength && onSubmit) {
        setTimeout(onSubmit, 100);
      }
    }
  };

  const handleBackspace = () => {
    if (value.length > 0) {
      playSound('click');
      triggerVibration(20);
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    playSound('click');
    triggerVibration(30);
    onChange('');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="w-full max-w-[280px] mx-auto select-none">
      {/* Indicador de dígitos */}
      <div className="flex justify-center gap-3 mb-4">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
              i < value.length
                ? 'bg-emerald-500 border-emerald-400 scale-110 shadow-sm shadow-emerald-500/50'
                : 'border-slate-600 bg-slate-800/60'
            }`}
          />
        ))}
      </div>

      {/* Grid del Teclado Numérico */}
      <div className="grid grid-cols-3 gap-2.5">
        {keys.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num)}
            className="h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-600 active:text-white text-slate-100 font-bold text-2xl shadow-sm border border-slate-700/60 transition-all flex items-center justify-center active:scale-95 touch-manipulation"
          >
            {num}
          </button>
        ))}

        {/* Botón Borrar Todo */}
        <button
          type="button"
          onClick={handleClear}
          className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 text-slate-400 font-medium text-xs shadow-sm border border-slate-800 transition-all flex flex-col items-center justify-center active:scale-95 touch-manipulation"
          title="Borrar todo"
        >
          <RotateCcw className="w-5 h-5 text-slate-400 mb-0.5" />
          <span>Limpiar</span>
        </button>

        {/* Dígito 0 */}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-emerald-600 active:text-white text-slate-100 font-bold text-2xl shadow-sm border border-slate-700/60 transition-all flex items-center justify-center active:scale-95 touch-manipulation"
        >
          0
        </button>

        {/* Botón Retroceso (Backspace) */}
        <button
          type="button"
          onClick={handleBackspace}
          className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 text-slate-400 font-medium text-xs shadow-sm border border-slate-800 transition-all flex flex-col items-center justify-center active:scale-95 touch-manipulation"
          title="Retroceder"
        >
          <Delete className="w-5 h-5 text-slate-400 mb-0.5" />
          <span>Borrar</span>
        </button>
      </div>
    </div>
  );
}
