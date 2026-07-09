export class AppError extends Error {
    constructor(public statusCode: number, message: string, public readonly details?: unknown) {
        super(message);
        this.name = 'AppError';
    }
}