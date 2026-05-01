import { CheckoutPage } from "./CheckoutPage";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    }>
      <CheckoutPage />
    </Suspense>
  );
}
