const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4,  // <--- THE SILVER BULLET: Forces IPv4 only
  debug: true,
  logger: true
});

export async function sendEmail(to: string, subject: string, htmlBody: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set to send email");
  }
  await transporter.sendMail({
    from: user,
    to,
    subject,
    html: htmlBody
  });
  console.log("[email] sent:", subject);
}