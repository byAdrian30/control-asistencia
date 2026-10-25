import { NextResponse } from 'next/server';
import { DEFAULT_CONFIG } from '@/lib/mock-storage';
import { SystemConfig } from '@/types/database';

// Estado global en memoria para mantener sincronizada la configuración entre todos los celulares
let currentServerConfig: SystemConfig = {
  ...DEFAULT_CONFIG,
  mall_lat: -6.76329,
  mall_lng: -79.86164,
  radius_meters: 250,
  store_location_name: 'Shimaya Ramen - Mall Aventura Chiclayo',
};

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
    currentServerConfig = {
      ...currentServerConfig,
      ...body,
    };
    return NextResponse.json({ success: true, config: currentServerConfig });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
