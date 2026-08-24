import React, { useState } from 'react';
import { MapPin, ArrowRight } from 'lucide-react';



interface EventCardProps {
  event: any;
  onSelectShow: (showId: string, eventTitle: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelectShow }) => {
  const shows: any[] = event.shows || [];
  const [selectedShowId, setSelectedShowId] = useState<string>(
    shows.length > 0 ? shows[0].id : ''
  );

  // Calculate lowest ticket price across available shows
  const lowestPrice = shows.reduce((min: number, show: any) => {
    if (!show.seats || show.seats.length === 0) return min;
    const showMin = Math.min(...show.seats.map((s: any) => s.price));
    return Math.min(min, showMin);
  }, Infinity);

  const formattedLowestPrice =
    lowestPrice !== Infinity ? `$${lowestPrice.toFixed(2)}` : '$15.00';

  const fallbackPoster =
    event.type === 'CONCERT'
      ? 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80'
      : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80';

  const posterImage = event.posterUrl || fallbackPoster;
  const isConcert = event.type === 'CONCERT';
  const currentShow = shows.find((s) => s.id === selectedShowId) || shows[0];

  return (
    <article className="bg-white border-2 border-black flex flex-col h-full overflow-hidden relative group justify-between hover:border-black transition-colors duration-150">
      {/* Media Image Frame */}
      <div className="relative w-full h-56 bg-[#F2F2F2] overflow-hidden border-b-2 border-black shrink-0">
        <img
          src={posterImage}
          alt={event.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackPoster;
          }}
          className="h-full w-full object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-200"
          loading="lazy"
        />

        {/* Swiss Category Flag */}
        <div className="absolute top-0 left-0">
          <span className="px-3 py-1 text-[11px] font-black uppercase tracking-widest bg-[#FF3000] text-white border-r-2 border-b-2 border-black block">
            {isConcert ? 'CONCERT 🎸' : 'CINEMA 🎬'}
          </span>
        </div>

        {/* Rating Metric */}
        <div className="absolute top-0 right-0">
          <span className="px-3 py-1 text-[11px] font-mono font-black uppercase tracking-widest bg-black text-white border-l-2 border-b-2 border-black block">
            ★ 9.4 / 10
          </span>
        </div>
      </div>

      {/* Structured Content Area */}
      <div className="p-6 flex flex-col flex-1 justify-between gap-5 bg-white">
        <div>
          {/* Category Tag + Date */}
          <div className="flex items-center justify-between text-[11px] font-mono font-black uppercase tracking-widest text-neutral-500 mb-2">
            <span>{event.type}</span>
            {currentShow && (
              <span className="text-black">
                {new Date(currentShow.startTime).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }).toUpperCase()}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-black uppercase tracking-tight text-black line-clamp-1">
            {event.title}
          </h3>

          {/* Venue */}
          <p className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 mt-1 line-clamp-1 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-[#FF3000] shrink-0" />
            <span>{currentShow?.venue?.name || 'MAIN AUDITORIUM'}</span>
          </p>

          {/* Description */}
          <p className="text-xs text-neutral-600 line-clamp-2 mt-3 leading-relaxed font-medium">
            {event.description || 'Exclusive scheduled presentation with high-fidelity sound and reserved seating.'}
          </p>
        </div>

        <div>
          {/* Showtimes Selector */}
          {shows.length > 0 && (
            <div className="pt-3 border-t-2 border-black mb-4">
              <span className="block text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500 mb-2">
                SCHEDULED SLOTS:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {shows.slice(0, 4).map((show: any) => {
                  const isSelected = show.id === (selectedShowId || shows[0]?.id);
                  const timeStr = new Date(show.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <button
                      key={show.id}
                      type="button"
                      onClick={() => setSelectedShowId(show.id)}
                      className={`px-3 py-1 text-xs font-mono font-black uppercase tracking-wider border-2 transition-colors ${
                        isSelected
                          ? 'bg-black text-white border-black'
                          : 'bg-[#F2F2F2] text-black border-black hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000]'
                      }`}
                    >
                      {timeStr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing & CTA Line */}
          <div className="pt-4 border-t-2 border-black flex items-center justify-between gap-3">
            <div>
              <span className="block text-[10px] font-mono font-black uppercase tracking-widest text-neutral-500">
                FROM
              </span>
              <span className="text-2xl font-black text-black">
                {formattedLowestPrice}
              </span>
            </div>

            {shows.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const targetShowId = selectedShowId || shows[0]?.id;
                  if (targetShowId) {
                    onSelectShow(targetShowId, event.title);
                  }
                }}
                className="swiss-btn-primary px-5 py-2.5 text-xs tracking-widest flex items-center gap-2 group-hover:bg-[#FF3000] group-hover:border-[#FF3000]"
              >
                <span>RESERVE SEATS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="px-3 py-2 bg-[#F2F2F2] border border-black text-[10px] font-mono font-black text-neutral-500 uppercase">
                NO SHOWS AVAILABLE
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
