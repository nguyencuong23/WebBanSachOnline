# API Documentation: Quản Lý Sách (Books & Categories)

Tài liệu này mô tả các API endpoints (Backend) được sử dụng để tương tác và quản lý dữ liệu Sách và Thể loại, đặc biệt là các API được gọi từ màn hình `BooksAdmin.tsx`.

> **Lưu ý về Authentication:** 
> Các API dành cho Admin (có tiền tố `/admin/`) yêu cầu JWT Token trong Header (`Authorization: Bearer <token>`) và user đó phải có role là `admin`.

---

## 1. Lấy danh sách toàn bộ Sách
- **Endpoint**: `GET /books`
- **Mô tả**: Lấy danh sách sách kèm theo thông tin thể loại.
- **Query Parameters**:
  - `search` (string, optional): Tìm kiếm theo tên sách hoặc tên tác giả.
  - `sort` (string, optional): Sắp xếp (VD: `title_asc`, `title_desc`).
- **Response** (200 OK):
  ```json
  {
    "items": [
      {
        "book_id": "VH-001",
        "title": "Nhà Giả Kim",
        "author": "Paulo Coelho",
        "price": 100000,
        "quantity": 50,
        "categories": { "category_id": "VH", "name": "Văn Học" },
        ...
      }
    ]
  }
  ```

---

## 2. Lấy chi tiết một cuốn sách
- **Endpoint**: `GET /books/:bookId`
- **Mô tả**: Lấy thông tin chi tiết của một cuốn sách theo mã sách.
- **Tham số URL**:
  - `bookId`: Mã sách (VD: `VH-001`)
- **Response** (200 OK):
  ```json
  {
    "item": {
      "book_id": "VH-001",
      "title": "Nhà Giả Kim",
      "author": "Paulo Coelho",
      "categories": { "category_id": "VH", "name": "Văn Học" },
      ...
    }
  }
  ```
- **Response** (404 Not Found):
  ```json
  {
    "error": { "message": "Book not found" }
  }
  ```

---

## 3. Lấy sách mới nhất
- **Endpoint**: `GET /books/latest`
- **Mô tả**: Lấy danh sách các cuốn sách được thêm mới nhất (dùng cho trang chủ).
- **Query Parameters**:
  - `limit` (integer, optional): Số lượng sách muốn lấy, mặc định là 10.
- **Response** (200 OK): Trả về mảng `items` tương tự như API `GET /books`.

---

## 4. Thêm Sách Mới (Admin)
- **Endpoint**: `POST /admin/books`
- **Mô tả**: Tạo một bản ghi sách mới trong database.
- **Header Yêu cầu**: `Authorization: Bearer <token>`
- **Body** (JSON):
  ```json
  {
    "book_id": "string (Required)",
    "title": "string (Required)",
    "author": "string (Required)",
    "publisher": "string",
    "isbn": "string",
    "category_id": "string (Required)",
    "price": "number (Required, >= 0)",
    "sale_price": "number",
    "is_on_sale": "boolean",
    "description": "string",
    "slug": "string",
    "is_published": "boolean",
    "publish_year": "number (Int)",
    "quantity": "number (Int, >= 0)",
    "location": "string",
    "image_url": "string"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "item": { /* Thông tin sách vừa được tạo */ }
  }
  ```

---

## 5. Cập Nhật Sách (Admin)
- **Endpoint**: `PATCH /admin/books/:bookId`
- **Mô tả**: Chỉnh sửa thông tin của một cuốn sách đã tồn tại.
- **Header Yêu cầu**: `Authorization: Bearer <token>`
- **Tham số URL**:
  - `bookId`: Mã sách cần cập nhật (VD: `VH-001`)
- **Body** (JSON): Truyền các trường cần cập nhật (tương tự như `POST /admin/books`, tất cả các trường đều là optional).
- **Response** (200 OK):
  ```json
  {
    "item": { /* Thông tin sách sau khi cập nhật */ }
  }
  ```

---

## 6. Xóa Sách (Admin)
- **Endpoint**: `DELETE /admin/books/:bookId`
- **Mô tả**: Xóa hoàn toàn một cuốn sách khỏi database.
- **Header Yêu cầu**: `Authorization: Bearer <token>`
- **Tham số URL**:
  - `bookId`: Mã sách cần xóa.
- **Response** (200 OK):
  ```json
  {
    "ok": true
  }
  ```
> **Ghi chú Frontend**: Logic Frontend (`BooksAdmin.tsx`) vẫn chịu trách nhiệm tự gọi trực tiếp Supabase Storage SDK để upload / xóa file ảnh WebP trên Cloud trước khi gọi đến các API database này, vì Backend hiện tại không hỗ trợ API xử lý file tĩnh.

---

## 7. Lấy danh sách Thể loại (Categories)
- **Endpoint**: `GET /categories`
- **Mô tả**: Lấy danh sách tất cả thể loại sách để hiển thị ở Dropdown chọn thể loại.
- **Response** (200 OK):
  ```json
  {
    "items": [
      {
        "category_id": "VH",
        "name": "Văn học"
      },
      ...
    ]
  }
  ```
