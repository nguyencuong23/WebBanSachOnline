(function () {
  "use strict";

  const API = {
    list: "/api/notifications",
    unreadCount: "/api/notifications/unread-count",
    markRead: (id) => `/api/notifications/${id}/read`,
    readAll: "/api/notifications/read-all",
  };

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
  }

  function fetchOptions(method, body) {
    const opt = {
      method,
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: getCookie("RequestVerificationToken") || "",
      },
      credentials: "same-origin",
    };
    if (body && (method === "POST" || method === "PUT")) opt.body = JSON.stringify(body);
    return opt;
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 60000;
    if (diff < 1) return "Vừa xong";
    if (diff < 60) return Math.floor(diff) + " phút trước";
    if (diff < 1440) return Math.floor(diff / 60) + " giờ trước";
    if (diff < 43200) return Math.floor(diff / 1440) + " ngày trước";
    return d.toLocaleDateString("vi-VN");
  }

  // --- 1. Cập nhật badge số thông báo chưa đọc ---
  function loadUnreadCount() {
    fetch(API.unreadCount, fetchOptions("GET"))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const badge = document.getElementById("badgeCount");
        if (!badge) return;
        const count = data.count || 0;
        badge.textContent = count > 99 ? "99+" : count;
        badge.style.display = count > 0 ? "inline-block" : "none";
      })
      .catch(() => {});
  }

  // --- 2. Load danh sách thông báo và render ---
  function ensureArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && typeof data.length === "number") return Array.from(data);
    return [];
  }

  function loadAndRenderList(container, emptyEl) {
    if (!container) return;
    container.innerHTML = "<li class='px-3 py-3 text-center text-muted'>Đang tải...</li>";
    if (emptyEl) emptyEl.style.display = "none";

    fetch(API.list, fetchOptions("GET"))
      .then(function (r) {
        if (!r.ok) return Promise.reject(new Error(r.statusText));
        return r.json();
      })
      .then(function (data) {
        var items = ensureArray(data);
        loadUnreadCount();
        if (items.length === 0) {
          container.innerHTML = "";
          if (emptyEl) emptyEl.style.display = "block";
          return;
        }
        if (emptyEl) emptyEl.style.display = "none";
        container.innerHTML = items
          .map(function (n) {
            var id = n.id != null ? n.id : n.Id;
            var title = n.title != null ? n.title : n.Title || "";
            var message = n.message != null ? n.message : n.Message || "";
            var link = n.link != null ? n.link : n.Link || "";
            var isRead = n.isRead != null ? n.isRead : n.IsRead;
            var createdAt = n.createdAt != null ? n.createdAt : n.CreatedAt;
            return (
              "<li><a href='#' class='dropdown-item notification-item " +
              (isRead ? "" : "unread") +
              "' data-id='" +
              id +
              "' data-link='" +
              String(link).replace(/"/g, "&quot;") +
              "'>" +
              "<div class='notif-title'>" +
              escapeHtml(title) +
              "</div>" +
              "<div class='notif-message'>" +
              escapeHtml(message) +
              "</div>" +
              "<div class='notif-time'>" +
              formatTime(createdAt) +
              "</div></a></li>"
            );
          })
          .join("");
      })
      .catch(function () {
        container.innerHTML = "<li class='px-3 py-3 text-center text-danger'>Không tải được thông báo.</li>";
      });
  }

  function escapeHtml(s) {
    if (!s) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // --- 3. Đánh dấu đã đọc rồi chuyển trang ---
  function onNotificationClick(e) {
    const item = e.target.closest(".notification-item");
    if (!item) return;
    e.preventDefault();
    const id = item.getAttribute("data-id");
    const link = item.getAttribute("data-link") || "/Client/Loans";
    fetch(API.markRead(id), fetchOptions("POST"))
      .then(() => loadUnreadCount())
      .catch(() => {});
    window.location.href = link;
  }

  // --- 4. Đánh dấu tất cả đã đọc ---
  function onMarkAllRead(e) {
    e.preventDefault();
    fetch(API.readAll, fetchOptions("POST"))
      .then((r) => {
        if (r.ok) {
          loadUnreadCount();
          const list = document.getElementById("notificationList");
          if (list) {
            list.querySelectorAll(".notification-item.unread").forEach((el) => el.classList.remove("unread"));
          }
        }
      })
      .catch(() => {});
  }

  // --- 5. Active link navbar (giữ logic cũ) ---
  function handleActiveNavbar() {
    const currentPath = window.location.pathname.toLowerCase();
    document.querySelectorAll("nav a").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const linkPath = href.toLowerCase();
      const isHome =
        (currentPath === "/" || currentPath === "/client" || currentPath === "/client/index") &&
        (linkPath === "/" || linkPath.includes("index"));
      const isExactMatch = currentPath === linkPath;
      const isSubPage = currentPath.includes(linkPath) && linkPath.length > 5;
      if (isHome || isExactMatch || isSubPage) link.classList.add("nav-active");
      else link.classList.remove("nav-active");
    });
  }

  // --- Khởi tạo ---
  document.addEventListener("DOMContentLoaded", function () {
    handleActiveNavbar();

    const bellBtn = document.getElementById("notificationBellBtn");
    const dropdownContainer = bellBtn ? bellBtn.closest(".dropdown") : null;
    const listEl = document.getElementById("notificationList");
    const emptyEl = document.getElementById("notificationEmpty");
    const markAllBtn = document.getElementById("markAllReadBtn");

    if (bellBtn && dropdownContainer && listEl) {
      loadUnreadCount();

      // Bootstrap 5: show.bs.dropdown fire trên phần tử .dropdown (container), không phải menu <ul>
      dropdownContainer.addEventListener("show.bs.dropdown", function () {
        loadAndRenderList(listEl, emptyEl);
      });

      listEl.addEventListener("click", onNotificationClick);
    }

    if (markAllBtn) markAllBtn.addEventListener("click", onMarkAllRead);
  });
})();
