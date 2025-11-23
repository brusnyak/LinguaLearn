import React from 'react';

interface CalendarViewProps {
    history: string[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ history }) => {
    // Generate last 14 days for simple view
    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border)]">
            <h3 className="text-sm font-bold text-[var(--color-text-muted)] mb-3 uppercase tracking-wider">Activity History</h3>
            <div className="flex justify-between gap-1">
                {days.map(date => {
                    const isActive = history.includes(date);
                    const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' });

                    return (
                        <div key={date} className="flex flex-col items-center gap-1">
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isActive
                                        ? 'bg-[var(--color-primary)] text-white shadow-md scale-110'
                                        : 'bg-gray-100 dark:bg-gray-800 text-[var(--color-text-muted)]'
                                    }`}
                                title={date}
                            >
                                {isActive ? '✓' : ''}
                            </div>
                            <span className="text-[10px] text-[var(--color-text-muted)]">{dayLabel}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
