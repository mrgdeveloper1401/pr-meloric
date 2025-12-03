import nodemailer from "nodemailer";
import crypto from "crypto";
import { otpManagerClass } from "./connectRedis";

interface EmailOption {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const HOST = process.env.EMAIL_HOST as string;
const PORT = Number(process.env.EMAIL_PORT) as number;
const SECURE = Boolean(process.env.USE_SECURE) as boolean;
const EMAIL_USER = process.env.EMAIL_USER as string;
const EMAIL_PASS = process.env.EMAIL_PASS as string;
const FROM_EMAIL = process.env.FROM_EMAIL as string;

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const transporterOptions = {
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    };
    this.transporter = nodemailer.createTransport(transporterOptions);
  }

  private async verifyTransporter() {
    try {
      await this.transporter.verify();
    } catch (error) {
      throw new Error(error);
    }
  }

  async sendEmail(options: EmailOption) {
    try {
      await this.transporter.sendMail({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.text,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      throw new Error(error);
    }
  }

  generateOtpCode() {
    return crypto.randomInt(999999);
  }

  async storeEmailOtp(email: string, ipAddress: string) {
    const code = this.generateOtpCode();
    await otpManagerClass.storeOtp(email, code, ipAddress);
    return code;
  }

  async verifyEmailOtp(email: string, code: number, ipAddress: string) {
    return await otpManagerClass.verifyOtp(email, code, ipAddress);
  }
}

export const createEmailService = new EmailService();
