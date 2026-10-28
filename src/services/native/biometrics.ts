import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  BiometryType,
  type CheckBiometryResult,
  getBiometryName,
} from '@aparajita/capacitor-biometric-auth'

export { BiometryType, BiometryErrorType }

export interface BiometricsAvailability {
  isAvailable: boolean
  biometryType: BiometryType
  biometryName: string
  isFace: boolean
  reason: string
  deviceIsSecure: boolean
  strongBiometryIsAvailable: boolean
}

export interface BiometricAuthResult {
  success: boolean
  cancelled: boolean
  error?: string
  code?: BiometryErrorType
}

/**
 * Returns a human-friendly label for the device's biometry type.
 */
export function getFriendlyBiometryName(type: BiometryType): string {
  switch (type) {
    case BiometryType.faceId:
      return 'Face ID'
    case BiometryType.touchId:
      return 'Touch ID'
    case BiometryType.fingerprintAuthentication:
      return 'Fingerprint'
    case BiometryType.faceAuthentication:
      return 'Face Recognition'
    case BiometryType.irisAuthentication:
      return 'Iris'
    default:
      return getBiometryName(type) || 'Biometrics'
  }
}

/**
 * Checks if the device supports and has enrolled biometric authentication (Fingerprint, Face ID, etc.).
 */
export async function checkBiometricsAvailable(): Promise<BiometricsAvailability> {
  try {
    const result: CheckBiometryResult = await BiometricAuth.checkBiometry()
    const name = getFriendlyBiometryName(result.biometryType)
    const isFace =
      result.biometryType === BiometryType.faceId ||
      result.biometryType === BiometryType.faceAuthentication

    return {
      isAvailable: Boolean(result.isAvailable),
      biometryType: result.biometryType,
      biometryName: name,
      isFace,
      reason: result.reason || '',
      deviceIsSecure: Boolean(result.deviceIsSecure),
      strongBiometryIsAvailable: Boolean(result.strongBiometryIsAvailable),
    }
  } catch (error) {
    console.warn('[Biometrics] checkBiometry error:', error)
    return {
      isAvailable: false,
      biometryType: BiometryType.none,
      biometryName: 'Biometrics',
      isFace: false,
      reason: error instanceof Error ? error.message : 'Biometrics unavailable',
      deviceIsSecure: false,
      strongBiometryIsAvailable: false,
    }
  }
}

/**
 * Prompts the user for biometric authentication (Face ID or Fingerprint).
 *
 * @param options Reason and dialog customization options
 * @returns Object with success status, cancellation status, and optional error description
 */
export async function authenticateWithBiometrics(options?: {
  reason?: string
  cancelTitle?: string
  title?: string
  subtitle?: string
}): Promise<BiometricAuthResult> {
  try {
    await BiometricAuth.authenticate({
      reason: options?.reason || 'Unlock WhereDidItGo',
      cancelTitle: options?.cancelTitle || 'Cancel',
      androidTitle: options?.title || 'Biometric Authentication',
      androidSubtitle: options?.subtitle || 'Verify your identity to proceed',
      allowDeviceCredential: false,
    })

    return {
      success: true,
      cancelled: false,
    }
  } catch (err: unknown) {
    if (err instanceof BiometryError || (err && typeof err === 'object' && 'code' in err)) {
      const bioErr = err as BiometryError
      const code = bioErr.code

      if (
        code === BiometryErrorType.userCancel ||
        code === BiometryErrorType.userFallback ||
        code === BiometryErrorType.systemCancel ||
        code === BiometryErrorType.appCancel
      ) {
        return {
          success: false,
          cancelled: true,
          code,
        }
      }

      if (code === BiometryErrorType.biometryLockout) {
        return {
          success: false,
          cancelled: false,
          error: 'Biometric authentication temporarily locked out due to too many attempts.',
          code,
        }
      }

      return {
        success: false,
        cancelled: false,
        error: bioErr.message || 'Biometric authentication failed',
        code,
      }
    }

    const errorStr = String(err)
    if (errorStr.toLowerCase().includes('cancel')) {
      return {
        success: false,
        cancelled: true,
      }
    }

    return {
      success: false,
      cancelled: false,
      error: err instanceof Error ? err.message : 'Biometric authentication failed',
    }
  }
}
