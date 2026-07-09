import mysql from 'mysql2/promise';

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Falta la variable de entorno requerida: ${key}`);
    }
    return value;
}

export const pool = mysql.createPool({
    host: requireEnv('DB_HOST'),
    port: Number(requireEnv('DB_PORT')),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
});