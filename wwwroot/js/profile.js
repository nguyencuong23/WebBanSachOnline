function openPaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closePaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

// Close on click outside
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("paymentModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        closePaymentModal();
      }
    });
  }

  // Handle change password form submission
  const changePasswordForm = document.getElementById("changePasswordForm");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handleChangePassword);
  }
});

// Toggle password visibility
function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  const icon = document.getElementById(fieldId + "-icon");

  if (field && icon) {
    if (field.type === "password") {
      field.type = "text";
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      field.type = "password";
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  }
}

// Handle change password form submission
async function handleChangePassword(e) {
  e.preventDefault();

  const form = e.target;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorDiv = document.getElementById("changePasswordError");
  const submitBtn = form.querySelector('button[type="submit"]');

  // Hide previous errors
  errorDiv.classList.add("d-none");

  // Client-side validation
  if (newPassword !== confirmPassword) {
    errorDiv.textContent = "Mật khẩu xác nhận không khớp";
    errorDiv.classList.remove("d-none");
    return;
  }

  // Password format validation
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    errorDiv.textContent =
      "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt";
    errorDiv.classList.remove("d-none");
    return;
  }

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<i class="fa fa-spinner fa-spin me-2"></i>Đang xử lý...';

  try {
    // Get anti-forgery token
    const token = form.querySelector(
      'input[name="__RequestVerificationToken"]',
    ).value;

    const response = await fetch("/Profile/ChangePassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: token,
      },
      body: JSON.stringify({
        NewPassword: newPassword,
        ConfirmPassword: confirmPassword,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("changePasswordModal"),
      );
      modal.hide();

      // Clear form
      form.reset();

      // Show success message
      const alertDiv = document.createElement("div");
      alertDiv.className = "alert alert-success alert-dismissible fade show";
      alertDiv.innerHTML = `
        <i class="fa fa-check-circle me-2"></i>${result.message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;

      const container = document.querySelector(".container.py-5");
      container.insertBefore(alertDiv, container.firstChild);

      // Auto dismiss after 5 seconds
      setTimeout(() => alertDiv.remove(), 5000);
    } else {
      errorDiv.textContent = result.message;
      errorDiv.classList.remove("d-none");
    }
  } catch (error) {
    errorDiv.textContent =
      "Có lỗi xảy ra khi kết nối đến server. Vui lòng thử lại.";
    errorDiv.classList.remove("d-none");
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa fa-save me-2"></i>Cập nhật mật khẩu';
  }
}
