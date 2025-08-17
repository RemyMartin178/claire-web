export interface FirebaseError {
  code: string;
  message: string;
  details?: any;
}

export class FirebaseErrorHandler {
  static readonly ERROR_CODES = {
    // Authentication errors
    AUTH_EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
    AUTH_WEAK_PASSWORD: 'auth/weak-password',
    AUTH_INVALID_EMAIL: 'auth/invalid-email',
    AUTH_USER_NOT_FOUND: 'auth/user-not-found',
    AUTH_WRONG_PASSWORD: 'auth/wrong-password',
    AUTH_INVALID_CREDENTIAL: 'auth/invalid-credential',
    AUTH_TOO_MANY_REQUESTS: 'auth/too-many-requests',
    AUTH_NETWORK_REQUEST_FAILED: 'auth/network-request-failed',
    AUTH_OPERATION_NOT_SUPPORTED: 'auth/operation-not-supported-in-this-environment',
    AUTH_POPUP_BLOCKED: 'auth/popup-blocked',
    AUTH_POPUP_CLOSED: 'auth/popup-closed-by-user',
    AUTH_CANCELLED_POPUP_REQUEST: 'auth/cancelled-popup-request',
    AUTH_ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL: 'auth/account-exists-with-different-credential',
    
    // Firestore errors
    FIRESTORE_PERMISSION_DENIED: 'permission-denied',
    FIRESTORE_UNAVAILABLE: 'unavailable',
    FIRESTORE_DEADLINE_EXCEEDED: 'deadline-exceeded',
    FIRESTORE_RESOURCE_EXHAUSTED: 'resource-exhausted',
    FIRESTORE_INTERNAL: 'internal',
    FIRESTORE_UNIMPLEMENTED: 'unimplemented',
    FIRESTORE_DATA_LOSS: 'data-loss',
    FIRESTORE_UNAUTHENTICATED: 'unauthenticated',
    
    // Network errors
    NETWORK_ERROR: 'network-error',
    TIMEOUT_ERROR: 'timeout-error',
    UNKNOWN_ERROR: 'unknown-error'
  } as const;

  static getUserFriendlyMessage(error: any): string {
    const errorCode = error?.code || error?.message || 'unknown';
    
    switch (errorCode) {
      // Authentication errors
      case this.ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE:
        return 'Cette adresse email est déjà utilisée';
      case this.ERROR_CODES.AUTH_WEAK_PASSWORD:
        return 'Le mot de passe doit contenir au moins 6 caractères';
      case this.ERROR_CODES.AUTH_INVALID_EMAIL:
        return 'Adresse email invalide';
      case this.ERROR_CODES.AUTH_USER_NOT_FOUND:
        return 'Aucun compte trouvé avec cette adresse email';
      case this.ERROR_CODES.AUTH_WRONG_PASSWORD:
        return 'Mot de passe incorrect';
      case this.ERROR_CODES.AUTH_INVALID_CREDENTIAL:
        return 'Email ou mot de passe incorrect';
      case this.ERROR_CODES.AUTH_TOO_MANY_REQUESTS:
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      case this.ERROR_CODES.AUTH_NETWORK_REQUEST_FAILED:
        return 'Erreur de connexion. Vérifiez votre connexion internet';
      case this.ERROR_CODES.AUTH_OPERATION_NOT_SUPPORTED:
        return 'La connexion par fenêtre n’est pas supportée dans cet environnement';
      case this.ERROR_CODES.AUTH_POPUP_BLOCKED:
        return 'La fenêtre de connexion a été bloquée par votre navigateur';
      case this.ERROR_CODES.AUTH_POPUP_CLOSED:
        return 'La fenêtre de connexion a été fermée avant la fin';
      case this.ERROR_CODES.AUTH_CANCELLED_POPUP_REQUEST:
        return 'La demande de connexion a été annulée';
      case this.ERROR_CODES.AUTH_ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL:
        return 'Un compte existe déjà avec une autre méthode pour cet email';
      
      // Firestore errors
      case this.ERROR_CODES.FIRESTORE_PERMISSION_DENIED:
        return 'Accès refusé. Veuillez vous reconnecter';
      case this.ERROR_CODES.FIRESTORE_UNAVAILABLE:
        return 'Service temporairement indisponible. Veuillez réessayer';
      case this.ERROR_CODES.FIRESTORE_DEADLINE_EXCEEDED:
        return 'Délai d\'attente dépassé. Veuillez réessayer';
      case this.ERROR_CODES.FIRESTORE_RESOURCE_EXHAUSTED:
        return 'Limite de ressources atteinte. Veuillez réessayer plus tard';
      case this.ERROR_CODES.FIRESTORE_INTERNAL:
        return 'Erreur interne du serveur. Veuillez réessayer';
      case this.ERROR_CODES.FIRESTORE_UNAUTHENTICATED:
        return 'Session expirée. Veuillez vous reconnecter';
      
      // Network errors
      case this.ERROR_CODES.NETWORK_ERROR:
        return 'Erreur de connexion. Vérifiez votre connexion internet';
      case this.ERROR_CODES.TIMEOUT_ERROR:
        return 'Délai d\'attente dépassé. Veuillez réessayer';
      
      default:
        return 'Une erreur inattendue s\'est produite. Veuillez réessayer';
    }
  }

