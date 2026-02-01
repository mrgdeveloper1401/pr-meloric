import { createClient } from "redis";
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), "../../.env"); // config env path
dotenv.config({ path: envPath });

// url redis
const DEBUG = process.env.DEBUG_MODE;

const redisEnv = (debugMode = DEBUG) => {
  if (debugMode === "true") {
    const url = "redis://localhost:6381/1";
    return url;
  } else {
    const url = `redis://${process.env.PROD_REDIS_HOST}:${process.env.PROD_REDIS_PORT}/1`;
    return url;
  }
};

export const redisClient = createClient({
  url: redisEnv(),
  password: process.env.PROD_REDIS_PASSWORD || undefined,
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
};

export const VerifyOtpRedis = async (code: number, userIp: string) => {
  if (isRedisConnected === false) {
    await connectRedis();
  }
  const RedisKey = `otp_${code}_${userIp}`;
  const check = await redisClient.get(RedisKey);
  redisClient.del(RedisKey);
  await disconnectRedis();
  return check;
};

class RedisOtpManager {
  private client;
  private isConnected = false;

  constructor() {
    const DEBUG = process.env.DEBUG_MODE === "true";

    const redisUrl = DEBUG
      ? "redis://localhost:6381/1"
      : `redis://${process.env.PROD_REDIS_HOST}:${process.env.PROD_REDIS_PORT}/1`;

    this.client = createClient({
      url: redisUrl,
      password: process.env.PROD_REDIS_PASSWORD || undefined,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on("error", (err) => {
      this.isConnected = false;
    });

    this.client.on("connect", () => {});

    this.client.on("disconnect", () => {
      this.isConnected = false;
    });
  }

  async connect() {
    if (this.isConnected == false && !this.client.isOpen) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async discounnect() {
    if (this.client.isOpen) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // save otp in redis
  async storeOtp(phone: string, code: number, ipAddress: string, store_type: string) {
    try {
      await this.connect();

      const redisKey = `${store_type}_${phone}_${code}_${ipAddress}`;
      await this.client.setEx(redisKey, 120, "valid");
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async storeJitToken(jit: string, ipAddress: string) {
    try {
      await this.connect();

      const redisKey = `token_${jit}_${ipAddress}`;
      await this.client.setEx(redisKey, 300, "valid");
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async verifyJittoken(jit: string, ipAddress: string) {
    try {
      await this.connect();
      const redisKey = `token_${jit}_${ipAddress}`;
      const result = await this.client.get(redisKey);
      if (result) {
        await this.client.del(redisKey);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async verifyOtp(phone: string, code: number, ipAddress: string, store_type: string) {
    try {
      await this.connect();
      const redisKey = `${store_type}_${phone}_${code}_${ipAddress}`;
      const result = await this.client.get(redisKey);
      if (result) {
        await this.client.del(redisKey);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const otpManagerClass = new RedisOtpManager();
