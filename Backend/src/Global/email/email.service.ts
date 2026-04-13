import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private brevoClient: BrevoClient;
  private senderEmail: string;
  private senderName: string;

  constructor() {
    // Initialize Brevo API client
    this.brevoClient = new BrevoClient({
      apiKey: process.env.BREVO_API_KEY || '',
    });

    this.senderEmail = process.env.EMAIL_FROM || 'no-reply@nexusledger.com';
    this.senderName = process.env.EMAIL_FROM_NAME || 'Nexus Ledger System';

    if (!process.env.BREVO_API_KEY) {
      this.logger.warn('BREVO_API_KEY not found in environment variables');
    } else {
      this.logger.log('Brevo email service initialized');
    }
  }

  /**
   * Load and compile HBS template
   * @param templateName - Name of the template file (without extension)
   * @param data - Data to inject into the template
   * @returns Compiled HTML string
   */
  private loadTemplate(templateName: string, data: Record<string, any>): string {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'Templates',
      `${templateName}.hbs`,
    );

    if (!fs.existsSync(templatePath)) {
      this.logger.error(
        `Email template "${templateName}" not found at ${templatePath}`,
      );
      throw new BadRequestException('Email template not found');
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);
    return template(data);
  }

  /**
   * Sends an email with the given subject, recipient, and dynamic template data.
   * @param to - Recipient email address (string or array)
   * @param subject - Email subject (dynamic)
   * @param templateName - Name of the handlebars template file (without extension)
   * @param templateData - Data to populate the template placeholders
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    templateName: string,
    templateData: Record<string, any>,
  ): Promise<void> {
    if (!to || !subject || !templateName) {
      throw new BadRequestException(
        'Email recipient, subject and template are required.',
      );
    }

    const html = this.loadTemplate(templateName, templateData);

    // Convert to array of recipient objects
    const recipients = Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }];

    try {
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: recipients,
        subject: subject,
        htmlContent: html,
      });
      this.logger.log(
        `Email sent to ${Array.isArray(to) ? to.join(', ') : to} with subject "${subject}" - MessageId: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error('Failed to send email via Brevo', error);
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send email with raw HTML content (no template)
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - HTML content
   */
  async sendRawEmail(
    to: string | string[],
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    if (!to || !subject || !htmlContent) {
      throw new BadRequestException(
        'Email recipient, subject and content are required.',
      );
    }

    const recipients = Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }];

    try {
      const result = await this.brevoClient.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: recipients,
        subject: subject,
        htmlContent: htmlContent,
      });
      this.logger.log(
        `Email sent to ${Array.isArray(to) ? to.join(', ') : to} with subject "${subject}" - MessageId: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error('Failed to send email via Brevo', error);
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send welcome email to new staff with temporary password
   * @param options - Email options
   */
  async sendStaffWelcomeEmail(options: {
    email: string;
    name: string;
    tempPassword: string;
  }): Promise<void> {
    const { email, name, tempPassword } = options;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(29,78,216,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:36px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.15em;color:#bfdbfe;text-transform:uppercase;">Nexus Ledger Supply Ltd</p>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Welcome Aboard!</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hello <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">Your staff account has been created. Here are your login credentials:</p>
            <div style="background:#f0f6ff;border:2px solid #bfdbfe;border-radius:10px;padding:20px;margin:0 0 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Temporary Password</p>
              <p style="margin:0;font-size:26px;font-weight:700;color:#1e3a8a;letter-spacing:4px;">${tempPassword}</p>
            </div>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;"><strong style="color:#1e293b;">Important:</strong> Please change your password after your first login for security purposes.</p>
            <a href="${frontendUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Login to Dashboard</a>
            <p style="margin:24px 0 0;font-size:14px;color:#64748b;">If you have any questions, please contact the administrator.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0f6ff;padding:20px 32px;border-top:1px solid #bfdbfe;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Nexus Ledger Supply Ltd · This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.sendRawEmail(
      email,
      'Welcome to Nexus Ledger - Your Staff Account is Ready!',
      html,
    );
  }

  /**
   * Send password reset email
   * @param options - Email options
   */
  async sendPasswordResetEmail(options: {
    email: string;
    name: string;
    resetToken: string;
    userType: 'admin' | 'staff' | 'student';
  }): Promise<void> {
    const { email, name, resetToken, userType } = options;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/${userType}/reset-password?token=${resetToken}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(29,78,216,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:36px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.15em;color:#bfdbfe;text-transform:uppercase;">Nexus Ledger Supply Ltd</p>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Password Reset Request</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hello <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ef4444);color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Reset Password</a>
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px 16px;margin:24px 0;">
              <strong style="color:#92400e;">Note:</strong> <span style="color:#78350f;font-size:13px;">This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</span>
            </div>
            <p style="margin:0 0 6px;font-size:13px;color:#64748b;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="margin:0;word-break:break-all;font-size:11px;color:#94a3b8;background:#f0f6ff;padding:10px;border-radius:6px;">${resetLink}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0f6ff;padding:20px 32px;border-top:1px solid #bfdbfe;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Nexus Ledger Supply Ltd · This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.sendRawEmail(email, 'Password Reset Request - Nexus Ledger', html);
  }

  /**
   * Send fee payment confirmation email
   * @param options - Email options
   */
  async sendPaymentConfirmationEmail(options: {
    email: string;
    studentName: string;
    feeName: string;
    amountPaid: string;
    totalPaid: string;
    remainingBalance: string;
    paymentDate: string;
    paymentMethod: string;
  }): Promise<void> {
    const {
      email,
      studentName,
      feeName,
      amountPaid,
      totalPaid,
      remainingBalance,
      paymentDate,
      paymentMethod,
    } = options;

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(29,78,216,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:36px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.15em;color:#bfdbfe;text-transform:uppercase;">Nexus Ledger Supply Ltd</p>
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Payment Received</h1>
            <p style="margin:0;font-size:28px;font-weight:800;color:#4ade80;">${amountPaid}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">Dear User, we have received a payment for <strong style="color:#1e293b;">${studentName}</strong>.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f6ff;border:1px solid #bfdbfe;border-radius:10px;overflow:hidden;">
              <tr style="border-bottom:1px solid #bfdbfe;">
                <td style="padding:12px 16px;font-size:13px;color:#64748b;">Description</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">${feeName}</td>
              </tr>
              <tr style="border-bottom:1px solid #bfdbfe;">
                <td style="padding:12px 16px;font-size:13px;color:#64748b;">Payment Date</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">${paymentDate}</td>
              </tr>
              <tr style="border-bottom:1px solid #bfdbfe;">
                <td style="padding:12px 16px;font-size:13px;color:#64748b;">Payment Method</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">${paymentMethod}</td>
              </tr>
              <tr style="border-bottom:1px solid #bfdbfe;">
                <td style="padding:12px 16px;font-size:13px;color:#64748b;">Total Paid</td>
                <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;">${totalPaid}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#64748b;">Remaining Balance</td>
                <td style="padding:12px 16px;font-size:14px;font-weight:700;color:${remainingBalance === '0 RWF' ? '#16a34a' : '#dc2626'};text-align:right;">${remainingBalance}</td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-size:14px;color:#64748b;">Thank you for your business.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0f6ff;padding:20px 32px;border-top:1px solid #bfdbfe;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Nexus Ledger Supply Ltd · This is an automated message, please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.sendRawEmail(
      email,
      `Payment Confirmation - ${feeName} - Nexus Ledger`,
      html,
    );
  }
}
