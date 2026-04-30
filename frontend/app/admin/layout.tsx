import type { ReactNode } from "react";
import { AdminLayoutShell } from "./_components/AdminLayoutShell";
import "./admin.css";
import "./crud.css";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
