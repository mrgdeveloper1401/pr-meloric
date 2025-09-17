import crypto from "crypto";
import dotenv from "dotenv"
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({path: envPath});

const salt = process.env.SALT_HASH // Generate a random salt
const iterations = 1000000; // Number of iterations (higher is more secure but slower)
const keylen = 32; // Length of the derived key in bytes
const hashAlgorithm = process.env.HASHED_ALGORITM || "pbkdf2_sha256"
const hashInCreatePassword = process.env.hashInCreatePassword || "sha256"
const SALT_LENGTH = Number(process.env.SALT_LENGTH || 12);

// create generate salt
const generateSalt = (length: number = SALT_LENGTH): string => {
  return crypto.randomBytes(length).toString("base64").slice(0, length * 2); // base64 بدون padding
};

export const funcCreateHashPassword = (password: string): string => {
    const salt = generateSalt();
    const hashBuffer = crypto.pbkdf2Sync(password, salt, iterations, keylen, hashInCreatePassword)
    const hash = hashBuffer.toString("base64");
    return `${hashAlgorithm}$${iterations}$${salt}$${hash}`;
}

export const funcVerifyPassword = (password: string, storedHash: string): boolean => {
    if (!storedHash) return false;

    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== hashAlgorithm) {
    throw new Error("Invalid hash format or algorithm");
  }

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const expectedHash = parts[3];

  const hashBuffer = crypto.pbkdf2Sync(password, salt, iterations, keylen, hashInCreatePassword);
  const computedHash = hashBuffer.toString("base64");
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(expectedHash));

}
