import React from 'react';
import { Calendar, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { TIMELINE_STEPS } from '../data/polarData';

interface TimelineSliderProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  hasConflict: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentStep,
  onStepChange,
  hasConflict,
  isPlaying = false,
  onTogglePlay,
}) => {
  const currentInfo = TIMELINE_STEPS[currentStep] || TIMELINE_STEPS[0];

  return (
    <div
      id="timeline-control-panel"
      className="bg-white border border-slate-200 rounded-md p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3"
    >
      {/* Date & Mode Label */}
      <div className="flex items-center gap-2.5 min-w-[200px] shrink-0">
        <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 font-mono">
              {currentInfo.fullDate}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 font-mono">
              {currentInfo.timeUtc}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {currentInfo.description}
          </div>
        </div>
      </div>

      {/* Interactive Step Track */}
      <div className="flex-1 w-full max-w-xl px-2">
        <div className="relative flex items-center justify-between">
          {/* Background Connecting Line */}
          <div className="absolute left-2 right-2 h-1 bg-slate-200 rounded-full z-0" />
          {/* Progress filled line */}
          <div
            className="absolute left-2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-200"
            style={{ width: `${(currentStep / (TIMELINE_STEPS.length - 1)) * 98}%` }}
          />

          {TIMELINE_STEPS.map((step) => {
            const isSelected = currentStep === step.index;
            const isConflictStep = step.index === 3 && hasConflict;

            return (
              <button
                key={step.index}
                id={`timeline-step-${step.index}`}
                onClick={() => onStepChange(step.index)}
                className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-hidden"
              >
                {/* Step Circle */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                    isSelected
                      ? isConflictStep
                        ? 'bg-rose-600 border-rose-200 shadow-sm scale-110'
                        : 'bg-blue-600 border-blue-200 shadow-sm scale-110'
                      : isConflictStep
                      ? 'bg-rose-100 border-rose-500'
                      : 'bg-white border-slate-300 group-hover:border-blue-400'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : isConflictStep ? 'bg-rose-600' : 'bg-transparent'
                    }`}
                  />
                </div>

                {/* Date Label */}
                <span
                  className={`text-[11px] mt-1 tracking-tight font-medium ${
                    isSelected
                      ? 'text-blue-900 font-bold'
                      : isConflictStep
                      ? 'text-rose-700 font-semibold'
                      : 'text-slate-600 group-hover:text-slate-900'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Prev / Play / Next Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          id="timeline-btn-prev"
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          title="Previous time step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {onTogglePlay && (
          <button
            id="timeline-btn-play"
            onClick={onTogglePlay}
            className="p-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
            title={isPlaying ? 'Pause timeline playback' : 'Play timeline drift'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[11px]">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        )}

        <button
          id="timeline-btn-next"
          onClick={() => onStepChange(Math.min(TIMELINE_STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === TIMELINE_STEPS.length - 1}
          className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          title="Next time step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
