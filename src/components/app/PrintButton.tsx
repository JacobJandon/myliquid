"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Print, or save as PDF from the print dialog. */
export function PrintButton() {
  return (
    <button type="button" className={buttonClass("secondary", "sm")} onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" /> Print or save as PDF
    </button>
  );
}
