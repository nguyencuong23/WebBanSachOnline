import { Suspense } from "react";
import { SearchPage } from "./SearchPage";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    }>
      <SearchPage />
    </Suspense>
  );
}
