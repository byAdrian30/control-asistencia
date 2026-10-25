import { NextResponse } from 'next/server';
import { Attendance } from '@/types/database';
import { serverAttendances, addOrUpdateServerAttendance } from '@/lib/server-state';

export async function GET() {
  return NextResponse.json(serverAttendances, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: Request) {
  try {
    const record: Attendance = await req.json();
    if (!record || !record.id) {
      return NextResponse.json({ error: 'Registro inválido' }, { status: 400 });
    }

    addOrUpdateServerAttendance(record);
    return NextResponse.json({ success: true, count: serverAttendances.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error procesando marcación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
