import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path = require("path");
import { v4 as uuidV4 } from "uuid";
import { otpManagerClass } from "./connectRedis";

const envPath = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: envPath });

// secret key
const secretKey = process.env.JWT_SECRET_KEY;

export const funcCreateToken = (userId: number, isActive: boolean) => {
  // const secretKey = process.env.JWT_SECRET_KEY;
  const refreshSecretKey = process.env.REFRESH_JWT_SECRET_KEY;

  if (!secretKey && refreshSecretKey) {
    throw new Error(
      "JWT_SECRET_KEY and REFRESH_JWT_SECRET_KEY is not defined in environment variables"
    );
  }

  const accessToken = jwt.sign(
    {
      user_id: userId,
      is_active: isActive,
      typeToken: "access",
      uuid_name: uuidV4(),
    },
    secretKey as string,
    { expiresIn: "30d" }
  );
  const refreshToken = jwt.sign(
    {
      user_id: userId,
      is_active: isActive,
      type_token: "refresh",
      uuid_name: uuidV4(),
    },
    refreshSecretKey as string,
    { expiresIn: "30d" }
  );
  return { accessToken, refreshToken };
};

export const CreateJwtLink = async (userId: number, ipAddress: string) => {
  const jit = uuidV4();

  const accessToken = jwt.sign(
    {
      user_id: userId,
      typeToken: "link",
      jit: jit,
    },
    secretKey as string,
    { expiresIn: 5 * 60 }
  );
  await otpManagerClass.storeJitToken(jit, ipAddress);
  return accessToken;
};

export const decodeJwtToken = async (token: string, ipAddress: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
    const jit = (decoded as any).jit;
    const verify = await otpManagerClass.verifyJittoken(jit, ipAddress);
    if (!verify) {
      return {
        success: false,
        message: "Invalid token",
      };
    }
    return {
      success: true,
      data: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: {
          type: "TOKEN_EXPIRED",
          message: "Token has expired",
          originalError: error.message,
        },
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: {
          type: "INVALID_TOKEN",
          message: "Invalid token",
          originalError: error.message,
        },
      };
    }

    // سایر خطاها
    return {
      success: false,
      error: {
        type: "UNKNOWN_ERROR",
        message: "Unknown error occurred",
        originalError: error.message,
      },
    };
  }
};
