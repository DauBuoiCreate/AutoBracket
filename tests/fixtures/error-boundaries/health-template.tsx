import type { ReactNode } from "react";

import { ControlledErrorTemplate } from "../controlled-error-template";

interface HealthTemplateProps {
  readonly children: ReactNode;
}

export default function HealthTemplate({ children }: HealthTemplateProps) {
  return <ControlledErrorTemplate boundary="segment">{children}</ControlledErrorTemplate>;
}
