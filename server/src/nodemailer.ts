const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
  service: 'gmail',
  // port: 587,
  // secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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