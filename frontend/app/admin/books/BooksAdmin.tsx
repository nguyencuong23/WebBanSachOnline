"use client";

/**
 * ============================================================================
 * CHÚ THÍCH FILE & MODULE
 * ============================================================================
 * Tên file:      BooksAdmin.tsx
 * Mục đích:      Trang quản lý sách trong khu vực admin — cho phép xem, thêm,
 *                chỉnh sửa và xóa sách kèm theo upload ảnh bìa lên Supabase Storage.
 * Các chức năng chính:
 *   - Hiển thị danh sách sách với tìm kiếm, lọc và sắp xếp realtime
 *   - Thêm sách mới với tự động sinh book_id từ category + số thứ tự
 *   - Chỉnh sửa thông tin sách (partial update)
 *   - Xóa sách kèm xóa ảnh trên Storage
 *   - Upload ảnh bìa: hỗ trợ chọn file, kéo thả, dán từ clipboard/URL
 *   - Tự động chuyển đổi ảnh sang định dạng WebP (chất lượng 85%)
 *
 * Tên module:    Admin Book Management
 * Module liên quan: lib/api.ts, lib/supabase.ts, routes/books.js (backend)
 *
 * Phiên bản:     1.0.0
 * Tác giả:       Nguyễn Mạnh Cường
 * Ngày tạo:      2026-05-07
 * Ngày cập nhật: 2026-05-07
 * Ghi chú:       Ảnh bìa được lưu vào bucket riêng theo thể loại sách
 *                (ví dụ: van-hoc-images, manga-images, v.v.).
 * ============================================================================
 */


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";

// ID project Supabase — dùng để xây dựng URL Storage khi cần
const PROJECT_ID = "gtjrtwtbjdcznuacgrio";

