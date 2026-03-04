import { Construction } from 'lucide-react';

export default function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
        <Construction size={32} className="text-orange-500" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-700">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">This module will be built in the next step.</p>
      </div>
    </div>
  );
}
