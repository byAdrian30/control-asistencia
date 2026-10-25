import { NextResponse } from 'next/server';
import { currentServerConfig, setServerConfig } from '@/lib/server-state';

export async function GET() {
  return NextResponse.json(currentServerConfig, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    setServerConfig(body);
    return NextResponse.json({ success: true, config: currentServerConfig });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
