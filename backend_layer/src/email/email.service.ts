import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
            port: this.configService.get<number>('SMTP_PORT', 587),
            secure: false, // true for 465, false for other ports
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    /**
     * Send OTP verification email with beautiful HTML template
     */
    async sendOTPEmail(to: string, otp: string, displayName: string): Promise<boolean> {
        try {
            const mailOptions = {
                from: this.configService.get<string>('SMTP_FROM', '"ByteBoom" <noreply@byteboom.io>'),
                to: to,
                subject: 'Your ByteBoom Verification Code',
                html: this.getOTPEmailTemplate(otp, displayName),
            };

            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`✅ OTP email sent to ${to}: ${info.messageId}`);
            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to send OTP email to ${to}: ${error.message}`);
            return false;
        }
    }

    /**
     * Beautiful HTML email template for OTP
     */
    private getOTPEmailTemplate(otp: string, displayName: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ByteBoom Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="520px" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                ⚡ ByteBoom
              </h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 500;">
                Crypto Trading Intelligence
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 10px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Welcome, ${displayName}! 👋
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Thanks for joining ByteBoom. Use the verification code below to complete your account setup:
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px solid #e9d5ff; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);">
                <p style="margin: 0 0 16px; color: #7c3aed; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">
                  YOUR VERIFICATION CODE
                </p>
                <div style="background: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
                  <p style="margin: 0; color: #7c3aed; font-size: 40px; font-weight: 900; letter-spacing: 14px; font-family: 'Courier New', Courier, monospace; text-shadow: 0 1px 2px rgba(124, 58, 237, 0.1);">
                    ${otp}
                  </p>
                </div>
                <p style="margin: 0; color: #f59e0b; font-size: 13px; font-weight: 600;">
                  ⏱️ Expires in <strong>10 minutes</strong>
                </p>
              </div>

              <!-- Warning -->
              <div style="background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #991b1b; font-size: 12px; line-height: 1.5;">
                  🔒 <strong>Security Notice:</strong> Never share this code with anyone. ByteBoom will never ask for your verification code.
                </p>
              </div>

              <!-- Help Text -->
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                If you didn't request this code, you can safely ignore this email. Someone may have typed your email by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px; color: #6b7280; font-size: 11px;">
                © ${new Date().getFullYear()} ByteBoom. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 10px;">
                Automated trading signals · Real-time analytics
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    }

    /**
     * Test SMTP connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            this.logger.log('✅ SMTP connection verified successfully');
            return true;
        } catch (error) {
            this.logger.error(`❌ SMTP connection failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Send login notification email
     */
    async sendLoginNotification(
        to: string, 
        displayName: string, 
        ipAddress: string, 
        device: string, 
        location: string
    ): Promise<boolean> {
        try {
            const mailOptions = {
                from: this.configService.get<string>('SMTP_FROM', '"ByteBoom Security" <security@byteboom.io>'),
                to: to,
                subject: 'New Login to Your ByteBoom Account',
                html: this.getLoginNotificationTemplate(displayName, ipAddress, device, location),
            };

            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`✅ Login notification sent to ${to}: ${info.messageId}`);
            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to send login notification to ${to}: ${error.message}`);
            return false;
        }
    }

    /**
     * Login notification email template
     */
    private getLoginNotificationTemplate(
        displayName: string, 
        ipAddress: string, 
        device: string, 
        location: string
    ): string {
        const loginTime = new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });

        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ByteBoom Login Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560px" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 32px 40px; text-align: center;">
              <div style="background: rgba(255,255,255,0.2); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🔐</span>
              </div>
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                Security Alert
              </h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500;">
                New login detected
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 12px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                Hi ${displayName},
              </h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                We detected a new login to your ByteBoom account. If this was you, you can safely ignore this email.
              </p>

              <!-- Login Details -->
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Login Details
                </h3>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 100px;">
                      <strong>Time:</strong>
                    </td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 13px;">
                      ${loginTime}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">
                      <strong>Device:</strong>
                    </td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 13px;">
                      ${device}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">
                      <strong>Location:</strong>
                    </td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 13px;">
                      ${location}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">
                      <strong>IP Address:</strong>
                    </td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 13px; font-family: 'Courier New', monospace;">
                      ${ipAddress}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Action Required -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px; color: #92400e; font-size: 15px; font-weight: 700;">
                  ⚠️ Wasn't you?
                </h3>
                <p style="margin: 0 0 16px; color: #78350f; font-size: 13px; line-height: 1.6;">
                  If you don't recognize this activity, please secure your account immediately:
                </p>
                <ol style="margin: 0 0 0 20px; padding: 0; color: #78350f; font-size: 13px; line-height: 1.8;">
                  <li>Change your password right away</li>
                  <li>Review your recent account activity</li>
                  <li>Enable two-factor authentication</li>
                  <li>Contact our support team if needed</li>
                </ol>
              </div>

              <!-- Security Tips -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #166534; font-size: 12px; line-height: 1.6;">
                  <strong>💡 Security Tip:</strong> Always use a strong, unique password and enable two-factor authentication for better account security.
                </p>
              </div>

              <!-- Help Text -->
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                If you have any questions or concerns, please contact our support team at support@byteboom.io
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 11px;">
                © ${new Date().getFullYear()} ByteBoom. All rights reserved.
              </p>
              <p style="margin: 0 0 12px; color: #9ca3af; font-size: 10px;">
                This is an automated security notification. Please do not reply to this email.
              </p>
              <p style="margin: 0; color: #d1d5db; font-size: 10px;">
                ByteBoom Security · Automated Trading Signals
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
    }
}
