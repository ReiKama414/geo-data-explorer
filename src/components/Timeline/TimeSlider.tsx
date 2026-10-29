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
    <div
      data-testid="timeslider-container"
      className="w-full max-w-[calc(100vw-24px)] sm:w-96 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md dark:shadow-xl backdrop-blur-xs px-3 py-2.5 flex flex-col gap-1.5 text-xs text-slate-800 dark:text-slate-100 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Play / Step Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? '暫停時間推進' : '播放時間序列'}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            onClick={handlePrev}
            title="前一個時期"
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            title="後一個時期"
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Current Time Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-sky-400 shrink-0" />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{timeColumnName}:</span>
          <span
            data-testid="time-slider-badge"
            className="font-mono text-xs font-bold text-slate-900 dark:text-sky-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shrink-0"
          >
            {selectedTime || timeValues[0]}
          </span>
        </div>

        {/* Playback speed toggle */}
        <div className="flex items-center gap-0.5 text-[10px] font-mono shrink-0">
          {[
            { label: '1x', ms: 1500 },
            { label: '2x', ms: 800 },
          ].map((sp) => (
            <button
              key={sp.label}
              onClick={() => setSpeed(sp.ms)}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                speed === sp.ms
                  ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-sky-300 font-bold'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Discrete Timeline Track & Marks */}
      <div className="pt-0.5">
        <input
          type="range"
          min={0}
          max={timeValues.length - 1}
          value={safeIndex}
          onChange={(e) => onTimeChange(timeValues[Number(e.target.value)])}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-slate-900 dark:accent-sky-400"
        />
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 px-0.5">
        {timeValues.map((t, i) => (
          <button
            key={t}
            onClick={() => onTimeChange(t)}
            className={`transition-colors cursor-pointer p-0.5 ${
              i === safeIndex
                ? 'text-slate-900 dark:text-sky-400 font-bold scale-110'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};
