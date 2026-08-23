import React from 'react';
import { Printer } from 'lucide-react';

interface TicketModalProps {
  bookingResult: any;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ bookingResult, onClose }) => {
  const data = bookingResult || {};
  const booking = data.booking || {};

  const bookingReference =
    data.bookingReference || booking.bookingReference || 'TKT-CONFIRMED';

  const eventTitle =
    data.eventTitle ||
    data.show?.event?.title ||
    booking.show?.event?.title ||
    'ADMISSION PASS';

  const venueName =
    data.venueName ||
    data.show?.venue?.name ||
    booking.show?.venue?.name ||
    'MAIN AUDITORIUM';

  const rawStartTime =
    data.startTime ||
    data.show?.startTime ||
    booking.show?.startTime ||
    data.showStartTime;

  const formattedStartTime = rawStartTime
    ? new Date(rawStartTime).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).toUpperCase()
    : 'N/A';

  const totalAmount =
    data.totalPaid ??
    data.totalAmount ??
    booking.totalAmount ??
    booking.pricePaid ??
    0;

  const qrCodeImage =
    data.qrCode ||
    data.qrCodeDataUrl ||
    booking.qrCodeData ||
    data.tickets?.[0]?.qrCodeDataUrl ||
    booking.tickets?.[0]?.qrCodeData ||
    null;

  // Extract seats list
  const ticketsList: any[] = data.tickets || booking.tickets || [];
  const singleSeat =
    data.seat ||
    (booking.showSeat?.seat
      ? `${booking.showSeat.seat.rowLabel}${booking.showSeat.seat.colNumber}`
      : '');
  const singleCategory =
    data.category || booking.showSeat?.seat?.category || 'VIP';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-white border-4 border-black p-8 relative swiss-grid-pattern">
        {/* Header Tag */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-6">
          <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000]">
            00. ADMISSION VOUCHER
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black uppercase text-black hover:text-[#FF3000]"
          >
            [CLOSE ✕]
          </button>
        </div>

        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#FF3000] text-white text-[10px] font-mono font-black uppercase tracking-widest">
              CONFIRMED
            </span>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
            {eventTitle}
          </h2>
          <p className="text-xs font-mono font-bold text-neutral-600 uppercase tracking-wider mt-1">
            REF: {bookingReference}
          </p>
        </div>

        {/* Tabular Details Grid */}
        <div className="border-2 border-black divide-y-2 divide-black bg-white mb-6">
          <div className="grid grid-cols-2 divide-x-2 divide-black p-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                VENUE / AUDITORIUM
              </span>
              <span className="font-black text-black uppercase">
                {venueName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                SHOWTIME
              </span>
              <span className="font-black text-black">
                {formattedStartTime}
              </span>
            </div>
          </div>

          <div className="p-3">
            <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1.5">
              SEAT ASSIGNMENTS:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ticketsList.length > 0 ? (
                ticketsList.map((t: any, idx: number) => {
                  const seatName =
                    t.seat ||
                    (t.rowLabel && t.colNumber ? `${t.rowLabel}${t.colNumber}` : null) ||
                    (t.showSeat?.seat ? `${t.showSeat.seat.rowLabel}${t.showSeat.seat.colNumber}` : `SEAT ${idx + 1}`);
                  const seatCat =
                    t.category || t.showSeat?.seat?.category || 'VIP';

                  return (
                    <span
                      key={t.id || t.bookingId || idx}
                      className="px-2.5 py-1 bg-black text-white text-xs font-mono font-black uppercase"
                    >
                      SEAT {seatName} [{seatCat}]
                    </span>
                  );
                })
              ) : singleSeat ? (
                <span className="px-2.5 py-1 bg-black text-white text-xs font-mono font-black uppercase">
                  SEAT {singleSeat} [{singleCategory}]
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-black text-white text-xs font-mono font-black uppercase">
                  SEAT ALLOCATED [CONFIRMED]
                </span>
              )}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="p-4 flex flex-col items-center justify-center bg-[#F2F2F2]">
            {qrCodeImage ? (
              <div className="p-2 bg-white border-2 border-black mb-2">
                <img
                  src={qrCodeImage}
                  alt={`Pass QR Code ${bookingReference}`}
                  className="w-36 h-36 object-contain"
                />
              </div>
            ) : (
              <div className="w-36 h-36 bg-white border-2 border-black flex flex-col items-center justify-center p-3 text-center mb-2">
                <span className="text-2xl font-black font-mono text-black mb-1">■■■</span>
                <span className="text-[10px] font-mono font-bold text-neutral-600 uppercase">
                  DIGITAL PASS
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase">
                  {bookingReference}
                </span>
              </div>
            )}
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-600">
              SCAN AT GATE FOR ACCESS
            </span>
          </div>

          {/* Total Amount Paid */}
          <div className="p-3 flex items-baseline justify-between bg-white">
            <span className="text-xs font-mono font-black uppercase">
              TOTAL AMOUNT PAID:
            </span>
            <span className="text-2xl font-black text-black">
              ${Number(totalAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="swiss-btn-secondary py-3 text-xs tracking-widest flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT PASS</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="swiss-btn-primary py-3 text-xs tracking-widest"
          >
            DISMISS →
          </button>
        </div>
      </div>
    </div>
  );
};
