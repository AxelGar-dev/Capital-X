import { describe, it, expect } from 'vitest';
import { validateEmail } from './emailValidator.js';

describe('validateEmail', () => {
    it('valid standard format', () => {
        const result = validateEmail('contacto@empresa.com');
        expect(result.valid).toBe(true);
    });
    it('valid subdomains and special chars', () => {
        const result = validateEmail('a.b+test@sub.empresa.com.mx');
        expect(result.valid).toBe(true);
    });

    it('rejects empty string', () => {
        const result = validateEmail('');
        expect(result.valid).toBe(false);
    });

    it('rejects spaces only', () => {
        const result = validateEmail('   ');
        expect(result.valid).toBe(false);
    });

    it('rejects missing at symbol', () => {
        const result = validateEmail('sinarroba.com');
        expect(result.valid).toBe(false);
    });

    it('rejects missing local part', () => {
        const result = validateEmail('@sindominio.com');
        expect(result.valid).toBe(false);
    });

    it('rejects missing domain', () => {
        const result = validateEmail('usuario@');
        expect(result.valid).toBe(false);
    });

    it('rejects missing tld', () => {
        const result = validateEmail('usuario@dominio');
        expect(result.valid).toBe(false);
    });

    it('rejects double at symbol', () => {
        const result = validateEmail('usuario@@dominio.com');
        expect(result.valid).toBe(false);
    });

    it('rejects spaces inside email', () => {
        const result = validateEmail('usuario @dominio.com');
        expect(result.valid).toBe(false);
    });
});
