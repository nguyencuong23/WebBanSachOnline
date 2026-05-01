import { BookDetailPage } from "./BookDetailPage";

export default function Page({ params }: { params: { bookId: string } }) {
  return <BookDetailPage bookId={params.bookId} />;
}
