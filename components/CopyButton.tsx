'use client';

import { useState, useEffect, useRef } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string | undefined;
}

export default function CopyButton({ textToCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleCopy} className="ml-2 text-slate-500 hover:text-slate-200">
      {copied ? <Check size={16} className="text-green-400" /> : <Clipboard size={16} />}
    </button>
  );
}
