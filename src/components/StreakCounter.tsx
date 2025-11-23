import React from 'react';
import { Flame } from 'lucide-react';

interface StreakCounterProps {
    streak: number;
}

const StreakCounter: React.FC<StreakCounterProps> = ({ streak }) => {
    return (
        <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-full font-bold shadow-sm">
            <Flame size={20} className={streak > 0 ? "fill-current animate-pulse" : ""} />
            <span>{streak} Day Streak</span>
        </div>
    );
};

export default StreakCounter;
