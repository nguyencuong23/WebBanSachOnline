function closeModal() {
  document.getElementById("modal-overlay").classList.remove("active");
}

function formatVnd(number) {
  return new Intl.NumberFormat("vi-VN").format(number || 0) + " đ";
}

// --- HELPER: Detect Group for Smart Description ---
function detectGroup(bookId) {
  if (!bookId || bookId.length < 2) return "Tài liệu Khác";
  const prefix = bookId.substring(0, 2).toUpperCase();
  const groups = {
    IT: "Công nghệ & Lập trình",
    KH: "Khoa học Tự nhiên",
    KT: "Kinh tế & Tài chính",
    NN: "Ngôn ngữ & Văn hóa",
    VH: "Văn học & Nghệ thuật",
    PL: "Pháp luật & Đời sống",
    YD: "Y Dược & Sức khỏe",
  };
  return groups[prefix] || "Tài liệu Tổng hợp";
}

// --- HELPER: Generate Smart Description ---
function getSmartDescription(title, author, bookId) {
  const groupName = detectGroup(bookId);
  let template = "";

  switch (groupName) {
    case "Công nghệ & Lập trình":
      template = `Tài liệu <b>"${title}"</b> là nguồn kiến thức quý giá dành cho sinh viên và kỹ sư ngành CNTT. Sách cung cấp các nền tảng kỹ thuật quan trọng, cập nhật xu hướng công nghệ mới giúp người đọc nâng cao tư duy lập trình và giải quyết vấn đề hiệu quả.`;
      break;
    case "Kinh tế & Tài chính":
      template = `Cuốn sách <b>"${title}"</b> của tác giả ${author} đi sâu phân tích các nguyên lý kinh tế thị trường, quản trị tài chính và chiến lược kinh doanh. Đây là tài liệu tham khảo thiết yếu, giúp sinh viên khối ngành Kinh tế nắm bắt tư duy quản lý hiện đại.`;
      break;
    case "Ngôn ngữ & Văn hóa":
      template = `Khám phá vẻ đẹp ngôn ngữ và bản sắc văn hóa đa dạng qua tác phẩm <b>"${title}"</b>. Sách không chỉ giúp người đọc mở rộng vốn từ vựng, ngữ pháp mà còn cung cấp cái nhìn sâu sắc về bối cảnh văn hóa đặc trưng.`;
      break;
    case "Y Dược & Sức khỏe":
      template = `Tài liệu chuyên ngành Y Dược cung cấp kiến thức y khoa chính xác, cập nhật các phương pháp chẩn đoán và điều trị tiên tiến. <b>"${title}"</b> là cẩm nang hữu ích hỗ trợ đắc lực cho sinh viên y khoa và các bác sĩ trong quá trình nghiên cứu.`;
      break;
    case "Khoa học Tự nhiên":
      template = `Tài liệu <b>"${title}"</b> tập hợp các nghiên cứu và lý thuyết nền tảng về khoa học tự nhiên. Sách được trình bày logic, khoa học, phù hợp cho việc tra cứu và nghiên cứu chuyên sâu của giảng viên và sinh viên.`;
      break;
    case "Pháp luật & Đời sống":
      template = `Cuốn sách hệ thống hóa các quy định pháp luật hiện hành và các tình huống thực tiễn. <b>"${title}"</b> là tài liệu quan trọng giúp người đọc hiểu rõ hơn về hệ thống pháp lý và cách áp dụng luật vào đời sống.`;
      break;
    default:
      template = `Tác phẩm <b>"${title}"</b> của tác giả <b>${author}</b> là lựa chọn phù hợp để bạn bổ sung vào tủ sách của mình. Thêm vào giỏ để đặt mua nhanh chóng.`;
      break;
  }
  return template;
}

