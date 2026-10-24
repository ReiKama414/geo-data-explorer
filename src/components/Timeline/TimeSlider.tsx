import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

interface TimeSliderProps {
  timeValues: string[];
  selectedTime: string | null;
  onTimeChange: (time: string) => void;
  timeColumnName: string;
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  timeValues,
  selectedTime,
  onTimeChange,
  timeColumnName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1500); // ms per step
  const timerRef = useRef<any>(null);

  const currentIndex = selectedTime ? timeValues.indexOf(selectedTime) : 0;
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Next step handler
  const handleNext = () => {
    const nextIdx = (safeIndex + 1) % timeValues.length;
    onTimeChange(timeValues[nextIdx]);
  };

  // Prev step handler
  const handlePrev = () => {
    const prevIdx = (safeIndex - 1 + timeValues.length) % timeValues.length;
    onTimeChange(timeValues[prevIdx]);
  };

  // Auto-play effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, speed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, safeIndex, timeValues, speed]);

  if (!timeValues || timeValues.length <= 1) {
    return null;
  }

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        {/* Play / Step Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? '暫停時間推進' : '播放時間序列'}
            className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={handlePrev}
            title="前一個時期"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            title="後一個時期"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Time Badge */}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs text-slate-400">{timeColumnName}:</span>
          <span className="font-mono text-sm font-bold text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2.5 py-0.5 rounded-lg shadow-inner">
            {selectedTime || timeValues[0]}
          </span>
        </div>

        {/* Playback speed toggle */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          {[
            { label: '1x', ms: 1500 },
            { label: '2x', ms: 800 },
          ].map((sp) => (
            <button
              key={sp.label}
              onClick={() => setSpeed(sp.ms)}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                speed === sp.ms
                  ? 'bg-slate-700 text-sky-300 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discrete Timeline Track & Marks */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="range"
          min={0}
          max={timeValues.length - 1}
          value={safeIndex}
          onChange={(e) => onTimeChange(timeValues[Number(e.target.value)])}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
        {timeValues.map((t, i) => (
          <button
            key={t}
            onClick={() => onTimeChange(t)}
            className={`transition-colors cursor-pointer ${
              i === safeIndex ? 'text-sky-400 font-bold scale-110' : 'hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};
