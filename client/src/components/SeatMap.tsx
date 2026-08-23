import React, { useEffect, useState, useCallback } from 'react';
import { Clock, ChevronLeft, X } from 'lucide-react';
import { fetchAPI } from '../services/api';
import { getSocket, joinShowRoom, leaveShowRoom } from '../services/socket';
import confetti from 'canvas-confetti';

interface SeatMapProps {
  showId: string;
  currentUser: any;
  onBack: () => void;
  onBookingSuccess: (ticketData: any) => void;
  onOpenWaitlist: (showId: string, category: string) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  showId,
  currentUser,
  onBack,
  onBookingSuccess,
  onOpenWaitlist,
}) => {
  const [seatMap, setSeatMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newlySelectedSeatIds, setNewlySelectedSeatIds] = useState<string[]>([]);
  const [activeHolds, setActiveHolds] = useState<any[]>([]);
  const [holdTimerSeconds, setHoldTimerSeconds] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadSeatMap = useCallback(async () => {
    if (!showId) {
      setErrorMsg('No show ID provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchAPI(`/shows/${showId}/seats`);
      setSeatMap(data);
      setErrorMsg('');

      const myHeldSeats = (data?.seats || []).filter((s: any) => s.heldByMe);
      if (myHeldSeats.length > 0) {
        setActiveHolds(
          myHeldSeats.map((s: any) => ({
            showSeatId: s.showSeatId,
            expiresAt: s.holdExpiresAt,
          }))
        );
      } else {
        setActiveHolds([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load auditorium seating data.');
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    loadSeatMap();
    if (!showId) return;

    joinShowRoom(showId);

    const socket = getSocket();
    const handleSeatLocked = (payload: any) => {
      if (payload.showId === showId) {
        setSeatMap((prev: any) => {
          if (!prev || !prev.seats) return prev;
          return {
            ...prev,
            seats: prev.seats.map((seat: any) => {
              if (payload.seatIds.includes(seat.showSeatId)) {
                return {
                  ...seat,
                  status: 'HELD',
                  heldByMe: payload.customerId === currentUser?.id,
                  holdExpiresAt: payload.expiresAt,
                };
              }
              return seat;
            }),
          };
        });
      }
    };

    const handleSeatReleased = (payload: any) => {
      if (payload.showId === showId) {
        setSeatMap((prev: any) => {
          if (!prev || !prev.seats) return prev;
          return {
            ...prev,
            seats: prev.seats.map((seat: any) => {
              if (payload.seatIds.includes(seat.showSeatId)) {
                return {
                  ...seat,
                  status: 'AVAILABLE',
                  heldByMe: false,
                  holdExpiresAt: null,
                };
              }
              return seat;
            }),
          };
        });
      }
    };

    const handleSeatBooked = (payload: any) => {
      if (payload.showId === showId) {
        setSeatMap((prev: any) => {
          if (!prev || !prev.seats) return prev;
          return {
            ...prev,
            seats: prev.seats.map((seat: any) => {
              if (payload.seatIds.includes(seat.showSeatId)) {
                return {
                  ...seat,
                  status: 'BOOKED',
                  heldByMe: false,
                };
              }
              return seat;
            }),
          };
        });
      }
    };

    socket.on('seat_locked', handleSeatLocked);
    socket.on('seat_released', handleSeatReleased);
    socket.on('seat_booked', handleSeatBooked);

    return () => {
      leaveShowRoom(showId);
      socket.off('seat_locked', handleSeatLocked);
      socket.off('seat_released', handleSeatReleased);
      socket.off('seat_booked', handleSeatBooked);
    };
  }, [showId, currentUser?.id, loadSeatMap]);

  // Hold Timer Countdown
  useEffect(() => {
    if (activeHolds.length === 0) {
      setHoldTimerSeconds(null);
      return;
    }

    const interval = setInterval(() => {
      const earliestExpiry = activeHolds.reduce((min, h) => {
        const time = new Date(h.expiresAt).getTime();
        return time < min ? time : min;
      }, Infinity);

      const remainingMs = earliestExpiry - Date.now();
      if (remainingMs <= 0) {
        setHoldTimerSeconds(0);
        setActiveHolds([]);
        loadSeatMap();
        clearInterval(interval);
      } else {
        setHoldTimerSeconds(Math.floor(remainingMs / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHolds, loadSeatMap]);

  const handleSeatClick = (seat: any) => {
    if (seat.status === 'BOOKED') return;

    if (seat.status === 'HELD' && !seat.heldByMe) return;

    if (seat.heldByMe) {
      return;
    }

    if (newlySelectedSeatIds.includes(seat.showSeatId)) {
      setNewlySelectedSeatIds((prev) => prev.filter((id) => id !== seat.showSeatId));
    } else {
      setNewlySelectedSeatIds((prev) => [...prev, seat.showSeatId]);
    }
  };

  const handleHoldSeats = async () => {
    if (!currentUser) {
      setErrorMsg('Please sign in to place seat reservations.');
      return;
    }
    if (newlySelectedSeatIds.length === 0) return;

    try {
      setActionLoading(true);
      setErrorMsg('');
      await fetchAPI(`/shows/${showId}/hold`, {
        method: 'POST',
        body: JSON.stringify({ showSeatIds: newlySelectedSeatIds }),
      });

      setNewlySelectedSeatIds([]);
      await loadSeatMap();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseSpecificSeat = async (seatId: string) => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      await fetchAPI(`/shows/${showId}/release`, {
        method: 'POST',
        body: JSON.stringify({ showSeatIds: [seatId] }),
      });
      await loadSeatMap();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseAllHolds = async () => {
    const heldIds = activeHolds.map((h) => h.showSeatId);
    if (heldIds.length === 0) return;

    try {
      setActionLoading(true);
      setErrorMsg('');
      await fetchAPI(`/shows/${showId}/release`, {
        method: 'POST',
        body: JSON.stringify({ showSeatIds: heldIds }),
      });
      setActiveHolds([]);
      await loadSeatMap();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!currentUser) return;

    const seatsToBook = activeHolds.map((h) => h.showSeatId);
    if (seatsToBook.length === 0) {
      setErrorMsg('No held seats available to book. Please hold seats first.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetchAPI('/bookings/confirm', {
        method: 'POST',
        body: JSON.stringify({
          showId,
          showSeatIds: seatsToBook,
        }),
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setActiveHolds([]);
      setNewlySelectedSeatIds([]);
      onBookingSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-black">
        <div className="w-10 h-10 border-4 border-black border-t-[#FF3000] rounded-none animate-spin mb-3" />
        <span className="text-xs font-mono font-black uppercase tracking-widest">
          LOADING AUDITORIUM SEATS...
        </span>
      </div>
    );
  }

  if (!seatMap) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-white border-4 border-black my-8">
        <p className="text-sm font-black uppercase mb-4">Auditorium data unavailable for this show.</p>
        <button type="button" onClick={onBack} className="swiss-btn-primary">
          ← RETURN TO SHOWS
        </button>
      </div>
    );
  }

  const eventTitle = seatMap.eventTitle || seatMap.show?.event?.title || 'EVENT PRESENTATION';
  const venueName = seatMap.venueName || seatMap.show?.venue?.name || 'MAIN AUDITORIUM';
  const startTime = seatMap.startTime || seatMap.show?.startTime;
  const categoryPrices: Record<string, number> = seatMap.categoryPrices || seatMap.show?.categoryPrices || {};
  const seats: any[] = seatMap.seats || [];

  // Group seats by Category & Row
  const categories = ['VIP', 'PREMIUM', 'STANDARD'];
  const seatsByCategory: Record<string, any[]> = {
    VIP: [],
    PREMIUM: [],
    STANDARD: [],
  };

  seats.forEach((seat: any) => {
    if (seatsByCategory[seat.category]) {
      seatsByCategory[seat.category].push(seat);
    }
  });

  const selectedSeats = seats.filter((s: any) =>
    newlySelectedSeatIds.includes(s.showSeatId)
  );
  const myHeldSeats = seats.filter((s: any) => s.heldByMe);

  const totalHeldPrice = myHeldSeats.reduce((sum: number, s: any) => sum + s.price, 0);
  const totalSelectedPrice = selectedSeats.reduce((sum: number, s: any) => sum + s.price, 0);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-4 border-black pb-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-mono font-black uppercase tracking-widest text-black hover:text-[#FF3000] flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>[BACK TO SHOWS]</span>
          </button>
          <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
            SEAT SELECTION
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
            {eventTitle}
          </h1>
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">
            {venueName} {startTime ? `— ${new Date(startTime).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).toUpperCase()}` : ''}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 bg-[#F2F2F2] p-3 border-2 border-black">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-black" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider">AVAILABLE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#FF3000] border-2 border-[#FF3000]" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#FF3000]">SELECTED / HELD</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-black border-2 border-black" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider">RESERVED</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#E5E5E5] border-2 border-[#d1d5db]" />
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-neutral-400">BOOKED</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#FF3000] flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} className="text-white hover:text-[#FF3000]">
            [DISMISS ✕]
          </button>
        </div>
      )}

      {/* Main Grid: Seating Chart (8 cols) + Swiss Ledger Cart (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Seating Schematic */}
        <div className="lg:col-span-8 bg-white border-4 border-black p-6 md:p-8 swiss-grid-pattern">
          {/* Projection Screen Geometric Bar */}
          <div className="mb-12">
            <div className="w-full bg-black text-white py-2 text-center text-xs font-mono font-black uppercase tracking-widest border-2 border-black">
              [ STAGE / SCREEN ]
            </div>
            <div className="h-1 bg-[#FF3000] w-full" />
          </div>

          {/* Seat Categories Matrix */}
          <div className="space-y-10">
            {categories.map((category) => {
              const catSeats = seatsByCategory[category] || [];
              if (catSeats.length === 0) return null;

              const price = categoryPrices[category] || 15;
              const rows: Record<string, any[]> = {};
              catSeats.forEach((s) => {
                if (!rows[s.rowLabel]) rows[s.rowLabel] = [];
                rows[s.rowLabel].push(s);
              });

              // Check if all seats in category are sold out
              const isCategorySoldOut = catSeats.every((s) => s.status === 'BOOKED');

              return (
                <div key={category} className="border-t-2 border-black pt-6">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 bg-black text-white text-xs font-black uppercase tracking-widest">
                        {category}
                      </span>
                      <span className="text-xs font-mono font-black text-black">
                        ${Number(price).toFixed(2)}
                      </span>
                    </div>

                    {isCategorySoldOut && (
                      <button
                        type="button"
                        onClick={() => onOpenWaitlist(showId, category)}
                        className="px-3 py-1 bg-[#FF3000] text-white text-xs font-black uppercase tracking-widest border-2 border-black hover:bg-black transition-colors"
                      >
                        JOIN WAITLIST +
                      </button>
                    )}
                  </div>

                  {/* Rows Matrix */}
                  <div className="flex flex-col gap-2 items-center overflow-x-auto py-2">
                    {Object.keys(rows).sort().map((rowLabel) => (
                      <div key={rowLabel} className="flex items-center gap-2">
                        {/* Row Identifier */}
                        <span className="w-6 text-center font-mono font-black text-xs text-neutral-500">
                          {rowLabel}
                        </span>

                        {/* Seats in Row */}
                        <div className="flex gap-1.5">
                          {rows[rowLabel].sort((a, b) => a.colNumber - b.colNumber).map((seat) => {
                            const isNewlySelected = newlySelectedSeatIds.includes(seat.showSeatId);
                            const isHeldByMe = seat.heldByMe;
                            const isLocked = seat.status === 'HELD' && !seat.heldByMe;
                            const isBooked = seat.status === 'BOOKED';

                            let seatStyle = 'swiss-seat-available';
                            if (isNewlySelected || isHeldByMe) seatStyle = 'swiss-seat-selected';
                            else if (isLocked) seatStyle = 'swiss-seat-held';
                            else if (isBooked) seatStyle = 'swiss-seat-booked';

                            return (
                              <button
                                key={seat.showSeatId}
                                type="button"
                                disabled={isLocked || isBooked}
                                onClick={() => handleSeatClick(seat)}
                                className={`swiss-seat ${seatStyle}`}
                                title={`${seat.rowLabel}${seat.colNumber} — $${seat.price} (${seat.status})`}
                              >
                                {seat.colNumber}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Swiss Reservation Ledger */}
        <div className="lg:col-span-4 bg-white border-4 border-black p-6 space-y-6">
          <div className="border-b-2 border-black pb-3">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
              SUMMARY
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight text-black">
              ORDER SUMMARY
            </h2>
          </div>

          {/* Active Hold Countdown Timer */}
          {holdTimerSeconds !== null && (
            <div className="p-4 bg-black text-white border-2 border-black">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FF3000] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>SEATS HELD FOR:</span>
                </span>
                <span className="text-lg font-mono font-black text-[#FF3000]">
                  {formatTimer(holdTimerSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 font-medium">
                Your seats are held. Complete checkout before the timer expires to secure your booking.
              </p>
            </div>
          )}

          {/* Held Seats Breakdown */}
          {myHeldSeats.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span>HELD SEATS [{myHeldSeats.length}]</span>
                <button
                  type="button"
                  onClick={handleReleaseAllHolds}
                  className="text-[10px] font-mono font-bold text-neutral-500 hover:text-[#FF3000]"
                >
                  RELEASE ALL ✕
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {myHeldSeats.map((s: any) => (
                  <div
                    key={s.showSeatId}
                    className="p-2.5 bg-[#F2F2F2] border border-black flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <span className="font-black text-black block">
                        SEAT {s.rowLabel}{s.colNumber}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase">
                        {s.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-black">${s.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleReleaseSpecificSeat(s.showSeatId)}
                        className="text-neutral-400 hover:text-[#FF3000]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t-2 border-black flex items-center justify-between font-black">
                <span className="text-xs uppercase tracking-wider">HELD TOTAL:</span>
                <span className="text-lg">${totalHeldPrice.toFixed(2)}</span>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmBooking}
                className="swiss-btn-accent w-full py-3 text-xs tracking-widest mt-2"
              >
                {actionLoading ? 'PROCESSING...' : `CONFIRM & PAY $${totalHeldPrice.toFixed(2)} →`}
              </button>
            </div>
          )}

          {/* Newly Selected Seats (Pending Hold) */}
          {selectedSeats.length > 0 && (
            <div className="space-y-3 pt-4 border-t-2 border-dashed border-neutral-300">
              <span className="text-xs font-black uppercase tracking-wider block">
                SELECTED [{selectedSeats.length}]
              </span>

              <div className="flex flex-wrap gap-1">
                {selectedSeats.map((s: any) => (
                  <span
                    key={s.showSeatId}
                    className="px-2 py-1 bg-[#F2F2F2] border border-black text-xs font-mono font-bold"
                  >
                    {s.rowLabel}{s.colNumber}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between font-black text-xs">
                <span className="uppercase">PENDING TOTAL:</span>
                <span>${totalSelectedPrice.toFixed(2)}</span>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleHoldSeats}
                className="swiss-btn-primary w-full py-3 text-xs tracking-widest"
              >
                {actionLoading ? 'LOCKING SEATS...' : `HOLD ${selectedSeats.length} SEAT(S) (10 MIN) →`}
              </button>
            </div>
          )}

          {myHeldSeats.length === 0 && selectedSeats.length === 0 && (
            <div className="p-6 bg-[#F2F2F2] border-2 border-black text-center text-xs font-bold uppercase tracking-wider text-neutral-600">
              CLICK AVAILABLE SEATS ON THE AUDITORIUM MATRIX TO BEGIN RESERVATION.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
