"use client";

import { useState, type ReactNode } from "react";

type ControlledBoundary = "global" | "segment";

interface ControlledErrorTemplateProps {
  readonly boundary: ControlledBoundary;
  readonly children: ReactNode;
}

const triggerLabels: Record<ControlledBoundary, string> = {
  global: "Gây lỗi global có kiểm soát",
  segment: "Gây lỗi segment có kiểm soát",
};

export function ControlledErrorTemplate({ boundary, children }: ControlledErrorTemplateProps) {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error(`${boundary}-internal-sentinel`);
  }

  return (
    <>
      <button onClick={() => setShouldThrow(true)} type="button">
        {triggerLabels[boundary]}
      </button>
      {children}
    </>
  );
}
