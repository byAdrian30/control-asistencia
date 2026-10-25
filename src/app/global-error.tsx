'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
        <p className="text-slate-400 text-sm mb-4">{error.message || 'Error inesperado'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
