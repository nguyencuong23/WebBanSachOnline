// ===== ADMIN.JS - Admin Panel Utilities =====

document.addEventListener("DOMContentLoaded", function () {
  // Auto-hide alerts after 5 seconds
  autoHideAlerts();

  // Initialize search functionality
  initializeSearch();

  // Initialize filter functionality
  initializeFilters();

  // Active menu highlighting
  highlightActiveMenu();
});

// Auto-hide success/info alerts after 5 seconds
function autoHideAlerts() {
  const alerts = document.querySelectorAll(".alert-success, .alert-info");
  alerts.forEach((alert) => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });
}

// Initialize table search
function initializeSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const table = document.querySelector(".table tbody");
  if (!table) return;

  searchInput.addEventListener("keyup", function () {
    const searchTerm = this.value.toLowerCase();
    const rows = table.getElementsByTagName("tr");

    for (let row of rows) {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? "" : "none";
    }
  });
}

// Initialize filter dropdowns
function initializeFilters() {
  const filterSelect = document.getElementById("statusFilter");
  if (!filterSelect) return;

  const table = document.querySelector(".table tbody");
  if (!table) return;

  filterSelect.addEventListener("change", function () {
    const filterValue = this.value.toLowerCase();
    const rows = table.getElementsByTagName("tr");

    for (let row of rows) {
      if (filterValue === "all" || filterValue === "") {
        row.style.display = "";
      } else {
        const statusCell = row.querySelector(".badge");
        if (statusCell) {
          const statusText = statusCell.textContent.toLowerCase();
          row.style.display = statusText.includes(filterValue) ? "" : "none";
        }
      }
    }
  });
}

// Highlight active menu item
function highlightActiveMenu() {
  const currentPath = window.location.pathname;
  const menuLinks = document.querySelectorAll(".sidebar-menu .nav-link");

  menuLinks.forEach((link) => {
    const linkPath = link.getAttribute("href");
    if (linkPath && currentPath.includes(linkPath.split("?")[0])) {
      link.classList.add("active");
    }
  });
}

// Confirm delete action
function confirmDelete(itemName) {
  return confirm(
    `Bạn có chắc chắn muốn xóa "${itemName}"? Hành động này không thể hoàn tác.`,
  );
}

// Format currency (VND)
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
