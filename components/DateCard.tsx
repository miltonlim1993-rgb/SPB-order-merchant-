import React from 'react';
import { DateOption } from '../types';

interface DateCardProps {
  option: DateOption;
  isSelected: boolean;
  onClick: (date: string) => void;
}

const DateCard: React.FC<DateCardProps> = ({ option, isSelected, onClick }) => {
  return (
    <button
      onClick={() => option.available && onClick(option.date)}
      disabled={!option.available}
      className={`
        relative overflow-hidden flex flex-col items-center justify-center
        h-24 min-w-[5.5rem] rounded-xl border-comic transition-all duration-200
        ${!option.available ? 'opacity-50 bg-gray-200 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:shadow-comic'}
        ${isSelected 
          ? 'bg-brand-black text-brand-yellow shadow-comic' 
          : 'bg-white text-brand-black'
        }
      `}
    >
      <div className="flex flex-col items-center z-10">
        <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-gray-500'}`}>
          {option.day}
        </span>
        <span className="font-display text-2xl font-bold leading-none mt-1">
          {option.date}
        </span>
      </div>

      {!option.available && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/10 rotate-12">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 border-2 border-white rotate-12">SOLD</span>
         </div>
      )}
    </button>
  );
};

export default DateCard;