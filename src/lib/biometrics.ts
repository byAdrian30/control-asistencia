/**
 * Soporte Biométrico con WebAuthn (Touch ID, Face ID, Lector de Huellas Android / Windows Hello)
 */

export async function checkBiometricsSupport(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Registra los datos biométricos del colaborador en este celular
 */
export async function enrollBiometricCredential(
  employeeId: string,
  employeeName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supported = await checkBiometricsSupport();
    if (!supported) {
      return { success: false, error: 'Este dispositivo no cuenta con sensor biométrico compatible.' };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(employeeId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Shimaya Ramen Asistencia',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: employeeName,
        displayName: employeeName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Obliga a usar sensor del celular (FaceID/Huella)
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    if (credential) {
      localStorage.setItem(`shimaya_bio_${employeeId}`, 'enrolled');
      return { success: true };
    }
    return { success: false, error: 'No se completó la verificación biométrica.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Solicita confirmación biométrica (Face ID / Huella digital) al marcar
 */
export async function verifyBiometricCredential(
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supported = await checkBiometricsSupport();
    if (!supported) {
      return { success: true }; // Si el hardware no lo soporta, no bloquea al usuario
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    return { success: Boolean(assertion) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
