import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), "../../.env"); // config env path
dotenv.config({ path: envPath });

// url redis
const DEBUG = process.env.DEBUG_MODE;

const redisEnv = (debugMode = DEBUG) => {
    if (debugMode === 'true') {
        const url = "redis://localhost:6381/1"
        return url
    }
    else {
        const url = `redis://${process.env.PROD_REDIS_HOST}:${process.env.PROD_REDIS_PORT}/1`
        return url;
    }
}

export const redisClient = createClient({
    url: redisEnv(),
    password: process.env.PROD_REDIS_PASSWORD || undefined
});

let isConnected = false;

redisClient.on("error", (err) => {
    console.log("Redis Client Error", err);
    isConnected = false;
});

redisClient.on("connect", () => {
    console.log("Redis connecting...");
});

redisClient.on("ready", () => {
    console.log("Redis connected successfully");
    isConnected = true;
});

// func for check connect
export const isRedisConnected = isConnected;

// connect to redis
export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

const disconnectRedis = async () => {
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
}

export const VerifyOtpRedis = async (code: number, userIp: string) => {
    if (isRedisConnected === false) {
        await connectRedis();
    }
    const RedisKey = `otp_${code}_${userIp}`;
    const check = await redisClient.get(RedisKey);
    redisClient.del(RedisKey);
    await disconnectRedis();
    return check;
}
