import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter | null;

  constructor() {
    this.transporter = process.env.MAIL_HOST
      ? nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: Number(process.env.MAIL_PORT ?? 587),
          secure: true,
          auth: process.env.MAIL_USER
            ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD }
            : undefined,
        })
      : null;
  }

  async sendOtp(
    email: string,
    otp: string,
    purpose: 'verify-email' | 'reset-password',
  ) {
    const subject =
      purpose === 'verify-email'
        ? 'Verify your email address'
        : 'Reset your password';
    const text = `Your ${purpose === 'verify-email' ? 'email verification' : 'password reset'} code is ${otp}. It expires in ${process.env.OTP_EXPIRES_MINUTES ?? 10} minutes.`;
    if (!this.transporter) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException(
          'Email delivery is not configured',
        );
      }
      this.logger.warn(`Development OTP for ${email}: ${otp}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM ?? 'no-reply@localhost',
      to: email,
      subject,
      text,
    });
  }
}
