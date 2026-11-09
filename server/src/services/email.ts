import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Whether SMTP is configured. If not, email sending is skipped (dev mode).
export const emailEnabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = emailEnabled
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for 587/25
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    })
    : null;

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;

    if (!transporter) {
        // No SMTP configured — log the reset link so the flow can still be completed in dev.
        console.log(`[email] SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
        return;
    }

    await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject: 'Reset your moneysplit password',
        text: `Hi ${name},\n\nWe received a request to reset your password. Click the link below to choose a new one:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— moneysplit`,
        html: `<p>Hi ${name},</p>
<p>We received a request to reset your password. Click the button below to choose a new one:</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#4a7c59;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
<p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
<p>This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
<p>— moneysplit</p>`
    });
}