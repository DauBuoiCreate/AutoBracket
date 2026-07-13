import type { ReactNode } from "react";

import { ControlledErrorTemplate } from "./controlled-error-template";

interface RootTemplateProps {
  readonly children: ReactNode;
}

export default function RootTemplate({ children }: RootTemplateProps) {
  return <ControlledErrorTemplate boundary="global">{children}</ControlledErrorTemplate>;
}