  static isRetryableError(error: any): boolean {
    const errorCode = error?.code || error?.message || 'unknown';
    
    const retryableErrors = [
      this.ERROR_CODES.FIRESTORE_UNAVAILABLE,
      this.ERROR_CODES.FIRESTORE_DEADLINE_EXCEEDED,
      this.ERROR_CODES.FIRESTORE_RESOURCE_EXHAUSTED,
      this.ERROR_CODES.FIRESTORE_INTERNAL,
      this.ERROR_CODES.AUTH_NETWORK_REQUEST_FAILED,
      this.ERROR_CODES.NETWORK_ERROR,
      this.ERROR_CODES.TIMEOUT_ERROR
    ];
    
    return retryableErrors.includes(errorCode);
  }

  static isAuthError(error: any): boolean {
    const errorCode = error?.code || error?.message || 'unknown';
    return errorCode.startsWith('auth/');
  }

  static isFirestoreError(error: any): boolean {
    const errorCode = error?.code || error?.message || 'unknown';
    return [
      this.ERROR_CODES.FIRESTORE_PERMISSION_DENIED,
      this.ERROR_CODES.FIRESTORE_UNAVAILABLE,
      this.ERROR_CODES.FIRESTORE_DEADLINE_EXCEEDED,
      this.ERROR_CODES.FIRESTORE_RESOURCE_EXHAUSTED,
      this.ERROR_CODES.FIRESTORE_INTERNAL,
      this.ERROR_CODES.FIRESTORE_UNIMPLEMENTED,
      this.ERROR_CODES.FIRESTORE_DATA_LOSS,
      this.ERROR_CODES.FIRESTORE_UNAUTHENTICATED
    ].includes(errorCode);
  }

  static shouldLogError(error: any): boolean {
    const errorCode = error?.code || error?.message || 'unknown';
    
    const nonLoggableErrors = [
      this.ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE,
      this.ERROR_CODES.AUTH_WEAK_PASSWORD,
      this.ERROR_CODES.AUTH_INVALID_EMAIL,
      this.ERROR_CODES.AUTH_USER_NOT_FOUND,
      this.ERROR_CODES.AUTH_WRONG_PASSWORD
    ];
    
    return !nonLoggableErrors.includes(errorCode);
  }

  static createError(code: string, message?: string, details?: any): FirebaseError {
    return {
      code,
      message: message || this.getUserFriendlyMessage({ code }),
      details
    };
  }

  static wrapError(error: any): FirebaseError {
    return {
      code: error?.code || 'unknown',
      message: this.getUserFriendlyMessage(error),
      details: error
    };
  }
}

export const handleFirebaseError = (error: any): string => {
  return FirebaseErrorHandler.getUserFriendlyMessage(error);
};

export const isRetryableError = (error: any): boolean => {
  return FirebaseErrorHandler.isRetryableError(error);
};

export const shouldLogError = (error: any): boolean => {
  return FirebaseErrorHandler.shouldLogError(error);
}; 