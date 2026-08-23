"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWaitlistOfferEmail = exports.sendBookingConfirmationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Transporter using ethereal or local mock for easy development testing
let transporter = null;
const getTransporter = async () => {
    if (!transporter) {
        // Generate test Ethereal account if no custom SMTP provided
        const testAccount = await nodemailer_1.default.createTestAccount();
        transporter = nodemailer_1.default.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
    return transporter;
};
const sendBookingConfirmationEmail = async (params) => {
    try {
        const mailer = await getTransporter();
        // Extract base64 part of QR code
        const base64Data = params.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
        const info = await mailer.sendMail({
            from: '"Ticket System" <tickets@ticketbooking.com>',
            to: params.toEmail,
            subject: `🎉 Booking Confirmed: ${params.eventTitle} - Ref: ${params.bookingReference}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Ticket Booking Confirmation</h2>
          <p>Hi <strong>${params.customerName}</strong>,</p>
          <p>Your booking for <strong>${params.eventTitle}</strong> is confirmed!</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Booking Reference:</strong> <code style="font-size: 16px; color: #4f46e5;">${params.bookingReference}</code></p>
            <p style="margin: 5px 0;"><strong>Venue:</strong> ${params.venueName}</p>
            <p style="margin: 5px 0;"><strong>Show Time:</strong> ${params.showTime}</p>
            <p style="margin: 5px 0;"><strong>Seat(s):</strong> ${params.seatInfo}</p>
            <p style="margin: 5px 0;"><strong>Total Paid:</strong> $${params.totalPaid.toFixed(2)}</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <p><strong>Present this QR Code at the venue entry:</strong></p>
            <img src="cid:qrcode_ticket" alt="QR Code Ticket" style="width: 200px; height: 200px; border: 2px dashed #4f46e5; padding: 10px;" />
          </div>

          <p style="color: #64748b; font-size: 12px; text-align: center;">Thank you for booking with us!</p>
        </div>
      `,
            attachments: [
                {
                    filename: `ticket_${params.bookingReference}.png`,
                    content: base64Data,
                    encoding: 'base64',
                    cid: 'qrcode_ticket',
                },
            ],
        });
        console.log(`[EMAIL] Booking Confirmation Sent to ${params.toEmail}. Preview URL: ${nodemailer_1.default.getTestMessageUrl(info)}`);
        return info;
    }
    catch (error) {
        console.error('[EMAIL ERROR] Failed to send booking confirmation email:', error);
    }
};
exports.sendBookingConfirmationEmail = sendBookingConfirmationEmail;
const sendWaitlistOfferEmail = async (params) => {
    try {
        const mailer = await getTransporter();
        const formattedExpiry = new Date(params.offerExpiresAt).toLocaleTimeString();
        const info = await mailer.sendMail({
            from: '"Ticket System" <tickets@ticketbooking.com>',
            to: params.toEmail,
            subject: `🚨 A Seat is Available for ${params.eventTitle}! Claim Your Seat Now`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f59e0b; borderRadius: 8px;">
          <h2 style="color: #d97706; text-align: center;">Waitlist Seat Offer</h2>
          <p>Hi <strong>${params.customerName}</strong>,</p>
          <p>Great news! A <strong>${params.seatCategory}</strong> seat (<strong>${params.seatLabel}</strong>) has just opened up for <strong>${params.eventTitle}</strong>!</p>
          
          <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #fef3c7;">
            <p style="margin: 5px 0; color: #b45309;"><strong>⚠️ Important:</strong> You have until <strong>${formattedExpiry}</strong> to claim this seat offer before it moves to the next person in line.</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${params.claimOfferUrl}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Claim Ticket Now
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; text-align: center;">If you do not claim this seat before the deadline, your reservation offer will automatically expire.</p>
        </div>
      `,
        });
        console.log(`[EMAIL] Waitlist Offer Sent to ${params.toEmail}. Preview URL: ${nodemailer_1.default.getTestMessageUrl(info)}`);
        return info;
    }
    catch (error) {
        console.error('[EMAIL ERROR] Failed to send waitlist offer email:', error);
    }
};
exports.sendWaitlistOfferEmail = sendWaitlistOfferEmail;
