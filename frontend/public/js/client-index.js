document.addEventListener("DOMContentLoaded", function () {
  AOS.init({ offset: 100, duration: 800, easing: "ease-in-out", once: true });

  new Swiper(".myBookSwiper", {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    grabCursor: true,
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
      dynamicBullets: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    breakpoints: {
      640: { slidesPerView: 2, spaceBetween: 20 },
      768: { slidesPerView: 3, spaceBetween: 30 },
      1024: { slidesPerView: 4, spaceBetween: 30 },
    },
  });
});

function performSearch() {
  const input = document.getElementById("homeSearchInput");
  const keyword = input.value.trim();

  if (keyword) {
    window.location.href = `/Client/Search?search=${encodeURIComponent(keyword)}`;
  } else {
    input.focus();
    input.style.border = "2px solid #ffc107";
    setTimeout(() => (input.style.border = "none"), 1000);
  }
}

function handleEnter(event) {
  if (event.key === "Enter") {
    performSearch();
  }
}

const serviceData = {
  reading: {
    title: "Không gian Đọc & Tự học Hiện đại",
    image:
      "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1920&q=80",
    content: `
            <p class="lead text-secondary">Thư viện Đại Nam cung cấp không gian yên tĩnh với 500 chỗ ngồi.</p>
            <hr class="my-5">
            <div class="row mt-5">
                <div class="col-md-6">
                    <h4 class="fw-bold mb-4" style="color: #2c3e50;"><i class="fas fa-star text-warning me-2"></i>Tiện ích nổi bật</h4>
                    <ul class="list-unstyled svc-list fa-ul">
                        <li><span class="fa-li"><i class="fas fa-wifi"></i></span>Wifi tốc độ cao</li>
                        <li><span class="fa-li"><i class="fas fa-plug"></i></span>Ổ cắm điện tại bàn</li>
                        <li><span class="fa-li"><i class="fas fa-chair"></i></span>Ghế Ergonomic</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <div class="svc-feature-box shadow-sm">
                        <h5 class="fw-bold"><i class="fas fa-info-circle me-2"></i>Quy định</h5>
                        <p class="mb-0">Vui lòng giữ trật tự và vệ sinh chung.</p>
                    </div>
                </div>
            </div>
        `,
  },
  meeting: {
    title: "Dịch vụ Phòng Họp Nhóm",
    image:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1920&q=80",
    content: `
            <p class="lead text-secondary">Không gian thảo luận nhóm cách âm tốt.</p>
            <hr class="my-5">
            <div class="row mt-5 align-items-center">
                <div class="col-md-6">
                    <img src="https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=800&q=80" class="img-fluid rounded-4 shadow-lg">
                </div>
                <div class="col-md-6 ps-md-5">
                    <h4 class="fw-bold mb-4">Trang thiết bị</h4>
                    <ul class="list-unstyled svc-list fa-ul">
                        <li><span class="fa-li"><i class="fas fa-tv"></i></span>Smart TV 65 inch</li>
                        <li><span class="fa-li"><i class="fas fa-chalkboard-teacher"></i></span>Bảng kính</li>
                    </ul>
                </div>
            </div>
        `,
  },
  digital: {
    title: "Thư viện Số & Cơ sở Dữ liệu",
    image:
      "https://images.unsplash.com/photo-1507842217121-ca1904a5e1a1?auto=format&fit=crop&w=1920&q=80",
    content: `
            <p class="lead text-secondary">Truy cập hàng ngàn tài liệu điện tử mọi lúc, mọi nơi.</p>
            <hr class="my-5">
            <div class="row mt-5">
                <div class="col-md-4">
                    <div class="text-center p-4 border rounded-3 hover-shadow">
                        <i class="fas fa-book-reader fa-3x text-primary mb-3"></i>
                        <h5>E-Books</h5>
                        <p class="small text-muted">20,000+ đầu sách điện tử</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center p-4 border rounded-3 hover-shadow">
                        <i class="fas fa-newspaper fa-3x text-success mb-3"></i>
                        <h5>Tạp chí Khoa học</h5>
                        <p class="small text-muted">Kết nối CSDL quốc tế</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="text-center p-4 border rounded-3 hover-shadow">
                        <i class="fas fa-graduation-cap fa-3x text-warning mb-3"></i>
                        <h5>Luận văn / Đồ án</h5>
                        <p class="small text-muted">Kho tài liệu nội sinh DNU</p>
                    </div>
                </div>
            </div>
        `,
  },
};

function openService(serviceKey) {
  const data = serviceData[serviceKey];
  if (!data) return;

  document.getElementById("svc-header").style.backgroundImage =
    `url('${data.image}')`;
  document.getElementById("svc-title").innerHTML = data.title;
  document.getElementById("svc-body").innerHTML = data.content;

  document.body.style.overflow = "hidden";
  document.getElementById("service-overlay").classList.add("active");
}

function closeService() {
  document.getElementById("service-overlay").classList.remove("active");
  document.body.style.overflow = "";
}
