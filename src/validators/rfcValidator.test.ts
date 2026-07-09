import { describe, it, expect} from 'vitest';
import { validateRfc } from './rfcValidator.js'

describe('validateRfc', () => {
    it('returns valid for a correct RFC', () => {
        const result = validateRfc("ABC850315XY1");
        expect(result.valid).toBe(true);
    });

    it('Normalizes lowercase RFC before validating', () => {
        const result = validateRfc("abc850315xy1");
        expect(result.valid).toBe(true);
    });

    it('Incorrect length (7 characters, not 12)', () => {
        const result = validateRfc("ABC8503");
        expect(result.valid).toBe(false);
    });

    it('Incorrect format (starts with digits, not letters', () => {
        const result = validateRfc("123850315XY1");
        expect(result.valid).toBe(false);
    });

    it('Month 13 does not exists', () => {
        const result = validateRfc("ABC851315XY1");
        expect(result.valid).toBe(false);
    });

    it('February 30 does not exists', () => {
        const result = validateRfc("ABC850230XY1");
        expect(result.valid).toBe(false);
    });

    it('April does not have 31 days', () => {
        const result = validateRfc("ABC850431XY1");
        expect(result.valid).toBe(false);
    });

    it('The year 2000 is a leap year; February 29 is valid.', () => {
        const result = validateRfc("ABC000229XY1");
        expect(result.valid).toBe(true);
    });

    it('1985 is not a leap year; February 29th does not exist.', () => {
        const result = validateRfc("ABC850229XY1");
        expect(result.valid).toBe(false);
    });

    it('Day 00 does not exist (day must be >= 1)', () => {
        const result = validateRfc("ABC850100XY1");
        expect(result.valid).toBe(false);
    });
})