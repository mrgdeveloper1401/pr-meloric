// import cors from "cors";
// import { NextFunction } from "express";


interface CorsOptions {
    origin: string | string[];
    method: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
    optionsSuccessStatus?: number;
}

// interface RateLimitOptions {
//   windowMs: number;
//   max: number;
//   message: string | object;
//   standardHeaders?: boolean;
//   legacyHeaders?: boolean;
//   skip?: (req: Request, res: Response) => boolean;
//   handler?: (req: Request, res: Response, next: NextFunction) => void;
// }

export const CorsOptionsMiddleware: CorsOptions = {
    origin: process.env.APP_CORS_ORIGIN.split(","),
    method: process.env.APP_CORS_ORIGIN_METHOD.split(","),
    allowedHeaders: process.env.APP_CORS_ORIGIN_ALLOWED_HEADER.split(","),
    credentials: Boolean(process.env.APP_CREDENTIALS),
    optionsSuccessStatus: Number(process.env.OPTION_SUCCESS_STATUS)
}