/**
 * @component AdminBooksPage
 * @description Trang quản lý sách trong khu vực admin.
 *              Cung cấp giao diện CRUD đầy đủ cho sách kèm upload ảnh bìa.
 *              Tìm kiếm và sắp xếp được thực hiện qua API backend (không lọc client-side).
 */
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
  const [isDragging, setIsDragging] = useState(false);

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

  // Tải danh sách thể loại (chỉ cần gọi 1 lần lúc đầu)
  /**
   * Tải danh sách thể loại sách từ API để dùng trong dropdown form.
   * Chỉ gọi một lần khi component mount.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function loadCategories() {
    try {
      const resCats = await apiFetch<{ items: any[] }>("/categories");
      setCategories(resCats.items || []);
    } catch (e: any) {
      console.error(e);
    }
  }

  // Lấy dữ liệu sách qua API Backend (hỗ trợ lọc & tìm kiếm)
  /**
   * Tải danh sách sách từ API với các tham số tìm kiếm và sắp xếp hiện tại.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function load() {
    try {
      const qs = new URLSearchParams();
      if (keyword.trim()) qs.append("search", keyword.trim());
      if (searchBy) qs.append("searchBy", searchBy);
      if (sortBy) qs.append("sort", sortBy);

      const resBooks = await apiFetch<{ items: any[] }>(`/books?${qs.toString()}`);
      setItems(resBooks.items || []);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // Gọi API mỗi khi thay đổi từ khóa tìm kiếm hoặc sắp xếp (có độ trễ nhẹ)
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, searchBy, sortBy]);

  async function fetchNextSkuNumber(catId: string) {
    if (!catId) return "";
    try {
      const res = await apiFetch<{ items: any[] }>(`/books?category_id=${catId}`);
      let maxNum = 0;
      (res.items || []).forEach((book) => {
        const parts = book.book_id.split("-");
        if (parts.length > 1) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      return String(maxNum + 1);
    } catch (e) {
      console.error("Lỗi tính số thứ tự:", e);
      return "1";
    }
  }

  const handleCategoryChange = async (catId: string) => {
    if (!catId) {
      setSkuNumber("");
      setForm((f: any) => ({ ...f, category_id: "", book_id: "" }));
      return;
    }
    const nextNum = await fetchNextSkuNumber(catId);
    setSkuNumber(nextNum);
    const formattedNum = nextNum.padStart(3, "0");
    setForm((f: any) => ({
      ...f,
      category_id: catId,
      book_id: `${catId.toUpperCase()}-${formattedNum}`
    }));
  };

  /**
   * Tạo slug URL-friendly từ tiêu đề sách.
   * Chuẩn hóa Unicode, loại bỏ ký tự đặc biệt và thay khoảng trắng bằng dấu gạch ngang.
   *
   * @param {string} title - Tiêu đề sách cần tạo slug.
   * @returns {string} Chuỗi slug đã được chuẩn hóa.
   */
  const generateSlug = (title: string) => {
    return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
      .replace(/([^0-9a-z-\s])/g, "").replace(/(\s+)/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  };

  /**
   * Lấy tên bucket Supabase Storage tương ứng với mã thể loại sách.
   * Mỗi thể loại có bucket riêng để tổ chức ảnh bìa theo nhóm.
   *
   * @param {string} catId - Mã thể loại (ví dụ: "VH", "MG", "LN").
   * @returns {string} Tên bucket Storage tương ứng, mặc định là "books" nếu không tìm thấy.
   */
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

  /**
   * Lấy URL công khai của ảnh bìa sách từ Supabase Storage.
   *
   * @param {string} catId    - Mã thể loại để xác định bucket.
   * @param {string} fileName - Tên file ảnh trong bucket.
   * @returns {string} URL công khai của ảnh, kèm timestamp để tránh cache.
   */
  const getStorageUrl = (catId: string, fileName: string) => {
    if (!fileName) return "";
    const bucket = getBucketName(catId);
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  /**
   * Xử lý sự kiện chọn file ảnh từ input.
   * Tự động chuyển đổi ảnh sang WebP (chất lượng 85%) trước khi lưu vào state.
   *
   * @async
   * @param {React.ChangeEvent<HTMLInputElement>} e - Sự kiện change của input file.
   * @returns {Promise<void>}
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Vui lòng chọn một tệp hình ảnh hợp lệ.");
      return;
    }

    try {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Vẽ ảnh lên canvas
          ctx.drawImage(img, 0, 0);
          
          // Chuyển đổi sang WebP (chất lượng 85%)
          canvas.toBlob((blob) => {
            if (blob) {
              const originalName = file.name;
              const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
              const newFileName = `${nameWithoutExt}.webp`;
              
              const webpFile = new File([blob], newFileName, { type: 'image/webp' });
              
              setSelectedFile(webpFile);
              setLocalPreview(URL.createObjectURL(webpFile));
              setForm((f: any) => ({ ...f, image_url: `${f.book_id || ''}.webp` }));
            }
          }, 'image/webp', 0.85);
        }
        URL.revokeObjectURL(objectUrl);
      };
      
      img.onerror = () => {
        alert("Lỗi khi tải hình ảnh. Vui lòng thử lại.");
        URL.revokeObjectURL(objectUrl);
      };
      
      img.src = objectUrl;
    } catch (err) {
      console.error("Lỗi chuyển đổi ảnh:", err);
      alert("Đã xảy ra lỗi khi xử lý ảnh.");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (modalMode === "detail") return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (modalMode === "detail") return;

    // 1. Trường hợp kéo file từ máy tính
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const syntheticEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileChange(syntheticEvent);
      return;
    }

    // 2. Trường hợp kéo ảnh trực tiếp từ tab/web khác
    const html = e.dataTransfer.getData("text/html");
    const uriList = e.dataTransfer.getData("text/uri-list");
    let imageUrl = "";

    if (html) {
      const match = html.match(/<img.*?src=["'](.*?)["']/i);
      if (match && match[1]) {
        imageUrl = match[1];
      }
    }
    
    if (!imageUrl && uriList) {
      imageUrl = uriList.split('\n')[0];
    }

    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        let filename = imageUrl.split('/').pop()?.split('?')[0] || 'downloaded-image.jpg';
        if (!filename.includes('.')) filename += '.jpg';
        
        const downloadedFile = new File([blob], filename, { type: blob.type });
        const syntheticEvent = {
          target: { files: [downloadedFile] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        await handleFileChange(syntheticEvent);
      } catch (err) {
        console.error("Lỗi CORS khi lấy ảnh:", err);
        alert("Bảo mật trình duyệt (CORS) chặn lấy ảnh tự động từ trang này. Vui lòng tải ảnh về máy tính rồi kéo vào.");
      }
    }
  };

  // Global Paste Listener (bắt sự kiện paste ở mọi nơi trên trang khi đang mở form Add/Edit)
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      if (modalMode === "detail" || !modalMode) return;
      
      // 1. Dán trực tiếp file ảnh (Copy image)
      const file = e.clipboardData?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        e.preventDefault();
        const syntheticEvent = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        await handleFileChange(syntheticEvent);
        return;
      }

      // 2. Dán đường link URL của ảnh (Copy image address)
      const text = e.clipboardData?.getData("text/plain");
      if (text && (text.startsWith("http://") || text.startsWith("https://")) && text.match(/\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i)) {
        e.preventDefault();
        try {
          const response = await fetch(text);
          const blob = await response.blob();
          if (blob.type.startsWith("image/")) {
            let filename = text.split('/').pop()?.split('?')[0] || 'pasted-image.jpg';
            if (!filename.includes('.')) filename += '.jpg';
            const downloadedFile = new File([blob], filename, { type: blob.type });
            const syntheticEvent = { target: { files: [downloadedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
            await handleFileChange(syntheticEvent);
          }
        } catch (err) {
          console.error("Lỗi CORS khi paste URL ảnh:", err);
          alert("Không thể tự động tải ảnh từ link này do bảo mật CORS. Vui lòng lưu về máy rồi dán vào.");
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [modalMode]);

  /**
   * Lưu sách mới hoặc cập nhật sách hiện có.
   * Xử lý upload ảnh lên Storage trước khi gọi API backend.
   * Nếu có ảnh mới: xóa ảnh cũ → upload ảnh mới.
   * Nếu xóa tên file: xóa ảnh cũ trên Storage.
   *
   * @async
   * @param {React.FormEvent} e - Sự kiện submit của form.
   * @returns {Promise<void>}
   */
  async function saveBook(e: React.FormEvent) {
    e.preventDefault();
    if (modalMode === "detail") {
      setModalMode(null);
      return;
    }

    // Kiểm tra trùng lặp sách (trùng Tên sách, Tác giả và Nhà xuất bản)
    const isDuplicate = items.some(
      (item) =>
        item.title.trim().toLowerCase() === form.title.trim().toLowerCase() &&
        item.author.trim().toLowerCase() === form.author.trim().toLowerCase() &&
        (item.publisher || "").trim().toLowerCase() === (form.publisher || "").trim().toLowerCase() &&
        item.book_id !== form.book_id
    );
    if (isDuplicate) {
      alert("Sách này đã tồn tại trong hệ thống (trùng Tên sách, Tác giả và Nhà xuất bản)!");
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

      const saveData = {
        book_id: form.book_id,
        title: form.title,
        author: form.author,
        publisher: form.publisher,
        isbn: form.isbn,
        category_id: form.category_id,
        price: Number(form.price) || 0,
        sale_price: Number(form.sale_price) || 0,
        is_on_sale: Boolean(form.is_on_sale),
        description: form.description,
        slug: form.slug || generateSlug(form.title || ""),
        is_published: Boolean(form.is_published),
        publish_year: Number(form.publish_year) || new Date().getFullYear(),
        quantity: Number(form.quantity) || 0,
        location: form.location || "",
        image_url: finalImageUrl
      };
      if (modalMode === "add") {
        await apiFetch("/admin/books", { method: "POST", body: JSON.stringify(saveData) });
      } else if (modalMode === "edit") {
        await apiFetch(`/admin/books/${form.book_id}`, { method: "PATCH", body: JSON.stringify(saveData) });
      }
      setModalMode(null);
      setSelectedFile(null);
      setLocalPreview(null);
      await load();
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  /**
   * Xóa sách và ảnh bìa tương ứng trên Supabase Storage.
   * Hiển thị confirm dialog trước khi thực hiện.
   *
   * @async
   * @param {string} bookId - Mã sách cần xóa.
   * @returns {Promise<void>}
   */
  async function remove(bookId: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${bookId}"? Hành động này sẽ xóa cả ảnh đi kèm.`)) return;
    try {
      const book = items.find(i => i.book_id === bookId);
      if (book?.image_url) {
        await supabase.storage.from(getBucketName(book.category_id)).remove([book.image_url]);
      }
      await apiFetch(`/admin/books/${bookId}`, { method: "DELETE" });
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

  async function openEdit(book: any) {
    try {
      const res = await apiFetch<{ item: any }>(`/books/${book.book_id}`);
      setForm({ ...emptyForm, ...res.item });
      setSelectedFile(null);
      setLocalPreview(null);
      setModalMode("edit");
      const parts = res.item.book_id.split("-");
      if (parts.length > 1) {
        setSkuNumber(parts[1]);
      } else {
        setSkuNumber("");
      }
    } catch (e: any) {
      alert("Lỗi tải chi tiết: " + (e.message || String(e)));
    }
  }

  async function openDetail(book: any) {
    try {
      const res = await apiFetch<{ item: any }>(`/books/${book.book_id}`);
      setForm({ ...emptyForm, ...res.item });
      setSelectedFile(null);
      setLocalPreview(null);
      setModalMode("detail");
      const parts = res.item.book_id.split("-");
      if (parts.length > 1) {
        setSkuNumber(parts[1]);
      } else {
        setSkuNumber("");
      }
    } catch (e: any) {
      alert("Lỗi tải chi tiết: " + (e.message || String(e)));
    }
  }

  /**
   * Lấy tên thể loại hiển thị từ mã thể loại.
   *
   * @param {string} rawId - Mã thể loại cần tra cứu.
   * @returns {string} Tên thể loại hoặc mã gốc nếu không tìm thấy.
   */
  const getCategoryName = (rawId: string) => {
    if (!rawId) return "";
    const safeId = String(rawId).trim().toUpperCase();
    const apiCategory = categories.find(c => String(c.category_id).toUpperCase() === safeId);
    return apiCategory ? apiCategory.name : rawId;
  };

  // Không còn tự lọc ở Frontend nữa, API đã trả về list chuẩn
  const filteredAndSortedItems = items;

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
          transition: all 0.2s ease;
        }
        .vertical-preview-box.drag-active {
          border-color: #0d6efd;
          background-color: #e2eefd;
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
            <option value="publisher">Nhà xuất bản</option> 
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
            <option value="price-asc">Giá gốc: Tăng dần</option>
            <option value="price-desc">Giá gốc: Giảm dần</option>
            <option value="sale_price-asc">Giá KM: Tăng dần</option>
            <option value="sale_price-desc">Giá KM: Giảm dần</option>
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
                <th>Nhà xuất bản</th>
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
                  <td>{b.publisher}</td>
                  <td className="text-center">{b.publish_year}</td>
                  <td className="text-end">
                    {b.is_on_sale && b.sale_price > 0 ? (
                      <>
                        <div className="text-danger fw-bold">{b.sale_price.toLocaleString("vi-VN")}</div>
                        <div className="text-muted text-decoration-line-through small">{b.price ? b.price.toLocaleString("vi-VN") : "0"}</div>
                      </>
                    ) : (
                      <div className="fw-bold">{b.price ? b.price.toLocaleString("vi-VN") : "0"}</div>
                    )}
                  </td>
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
          <div 
            className="modal fade show d-block" 
            style={{ zIndex: 1050 }} 
            tabIndex={-1} 
            onClick={() => setModalMode(null)}
          >
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
                        <div 
                          className={`vertical-preview-box shadow-sm mb-3 position-relative ${isDragging ? 'drag-active' : ''}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
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
                            <select className="form-select" required disabled={modalMode !== "add"} value={form.category_id} onChange={(e) => handleCategoryChange(e.target.value)}>
                              <option value="">-- Chọn --</option>
                              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label fw-bold small">Số thứ tự</label>
                            <input type="text" className="form-control bg-light fw-bold text-center" readOnly placeholder="Hệ thống tự động" value={skuNumber ? skuNumber.padStart(3, "0") : ""} />
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