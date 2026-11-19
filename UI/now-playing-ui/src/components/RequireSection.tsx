import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSections } from "../preferences/SectionsContext";
import type { SectionKey } from "../preferences/types";

interface RequireSectionProps {
  section: SectionKey;
  children: ReactNode;
}

/**
 * Redirect away from a section the user has hidden. Renders nothing until the
 * preferences have loaded so a slow request cannot bounce a valid visitor.
 */
export function RequireSection({ section, children }: RequireSectionProps) {
  const { isVisible, ready } = useSections();

  if (!ready) return null;
  if (!isVisible(section)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
