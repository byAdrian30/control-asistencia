'use client';

import { useState } from 'react';
import { Smartphone, ShieldCheck, KeyRound, Sparkles, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { Employee } from '@/types/database';
import PinPad from './PinPad';
import { playSound, triggerVibration } from '@/lib/sound';
import { enrollBiometricCredential } from '@/lib/biometrics';

interface DeviceBindingModalProps {
  employee: Employee;
  deviceId: string;
  deviceDesc: string;
  onClose: () => void;
  onBindSuccess: (employeeId: string, newPin: string) => Promise<boolean>;
}

export default function DeviceBindingModal({
  employee,
  deviceId,
  deviceDesc,
  onClose,
  onBindSuccess,
}: DeviceBindingModalProps) {
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    if (pin.length < 4) {
      setErrorMsg('Debes ingresar un PIN de 4 dígitos.');
      return;
    }
    setErrorMsg(null);
    playSound('click');
    setPinStep('confirm');
  };

  const handleConfirmBind = async () => {
    if (confirmPin !== pin) {
      playSound('error');
      triggerVibration([100, 100, 100]);
      setErrorMsg('Los códigos PIN no coinciden. Intenta de nuevo.');
      setPin('');
      setConfirmPin('');
      setPinStep('create');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Intentar enrolar biometría si el celular tiene sensor
      try {
        await enrollBiometricCredential(employee.id, employee.name);
      } catch {
        // Silencioso si no es compatible
      }

      const ok = await onBindSuccess(employee.id, confirmPin);
      if (ok) {
        playSound('in');
        triggerVibration([100, 50, 150]);
      } else {
        setErrorMsg('Error al vincular el equipo. Inténtalo nuevamente.');
      }
    } catch {
      setErrorMsg('Ocurrió un error de conexión al vincular.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-2xl relative max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center py-2">
          {/* Ícono animado */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
            <Smartphone className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-2">
            <Sparkles className="w-3 h-3" /> Vinculación de Celular Único
          </span>

          <h3 className="text-lg font-black text-white">{employee.name}</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-3">
            Este teléfono quedará registrado como tu <strong>único celular autorizado</strong>. Nadie más podrá marcar por ti desde otro dispositivo.
          </p>

          {/* Información del Celular Detectado */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left mb-4 text-xs space-y-1">
            <p className="text-[10px] text-slate-400">Equipo detectado:</p>
            <p className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              {deviceDesc}
            </p>
          </div>

          {/* Errores */}
          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          {/* Formulario de PIN en 2 pasos */}
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-200 mb-2 flex items-center justify-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              {pinStep === 'create'
                ? 'Crea tu clave PIN de 4 dígitos:'
                : 'Confirma tu clave PIN (ingrésala de nuevo):'}
            </p>

            {pinStep === 'create' ? (
              <PinPad
                value={pin}
                onChange={setPin}
                onSubmit={pin.length === 4 ? handleNextStep : undefined}
              />
            ) : (
              <PinPad
                value={confirmPin}
                onChange={setConfirmPin}
                onSubmit={confirmPin.length === 4 ? handleConfirmBind : undefined}
              />
            )}
          </div>

          {/* Botón de Acción */}
          {pinStep === 'create' ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={pin.length < 4}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40"
            >
              Continuar a Confirmar PIN
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmBind}
              disabled={confirmPin.length < 4 || isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40"
            >
              {isSubmitting ? 'Vinculando teléfono...' : 'Guardar y Vincular este Celular'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
