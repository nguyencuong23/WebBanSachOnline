import type { ReactNode } from "react";
import { MainSiteLayout } from "./_components/MainSiteLayout";
import "./client-layout.css";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <MainSiteLayout>{children}</MainSiteLayout>;
}
