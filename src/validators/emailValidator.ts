import type { ValidationResult } from "./types.js";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

export function validateEmail(rawEmail: string): ValidationResult {
    const email: string = rawEmail.trim();
    if(email.length === 0) {
        return {
            valid: false,
            reason: 'No se ha ingresado ningún email.'
        }
    }

    if(!EMAIL_REGEX.test(email)) {
        return {
            valid: false,
            reason: 'El formato del email no es válido. Verifica que tenga la forma usuario@dominio.com.'
        }
    }

    return {
        valid: true
    }
}