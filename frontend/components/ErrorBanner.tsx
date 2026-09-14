import { IconWarning } from "./icons";

export default function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-[18px] flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
    >
      <IconWarning className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}