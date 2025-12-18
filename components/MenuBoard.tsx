
import React, { useState, useEffect, useMemo } from 'react';
import { MenuConfig } from '../types';
import { DIETARY_DATA } from '../constants';

interface MenuBoardProps {
  config: MenuConfig;
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

const MenuBoard: React.FC<MenuBoardProps> = ({ config }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(window.location.href);

  // Sync URL state when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentUrl(window.location.href);
    };
    window.addEventListener('hashchange', handleHashChange);
    // Also update periodically to catch local state changes that might affect the board
    const interval = setInterval(() => setCurrentUrl(window.location.href), 2000);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      clearInterval(interval);
    };
  }, []);

  const itemsWithImages = useMemo(() => {
    return config.items.filter(item => item.imageUrl && item.imageUrl.trim() !== '' && !item.isSoldOut);
  }, [config.items]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (itemsWithImages.length <= 1) return;
    const slideshowTimer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % itemsWithImages.length);
    }, 7000);
    return () => clearInterval(slideshowTimer);
  }, [itemsWithImages.length]);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.00&current_weather=true&temperature_unit=fahrenheit'
        );
        const data = await response.json();
        const current = data.current_weather;
        
        const getIcon = (code: number) => {
          if (code === 0) return 'fa-sun';
          if (code >= 1 && code <= 3) return 'fa-cloud-sun';
          if (code >= 45 && code <= 48) return 'fa-smog';
          if (code >= 51 && code <= 67) return 'fa-cloud-showers-heavy';
          if (code >= 71 && code <= 77) return 'fa-snowflake';
          if (code >= 80 && code <= 82) return 'fa-cloud-rain';
          if (code >= 95) return 'fa-bolt';
          return 'fa-cloud';
        };

        setWeather({
          temp: Math.round(current.temperature),
          condition: 'New York',
          icon: getIcon(current.weathercode)
        });
      } catch (error) {
        console.error("Failed to fetch weather", error);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 1800000);
    return () => clearInterval(weatherTimer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const activeItem = itemsWithImages.length > 0 ? itemsWithImages[currentImageIndex] : null;
  const displayImage = activeItem ? activeItem.imageUrl : config.featuredImage;
  const displayName = activeItem ? activeItem.name : config.featuredItemName;

  const fontClass = config.fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  
  // Use a more robust QR API. 
  // We limit the length to ensure it stays scannable. 
  // If the menu is too large, it falls back to the homepage.
  const qrUrl = useMemo(() => {
    const MAX_QR_CHARS = 2500; // Safe limit for many scanners
    const targetUrl = currentUrl.length > MAX_QR_CHARS 
      ? window.location.origin + window.location.pathname 
      : currentUrl;
    
    // Using goqr.me for better reliability
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}&bgcolor=ffffff&color=000000&margin=5`;
  }, [currentUrl]);

  const isTooLong = currentUrl.length > 2500;

  return (
    <div 
      className={`relative w-full h-full overflow-hidden flex select-none board-container ${fontClass}`}
      style={{ backgroundColor: config.backgroundColor, containerType: 'size' }}
    >
      {/* Left Panel: Featured Images */}
      <div className="w-[40%] h-full relative overflow-hidden bg-gray-900">
        <div key={displayImage} className="absolute inset-0 animate-fade-in transition-opacity duration-1000">
          <img 
            src={displayImage} 
            alt={displayName} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"></div>
          
          <div className="absolute bottom-[4cqw] left-[3cqw] right-[3cqw] flex flex-col items-start gap-[0.5cqw]">
            <span 
              className="text-white px-[1.2cqw] py-[0.4cqw] font-black text-[1cqw] uppercase tracking-widest shadow-2xl rounded-sm"
              style={{ backgroundColor: config.secondaryColor }}
            >
                FRESH TODAY
            </span>
            <span className="bg-white/95 text-gray-900 px-[1.5cqw] py-[0.6cqw] font-[900] text-[1.4cqw] uppercase tracking-tight shadow-xl rounded-sm backdrop-blur-sm border-l-[0.4cqw] max-w-full truncate"
                  style={{ borderLeftColor: config.accentColor }}>
                {displayName}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel: Menu Content */}
      <div className="w-[60%] h-full flex flex-col px-[3.5cqw] py-[2.5cqw] relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-[2cqw]">
          <div className="flex items-start gap-[1.2cqw]">
            {config.logoUrl && (
              <img src={config.logoUrl} alt="Logo" className="w-[5cqw] h-[5cqw] object-contain flex-shrink-0" />
            )}
            <div className="flex flex-col">
              <h1 className="text-[3.8cqw] leading-[0.85] font-black tracking-tighter uppercase break-words line-clamp-2"
                  style={{ color: config.accentColor }}>
                {config.title}
              </h1>
              <p className="max-w-[28cqw] text-[0.8cqw] font-bold leading-snug mt-[0.5cqw] opacity-75 italic"
                 style={{ color: config.accentColor }}>
                {config.subtitle}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end flex-shrink-0">
            <div className="text-[2.6cqw] font-black tracking-tighter leading-none"
                 style={{ color: config.secondaryColor }}>
              {formatTime(currentTime)}
            </div>
            {weather && (
              <div className="flex items-center gap-[0.6cqw] mt-[0.6cqw] bg-white/50 px-[0.8cqw] py-[0.3cqw] rounded-full border border-gray-100 shadow-sm backdrop-blur-sm">
                <i className={`fas ${weather.icon} text-[1cqw]`} style={{ color: config.accentColor }}></i>
                <span className="text-[1cqw] font-black text-gray-800">{weather.temp}°F</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items List */}
        <div className="flex-grow flex flex-col gap-[1cqw] overflow-hidden">
          {config.items.slice(0, 6).map((item) => (
            <div key={item.id} className={`flex justify-between items-start border-b border-gray-100 pb-[1cqw] last:border-0 relative ${item.isSoldOut ? 'grayscale-[0.8] opacity-50' : ''}`}>
              <div className="flex-grow pr-[3cqw] overflow-hidden">
                <div className="flex items-center gap-[0.6cqw]">
                  <h3 className={`text-[1.6cqw] font-[900] text-gray-900 uppercase tracking-tight leading-none truncate ${item.isSoldOut ? 'line-through decoration-rose-500 decoration-[0.2cqw]' : ''}`}>
                    {item.name}
                  </h3>
                  <div className="flex gap-[0.2cqw] flex-shrink-0">
                    {item.dietary?.map(tag => {
                      const info = DIETARY_DATA.find(d => d.tag === tag);
                      return info ? (
                        <span key={tag} className={`${info.color} text-white text-[0.55cqw] w-[0.9cqw] h-[0.9cqw] rounded-full flex items-center justify-center font-black shadow-sm`}>
                          {tag}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <p className="text-[0.8cqw] text-gray-500 font-medium mt-[0.3cqw] line-clamp-2">
                  {item.description}
                </p>
              </div>
              <div className="text-[2cqw] font-black text-gray-800 whitespace-nowrap leading-none flex-shrink-0">
                {item.price}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-gray-100 pt-[1.2cqw] flex items-center justify-between">
          <div className="flex gap-[1.2cqw]">
            {DIETARY_DATA.map((info) => (
              <div key={info.tag} className="flex items-center gap-[0.5cqw]">
                <span className={`${info.color} text-white w-[1.2cqw] h-[1.2cqw] rounded-full flex items-center justify-center font-black text-[0.6cqw]`}>
                  {info.tag}
                </span>
                <span className="text-[0.55cqw] font-black text-gray-400 tracking-wider uppercase">
                  {info.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-[1.5cqw]">
            <div className="text-right">
                <div className="text-[0.55cqw] font-black text-gray-400 uppercase tracking-widest leading-tight">Scan for Mobile Menu</div>
                <div className="text-[0.7cqw] font-black text-gray-400 uppercase tracking-widest">{config.title}</div>
            </div>
            <div className={`w-[6cqw] h-[6cqw] bg-white p-[0.6cqw] rounded-md shadow-xl flex items-center justify-center border-[0.2cqw] ${isTooLong ? 'border-amber-300' : 'border-white'}`}>
                <img src={qrUrl} alt="Menu QR" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default MenuBoard;
