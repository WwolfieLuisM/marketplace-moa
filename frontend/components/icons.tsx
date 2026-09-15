import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 20 20",
    fill: "none" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function IconHouse(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 7L10 3L17 7V15C17 15.5523 16.5523 16 16 16H4C3.44772 16 3 15.5523 3 15V7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 16V11H12V16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLogo(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="32" height="32" rx="8" fill="#ea580c" />
      <path
        d="M9 13L16 8L23 13V23C23 23.5523 22.5523 24 22 24H10C9.44772 24 9 23.5523 9 23V13Z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M13 24V17H19V24" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12.5 15L7.5 10L12.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M2.5 5.5L10 11L17.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 9V6.5a3.5 3.5 0 017 0V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 17c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 4.5V15.5M4.5 10H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2 10L6 14L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheckDouble(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2 10L6 14L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10L11 14L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSend(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M17.5 2.5L2.5 8.5L9 11L11.5 17.5L17.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 7L10 3L17 7V15C17 15.5523 16.5523 16 16 16H4C3.44772 16 3 15.5523 3 15V7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M3 5.5H17V13H8.5L5 16.5V13H3V5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLocation(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M10 17C10 17 5 12.5 5 8.5a5 5 0 0110 0C15 12.5 10 17 10 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 12.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M10 3.5a4.5 4.5 0 014.5 4.5V11l1.5 2H4l1.5-2V8A4.5 4.5 0 0110 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.5 15.5a1.8 1.8 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconWarning(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M10 2.5l2.2 4.5 4.9.7-3.55 3.45.85 4.9L10 13.9l-4.4 2.15.85-4.9L2.9 7.7l4.9-.7L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconHeart(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M10 16.5C10 16.5 3 12.1 3 7.6a3.7 3.7 0 017-2.1 3.7 3.7 0 017 2.1c0 4.5-7 8.9-7 8.9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M8 4H5.5C4.5 4 4 4.5 4 5.5v9c0 1 .5 1.5 1.5 1.5H8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M13 13.5L16.5 10L13 6.5M16.5 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlimento(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7.5h12l-1 7H5l-1-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 7.5v7M10 3.5c1.2 1 .7 2.4 0 3.5-1.2-1-.7-2.4 0-3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBebida(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 3.5h7V6c0 2.5-1 4.5-3.5 5.5-2.5-1-3.5-3-3.5-5.5V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 11.5v3M7.5 16.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconRopa(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4.5 3.5L7 6 8.5 4.5c1 1 2 1 3 0L13 6l2.5-2.5c.8.9.5 1.6 0 2.2l-.8 1.3H9.5v8h-3l-.4-8.3-1.3-1.2c-.5-.6-.8-1.3 0-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.5 13.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconHogar(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9.5h14l-1.5 7h-11l-1.5-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.5 9.5C5.5 6.5 7 5 10 5s4.5 1.5 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconTecnologia(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 5l1.5-1.5h3L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5v5h6V5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 10h12v4H4v-4ZM7 17c0-1.2.6-2 2-2h2c1.4 0 2 .8 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBelleza(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M10 16.5c-4-2.2-6-4.9-6-7.8A3.2 3.2 0 0110 6.8a3.2 3.2 0 016 1.9c0 2.9-2 5.6-6 7.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M5.5 12.5c-1.8.8-2.5 1.8-2.5 3 0 1 .6 1.5 1.5 1.5 1 .5 2.8 0 4-1.5M14.5 12.5c1.5.7 2.5 1.5 2.5 2.5 0 .5-.5 1-1.5 1-1 0-1.5-1-1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconServicios(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 8.5H14.5V14a2.5 2.5 0 01-2.5 2.5H8A2.5 2.5 0 015.5 14V8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 8.5V6.5a2 2 0 114 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}