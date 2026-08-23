import QRCode from 'qrcode';

export const generateQRCodeDataUrl = async (payload: {
  bookingReference: string;
  showId: string;
  customerEmail: string;
  seats: string[];
}): Promise<string> => {
  const qrData = JSON.stringify({
    ref: payload.bookingReference,
    showId: payload.showId,
    email: payload.customerEmail,
    seats: payload.seats,
    issuedAt: new Date().toISOString(),
  });

  return await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
    color: {
      dark: '#1e1b4b',
      light: '#ffffff',
    },
  });
};
