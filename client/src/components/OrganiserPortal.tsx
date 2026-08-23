import React, { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';

import { fetchAPI } from '../services/api';

export const OrganiserPortal: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'MOVIE' | 'CONCERT'>('MOVIE');
  const [posterUrl, setPosterUrl] = useState('');

  // Show Creation states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [vipPrice, setVipPrice] = useState(50);
  const [premiumPrice, setPremiumPrice] = useState(30);
  const [standardPrice, setStandardPrice] = useState(15);

  // Ticket Scanner / Verification Tool state
  const [verifyRef, setVerifyRef] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [eventsData, summaryData] = await Promise.all([
        fetchAPI('/events'),
        fetchAPI('/organiser/analytics/summary').catch(() => []),
      ]);
      setEvents(eventsData);
      setAnalytics(summaryData);

      const venuesData = await fetchAPI('/admin/venues').catch(() => []);
      setVenues(venuesData);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const created = await fetchAPI('/organiser/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          type,
          posterUrl: posterUrl || undefined,
        }),
      });

      setSuccessMsg(`Event listing '${created.title}' published!`);
      setTitle('');
      setDescription('');
      setPosterUrl('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await fetchAPI('/organiser/shows', {
        method: 'POST',
        body: JSON.stringify({
          eventId: selectedEventId,
          venueId: selectedVenueId,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          categoryPrices: {
            VIP: Number(vipPrice),
            PREMIUM: Number(premiumPrice),
            STANDARD: Number(standardPrice),
          },
        }),
      });

      setSuccessMsg('Showtime slot successfully scheduled.');
      setStartTime('');
      setEndTime('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleVerifyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyRef) return;

    try {
      setVerifyLoading(true);
      setVerifyResult(null);
      setErrorMsg('');

      const res = await fetchAPI('/bookings/verify', {
        method: 'POST',
        body: JSON.stringify({ bookingReference: verifyRef.trim() }),
      });

      setVerifyResult(res);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Financial aggregates
  const totalRevenue = analytics.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0);
  const totalTicketsBooked = analytics.reduce((acc, curr) => acc + (curr.ticketsBooked || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="border-b-4 border-black pb-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
            02. ORGANISER OPERATIONS HUB
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
            BOX OFFICE LEDGER & MANAGEMENT
          </h1>
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">
            Publish event listings, schedule showtime tiers, and scan tickets at admission gates.
          </p>
        </div>

        <span className="text-xs font-mono font-black px-3 py-1 bg-black text-white uppercase tracking-wider w-fit">
          LEDGER ACTIVE
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

      {/* Financial Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border-4 border-black p-6 relative swiss-grid-pattern">
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500 block mb-1">
            01. GROSS BOX OFFICE
          </span>
          <div className="text-4xl font-black text-black">
            ${totalRevenue.toFixed(2)}
          </div>
          <span className="text-xs font-bold text-neutral-600 uppercase mt-1 block">
            Confirmed Sales Revenue
          </span>
        </div>

        <div className="bg-white border-4 border-black p-6 relative swiss-grid-pattern">
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500 block mb-1">
            02. TICKETS DISPATCHED
          </span>
          <div className="text-4xl font-black text-[#FF3000]">
            {totalTicketsBooked}
          </div>
          <span className="text-xs font-bold text-neutral-600 uppercase mt-1 block">
            Admissions Issued
          </span>
        </div>

        <div className="bg-white border-4 border-black p-6 relative swiss-grid-pattern">
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500 block mb-1">
            03. ACTIVE PRODUCTIONS
          </span>
          <div className="text-4xl font-black text-black">
            {events.length}
          </div>
          <span className="text-xs font-bold text-neutral-600 uppercase mt-1 block">
            Published Catalog Listings
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Publishing + Showtime Scheduling */}
        <div className="lg:col-span-7 space-y-8">
          {/* Section 1: Publish Event */}
          <div className="bg-white border-4 border-black p-6 md:p-8 swiss-grid-pattern">
            <div className="border-b-2 border-black pb-3 mb-6">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
                01. CATALOG PUBLISHER
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black">
                PUBLISH NEW EVENT LISTING
              </h2>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  EVENT TITLE
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="OPPENHEIMER: 70MM IMAX PRESENTATION"
                  className="swiss-input w-full uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    PRODUCTION CATEGORY
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="swiss-input w-full font-black uppercase"
                  >
                    <option value="MOVIE">CINEMA (MOVIE)</option>
                    <option value="CONCERT">LIVE CONCERT (MUSIC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    POSTER IMAGE URL
                  </label>
                  <input
                    type="url"
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="swiss-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  EVENT DESCRIPTION & PRODUCTION NOTES
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Written and directed by Christopher Nolan. Mastered in 70mm analog film format."
                  className="swiss-input w-full text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="swiss-btn-primary w-full py-3 text-xs tracking-widest mt-2"
              >
                PUBLISH EVENT LISTING →
              </button>
            </form>
          </div>

          {/* Section 2: Schedule Showtimes */}
          <div className="bg-white border-4 border-black p-6 md:p-8 swiss-grid-pattern">
            <div className="border-b-2 border-black pb-3 mb-6">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
                02. SCHEDULER & TIERS
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black">
                SCHEDULE SHOWTIME & PRICING
              </h2>
            </div>

            <form onSubmit={handleCreateShow} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    SELECT EVENT
                  </label>
                  <select
                    required
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="swiss-input w-full font-bold uppercase"
                  >
                    <option value="">SELECT PUBLISHED EVENT...</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    ASSIGN AUDITORIUM
                  </label>
                  <select
                    required
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="swiss-input w-full font-bold uppercase"
                  >
                    <option value="">SELECT CONFIGURED VENUE...</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.totalRows * v.totalCols} seats)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    START TIME
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="swiss-input w-full font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    END TIME
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="swiss-input w-full font-mono text-xs"
                  />
                </div>
              </div>

              {/* Price Tiers */}
              <div className="pt-2 border-t-2 border-black">
                <span className="block text-xs font-mono font-black uppercase tracking-widest text-neutral-500 mb-2">
                  CATEGORY TIER PRICING:
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-black mb-1">
                      VIP ($)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={vipPrice}
                      onChange={(e) => setVipPrice(Number(e.target.value))}
                      className="swiss-input w-full font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-black mb-1">
                      PREMIUM ($)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={premiumPrice}
                      onChange={(e) => setPremiumPrice(Number(e.target.value))}
                      className="swiss-input w-full font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-black mb-1">
                      STANDARD ($)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={standardPrice}
                      onChange={(e) => setStandardPrice(Number(e.target.value))}
                      className="swiss-input w-full font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="swiss-btn-primary w-full py-3 text-xs tracking-widest mt-2"
              >
                SCHEDULE SHOWTIME SLOT →
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Gate Ticket QR Validator Tool */}
        <div className="lg:col-span-5 bg-white border-4 border-black p-6 space-y-6">
          <div className="border-b-2 border-black pb-3">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
              03. GATE VALIDATION
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              GATE ADMISSION SCANNER
            </h2>
          </div>

          <form onSubmit={handleVerifyTicket} className="space-y-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                SCAN QR OR ENTER BOOKING REF
              </label>
              <input
                type="text"
                required
                value={verifyRef}
                onChange={(e) => setVerifyRef(e.target.value)}
                placeholder="TKT-A892CD"
                className="swiss-input w-full font-mono font-black text-base uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={verifyLoading}
              className="swiss-btn-primary w-full py-3 text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>{verifyLoading ? 'VALIDATING...' : 'VALIDATE TICKET ACCESS →'}</span>
            </button>
          </form>

          {verifyResult && (
            <div className="p-4 bg-[#F2F2F2] border-2 border-black space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-black uppercase">
                  {verifyResult.status || 'VERIFIED'}
                </span>
                <span className="text-xs font-mono font-bold text-neutral-600">
                  REF: {verifyResult.bookingReference}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black uppercase tracking-tight text-black">
                  {verifyResult.show?.event?.title || 'Admission Verified'}
                </h4>
                <p className="text-xs font-mono uppercase text-neutral-700 mt-0.5">
                  AUDITORIUM: {verifyResult.show?.venue?.name}
                </p>
                <p className="text-xs font-mono uppercase text-neutral-700">
                  ATTENDEE: {verifyResult.customer?.name} ({verifyResult.customer?.email})
                </p>
              </div>

              <div className="pt-2 border-t border-black">
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase block mb-1">
                  AUTHORIZED SEATS:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(verifyResult.tickets || []).map((t: any) => (
                    <span
                      key={t.id}
                      className="px-2 py-0.5 bg-black text-white text-xs font-mono font-bold"
                    >
                      SEAT {t.showSeat?.seat?.rowLabel}{t.showSeat?.seat?.colNumber} [{t.showSeat?.seat?.category}]
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
