export function FormField({ label, required, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputBase =
  'w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition';

export function Input({ ...props }) {
  return <input className={inputBase} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ ...props }) {
  return <textarea className={`${inputBase} resize-none`} rows={3} {...props} />;
}

export function FormGrid({ children, cols = 2 }) {
  const colMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
  return (
    <div className={`grid ${colMap[cols]} gap-4`}>
      {children}
    </div>
  );
}
