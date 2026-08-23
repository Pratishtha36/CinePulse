import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';


import { fetchAPI } from '../services/api';

export const AdminVenueBuilder: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [totalRows, setTotalRows] = useState(4);
  const [totalCols, setTotalCols] = useState(6);
  const [categoryRules, setCategoryRules] = useState<Record<string, string>>({
    A: 'VIP',
    B: 'PREMIUM',
    C: 'STANDARD',
    D: 'STANDARD',
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadVenues = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/admin/venues');
      setVenues(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const handleRowCategoryChange = (rowLabel: string, category: string) => {
    setCategoryRules({ ...categoryRules, [rowLabel]: category });
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await fetchAPI('/admin/venues', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address,
          totalRows: Number(totalRows),
          totalCols: Number(totalCols),
          categoryRules,
        }),
      });

      setSuccessMsg(`Venue '${name}' blueprint created successfully!`);
      setName('');
      setAddress('');
      loadVenues();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!window.confirm('Delete this venue blueprint? This action is permanent.')) return;

    try {
      await fetchAPI(`/admin/venues/${venueId}`, { method: 'DELETE' });
      setSuccessMsg('Venue blueprint deleted.');
      loadVenues();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Generate row labels (A, B, C...)
  const rowLabels = Array.from({ length: Math.min(totalRows, 26) }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="border-b-4 border-black pb-6 mb-8 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
            01. ADMIN COMMAND STUDIO
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
            VENUE ARCHITECTURE & BLUEPRINTS
          </h1>
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">
            Design auditorium matrices, assign seat categories, and configure capacities.
          </p>
        </div>

        <span className="text-xs font-mono font-black px-3 py-1 bg-black text-white uppercase tracking-wider">
          {venues.length} CONFIGURED
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Venue Builder Form & Live Preview */}
        <div className="lg:col-span-7 bg-white border-4 border-black p-6 md:p-8 swiss-grid-pattern">
          <div className="border-b-2 border-black pb-3 mb-6">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
              01. SCHEMA SPECIFICATION
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              DESIGN NEW AUDITORIUM
            </h2>
          </div>

          <form onSubmit={handleCreateVenue} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  VENUE / AUDITORIUM NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="GRAND CINEMA HALL A"
                  className="swiss-input w-full uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  LOCATION / ADDRESS
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="BAHNHOFSTRASSE 42, ZÜRICH"
                  className="swiss-input w-full uppercase"
                />
              </div>
            </div>

            {/* Matrix Dimensions */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  TOTAL ROWS [MAX 26]
                </label>
                <input
                  type="number"
                  min="1"
                  max="26"
                  required
                  value={totalRows}
                  onChange={(e) => setTotalRows(parseInt(e.target.value, 10) || 1)}
                  className="swiss-input w-full font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  COLUMNS PER ROW
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={totalCols}
                  onChange={(e) => setTotalCols(parseInt(e.target.value, 10) || 1)}
                  className="swiss-input w-full font-mono font-bold"
                />
              </div>
            </div>

            {/* Row Category Tier Assigners */}
            <div className="pt-4 border-t-2 border-black">
              <span className="block text-xs font-mono font-black uppercase tracking-widest text-neutral-500 mb-3">
                TIER ALLOCATION BY ROW:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-[#F2F2F2] border-2 border-black">
                {rowLabels.map((label) => (
                  <div key={label} className="p-2 bg-white border border-black flex flex-col gap-1">
                    <span className="text-xs font-mono font-black text-black">ROW {label}</span>
                    <select
                      value={categoryRules[label] || 'STANDARD'}
                      onChange={(e) => handleRowCategoryChange(label, e.target.value)}
                      className="text-[11px] font-black uppercase bg-[#F2F2F2] border border-black p-1 focus:outline-none"
                    >
                      <option value="VIP">VIP</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="STANDARD">STANDARD</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Blueprint Live Matrix Preview */}
            <div className="pt-4 border-t-2 border-black">
              <span className="block text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500 mb-2">
                BLUEPRINT PREVIEW [{totalRows} × {totalCols} = {totalRows * totalCols} SEATS]:
              </span>
              <div className="p-4 bg-white border-2 border-black flex flex-col gap-1.5 items-center overflow-x-auto">
                <div className="w-full bg-black text-white py-1 text-center text-[10px] font-mono font-black uppercase tracking-widest mb-2">
                  [ SCREEN ]
                </div>
                {rowLabels.map((label) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-4 text-center font-mono font-bold text-[10px] text-neutral-400">
                      {label}
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(totalCols, 12) }, (_, c) => (
                        <div
                          key={c}
                          className="w-5 h-5 bg-[#F2F2F2] border border-black text-[9px] font-mono font-bold flex items-center justify-center"
                        >
                          {c + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="swiss-btn-primary w-full py-3 text-xs tracking-widest mt-4"
            >
              CREATE AUDITORIUM BLUEPRINT →
            </button>
          </form>
        </div>

        {/* Existing Configured Venues List */}
        <div className="lg:col-span-5 bg-white border-4 border-black p-6 space-y-4">
          <div className="border-b-2 border-black pb-3">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-1">
              02. ACTIVE REGISTRY
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-black">
              CONFIGURED AUDITORIUMS
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-mono font-bold uppercase">
              Loading venues...
            </div>
          ) : venues.length === 0 ? (
            <div className="p-8 bg-[#F2F2F2] border-2 border-black text-center text-xs font-bold uppercase tracking-wider text-neutral-500">
              NO AUDITORIUM LAYOUTS CREATED.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {venues.map((v, idx) => (
                <div
                  key={v.id}
                  className="p-4 bg-white border-2 border-black flex flex-col justify-between gap-3 swiss-grid-pattern"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-black text-neutral-500 block">
                        [{String(idx + 1).padStart(2, '0')}]
                      </span>
                      <h3 className="text-lg font-black uppercase tracking-tight text-black">
                        {v.name}
                      </h3>
                      <p className="text-xs text-neutral-600 font-mono uppercase mt-0.5">
                        📍 {v.address}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteVenue(v.id)}
                      className="p-1.5 text-neutral-400 hover:text-[#FF3000] border border-black hover:border-[#FF3000] transition-colors"
                      title="Delete Venue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-black flex items-center justify-between text-xs font-mono">
                    <span className="font-bold uppercase text-neutral-500">CAPACITY:</span>
                    <span className="font-black text-black">
                      {v.totalRows} ROWS × {v.totalCols} COLS ({v.totalRows * v.totalCols} SEATS)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
