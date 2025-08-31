'use client';

export const FormInput = ({ label, value, onChange, placeholder }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1">
            <input 
              type="text" 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              className="block w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none" 
              placeholder={placeholder}
            />
        </div>
    </div>
);

export const FormTextarea = ({ label, value, onChange, placeholder = "" }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1">
            <textarea 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              placeholder={placeholder} 
              className="block w-full h-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono text-sm" 
            />
        </div>
    </div>
);