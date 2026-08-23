"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRCodeDataUrl = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const generateQRCodeDataUrl = async (payload) => {
    const qrData = JSON.stringify({
        ref: payload.bookingReference,
        showId: payload.showId,
        email: payload.customerEmail,
        seats: payload.seats,
        issuedAt: new Date().toISOString(),
    });
    return await qrcode_1.default.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
            dark: '#1e1b4b',
            light: '#ffffff',
        },
    });
};
exports.generateQRCodeDataUrl = generateQRCodeDataUrl;
