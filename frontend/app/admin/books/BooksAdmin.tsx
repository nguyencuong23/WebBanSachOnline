"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PROJECT_ID = "gtjrtwtbjdcznuacgrio";

export function AdminBooksPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("book_id-asc");
  const [modalMode, setModalMode] = useState<"add" | "edit" | "detail" | null>(null);
  const [skuNumber, setSkuNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const emptyForm = {
    book_id: "",
    title: "",
    author: "",
    publisher: "",
    isbn: "",
    category_id: "",
    price: 0,
    sale_price: 0,
    is_on_sale: false,
    description: "",
    slug: "",
    is_published: true,
    publish_year: new Date().getFullYear(),
    quantity: 0,
    location: "",
    image_url: ""
  };

  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Lấy dữ liệu trực tiếp từ Supabase
  async function load() {
    try {
      const { data: books, error: booksErr } = await supabase.from("books").select("*");
      if (booksErr) throw booksErr;

      const { data: cats, error: catsErr } = await supabase.from("categories").select("*");
      if (catsErr) throw catsErr;

      setItems(books || []);
      setCategories(cats || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (modalMode === "add" && form.category_id && skuNumber) {
      const formattedNum = skuNumber.padStart(3, "0");
      setForm((f: any) => ({ ...f, book_id: `${form.category_id.toUpperCase()}-${formattedNum}` }));
    }
  }, [form.category_id, skuNumber, modalMode]);

  const generateSlug = (title: string) => {
    return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
      .replace(/([^0-9a-z-\s])/g, "").replace(/(\s+)/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  };

  const getBucketName = (catId: string) => {
    const bucketMap: Record<string, string> = {
      'VH': 'van-hoc-images',
      'KT': 'kinh-te-images',
      'TL': 'tam-ly-images',
      'KH': 'khoa-hoc-images',
      'LS': 'lich-su-images',
      'NN': 'ngoai-ngu-images',
      'GD': 'giao-duc-images',
      'TH': 'triet-hoc-images',
      'MG': 'manga-images',
      'LN': 'light-novel-images'
    };
    return bucketMap[String(catId).toUpperCase()] || 'books';
  };

  const getStorageUrl = (catId: string, fileName: string) => {
    if (!fileName) return "";
    const bucket = getBucketName(catId);
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setLocalPreview(URL.createObjectURL(file));
      const fileExt = file.name.split('.').pop();
      setForm((f: any) => ({ ...f, image_url: `${f.book_id}.${fileExt}` }));
    }
  };

  // Thêm mới/Cập nhật dữ liệu bằng Supabase
  async function saveBook(e: React.FormEvent) {
    e.preventDefault();
    if (modalMode === "detail") {
      setModalMode(null);
      return;
    }

    try {
      const bucket = getBucketName(form.category_id);
      let finalImageUrl = form.image_url;
      const oldBook = modalMode === "edit" ? items.find(i => i.book_id === form.book_id) : null;

      // TRƯỜNG HỢP 1: CÓ ẢNH MỚI ĐƯỢC CHỌN
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${form.book_id}.${fileExt}`;

        // Xóa tệp cũ (nếu có) trên Storage để tránh xung đột cache của Supabase
        await supabase.storage.from(bucket).remove([fileName]);

        // Tải tệp mới lên với chỉ thị không lưu bộ nhớ đệm
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, selectedFile, {
            cacheControl: '0',
            upsert: true
          });
          if (uploadError) throw uploadError;
        finalImageUrl = fileName;
      } 
      // TRƯỜNG HỢP 2: KHÔNG CÓ ẢNH MỚI NHƯNG XÓA TÊN FILE TRONG Ô TEXT
      else if (!finalImageUrl && modalMode === "edit") {
        if (oldBook?.image_url) {
          await supabase.storage.from(bucket).remove([oldBook.image_url]);
        }
      }

      // ĐÂY LÀ NƠI ANH GIỮ LẠI BỘ LỌC DỮ LIỆU CỦA MÌNH
      // Giữ nguyên đoạn biến saveData và lệnh insert/update phía dưới của anh...
      const saveData = {
        book_id: form.book_id,
        // ... (giữ nguyên các trường còn lại của anh)
        image_url: finalImageUrl
      };
      if (modalMode === "add") {
        const { error } = await supabase.from("books").insert([saveData]);
        if (error) throw error;
      } else if (modalMode === "edit") {
        const { error } = await supabase.from("books").update(saveData).eq("book_id", form.book_id);
        if (error) throw error;
      }
      setModalMode(null);
      setSelectedFile(null);
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  // Khôi phục hàm Xóa (Xóa ảnh trên Storage, sau đó xóa dòng trong DB)
  async function remove(bookId: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${bookId}"? Hành động này sẽ xóa cả ảnh đi kèm.`)) return;
    try {
      const book = items.find(i => i.book_id === bookId);
      if (book?.image_url) {
        await supabase.storage.from(getBucketName(book.category_id)).remove([book.image_url]);
      }
      const { error } = await supabase.from("books").delete().eq("book_id", bookId);
      if (error) throw error;
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setSkuNumber("");
    setSelectedFile(null);
    setLocalPreview(null);
    setModalMode("add");
  }

  function openEdit(book: any) {
    setForm({ ...emptyForm, ...book });
    setSelectedFile(null);
    setLocalPreview(null);
    setModalMode("edit");
  }

  function openDetail(book: any) {
    setForm({ ...emptyForm, ...book });
    setSelectedFile(null);
    setLocalPreview(null);
    setModalMode("detail");
  }

  const getCategoryName = (rawId: string) => {
    if (!rawId) return "";
    const safeId = String(rawId).trim().toUpperCase();
    const apiCategory = categories.find(c => String(c.category_id).toUpperCase() === safeId);
    return apiCategory ? apiCategory.name : rawId;
  };

  const filteredAndSortedItems = items
    .filter((b) => {
      const k = keyword.trim().toLowerCase();
      if (!k) return true;
      const categoryName = getCategoryName(b.category_id);
      if (searchBy === "all") {
        return [b.book_id, b.title, b.author, categoryName, String(b.publish_year)].some((v) => String(v || "").toLowerCase().includes(k));
      }
      if (searchBy === "category_id") return categoryName.toLowerCase().includes(k);
      return String(b[searchBy] || "").toLowerCase().includes(k);
    })
    .sort((a, b) => {
      const [field, dir] = sortBy.split("-");
      let valA = field === "category_id" ? getCategoryName(a.category_id) : a[field];
      let valB = field === "category_id" ? getCategoryName(b.category_id) : b[field];

      if (typeof valA === "string" || typeof valB === "string") {
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return dir === "asc" ? -1 : 1;
        if (strA > strB) return dir === "asc" ? 1 : -1;
        return 0;
      }
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return dir === "asc" ? numA - numB : numB - numA;
    });

  return (
    <div>
      <style>{`
        .action-hover-wrapper { position: relative; display: inline-flex; align-items: center; }
        .action-hover-buttons {
          position: absolute; right: 100%; display: flex; gap: 8px; opacity: 0; visibility: hidden;
          transition: all 0.2s ease-in-out; padding: 6px 10px; margin-right: 8px;
          background-color: #ffffff; border: 1px solid #dee2e6; border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); z-index: 100;
        }
        .action-hover-wrapper:hover .action-hover-buttons { opacity: 1; visibility: visible; }
        .btn-action-icon { width: 32px; height: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; }
        .vertical-preview-box {
          width: 100%;
          aspect-ratio: 2 / 3;
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vertical-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .modal-xl { max-width: 1100px; }
      `}</style>

      <div className="page-header mb-4">
        <h1><i className="fas fa-book me-2" />Quản lý sách</h1>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div className="input-group" style={{ maxWidth: "500px" }}>
          <select className="form-select" style={{ maxWidth: "150px" }} value={searchBy} onChange={(e) => setSearchBy(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="book_id">Mã sách</option>
            <option value="title">Tên sách</option>
            <option value="author">Tác giả</option>
            <option value="category_id">Thể loại</option>
            <option value="publish_year">Năm XB</option>
          </select>
          <input type="text" className="form-control" placeholder="Tìm kiếm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        <div className="d-flex align-items-center gap-2">
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="book_id-asc">Mã sách: Tăng dần</option>
            <option value="book_id-desc">Mã sách: Giảm dần</option>
            <option value="title-asc">Tên sách: A-Z</option>
            <option value="title-desc">Tên sách: Z-A</option>
            <option value="author-asc">Tác giả: A-Z</option>
            <option value="author-desc">Tác giả: Z-A</option>
            <option value="category_id-asc">Thể loại: A-Z</option>
            <option value="category_id-desc">Thể loại: Z-A</option>
            <option value="publish_year-asc">Năm XB: Tăng dần</option>
            <option value="publish_year-desc">Năm XB: Giảm dần</option>
            <option value="quantity-asc">Số lượng: Tăng dần</option>
            <option value="quantity-desc">Số lượng: Giảm dần</option>
            <option value="price-asc">Giá: Tăng dần</option>
            <option value="price-desc">Giá: Giảm dần</option>
          </select>
          <button className="btn btn-primary text-nowrap" onClick={openAdd}><i className="fas fa-plus me-1"></i> Thêm sách</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Mã sách</th>
                <th>Tên sách</th>
                <th>Tác giả</th>
                <th>Thể loại</th>
                <th className="text-center">Năm XB</th>
                <th className="text-end">Giá (VNĐ)</th>
                <th className="text-center">Số lượng</th>
                <th className="text-end" style={{ width: "80px" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedItems.map((b) => (
                <tr key={b.book_id}>
                  <td>{b.book_id}</td>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td><span className="badge bg-primary">{getCategoryName(b.category_id)}</span></td>
                  <td className="text-center">{b.publish_year}</td>
                  <td className="text-end">{b.price ? b.price.toLocaleString("vi-VN") : "0"}</td>
                  <td className="text-center">{b.quantity}</td>
                  <td className="text-end">
                    <div className="action-hover-wrapper">
                      <div className="action-hover-buttons">
                        <button className="btn btn-outline-info btn-action-icon" onClick={() => openDetail(b)}><i className="fas fa-eye"></i></button>
                        <button className="btn btn-outline-primary btn-action-icon" onClick={() => openEdit(b)}><i className="fas fa-edit"></i></button>
                        <button className="btn btn-outline-danger btn-action-icon" onClick={() => remove(b.book_id)}><i className="fas fa-trash-alt"></i></button>
                      </div>
                      <button className="btn btn-light btn-action-icon"><i className="fas fa-ellipsis-v"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={() => setModalMode(null)}></div>
          <div className="modal fade show d-block" style={{ zIndex: 1050 }} tabIndex={-1} onClick={() => setModalMode(null)}>
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold text-primary">
                    <i className="fas fa-info-circle me-2"></i>
                    {modalMode === "add" ? "Thêm sách mới" : modalMode === "edit" ? "Chỉnh sửa sách" : "Chi tiết sách"}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setModalMode(null)}></button>
                </div>
                <div className="modal-body p-4">
                  <form id="bookModalForm" onSubmit={saveBook}>
                    <div className="row">
                      <div className="col-md-4 border-end">
                        <label className="form-label fw-bold">Ảnh bìa</label>
                        <div className="vertical-preview-box shadow-sm mb-3 position-relative">
                          {(localPreview || form.image_url) ? (
                            <>
                              <img 
                                src={localPreview || getStorageUrl(form.category_id, form.image_url)} 
                                alt="Preview" 
                                className="vertical-preview-img" 
                                onError={e => e.currentTarget.src = "https://placehold.co/400x600?text=Chưa+có+ảnh"} 
                              />
                              {/* Nút Xóa ảnh hiển thị đè lên góc phải trên cùng */}
                              {modalMode !== "detail" && (
                                <button 
                                  type="button" 
                                  className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow" 
                                  style={{ width: "32px", height: "32px", padding: 0 }}
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setLocalPreview(null);
                                    setForm((f: any) => ({ ...f, image_url: "" }));
                                    // Nếu anh có thẻ input type="file", có thể cần reset value của nó ở đây
                                    const fileInput = document.getElementById("coverImageInput") as HTMLInputElement;
                                    if (fileInput) fileInput.value = "";
                                  }}
                                  title="Gỡ ảnh này"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                            </>
                          ) : ( 
                            <div className="text-muted"><i className="fas fa-image fa-3x opacity-25"></i></div> 
                          )}
                        </div>
                        
                        {modalMode !== "detail" && (
                          <input 
                            id="coverImageInput"
                            type="file" 
                            className="form-control mb-2" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                          />
                        )}
                        <input 
                          className="form-control form-control-sm bg-light" 
                          placeholder="Đường dẫn ảnh" 
                          readOnly 
                          value={form.image_url || ""} 
                          onChange={e => setForm((f:any) => ({ ...f, image_url: e.target.value }))} 
                        />
                      </div>

                      <div className="col-md-8">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label fw-bold small">Thể loại</label>
                            <select className="form-select" required disabled={modalMode !== "add"} value={form.category_id} onChange={(e) => setForm((f: any) => ({ ...f, category_id: e.target.value }))}>
                              <option value="">-- Chọn --</option>
                              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-bold small">Số thứ tự</label>
                            <input type="number" className="form-control" required disabled={modalMode !== "add"} value={skuNumber} onChange={(e) => setSkuNumber(e.target.value)} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-bold small">Mã hệ thống</label>
                            <input className="form-control bg-light fw-bold text-center" readOnly value={form.book_id} />
                          </div>

                          <div className="col-12">
                            <label className="form-label fw-bold small">Tên sách</label>
                            <input className="form-control form-control-lg fw-bold" required readOnly={modalMode === "detail"} value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value, slug: generateSlug(e.target.value) }))} />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label fw-bold small">Tác giả</label>
                            <input className="form-control" readOnly={modalMode === "detail"} value={form.author || ""} onChange={(e) => setForm((f: any) => ({ ...f, author: e.target.value }))} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-bold small">Nhà xuất bản</label>
                            <input className="form-control" readOnly={modalMode === "detail"} value={form.publisher || ""} onChange={(e) => setForm((f: any) => ({ ...f, publisher: e.target.value }))} />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label fw-bold small">ISBN</label>
                            <input className="form-control" readOnly={modalMode === "detail"} value={form.isbn || ""} onChange={(e) => setForm((f: any) => ({ ...f, isbn: e.target.value }))} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-bold small">Năm xuất bản</label>
                            <input type="number" className="form-control" readOnly={modalMode === "detail"} value={form.publish_year || ""} onChange={(e) => setForm((f: any) => ({ ...f, publish_year: Number(e.target.value) }))} />
                          </div>

                          <div className="col-md-4">
                            <label className="form-label fw-bold small text-primary">Giá bán</label>
                            <div className="input-group">
                              <input type="number" className="form-control" required readOnly={modalMode === "detail"} value={form.price} onChange={(e) => setForm((f: any) => ({ ...f, price: Number(e.target.value) }))} />
                              <span className="input-group-text">₫</span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-bold small text-success">Khuyến mãi</label>
                            <div className="input-group">
                              <input type="number" className="form-control" readOnly={modalMode === "detail"} value={form.sale_price || 0} onChange={(e) => setForm((f: any) => ({ ...f, sale_price: Number(e.target.value) }))} />
                              <span className="input-group-text">₫</span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-bold small">Tồn kho</label>
                            <input type="number" className="form-control" required readOnly={modalMode === "detail"} value={form.quantity} onChange={(e) => setForm((f: any) => ({ ...f, quantity: Number(e.target.value) }))} />
                          </div>

                          <div className="col-12">
                            <label className="form-label fw-bold small">Slug</label>
                            <input className="form-control form-control-sm text-muted" readOnly={modalMode === "detail"} value={form.slug || ""} onChange={(e) => setForm((f: any) => ({ ...f, slug: e.target.value }))} />
                          </div>

                          <div className="col-12">
                            <label className="form-label fw-bold small">Mô tả nội dung</label>
                            <textarea className="form-control" rows={4} readOnly={modalMode === "detail"} value={form.description || ""} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setModalMode(null)}>Đóng</button>
                  {modalMode !== "detail" && (
                    <button type="submit" form="bookModalForm" className="btn btn-primary px-4">
                      {modalMode === "add" ? "Lưu sách & Tải ảnh" : "Cập nhật thay đổi"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}