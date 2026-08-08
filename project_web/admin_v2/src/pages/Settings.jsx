import { Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-500">
      <SettingsIcon size={40} className="mb-3 opacity-30" />
      <p className="text-sm">Tính năng đang phát triển...</p>
    </div>
  );
}
