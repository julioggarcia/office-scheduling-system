import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter: any | null = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendMail(opts: { to: string; subject: string; text?: string; html?: string }) {
  if (!transporter) {
    console.warn('SMTP not configured; skipping email', opts);
    return;
  }
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.ADMIN_EMAIL, ...opts });
}

export default transporter;
