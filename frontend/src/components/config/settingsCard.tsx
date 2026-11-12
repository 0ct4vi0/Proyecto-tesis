import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}

function SettingsCard({ title, description, danger = false, children }: Props) {
  return (
    <section
      className={
        "rounded-xl border p-6 " +
        (danger
          ? "border-red-500/40 bg-red-500/[0.04]"
          : "border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--card,rgba(255,255,255,0.03))]")
      }
    >
      <h2
        className={
          "mb-1 font-['Space_Grotesk'] text-[18px] font-semibold " +
          (danger ? "text-red-400" : "text-[var(--text)]")
        }
      >
        {title}
      </h2>
      {description && <p className="mb-5 text-[13px] text-[var(--muted)]">{description}</p>}
      {children}
    </section>
  );
}

export default SettingsCard;