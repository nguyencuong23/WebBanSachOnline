function openPayFineModal(userId, currentDebt) {
  document.getElementById("payFineUserId").value = userId;
  document.getElementById("payFineCurrentDebt").value = new Intl.NumberFormat(
    "vi-VN",
    { style: "currency", currency: "VND" },
  ).format(currentDebt);
  var myModal = new bootstrap.Modal(document.getElementById("payFineModal"));
  myModal.show();
}

// Auto-submit filter form
function handleFilterChange() {
  document.getElementById("filterForm").submit();
}
