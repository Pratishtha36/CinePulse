import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { fetchAPI } from '../services/api';

interface WaitlistModalProps {
  showId: string;
  category: string;
  currentUser: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  showId,
  category,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async () => {
    if (!currentUser) {
      setErrorMsg('Authentication required to queue on waitlist.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await fetchAPI('/waitlist/join', {
        method: 'POST',
        body: JSON.stringify({ showId, seatCategory: category }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-white border-4 border-black p-8 relative swiss-grid-pattern">
        {/* Header Tag */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-6">
          <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FF3000]">
            04. FIFO WAITLIST PROTOCOL
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
          <span className="px-2 py-0.5 bg-black text-white text-[10px] font-mono font-black uppercase tracking-widest block w-fit mb-1">
            CATEGORY SOLD OUT
          </span>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-black">
            JOIN {category} QUEUE
          </h2>
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider mt-1">
            Automated allocation triggers immediately when any attendee cancels.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-black text-white text-xs font-bold uppercase tracking-wider border-l-4 border-[#FF3000]">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Informational Specs */}
        <div className="p-4 bg-[#F2F2F2] border-2 border-black space-y-2 mb-6 text-xs font-mono">
          <p className="flex items-start gap-2 font-bold text-black">
            <CheckCircle2 className="w-4 h-4 text-[#FF3000] shrink-0 mt-0.5" />
            <span>Strict First-In-First-Out (FIFO) queue guarantees fairness.</span>
          </p>
          <p className="flex items-start gap-2 font-bold text-black">
            <CheckCircle2 className="w-4 h-4 text-[#FF3000] shrink-0 mt-0.5" />
            <span>10-minute exclusive time-limited claim window dispatched on cancellations.</span>
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="swiss-btn-secondary py-3 text-xs tracking-widest"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleJoin}
            className="swiss-btn-accent py-3 text-xs tracking-widest"
          >
            {loading ? 'QUEUING...' : 'ENQUEUE POSITION →'}
          </button>
        </div>
      </div>
    </div>
  );
};
