"use client";

import { ReactNode } from "react";
import { RoleBackLink } from "@/components/shared/role-back-link";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  rightActions?: ReactNode;
  backLinkProps?: Parameters<typeof RoleBackLink>[0];
  className?: string;
};

export function RoleActionsHeader({
  eyebrow,
  title,
  description,
  rightActions,
  backLinkProps,
  className = "mb-5 flex flex-wrap items-start justify-between gap-3",
}: Props) {
  return (
    <div className={className}>
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <RoleBackLink {...backLinkProps} />
        {rightActions}
      </div>
    </div>
  );
}