// --- MAIN: Open Modal ---
function openDetailModal(bookId) {
  const dataContainer = document.getElementById(`modal-data-${bookId}`);
  if (!dataContainer) return;

  const title = dataContainer.querySelector(".data-title").innerText;
  const author = dataContainer.querySelector(".data-author").innerText;
  const category = dataContainer.querySelector(".data-category").innerText;
  const location = dataContainer.querySelector(".data-location").innerText;
  const quantity = parseInt(
    dataContainer.querySelector(".data-quantity").innerText,
  );
  const price = parseFloat(
    (dataContainer.querySelector(".data-price")?.innerText || "0").replace(
      ",",
      ".",
    ),
  );
  const salePriceRaw = dataContainer.querySelector(".data-sale-price")?.innerText;
  const salePrice = salePriceRaw ? parseFloat(salePriceRaw.replace(",", ".")) : null;
  const unitPrice = salePrice && salePrice > 0 && salePrice < price ? salePrice : price;
  const image = dataContainer.querySelector(".data-image").innerText;
  const publisher =
    dataContainer.querySelector(".data-publisher").innerText || "NXB Giáo Dục";
  const year = dataContainer.querySelector(".data-year").innerText || "2023";

  // Generate dynamic description
  const description = getSmartDescription(title, author, bookId);

  const statusText =
    quantity > 0
      ? `<span class="text-success fw-bold"><i class="fas fa-check-circle"></i> Có sẵn (${quantity} cuốn)</span>`
      : `<span class="text-danger fw-bold"><i class="fas fa-times-circle"></i> Đã hết sách</span>`;

  const statusBg = quantity > 0 ? "#ecfdf5" : "#fef2f2";
  const statusColor = quantity > 0 ? "#059669" : "#dc2626";
  const statusIcon = quantity > 0 ? "fa-check-circle" : "fa-times-circle";
  const statusLabel = quantity > 0 ? `Sẵn sàng (${quantity})` : "Hết sách";

  // READ CONFIG FROM DOM
  const csrfToken = document.getElementById("csrf-container").innerHTML.trim();
  const returnUrl = window.location.pathname + window.location.search;

  const priceHtml =
    salePrice && salePrice > 0 && salePrice < price
      ? `<div class="d-flex align-items-end gap-2" style="margin-bottom: 18px;">
            <div style="font-size: 1.6rem; font-weight: 800; color:#0f172a;">${formatVnd(unitPrice)}</div>
            <div class="text-muted text-decoration-line-through">${formatVnd(price)}</div>
         </div>`
      : `<div style="margin-bottom: 18px; font-size: 1.6rem; font-weight: 800; color:#0f172a;">${formatVnd(unitPrice)}</div>`;

  const html = `
        <div class="modal-content-flex">
            <div class="modal-img-col">
                <div style="border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.2); background: #fff;">
                        <img src="${image}" class="modal-book-img" alt="${title}">
                </div>
            </div>
            <div class="modal-info-col">
                <h2 class="modal-book-title">${title}</h2>
                
                <div style="margin-bottom: 20px; color: #475569; font-size: 1.1rem;">
                    <i class="fas fa-pen-nib"></i> Tác giả: <strong>${author}</strong>
                </div>

                ${priceHtml}

                <div style="display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15px;">
                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 6px 15px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas ${statusIcon}"></i> ${statusLabel}
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px 30px; background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 0.95rem;">
                    <div><span style="color:#94a3b8; font-size:0.8rem; display:block;">THỂ LOẠI</span> <b style="color:#334155;">${category}</b></div>
                    <div><span style="color:#94a3b8; font-size:0.8rem; display:block;">NXB</span> <b style="color:#334155;">${publisher}</b></div>
                    <div><span style="color:#94a3b8; font-size:0.8rem; display:block;">NĂM XB</span> <b style="color:#334155;">${year}</b></div>
                    <div><span style="color:#94a3b8; font-size:0.8rem; display:block;">VỊ TRÍ</span> <b style="color:#334155;">${location}</b></div>
                </div>

                <div>
                    <label style="color: #005aab; font-weight: bold; display: block; margin-bottom: 8px;">
                        <i class="fas fa-align-left"></i> Giới thiệu nội dung:
                    </label>
                    <div class="modal-book-desc">
                        ${description}
                    </div>
                </div>

                <form action="/Cart/Add" method="post" class="modal-actions mt-4 d-flex gap-2">
                    ${csrfToken}
                    <input type="hidden" name="bookId" value="${bookId}" />
                    <input type="number" name="quantity" value="1" min="1" max="${Math.max(1, quantity)}" class="form-control" style="max-width: 110px;" ${quantity > 0 ? "" : "disabled"} />
                    <input type="hidden" name="returnUrl" value="${returnUrl}" />
                    
                    <button type="submit" class="btn btn-primary flex-grow-1 py-2 rounded-pill fw-bold text-decoration-none d-flex align-items-center justify-content-center" ${quantity > 0 ? "" : "disabled"}>
                        <i class="fa-solid fa-cart-plus me-2"></i> Thêm vào giỏ
                    </button>

                        <button type="button" class="btn btn-outline-secondary rounded-circle" style="width: 45px; height: 45px;" onclick="closeModal()">
                        <i class="fa-solid fa-xmark"></i>
                        </button>
                </form>
            </div>
        </div>
    `;

  document.getElementById("detail-content").innerHTML = html;
  document.getElementById("modal-overlay").classList.add("active");
}
