import type { ReactNode } from "react";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && <div className="page-heading__actions">{actions}</div>}
    </div>
  );
}
