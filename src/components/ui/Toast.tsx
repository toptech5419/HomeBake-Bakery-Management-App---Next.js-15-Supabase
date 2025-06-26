import React from "react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

export function Toast({ message, type, onClose }: { message: string; type: ToastMessage["type"]; onClose: () => void }) {
  return (
    <div
      className={`fixed z-50 top-6 right-6 min-w-[220px] max-w-xs px-4 py-3 rounded shadow-lg text-white flex items-center gap-2 transition-all animate-fade-in-up
        ${type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600"}
      `}
      role="alert"
    >
      {type === "success" && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      )}
      {type === "error" && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      {type === "info" && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" /></svg>
      )}
      <span className="flex-1 text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white focus:outline-none">&times;</button>
    </div>
  );
} 