
import React from 'react';
import { Personality } from '../types';
import { PERSONALITY_LABELS, PERSONALITY_COLORS } from '../constants';
import { clsx } from 'clsx';
import { Sparkles, Sword, Shield, Heart, Bot, HeartHandshake, Code, Utensils, User, TrendingUp, Flame, Video, Smile, Gamepad2 } from 'lucide-react';

interface Props {
  selected: Personality;
  onSelect: (p: Personality) => void;
}

const ICONS: Record<Personality, React.ReactNode> = {
  [Personality.ROAST]: <Sparkles className="w-3.5 h-3.5" />,
  [Personality.ROMAN]: <Sword className="w-3.5 h-3.5" />,
  [Personality.BIG_BRO]: <Shield className="w-3.5 h-3.5" />,
  [Personality.LITTLE_SIS]: <Sparkles className="w-3.5 h-3.5" />, 
  [Personality.ASSISTANT]: <Bot className="w-3.5 h-3.5" />,
  [Personality.THERAPIST]: <HeartHandshake className="w-3.5 h-3.5" />,
  [Personality.CODER]: <Code className="w-3.5 h-3.5" />,
  [Personality.CHEF]: <Utensils className="w-3.5 h-3.5" />,
  [Personality.GF]: <Heart className="w-3.5 h-3.5" />,
  [Personality.BF]: <User className="w-3.5 h-3.5" />,
  [Personality.TRADER]: <TrendingUp className="w-3.5 h-3.5" />,
  [Personality.RIZZER]: <Flame className="w-3.5 h-3.5" />,
  [Personality.YOUTUBER]: <Video className="w-3.5 h-3.5" />,
  [Personality.FUN]: <Smile className="w-3.5 h-3.5" />,
  [Personality.GAMER]: <Gamepad2 className="w-3.5 h-3.5" />,
};

export const PersonalityMenu: React.FC<Props> = ({ selected, onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar px-4">
      {Object.values(Personality).map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
            selected === p 
              ? "bg-[#27272a] text-white" 
              : "text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]"
          )}
        >
          <span className={clsx(selected === p ? PERSONALITY_COLORS[p] : "text-zinc-600")}>
            {ICONS[p]}
          </span>
          {PERSONALITY_LABELS[p]}
        </button>
      ))}
    </div>
  );
};
