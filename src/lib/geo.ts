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
 * Obtiene la ubicación precisa del dispositivo actual con fallback automático para interiores:
 * - Fase 1: Intenta GPS de alta precisión con caché reciente.
 * - Fase 2: Si está en interiores de un centro comercial / cocina y los satélites no llegan
 *           (TIMEOUT o POSITION_UNAVAILABLE), cambia automáticamente a triangulación por Wi-Fi y antenas celulares.
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Tu navegador no tiene soporte de geolocalización GPS.'));
      return;
    }

    // FASE 1: Intentar alta precisión con caché permisiva
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        // Si el usuario bloqueó el permiso en el navegador (Chrome o Safari)
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new Error(
              '⚠️ El permiso de ubicación está BLOQUEADO en tu navegador (Chrome o Safari). Toca el icono de candado 🔒 (o "aA") arriba al lado del link, entra a Permisos y activa "Ubicación: Permitir", luego recarga.'
            )
          );
          return;
        }

        // FASE 2 (FALLBACK): TIMEOUT o POSITION_UNAVAILABLE (común bajo techo en malls o cocina)
        // Intentar con baja precisión (redes Wi-Fi y antenas móviles)
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            resolve({
              latitude: fallbackPos.coords.latitude,
              longitude: fallbackPos.coords.longitude,
              accuracy: fallbackPos.coords.accuracy,
            });
          },
          (fallbackErr) => {
            let msg = 'No pudimos obtener tu ubicación.';
            if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              msg =
                '⚠️ Permiso de ubicación bloqueado. Toca el candado 🔒 al lado del link y permite la ubicación en tu navegador.';
            } else if (fallbackErr.code === fallbackErr.TIMEOUT) {
              msg =
                'La señal GPS tarda en responder bajo techo. Enciende el Wi-Fi en tu celular (ayuda a triangular la ubicación dentro del mall) o acércate a la entrada e intenta de nuevo.';
            } else if (fallbackErr.code === fallbackErr.POSITION_UNAVAILABLE) {
              msg =
                'No se pudo triangular la posición dentro del local. Verifica tener el Wi-Fi o datos encendidos y la opción "Precisión de ubicación de Google" activa en tu teléfono.';
            }
            reject(new Error(msg));
          },
          {
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 180000, // hasta 3 minutos de caché válida
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 5000, // No esperar 12s si los satélites no llegan bajo techo
        maximumAge: 60000, // hasta 1 minuto de caché reciente
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
