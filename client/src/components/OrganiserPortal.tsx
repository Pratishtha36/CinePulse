import React, { useState, useEffect, useRef } from 'react';
import { QrCode, UploadCloud, Image as ImageIcon, CheckCircle, X, Loader2 } from 'lucide-react';

import { fetchAPI, uploadPosterImage } from '../services/api';

export const OrganiserPortal: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'MOVIE' | 'CONCERT'>('MOVIE');
  const [posterUrl, setPosterUrl] = useState('');

  // Poster Image Upload States
  const [posterMode, setPosterMode] = useState<'upload' | 'url'>('upload');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [isPublishing, setIsPublishing] = useState(false);
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

  const handleFileProcess = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Invalid file format. Please upload JPG, PNG, WebP, or AVIF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds the 5MB limit.`);
      return;
    }

    setPosterFile(file);
    const localPreview = URL.createObjectURL(file);
    setPosterPreview(localPreview);
    setIsUploadingPoster(true);
    setUploadProgress(0);
    setErrorMsg('');

    try {
      const cdnUrl = await uploadPosterImage(file, (percent) => {
        setUploadProgress(percent);
      });
      setPosterUrl(cdnUrl);
      setSuccessMsg('Poster image uploaded successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload poster image.');
      setPosterFile(null);
      setPosterPreview(null);
      setPosterUrl('');
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePoster = () => {
    setPosterFile(null);
    setPosterPreview(null);
    setPosterUrl('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isUploadingPoster) {
      setErrorMsg('Please wait for the poster upload to finish before publishing.');
      return;
    }

    if (!title.trim() || title.trim().length < 2) {
      setErrorMsg('Event title must be at least 2 characters long.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg('Event description must be at least 5 characters long.');
      return;
    }

    try {
      setIsPublishing(true);
      const created = await fetchAPI('/organiser/events', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          posterUrl: posterUrl ? posterUrl.trim() : undefined,
        }),
      });

      setSuccessMsg(`Event listing '${created.title}' published successfully!`);
      setTitle('');
      setDescription('');
      setPosterUrl('');
      setPosterFile(null);
      setPosterPreview(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish event listing.');
    } finally {
      setIsPublishing(false);
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

              {/* Poster Asset Uploader (Production S3 Direct / Local) */}
              <div className="border-2 border-black p-4 bg-[#FAFAFA]">
                <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#FF3000]" />
                    EVENT POSTER ASSET
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPosterMode('upload')}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider border transition-colors ${
                        posterMode === 'upload'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-600 border-black hover:bg-neutral-100'
                      }`}
                    >
                      FILE UPLOAD
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosterMode('url')}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider border transition-colors ${
                        posterMode === 'url'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-neutral-600 border-black hover:bg-neutral-100'
                      }`}
                    >
                      DIRECT URL
                    </button>
                  </div>
                </div>

                {posterMode === 'upload' ? (
                  <div>
                    {posterPreview || posterUrl ? (
                      <div className="flex items-start gap-4 p-3 bg-white border-2 border-black">
                        {/* Thumbnail */}
                        <div className="w-20 h-28 shrink-0 bg-neutral-200 border border-black overflow-hidden relative">
                          <img
                            src={posterPreview || posterUrl}
                            alt="Poster Preview"
                            className="w-full h-full object-cover"
                          />
                          {isUploadingPoster && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Details & Controls */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-tight text-black truncate block">
                              {posterFile ? posterFile.name : 'Uploaded Poster'}
                            </span>
                            <button
                              type="button"
                              onClick={handleRemovePoster}
                              disabled={isUploadingPoster}
                              className="text-[10px] font-mono font-black uppercase tracking-wider text-[#FF3000] hover:underline flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> REMOVE
                            </button>
                          </div>

                          {posterFile && (
                            <span className="text-[10px] font-mono text-neutral-500 block">
                              {(posterFile.size / (1024 * 1024)).toFixed(2)} MB • {posterFile.type}
                            </span>
                          )}

                          {isUploadingPoster ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono font-bold text-neutral-600">
                                <span>UPLOADING TO STORAGE...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full h-2 bg-neutral-200 border border-black overflow-hidden">
                                <div
                                  className="h-full bg-[#FF3000] transition-all duration-150"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] font-mono font-black text-[#10b981] uppercase tracking-wider">
                              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>STORAGE ASSET READY</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Box */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-6 border-2 border-dashed text-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-[#FF3000] bg-[#FF3000]/5'
                            : 'border-black bg-white hover:border-[#FF3000] hover:bg-neutral-50'
                        }`}
                      >
                        <UploadCloud className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                        <span className="block text-xs font-black uppercase tracking-wider text-black">
                          DRAG & DROP POSTER OR CLICK TO BROWSE
                        </span>
                        <span className="block text-[10px] font-mono font-bold text-neutral-500 uppercase mt-1">
                          SUPPORTS JPG, PNG, WEBP, AVIF (MAX 5MB • 2:3 RATIO RECOMMENDED)
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileProcess(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fallback Direct URL Input */
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={posterUrl}
                      onChange={(e) => {
                        setPosterUrl(e.target.value);
                        setPosterPreview(e.target.value);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="swiss-input w-full text-xs font-mono"
                    />
                    <span className="text-[10px] font-mono font-bold text-neutral-500 block">
                      PASTE A DIRECT ACCESSIBLE IMAGE URL (HTTPS)
                    </span>
                  </div>
                )}
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

              {/* Inline Feedback directly in form */}
              {errorMsg && (
                <div className="p-3 bg-black text-[#FF3000] text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#FF3000] animate-in fade-in">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-black text-[#10b981] text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#10b981] animate-in fade-in">
                  ✓ {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isPublishing || isUploadingPoster}
                className="swiss-btn-primary w-full py-3 text-xs tracking-widest mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>PUBLISHING CATALOG LISTING...</span>
                  </>
                ) : isUploadingPoster ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>UPLOADING POSTER ASSET ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <span>PUBLISH EVENT LISTING →</span>
                )}
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
