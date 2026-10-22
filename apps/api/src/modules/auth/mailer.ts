import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from '@expenseflow/logger';
import { env } from '../../config/env.js';

let transporterInstance: Transporter | null = null;

export async function getMailerTransporter(): Promise<Transporter> {
  if (!transporterInstance) {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporterInstance = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('Configured production SMTP mail transport');
    } else {
      // Development & Test fallback: local logger / test account
      transporterInstance = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      logger.info('Using local stream mail transport for development/testing');
    }
  }

  return transporterInstance;
}

export interface SendOtpEmailParams {
  email: string;
  otp: string;
  magicLinkUrl: string;
}

export async function sendOtpEmail(params: SendOtpEmailParams): Promise<{ previewUrl?: string }> {
  const transporter = await getMailerTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ExpenseFlow AI" <auth@expenseflow.ai>',
    to: params.email,
    subject: `Your ExpenseFlow Login Code: ${params.otp}`,
    text: `Your single-use sign in verification code is: ${params.otp}\n\nAlternatively, click here to sign in: ${params.magicLinkUrl}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #000; color: #fff; border-radius: 12px;">
        <h2 style="color: #007AFF; margin-top: 0;">ExpenseFlow AI</h2>
        <p style="font-size: 16px; color: #8E8E93;">Your single-use verification code is:</p>
        <div style="background: #1C1C1E; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #34C759;">${params.otp}</span>
        </div>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${params.magicLinkUrl}" style="background: #007AFF; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
            Sign In with Magic Link
          </a>
        </p>
        <p style="font-size: 13px; color: #636366; margin-top: 32px; border-top: 1px solid #2C2C2E; padding-top: 16px;">
          This code expires in 10 minutes. If you did not request this email, please ignore it.
        </p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info({ email: params.email, messageId: info.messageId }, 'Dispatched authentication verification email');

  return {};
}
