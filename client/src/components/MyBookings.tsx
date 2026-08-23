import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, MapPin, QrCode } from 'lucide-react';
import { fetchAPI } from '../services/api';

interface MyBookingsProps {
  onViewTicket: (ticketData: any) => void;
}

export const MyBookings: React.FC<MyBookingsProps> = ({ onViewTicket }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/bookings/my');
      setBookings(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm('Confirm cancellation? Released seats will be automatically reallocated to the FIFO waitlist.')) {
      return;
    }

    try {
      setCancellingId(bookingId);
      setErrorMsg('');
      await fetchAPI(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      setSuccessMsg('Booking cancelled. Seats reallocated to waitlist queue.');
      loadBookings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-black">
        <div className="w-10 h-10 border-4 border-black border-t-[#FF3000] rounded-none animate-spin mb-3" />
        <span className="text-xs font-mono font-black uppercase tracking-widest">
          03. RETRIEVING PASS WALLET...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-6 mb-8">
        <div>
          <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
            03. PASS WALLET
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
            MY ADMISSION PASSES
          </h1>
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">
            Active reservations, admission QR codes, and cancellation triggers.
          </p>
        </div>

        <span className="text-xs font-mono font-black px-3 py-1 bg-black text-white uppercase tracking-wider">
          {bookings.length} {bookings.length === 1 ? 'PASS' : 'PASSES'}
        </span>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#FF3000]">
          ⚠️ {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#10b981]">
          ✓ {successMsg}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center swiss-grid-pattern">
          <Ticket className="w-12 h-12 text-black mx-auto mb-3" />
          <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-1">
            NO PASSES RECORDED
          </h3>
          <p className="text-xs text-neutral-600 uppercase font-bold tracking-wider max-w-md mx-auto">
            You do not have any active or previous ticket reservations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((b, idx) => {
            const isCancelled = b.status === 'CANCELLED';
            const show = b.show || {};
            const event = show.event || {};
            const venue = show.venue || {};
            const amountPaid = b.pricePaid ?? b.totalAmount ?? b.totalPaid ?? 0;
            const seatLabel = b.showSeat?.seat ? `${b.showSeat.seat.rowLabel}${b.showSeat.seat.colNumber}` : '';
            const category = b.showSeat?.seat?.category || '';

            return (
              <div
                key={b.id}
                className={`bg-white border-4 ${
                  isCancelled ? 'border-neutral-300 opacity-60' : 'border-black'
                } p-6 flex flex-col justify-between gap-4 relative swiss-grid-pattern`}
              >
                <div>
                  {/* Top Bar: Index & Status */}
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                    <span className="text-xs font-mono font-black text-neutral-500">
                      [{String(idx + 1).padStart(2, '0')}] REF: {b.bookingReference}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-widest ${
                        isCancelled
                          ? 'bg-neutral-200 text-neutral-600'
                          : 'bg-[#FF3000] text-white'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-2">
                    {event.title || 'Event Presentation'}
                  </h3>

                  <div className="text-xs font-mono space-y-1 text-neutral-700 uppercase">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF3000]" />
                      <span>{venue.name || 'Main Auditorium'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-black" />
                      <span>
                        {show.startTime
                          ? new Date(show.startTime).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).toUpperCase()
                          : 'N/A'}
                      </span>
                    </p>
                  </div>

                  {/* Seat Tags */}
                  <div className="mt-4 pt-3 border-t-2 border-black">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1.5">
                      ALLOCATED SEATS:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {b.tickets && b.tickets.length > 0 ? (
                        b.tickets.map((t: any) => (
                          <span
                            key={t.id || t.bookingId}
                            className="px-2 py-0.5 bg-black text-white text-xs font-mono font-bold"
                          >
                            SEAT {t.seat || `${t.showSeat?.seat?.rowLabel}${t.showSeat?.seat?.colNumber}`} [{t.category || t.showSeat?.seat?.category}]
                          </span>
                        ))
                      ) : seatLabel ? (
                        <span className="px-2 py-0.5 bg-black text-white text-xs font-mono font-bold">
                          SEAT {seatLabel} [{category}]
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400 font-mono">SEAT ASSIGNED</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t-2 border-black flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase block">
                      PAID:
                    </span>
                    <span className="text-xl font-black text-black">
                      ${Number(amountPaid).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isCancelled && (
                      <>
                        <button
                          type="button"
                          disabled={cancellingId === b.id}
                          onClick={() => handleCancel(b.id)}
                          className="px-3 py-2 text-xs font-mono font-black uppercase text-[#FF3000] border-2 border-[#FF3000] hover:bg-[#FF3000] hover:text-white transition-colors"
                        >
                          {cancellingId === b.id ? 'CANCELING...' : 'CANCEL'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onViewTicket({
                              booking: b,
                              bookingReference: b.bookingReference,
                              totalPaid: amountPaid,
                              totalAmount: amountPaid,
                              eventTitle: event.title,
                              venueName: venue.name,
                              startTime: show.startTime,
                              qrCode: b.qrCodeData || b.tickets?.[0]?.qrCodeData || null,
                              qrCodeDataUrl: b.qrCodeData || b.tickets?.[0]?.qrCodeData || null,
                              tickets: b.tickets || [
                                {
                                  seat: seatLabel,
                                  rowLabel: b.showSeat?.seat?.rowLabel,
                                  colNumber: b.showSeat?.seat?.colNumber,
                                  category,
                                  price: b.pricePaid,
                                  qrCodeDataUrl: b.qrCodeData,
                                },
                              ],
                            })
                          }
                          className="swiss-btn-primary px-4 py-2 text-xs tracking-widest flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR PASS →</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
