import { NextResponse } from 'next/server';
import { getCloudFullState, saveCloudFullState } from '@/lib/cloud-storage';

export async function GET() {
  try {
    const state = await getCloudFullState();
    return NextResponse.json(state, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al sincronizar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    const updatedState = await saveCloudFullState(body);
    return NextResponse.json({
      success: true,
      state: updatedState,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar sincronización';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
