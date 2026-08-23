import React, { useState } from 'react';
import { LogOut, MapPin, ChevronDown, KeyRound } from 'lucide-react';

import { GoogleLogin } from '@react-oauth/google';
import { setAuthToken, removeAuthToken, fetchAPI } from '../services/api';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

type AuthPortal = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  setCurrentUser,
}) => {
  const [selectedCity, setSelectedCity] = useState('NEW YORK');
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPortal, setAuthPortal] = useState<AuthPortal>('CUSTOMER');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const cities = ['NEW YORK', 'LONDON', 'LOS ANGELES', 'SAN FRANCISCO', 'CHICAGO', 'ZÜRICH', 'BERLIN'];

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setAdminSecret('');
    setAuthError('');
  };

  const openAuthModal = (portal: AuthPortal, mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthPortal(portal);
    setAuthMode(mode);
    resetForm();
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      let res;
      if (authMode === 'LOGIN') {
        res = await fetchAPI('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } else {
        res = await fetchAPI('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            name,
            role: authPortal,
            adminSecret: authPortal === 'ADMIN' ? adminSecret : undefined,
          }),
        });
      }

      setAuthToken(res.token);
      setCurrentUser(res.user);
      localStorage.setItem('user_info', JSON.stringify(res.user));

      if (res.user.role === 'ADMIN') setCurrentTab('admin');
      else if (res.user.role === 'ORGANISER') setCurrentTab('organiser');
      else setCurrentTab('events');

      setShowAuthModal(false);
      resetForm();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      setAuthError('Google sign-in did not return a valid credential token.');
      return;
    }

    try {
      setAuthLoading(true);
      setAuthError('');

      const res = await fetchAPI('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          credential: credentialResponse.credential,
          role: authPortal,
        }),
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);
      localStorage.setItem('user_info', JSON.stringify(res.user));

      if (res.user.role === 'ADMIN') setCurrentTab('admin');
      else if (res.user.role === 'ORGANISER') setCurrentTab('organiser');
      else setCurrentTab('events');

      setShowAuthModal(false);
      resetForm();
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
    localStorage.removeItem('user_info');
    setCurrentTab('events');
  };

  const handleQuickDemoLogin = async (demoRole: 'CUSTOMER' | 'ORGANISER' | 'ADMIN') => {
    try {
      setAuthLoading(true);
      const res = await fetchAPI('/auth/demo', {
        method: 'POST',
        body: JSON.stringify({ role: demoRole }),
      });

      setAuthToken(res.token);
      setCurrentUser(res.user);
      localStorage.setItem('user_info', JSON.stringify(res.user));

      if (demoRole === 'ORGANISER') setCurrentTab('organiser');
      else if (demoRole === 'ADMIN') setCurrentTab('admin');
      else setCurrentTab('events');

      setShowAuthModal(false);
    } catch (err: any) {
      console.error('Demo login error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const isOrganiser = currentUser?.role === 'ORGANISER';
  const isAdmin = currentUser?.role === 'ADMIN';
  const isCustomer = !currentUser || currentUser?.role === 'CUSTOMER';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Swiss Typographic Logo */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                if (isAdmin) setCurrentTab('admin');
                else if (isOrganiser) setCurrentTab('organiser');
                else setCurrentTab('events');
              }}
              className="flex items-center gap-3 text-left focus:outline-none group"
            >
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg border-2 border-black group-hover:bg-[#FF3000] group-hover:border-[#FF3000] transition-colors">
                ■
              </div>
              <div>
                <span className="text-2xl font-black tracking-tighter uppercase text-black block leading-none">
                  CINEPULSE<span className="text-[#FF3000]">.</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-bold block mt-1">
                  {isAdmin
                    ? 'ADMIN STUDIO'
                    : isOrganiser
                    ? 'ORGANISER OPERATIONS'
                    : 'PREMIER CINEMA & LIVE TICKETING'}
                </span>
              </div>
            </button>

            {/* City Selector */}
            {currentTab === 'events' && (
              <div className="relative hidden md:block border-l-2 border-black pl-6">
                <button
                  type="button"
                  onClick={() => setShowCityMenu(!showCityMenu)}
                  className="px-3 py-1.5 bg-[#F2F2F2] hover:bg-black hover:text-white border-2 border-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FF3000]" />
                  <span>{selectedCity}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showCityMenu && (
                  <div className="absolute top-full left-6 mt-1 w-48 bg-white border-2 border-black p-0 z-50 shadow-none">
                    {cities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city);
                          setShowCityMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider border-b border-neutral-200 transition-colors ${
                          selectedCity === city
                            ? 'bg-[#FF3000] text-white font-black'
                            : 'text-black hover:bg-black hover:text-white'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center gap-1.5">
            {/* Customer Navigation */}
            {isCustomer && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentTab('events')}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 transition-colors ${
                    currentTab === 'events'
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-transparent hover:border-black'
                  }`}
                >
                  DISCOVER SHOWS
                </button>

                {currentUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('my-bookings')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 transition-colors ${
                        currentTab === 'my-bookings'
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-transparent hover:border-black'
                      }`}
                    >
                      MY PASSES
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentTab('waitlist')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 transition-colors ${
                        currentTab === 'waitlist'
                          ? 'bg-[#FF3000] text-white border-[#FF3000]'
                          : 'bg-white text-black border-transparent hover:border-black'
                      }`}
                    >
                      WAITLISTS
                    </button>
                  </>
                )}
              </>
            )}

            {/* Organiser Navigation */}
            {isOrganiser && (
              <div className="flex items-center gap-1 border-2 border-black p-0.5 bg-[#F2F2F2]">
                <button
                  type="button"
                  onClick={() => setCurrentTab('organiser')}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                    currentTab === 'organiser'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  HUB
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('events')}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                    currentTab === 'events'
                      ? 'bg-[#FF3000] text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  STOREFRONT
                </button>
              </div>
            )}

            {/* Admin Navigation */}
            {isAdmin && (
              <div className="flex items-center gap-1 border-2 border-black p-0.5 bg-[#F2F2F2]">
                <button
                  type="button"
                  onClick={() => setCurrentTab('admin')}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                    currentTab === 'admin'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  STUDIO
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('events')}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                    currentTab === 'events'
                      ? 'bg-[#FF3000] text-white'
                      : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  STOREFRONT
                </button>
              </div>
            )}
          </nav>

          {/* Profile & Auth Section */}
          <div className="flex items-center gap-3">
            {!currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('ORGANISER', 'LOGIN')}
                  className="hidden lg:inline-flex px-3 py-2 text-xs font-bold uppercase tracking-wider border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                >
                  HOST AN EVENT
                </button>

                <button
                  type="button"
                  onClick={() => openAuthModal('CUSTOMER', 'LOGIN')}
                  className="swiss-btn-primary px-5 py-2 text-xs tracking-widest"
                >
                  SIGN IN →
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-[#F2F2F2] border-2 border-black text-right hidden sm:flex items-center gap-2.5">
                  {currentUser.avatarUrl && (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-6 h-6 border border-black object-cover"
                    />
                  )}
                  <div>
                    <span className="font-black text-xs uppercase tracking-tight text-black block leading-none">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#FF3000] block mt-0.5">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2.5 bg-white border-2 border-black hover:bg-[#FF3000] hover:border-[#FF3000] hover:text-white transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Swiss Multi-Persona Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border-4 border-black p-8 relative swiss-grid-pattern">
            {/* Top Index Marker */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-6">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000]">
                CINEPULSE ACCESS
              </span>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs font-black uppercase text-black hover:text-[#FF3000]"
              >
                [CLOSE ✕]
              </button>
            </div>

            {/* Persona Segment Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#F2F2F2] p-1 border-2 border-black mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthPortal('CUSTOMER');
                  resetForm();
                }}
                className={`py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${
                  authPortal === 'CUSTOMER'
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-white'
                }`}
              >
                ATTENDEE
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthPortal('ORGANISER');
                  resetForm();
                }}
                className={`py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${
                  authPortal === 'ORGANISER'
                    ? 'bg-black text-white'
                    : 'text-black hover:bg-white'
                }`}
              >
                ORGANISER
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthPortal('ADMIN');
                  resetForm();
                }}
                className={`py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${
                  authPortal === 'ADMIN'
                    ? 'bg-[#FF3000] text-white'
                    : 'text-black hover:bg-white'
                }`}
              >
                ADMIN
              </button>
            </div>

            {/* Persona Title */}
            <div className="mb-6">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
                {authPortal === 'CUSTOMER' && (authMode === 'LOGIN' ? 'ATTENDEE SIGN IN' : 'ATTENDEE REGISTER')}
                {authPortal === 'ORGANISER' && (authMode === 'LOGIN' ? 'ORGANISER PORTAL' : 'ORGANISER REGISTER')}
                {authPortal === 'ADMIN' && (authMode === 'LOGIN' ? 'ADMIN STUDIO' : 'REGISTER ADMIN')}
              </h2>
              <p className="text-xs text-neutral-600 uppercase font-bold tracking-wider mt-1">
                {authPortal === 'CUSTOMER' && 'Instant ticketing, live seat matrix, and waitlist allocations.'}
                {authPortal === 'ORGANISER' && 'Event publishing, schedule management, and revenue ledgers.'}
                {authPortal === 'ADMIN' && 'Auditorium architecture, venue layouts, and master auditing.'}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#FF3000]">
                ⚠️ {authError}
              </div>
            )}

            {/* Official Google OAuth Sign-In */}
            {authPortal !== 'ADMIN' && (
              <>
                <div className="flex justify-center mb-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      setAuthError('Google sign-in popup was cancelled or failed.');
                    }}
                    useOneTap
                    shape="rectangular"
                    theme="filled_black"
                    text="continue_with"
                  />
                </div>

                <div className="flex items-center my-4">
                  <div className="flex-grow border-t-2 border-black" />
                  <span className="px-3 text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500">
                    OR CREDENTIALS
                  </span>
                  <div className="flex-grow border-t-2 border-black" />
                </div>
              </>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'REGISTER' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                    {authPortal === 'ORGANISER' ? 'ORGANISATION NAME' : 'FULL NAME'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={authPortal === 'ORGANISER' ? 'ACME PRODUCTIONS' : 'ALEXANDER MULLER'}
                    className="swiss-input w-full uppercase"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={authPortal === 'ORGANISER' ? 'host@acme.ch' : 'name@domain.com'}
                  className="swiss-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  PASSWORD
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="swiss-input w-full"
                />
              </div>

              {authPortal === 'ADMIN' && authMode === 'REGISTER' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#FF3000] mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>ADMIN SECRET KEY</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="ENTER ADMIN SECRET"
                    className="swiss-input w-full border-[#FF3000]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="swiss-btn-primary w-full py-3 text-xs tracking-widest mt-2"
              >
                {authLoading ? 'VERIFYING...' : authMode === 'LOGIN' ? 'AUTHENTICATE →' : 'REGISTER ACCOUNT →'}
              </button>
            </form>

            {/* Fast Demo Access Bar */}
            <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500">
                02. FAST DEMO:
              </span>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin(authPortal)}
                className="px-3 py-1 bg-[#F2F2F2] hover:bg-black hover:text-white border-2 border-black text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                ONE-CLICK {authPortal}
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="mt-4 pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                  setAuthError('');
                }}
                className="text-xs font-black uppercase tracking-wider text-black hover:text-[#FF3000] underline"
              >
                {authMode === 'LOGIN' ? 'CREATE A NEW ACCOUNT' : 'ALREADY REGISTERED? SIGN IN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
