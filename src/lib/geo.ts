/**
 * Utilidades de Geolocalización y Geovalla (Geofence) para Shimaya Ramen
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Fórmula de Haversine para calcular distancia entre dos puntos GPS en metros
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Obtiene la ubicación precisa del dispositivo actual
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Tu navegador no tiene soporte de geolocalización GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = 'No pudimos obtener tu ubicación.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Debes activar los permisos de ubicación (GPS) en tu celular para poder marcar.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'La señal GPS no está disponible. Asegúrate de tener activada la ubicación en tu teléfono.';
            break;
          case error.TIMEOUT:
            msg = 'Se agotó el tiempo esperando la señal GPS. Intenta de nuevo.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Formatea la distancia en metros o kilómetros
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
