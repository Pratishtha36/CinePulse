import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { EventCard } from './components/EventCard';
import { SeatMap } from './components/SeatMap';
import { TicketModal } from './components/TicketModal';
import { WaitlistModal } from './components/WaitlistModal';
import { MyBookings } from './components/MyBookings';
import { WaitlistsView } from './components/WaitlistsView';
import { AdminVenueBuilder } from './components/AdminVenueBuilder';
import { OrganiserPortal } from './components/OrganiserPortal';
import { fetchAPI } from './services/api';
import { Search, Film } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('events');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Event Catalog State
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Selected Show State for Seat Map View
  const [activeShowId, setActiveShowId] = useState<string | null>(null);

  // Modals State
  const [confirmedTicket, setConfirmedTicket] = useState<any>(null);
  const [waitlistModalData, setWaitlistModalData] = useState<{ showId: string; category: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        if (user.role === 'ADMIN') setCurrentTab('admin');
        else if (user.role === 'ORGANISER') setCurrentTab('organiser');
        else setCurrentTab('events');
      } catch {
        localStorage.removeItem('user_info');
      }
    }
    loadEvents();
  }, []);

  const loadEvents = async (search?: string, type?: string) => {
    try {
      setLoadingEvents(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (type) queryParams.append('type', type);

      const data = await fetchAPI(`/events?${queryParams.toString()}`);
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    loadEvents(query, selectedTypeFilter);
  };

  const handleTypeFilter = (type: string) => {
    const newType = selectedTypeFilter === type ? '' : type;
    setSelectedTypeFilter(newType);
    loadEvents(searchQuery, newType);
  };

  const handleSelectShow = (showId: string, _eventTitle: string) => {
    setActiveShowId(showId);
    setCurrentTab('seatmap');
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-20">
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      {/* Main Workspaces */}
      <main className="pt-24">
        {/* ========================================================================= */}
        {/* TAB 1: ADMINISTRATOR STUDIO                                               */}
        {/* ========================================================================= */}
        {currentTab === 'admin' && (
          <div className="animate-in fade-in duration-150">
            <AdminVenueBuilder />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ORGANISER OPERATIONS PORTAL                                        */}
        {/* ========================================================================= */}
        {currentTab === 'organiser' && (
          <div className="animate-in fade-in duration-150">
            <OrganiserPortal />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STOREFRONT & DISCOVERY CATALOG                                     */}
        {/* ========================================================================= */}
        {currentTab === 'events' && (
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
            {/* Hero Section: Asymmetrical 8:4 Split Grid Layout */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-stretch">
              {/* 8-Column Primary Curated Experience Area */}
              <div className="lg:col-span-8 bg-white border-4 border-black p-8 md:p-12 flex flex-col justify-between swiss-grid-pattern relative">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-[#FF3000] text-white text-xs font-mono font-black uppercase tracking-widest">
                      SEASON 2026
                    </span>
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
                      PREMIER CINEMA & LIVE PERFORMANCES
                    </span>
                  </div>

                  <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tighter text-black leading-[0.9] mb-6">
                    CURATED CINEMA &<br />
                    <span className="text-[#FF3000]">LIVE EVENTS.</span>
                  </h1>

                  <p className="text-sm md:text-base text-neutral-700 font-medium leading-relaxed max-w-2xl mb-8 uppercase tracking-wide">
                    Experience premier 70mm analog film screenings, world-class symphony concerts, and iconic theatrical performances. Select your exact seats in real-time.
                  </p>
                </div>

                {/* Search & Filter Controls */}
                <div className="pt-6 border-t-2 border-black flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-black absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="SEARCH PRODUCTIONS, VENUES, DIRECTORS..."
                      className="swiss-input w-full pl-10 text-xs font-bold uppercase tracking-wider"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTypeFilter('')}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors border-2 ${
                        selectedTypeFilter === ''
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-black hover:bg-[#F2F2F2]'
                      }`}
                    >
                      ALL
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTypeFilter('MOVIE')}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors border-2 ${
                        selectedTypeFilter === 'MOVIE'
                          ? 'bg-[#FF3000] text-white border-[#FF3000]'
                          : 'bg-white text-black border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      CINEMA 🎬
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTypeFilter('CONCERT')}
                      className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-colors border-2 ${
                        selectedTypeFilter === 'CONCERT'
                          ? 'bg-[#FF3000] text-white border-[#FF3000]'
                          : 'bg-white text-black border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      CONCERTS 🎸
                    </button>
                  </div>
                </div>
              </div>

              {/* 4-Column Curated Features & Experience Promise */}
              <div className="lg:col-span-4 bg-[#F2F2F2] border-4 border-black p-8 flex flex-col justify-between gap-6 relative swiss-dots">
                <div>
                  <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-2">
                    01. THE EXPERIENCE
                  </span>

                  <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-6">
                    PREMIER AUDITORIUMS
                  </h2>

                  <ul className="space-y-5 text-xs font-mono uppercase">
                    <li className="border-t-2 border-black pt-3">
                      <span className="font-black text-black block mb-0.5">
                        01. ACOUSTICALLY MASTERED
                      </span>
                      <span className="text-neutral-600 font-medium lowercase">
                        Immersive high-fidelity audio, 70mm analog film projection, and curated soundscapes.
                      </span>
                    </li>

                    <li className="border-t-2 border-black pt-3">
                      <span className="font-black text-[#FF3000] block mb-0.5">
                        02. SEAT-LEVEL SELECTION
                      </span>
                      <span className="text-neutral-600 font-medium lowercase">
                        Direct seat reservation with transparent tier pricing and instant holds.
                      </span>
                    </li>

                    <li className="border-t-2 border-black pt-3">
                      <span className="font-black text-black block mb-0.5">
                        03. INSTANT DIGITAL PASSES
                      </span>
                      <span className="text-neutral-600 font-medium lowercase">
                        Verified gate QR tickets delivered directly to your wallet for fast admission.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t-2 border-black flex items-center justify-between text-[10px] font-mono font-black text-neutral-500 uppercase tracking-widest">
                  <span>BOX OFFICE • OPEN 24/7</span>
                  <span>CINEPULSE PREMIER</span>
                </div>
              </div>
            </section>

            {/* Catalog Grid Section */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b-4 border-black">
              <div>
                <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000] block mb-0.5">
                  FEATURED PROGRAMME
                </span>
                <h2 className="text-3xl font-black uppercase tracking-tight text-black">
                  NOW SHOWING & UPCOMING PRESENTATIONS
                </h2>
              </div>
              <span className="text-xs font-mono font-black px-3 py-1 bg-black text-white uppercase tracking-wider">
                {events.length} {events.length === 1 ? 'PRODUCTION' : 'PRODUCTIONS'}
              </span>
            </div>

            {loadingEvents ? (
              <div className="flex flex-col items-center justify-center min-h-[30vh] text-black">
                <div className="w-10 h-10 border-4 border-black border-t-[#FF3000] rounded-none animate-spin mb-3" />
                <span className="text-xs font-mono font-black uppercase tracking-widest">
                  LOADING PROGRAMME...
                </span>
              </div>
            ) : events.length === 0 ? (
              <div className="bg-white border-4 border-black p-12 text-center swiss-grid-pattern">
                <Film className="w-12 h-12 text-black mx-auto mb-3" />
                <h3 className="text-2xl font-black uppercase tracking-tight text-black mb-1">
                  NO PRODUCTIONS FOUND
                </h3>
                <p className="text-xs text-neutral-600 uppercase font-bold tracking-wider max-w-md mx-auto">
                  Try adjusting your search criteria or explore all categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelectShow={handleSelectShow}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VISUAL SEAT MAP VIEW                                               */}
        {/* ========================================================================= */}
        {currentTab === 'seatmap' && (
          activeShowId ? (
            <SeatMap
              showId={activeShowId}
              currentUser={currentUser}
              onBack={() => setCurrentTab('events')}
              onBookingSuccess={(ticket) => setConfirmedTicket(ticket)}
              onOpenWaitlist={(showId, category) => setWaitlistModalData({ showId, category })}
            />
          ) : (
            <div className="max-w-4xl mx-auto p-8 text-center bg-white border-4 border-black my-8">
              <p className="text-sm font-black uppercase mb-4">No show selected.</p>
              <button type="button" onClick={() => setCurrentTab('events')} className="swiss-btn-primary">
                ← RETURN TO SHOWS
              </button>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* TAB 5: MY TICKETS WALLET                                                  */}
        {/* ========================================================================= */}
        {currentTab === 'my-bookings' && (
          <MyBookings onViewTicket={(ticket) => setConfirmedTicket(ticket)} />
        )}

        {/* ========================================================================= */}
        {/* TAB 6: WAITLISTS                                                          */}
        {/* ========================================================================= */}
        {currentTab === 'waitlist' && <WaitlistsView />}
      </main>

      {/* Ticket Modal Voucher */}
      {confirmedTicket && (
        <TicketModal
          bookingResult={confirmedTicket}
          onClose={() => setConfirmedTicket(null)}
        />
      )}

      {/* Waitlist Modal */}
      {waitlistModalData && (
        <WaitlistModal
          showId={waitlistModalData.showId}
          category={waitlistModalData.category}
          currentUser={currentUser}
          onClose={() => setWaitlistModalData(null)}
          onSuccess={() => setCurrentTab('waitlist')}
        />
      )}
    </div>
  );
};

export default App;
