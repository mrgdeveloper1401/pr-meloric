import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path = require("path");
import { v4 as uuidV4 } from "uuid";

const envPath = path.resolve(process.cwd(), "../../.env");
dotenv.config({path: envPath});

export const funcCreateToken = (userId: number, isActive: boolean) => {
    const secretKey = process.env.JWT_SECRET_KEY;
    const refreshSecretKey = process.env.REFRESH_JWT_SECRET_KEY

    if (!secretKey && refreshSecretKey) {
        throw new Error("JWT_SECRET_KEY and REFRESH_JWT_SECRET_KEY is not defined in environment variables");
    }

    const accessToken = jwt.sign(
        {
            user_id: userId, 
            is_active: isActive, 
            typeToken: "access",
            uuid_name: uuidV4()
        },
        secretKey as string,
        {expiresIn: "30d"}
    );
    const refreshToken = jwt.sign(
        {
            user_id: userId, 
            is_active: isActive, 
            type_token: "refresh",
            uuid_name: uuidV4()
        },
        refreshSecretKey as string,
        {expiresIn: "30d"}
    );
    return {accessToken, refreshToken}   
}
