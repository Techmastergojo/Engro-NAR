import React, { useState } from 'react';
import type { GlobalTimelineFilter } from '../types';
import { Calendar, X, Check, Clock, Sparkles } from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface TimelineFilterModalProps {
  currentFilter: GlobalTimelineFilter;
  onApplyFilter: (filter: GlobalTimelineFilter) => void;
  onClose: () => void;
}

export const TimelineFilterModal: React.FC<TimelineFilterModalProps> = ({
  currentFilter,
  onApplyFilter,
  onClose
}) => {
  const [startDate, setStartDate] = useState<string>(currentFilter.startDate || '2026-08-01');
  const [endDate, setEndDate] = useState<string>(currentFilter.endDate || '2026-08-20');
  const [selectedSingleDay, setSelectedSingleDay] = useState<string | null>(
    currentFilter.mode === 'single' ? currentFilter.singleDate || null : null
  );

  const handleApply = () => {
    soundFX.playSuccess();
    if (selectedSingleDay) {
      onApplyFilter({
        mode: 'single',
        startDate: selectedSingleDay,
        endDate: selectedSingleDay,
        singleDate: selectedSingleDay
      });
    } else {
      onApplyFilter({
        mode: startDate === '2026-08-01' && endDate === '2026-08-20' ? 'all' : 'custom',
        startDate,
        endDate
      });
    }
    onClose();
  };

  const handleSetPreset = (start: string, end: string) => {
    soundFX.playClick();
    setStartDate(start);
    setEndDate(end);
    setSelectedSingleDay(null);
  };

  const availableDays = Array.from({ length: 20 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-08-${String(dayNum).padStart(2, '0')}`;
    return { dayNum, dateStr };
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="timeline-filter-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="timeline-modal-header">
          <div className="modal-title-with-icon">
            <div className="cal-icon-circle">
              <Calendar size={20} className="text-engro-green" />
            </div>
            <div>
              <h3>Advanced Timeline Filter</h3>
              <p className="modal-subtext">Filter all dashboard KPIs, graphs & sites between dates</p>
            </div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Date Range Inputs: From Date to To Date */}
        <div className="from-to-inputs-container">
          <div className="from-date-box">
            <label className="date-input-lbl">
              <Clock size={12} className="text-engro-green" />
              <span>FROM (Date):</span>
            </label>
            <input
              type="date"
              className="styled-range-date-input"
              value={selectedSingleDay || startDate}
              disabled={selectedSingleDay !== null}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedSingleDay(null);
              }}
            />
          </div>

          <div className="date-arrow-separator">➔</div>

          <div className="to-date-box">
            <label className="date-input-lbl">
              <Clock size={12} className="text-engro-green" />
              <span>TO (Date):</span>
            </label>
            <input
              type="date"
              className="styled-range-date-input"
              value={selectedSingleDay || endDate}
              disabled={selectedSingleDay !== null}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedSingleDay(null);
              }}
            />
          </div>
        </div>

        {/* Quick Range Presets */}
        <div className="timeline-presets-section">
          <span className="section-micro-lbl">QUICK RANGE PRESETS:</span>
          <div className="preset-buttons-grid">
            <button
              className={`range-preset-btn ${!selectedSingleDay && startDate === '2026-08-01' && endDate === '2026-08-20' ? 'active' : ''}`}
              onClick={() => handleSetPreset('2026-08-01', '2026-08-20')}
            >
              Full Month (Aug 1 - 20)
            </button>
            <button
              className={`range-preset-btn ${!selectedSingleDay && startDate === '2026-08-01' && endDate === '2026-08-05' ? 'active' : ''}`}
              onClick={() => handleSetPreset('2026-08-01', '2026-08-05')}
            >
              Aug 1 - Aug 5
            </button>
            <button
              className={`range-preset-btn ${!selectedSingleDay && startDate === '2026-08-06' && endDate === '2026-08-10' ? 'active' : ''}`}
              onClick={() => handleSetPreset('2026-08-06', '2026-08-10')}
            >
              Aug 6 - Aug 10
            </button>
            <button
              className={`range-preset-btn ${!selectedSingleDay && startDate === '2026-08-11' && endDate === '2026-08-15' ? 'active' : ''}`}
              onClick={() => handleSetPreset('2026-08-11', '2026-08-15')}
            >
              Aug 11 - Aug 15
            </button>
            <button
              className={`range-preset-btn ${!selectedSingleDay && startDate === '2026-08-16' && endDate === '2026-08-20' ? 'active' : ''}`}
              onClick={() => handleSetPreset('2026-08-16', '2026-08-20')}
            >
              Aug 16 - Aug 20
            </button>
          </div>
        </div>

        {/* Single Day Picker */}
        <div className="single-day-picker-section">
          <div className="single-day-header">
            <span className="section-micro-lbl">OR SELECT SINGLE DAY:</span>
            {selectedSingleDay && (
              <button
                className="reset-day-link"
                onClick={() => setSelectedSingleDay(null)}
              >
                Clear Single Day
              </button>
            )}
          </div>
          <div className="days-number-grid">
            {availableDays.map(({ dayNum, dateStr }) => {
              const isSelected = selectedSingleDay === dateStr;
              return (
                <button
                  key={dateStr}
                  className={`day-square-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    soundFX.playClick();
                    setSelectedSingleDay(dateStr);
                  }}
                >
                  <span className="day-num">D{dayNum}</span>
                  <span className="day-sub">Aug {dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Summary & Apply Button */}
        <div className="timeline-modal-footer">
          <div className="active-selection-preview">
            <Sparkles size={13} className="text-amber" />
            <span>
              Active Filter:{' '}
              <strong>
                {selectedSingleDay
                  ? `Single Day: ${selectedSingleDay}`
                  : `From ${startDate} To ${endDate}`}
              </strong>
            </span>
          </div>

          <button className="apply-timeline-btn" onClick={handleApply}>
            <Check size={16} />
            <span>Apply Timeline Filter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
