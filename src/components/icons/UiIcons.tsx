import type { SVGProps } from 'react';

/** Small UI icons in the designs' style (filled, rounded, 1–2px strokes), for titles and chrome. */
type P = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 20, ...p }: P) => ({ width: size, height: size, 'aria-hidden': true, ...p });

export const HomeIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" {...base(p)}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" />
    <path d="M10.5 20.5V16a1.5 1.5 0 0 1 3 0v4.5" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ChevronUp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const BellIcon = (p: P) => (
  <svg viewBox="0 0 44 50" fill="currentColor" {...base(p)}>
    <path d="M15.3 43.6a8.4 8.4 0 0 0 13.4 0c-4.5.6-9 .6-13.4 0Z" />
    <path fillRule="evenodd" d="M34.4 24.3V23c0-7.1-5.6-12.8-12.4-12.8S9.6 15.9 9.6 23v1.3c0 1.5-.4 3.1-1.2 4.4l-2.1 3.1c-1.8 2.9-.4 6.8 2.8 7.7a47.8 47.8 0 0 0 25.8 0c3.2-.9 4.6-4.8 2.8-7.7l-2-3.1c-.9-1.3-1.3-2.9-1.3-4.4Z" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...base(p)}>
    <path d="M10 0a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 5.25a.75.75 0 0 0-.75.75v4c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06L10.75 9.7V6a.75.75 0 0 0-.75-.75Z" />
  </svg>
);

export const CloudSunIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M9.5 3.5a4.5 4.5 0 0 1 4.3 3.2A5 5 0 0 0 9.2 10 4 4 0 0 0 6 14a4 4 0 0 1-1.2-6.9A4.5 4.5 0 0 1 9.5 3.5Z" opacity={0.85} />
    <path d="M14.5 8a5 5 0 0 1 4.9 4.1A3.8 3.8 0 0 1 18.8 19.5H9.7a3.7 3.7 0 0 1-.3-7.4A5 5 0 0 1 14.5 8Z" />
  </svg>
);

/** The small "chart in a square" mark used before most card titles. */
export const CardIcon = (p: P) => (
  <svg viewBox="0 0 20 20" fill="none" {...base(p)}>
    <rect x="2" y="2" width="16" height="16" rx="3" fill="currentColor" />
    <path d="M5 11h2.3l1.6-3.6 2.4 6 1.6-3h2.1" stroke="#060308" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PowerIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" {...base(p)}>
    <path d="M12 3v8" />
    <path d="M6.3 7.2a8 8 0 1 0 11.4 0" />
  </svg>
);

export const LeafIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M20.5 3.5c-8.6-.4-15 2.6-16.4 9.4-.5 2.4 0 4.6 1.2 6.3L3.7 21l1.1 1 1.8-1.7c1.6 1 3.7 1.3 5.9.8 6.8-1.5 8.8-9.2 8-17.6ZM8 17.6l-.7-.7C9.8 12.6 13 10 17 8.4 13.6 10.6 10.8 13.6 8 17.6Z" />
  </svg>
);

export const DropIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M12 2.5c3.6 4.3 7 8.6 7 12.2a7 7 0 1 1-14 0c0-3.6 3.4-7.9 7-12.2Z" />
  </svg>
);

export const BtuIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5a4.5 4.5 0 1 1-4.5 4.5M12 7.5V5M7.5 12H5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
  </svg>
);

export const TimerIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v9l6.4 6.4" fill="currentColor" />
    <path d="M12 12h9A9 9 0 0 0 12 3Z" fill="currentColor" stroke="none" />
  </svg>
);

export const ParkingIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M6 3h7a6 6 0 0 1 0 12H9.5v6H6V3Zm3.5 3.3v5.4H13a2.7 2.7 0 0 0 0-5.4H9.5Z" />
  </svg>
);

export const CalendarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M7 2h2v2h6V2h2v2h2.5A1.5 1.5 0 0 1 21 5.5v14a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-14A1.5 1.5 0 0 1 4.5 4H7V2Zm-2 7v10h14V9H5Zm2 2h3v3H7v-3Zm5 0h3v3h-3v-3Z" />
  </svg>
);

export const FilterLinesIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
    <circle cx="15" cy="8" r="2" />
    <circle cx="9" cy="16" r="2" />
  </svg>
);

export const ElevatorIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 4-3 4h6L9 7Zm6 10 3-4h-6l3 4Z" />
  </svg>
);

export const CameraIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h10A1.5 1.5 0 0 1 16 7.5v2.2l4.2-2.6c.5-.3 1.3.1 1.3.7v8.4c0 .6-.8 1-1.3.7L16 14.3v2.2a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 16.5v-9Z" />
  </svg>
);

export const DoorIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M6 2.5h9.5A1.5 1.5 0 0 1 17 4v16.5h2.5V22h-15v-1.5H5V3.5a1 1 0 0 1 1-1Zm7 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
  </svg>
);

export const GateIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <path d="M3 20V8M21 20V8M3 10h18M3 15h18M8 10v5M13 10v5M18 10v5" />
  </svg>
);

export const RouteIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8.5 18h6a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h6" strokeDasharray="0.1 3.2" />
  </svg>
);

export const PeopleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <circle cx="9" cy="7.5" r="3.5" />
    <path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6v1h-13v-1Z" />
    <circle cx="17" cy="8.5" r="2.7" opacity={0.7} />
    <path d="M16.8 13.2c2.7.2 4.7 2.2 4.7 5V20H17v-1c0-2.2-.6-4.2-1.8-5.7.5-.1 1-.1 1.6-.1Z" opacity={0.7} />
  </svg>
);

export const ChatIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M4 4h16a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 17h-8.5L6 21v-4H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 4Z" />
  </svg>
);

export const PhoneIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M7.5 2h9A1.5 1.5 0 0 1 18 3.5v17a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5v-17A1.5 1.5 0 0 1 7.5 2Zm4.5 16.2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
  </svg>
);

export const TicketIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...base(p)}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5V15a3 3 0 0 0 0-6V6.5Zm7 2.5v6h1.5V9H10Z" />
  </svg>
);

export const SensorIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.4 5.4a9.3 9.3 0 0 0 0 13.2M18.6 5.4a9.3 9.3 0 0 1 0 13.2" />
  </svg>
);

export const LogoutIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...base(p)}>
    <path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h10" />
  </svg>
);

export const LiveIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...base(p)}>
    <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
  </svg>
);
