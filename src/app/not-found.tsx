import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Página no encontrada</h2>
      <p className="text-slate-400 text-sm mb-4">La página que buscas no existe.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm"
      >
        Volver a Asistencia
      </Link>
    </div>
  );
}
