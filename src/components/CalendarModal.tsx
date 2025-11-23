import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame } from 'lucide-react';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: string[];
    currentStreak: number;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, history, currentStreak }) => {
    if (!isOpen) return null;

    // Get current month data
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate calendar days
    const calendarDays = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    const isActiveDay = (day: number | null) => {
        if (!day) return false;
        const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
        return history.includes(dateStr);
    };

    const isToday = (day: number | null) => {
        if (!day) return false;
        return day === today.getDate() && currentMonth === today.getMonth();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-[var(--color-bg-card)] rounded-2xl shadow-xl overflow-hidden border border-[var(--color-border)]"
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold">{monthName}</h3>
                                    <div className="flex items-center gap-2 mt-1 text-orange-600 dark:text-orange-400">
                                        <Flame size={16} className="fill-current" />
                                        <span className="text-sm font-bold">{currentStreak} Day Streak</span>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="space-y-2">
                                {/* Week days header */}
                                <div className="grid grid-cols-7 gap-2 mb-2">
                                    {weekDays.map(day => (
                                        <div key={day} className="text-center text-xs font-bold text-[var(--color-text-muted)] uppercase">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar days */}
                                <div className="grid grid-cols-7 gap-2">
                                    {calendarDays.map((day, index) => {
                                        const isActive = isActiveDay(day);
                                        const isTodayDay = isToday(day);

                                        return (
                                            <div
                                                key={index}
                                                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${!day
                                                        ? ''
                                                        : isActive
                                                            ? 'bg-[var(--color-primary)] text-white shadow-md scale-105'
                                                            : isTodayDay
                                                                ? 'bg-gray-200 dark:bg-gray-700 ring-2 ring-[var(--color-primary)]'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-[var(--color-text-muted)]'
                                                    }`}
                                            >
                                                {day}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="flex gap-4 mt-6 text-xs text-[var(--color-text-muted)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-[var(--color-primary)]"></div>
                                        <span>Active</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 ring-2 ring-[var(--color-primary)]"></div>
                                        <span>Today</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CalendarModal;
