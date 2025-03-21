interface Config {
    HTTP_SERVER_PORT: number;
    WS_SERVER_PORT: number;
    JWT_SECRET: string;
    PRISMA_DATABASE_URL: string;
}

export const config: Config = {
    HTTP_SERVER_PORT: Number(process.env.HTTP_SERVER_PORT) || 3001,
    WS_SERVER_PORT: Number(process.env.WS_SERVER_PORT) || 8080,
    JWT_SECRET: String(process.env.JWT_SECRET || 'JWT_SECRET_NOT_SET'),
    PRISMA_DATABASE_URL: String(process.env.PRISMA_DATABASE_URL || 'PRISMA_DATABASE_URL_NOT_SET')
}

