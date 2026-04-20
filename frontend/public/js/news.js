document.addEventListener("DOMContentLoaded", function () {
  // 1. Kiểm tra xem phần tử Modal có tồn tại trong HTML không
  const newsModalElement = document.getElementById("newsDetailModal");

  // Nếu không có Modal trong HTML thì dừng lại ngay để tránh lỗi
  if (!newsModalElement) {
    console.error('Lỗi: Không tìm thấy ID "newsDetailModal" trong HTML.');
    return;
  }

  // Khởi tạo Bootstrap Modal
  const newsModal = new bootstrap.Modal(newsModalElement);

  // 2. Lấy các phần tử DOM (Chỉ lấy 1 lần để tối ưu hiệu năng)
  const modalElements = {
    title: document.getElementById("modalTitle"),
    category: document.getElementById("modalCategory"),
    date: document.getElementById("modalDate"),
    image: document.getElementById("modalImage"),
    content: document.getElementById("modalContent"),
  };

  // 3. Bắt sự kiện click
  const newsLinks = document.querySelectorAll(".js-show-news");

  newsLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault(); // Ngăn chặn load lại trang

      // Lấy dữ liệu (Sử dụng '||' để tạo nội dung mặc định nếu thiếu data)
      const data = {
        title: this.getAttribute("data-title") || "Thông báo",
        category: this.getAttribute("data-category") || "Tin tức",
        date:
          this.getAttribute("data-date") ||
          new Date().toLocaleDateString("vi-VN"),
        image: this.getAttribute("data-image"),
        content:
          this.getAttribute("data-content") ||
          "<p>Nội dung đang cập nhật...</p>",
      };

      // Gán dữ liệu vào Modal (Kiểm tra nếu thẻ đó có tồn tại thì mới gán)
      if (modalElements.title) modalElements.title.innerText = data.title;
      if (modalElements.category)
        modalElements.category.innerText = data.category;
      if (modalElements.date)
        modalElements.date.innerHTML = `<i class="far fa-clock me-1"></i> ${data.date}`;
      if (modalElements.content) modalElements.content.innerHTML = data.content;

      // Xử lý ảnh: Có ảnh thì hiện, không có thì ẩn khung ảnh
      if (modalElements.image) {
        if (data.image) {
          modalElements.image.src = data.image;
          modalElements.image.style.display = "block";
        } else {
          modalElements.image.style.display = "none";
        }
      }

      // Hiển thị Modal
      newsModal.show();
    });
  });
});
