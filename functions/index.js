const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const gmailUser = defineSecret('GMAIL_USER');
const gmailPass = defineSecret('GMAIL_APP_PASSWORD');

exports.sendNotification = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const { to, toName, subject, message } = request.data;
    if (!to || !subject || !message) {
      throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser.value(),
        pass: gmailPass.value(),
      },
    });

    await transporter.sendMail({
      from: `"efficient.epp" <${gmailUser.value()}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1E3A8A;margin:0 0 16px">${subject}</h2>
          <p style="color:#374151;white-space:pre-wrap;line-height:1.6">${message}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>
          <p style="color:#9ca3af;font-size:12px;margin:0">
            efficient.epp &mdash; your academic productivity companion
          </p>
        </div>`,
    });

    return { success: true };
  }
);