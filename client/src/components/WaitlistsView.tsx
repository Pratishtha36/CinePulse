import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

import { fetchAPI } from '../services/api';
import confetti from 'canvas-confetti';

export const WaitlistsView: React.FC = () => {
  const [waitlists, setWaitlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadWaitlists = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/waitlist/my');
      setWaitlists(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitlists();
  }, []);

  const handleClaimOffer = async (offer: any) => {
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetchAPI(`/waitlist/offers/${offer.id}/claim`, {
        method: 'POST',
        body: JSON.stringify({
          showId: offer.showSeat.showId,
          showSeatId: offer.showSeatId,
        }),
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSuccessMsg(`Waitlist offer claimed! Booking reference: ${res.bookingReference}`);
      loadWaitlists();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveWaitlist = async (waitlistId: string) => {
    if (!window.confirm('Forfeit your FIFO queue position and leave this category waitlist?')) {
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');
      await fetchAPI(`/waitlist/${waitlistId}`, {
        method: 'DELETE',
      });
      setSuccessMsg('Successfully removed from waitlist.');
      loadWaitlists();
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
          04. AUDITING QUEUE ALLOCATIONS...
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
            04. FIFO WAITLIST QUEUES
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
            WAITLISTS & OFFERS
          </h1>
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">
            Automated 10-minute claim vouchers dispatched on seat cancellations.
          </p>
        </div>

        <span className="text-xs font-mono font-black px-3 py-1 bg-black text-white uppercase tracking-wider">
          {waitlists.length} QUEUED
        </span>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#10b981]">
          ✓ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#FF3000]">
          ⚠️ {errorMsg}
        </div>
      )}

      {waitlists.length === 0 ? (
        <div className="bg-white border-4 border-black p-12 text-center swiss-grid-pattern">
          <Clock className="w-12 h-12 text-black mx-auto mb-3" />
          <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-1">
            NO ACTIVE QUEUES
          </h3>
          <p className="text-xs text-neutral-600 uppercase font-bold tracking-wider max-w-md mx-auto">
            You are not currently enrolled in any sold-out category waitlists.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {waitlists.map((entry, idx) => {
            const hasPendingOffer = entry.offers && entry.offers.length > 0;
            const offer = hasPendingOffer ? entry.offers[0] : null;

            return (
              <div
                key={entry.id}
                className={`bg-white border-4 ${
                  hasPendingOffer ? 'border-[#FF3000]' : 'border-black'
                } p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative swiss-grid-pattern`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono font-black text-neutral-500">
                      [{String(idx + 1).padStart(2, '0')}]
                    </span>
                    <span className="px-2 py-0.5 bg-black text-white text-xs font-black uppercase tracking-widest">
                      TIER: {entry.seatCategory}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-mono font-black uppercase tracking-widest ${
                        hasPendingOffer ? 'bg-[#FF3000] text-white animate-pulse' : 'bg-[#F2F2F2] text-black border border-black'
                      }`}
                    >
                      {hasPendingOffer ? 'OFFER DISPATCHED' : `STATUS: ${entry.status}`}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase tracking-tight text-black">
                    {entry.show?.event?.title || 'Scheduled Event'}
                  </h3>

                  <p className="text-xs font-mono text-neutral-600 uppercase mt-1">
                    VENUE: {entry.show?.venue?.name || 'Main Auditorium'} • QUEUED AT:{' '}
                    {new Date(entry.createdAt).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {hasPendingOffer && offer ? (
                    <div className="flex items-center gap-4 bg-[#F2F2F2] p-3 border-2 border-black">
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#FF3000] block">
                          CLAIM WINDOW ACTIVE
                        </span>
                        <span className="text-sm font-mono font-black text-black">
                          SEAT {offer.showSeat?.seat?.rowLabel}{offer.showSeat?.seat?.colNumber}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleClaimOffer(offer)}
                        className="swiss-btn-accent px-5 py-2.5 text-xs tracking-widest"
                      >
                        {actionLoading ? 'CLAIMING...' : 'CLAIM PASS →'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleLeaveWaitlist(entry.id)}
                        className="px-4 py-2.5 text-xs font-mono font-black uppercase text-[#FF3000] border-2 border-[#FF3000] hover:bg-[#FF3000] hover:text-white transition-colors"
                      >
                        LEAVE QUEUE ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
