// Hàm lật sách
function togglePage() {
  const book = document.getElementById("theBook");
  book.classList.toggle("show-register");

  // Reset forgot password forms khi đóng sách
  if (!book.classList.contains("show-register")) {
    resetForgotPasswordForms();
  }
}

// Xử lý sự kiện gửi yêu cầu
function handleRecovery(e) {
  const btn = e.target.querySelector("button");
  const originalText = btn.innerHTML;

  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG GỬI...';
  btn.style.opacity = "0.7";

  return true;
}

// === FORGOT PASSWORD LOGIC (2 BƯỚC ẨN/HIỆN) ===

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Bước 1: Gửi OTP
async function handleSendOtp(e) {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim();
  const sendBtn = document.getElementById("sendOtpBtn");
  const btnText = sendBtn.querySelector(".btn-text");
  const loader = sendBtn.querySelector(".btn-loader");
  const errorDiv = document.getElementById("emailError");

  // Clear errors
  errorDiv.classList.remove("show");
  errorDiv.textContent = "";

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(errorDiv, "Vui lòng nhập email hợp lệ");
    return false;
  }

  // Show loading
  sendBtn.disabled = true;
  sendBtn.classList.add("loading");

  try {
    const response = await fetch("/Account/SendOtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    });

    const result = await response.json();

    if (result.success) {
      // Chuyển sang bước 2
      document.getElementById("forgotStep1").style.display = "none";
      document.getElementById("forgotStep2").style.display = "block";
      document.getElementById("hiddenEmail").value = email;

      // Handle fix: Ẩn thông báo thành công sau 5s
      const successNotice = document.getElementById("otpSuccessNotice");
      if (successNotice) {
        successNotice.style.display = "flex"; // Reset display
        successNotice.style.opacity = "1";

        // Clear any existing timeout if exists
        if (window.otpSuccessTimeout) clearTimeout(window.otpSuccessTimeout);

        window.otpSuccessTimeout = setTimeout(() => {
          // Fade out effect
          successNotice.style.transition = "opacity 0.5s ease";
          successNotice.style.opacity = "0";
          setTimeout(() => {
            successNotice.style.display = "none";
          }, 500);
        }, 5000);
      }
    } else {
      showError(errorDiv, result.message || "Có lỗi xảy ra. Vui lòng thử lại");
    }
  } catch (error) {
    console.error("Error:", error);
    showError(errorDiv, "Không thể kết nối đến server. Vui lòng thử lại");
  } finally {
    sendBtn.disabled = false;
    sendBtn.classList.remove("loading");
  }

  return false;
}

// Bước 2: Đổi mật khẩu
async function handleResetPassword(e) {
  e.preventDefault();

  const email = document.getElementById("hiddenEmail").value;
  const otp = document.getElementById("otpInput").value.trim();
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  const resetBtn = document.getElementById("resetPasswordBtn");
  const btnText = resetBtn.querySelector(".btn-text");
  const loader = resetBtn.querySelector(".btn-loader");
  const errorDiv = document.getElementById("resetError");

  // Clear errors
  errorDiv.classList.remove("show");
  errorDiv.textContent = "";

  // Validate OTP
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    showError(errorDiv, "OTP phải là 6 chữ số");
    return false;
  }

  // Validate password
  if (!PASSWORD_REGEX.test(newPassword)) {
    showError(
      errorDiv,
      "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
    );
    return false;
  }

  // Validate confirm password
  if (newPassword !== confirmPassword) {
    showError(errorDiv, "Mật khẩu xác nhận không khớp");
    return false;
  }

  // Show loading
  resetBtn.disabled = true;
  btnText.style.display = "none";
  loader.style.display = "block";

  try {
    const response = await fetch("/Account/ResetPassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        otp: otp,
        newPassword: newPassword,
        confirmPassword: confirmPassword,
      }),
    });

    const result = await response.json();

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Thành công!",
        text: "Đổi mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.",
        confirmButtonText: "Đăng nhập ngay",
        confirmButtonColor: "#f58220",
        allowOutsideClick: false,
        heightAuto: false,
        scrollbarPadding: false,
        didOpen: () => {
          // Blur active element to prevent auto-scrolling to focus
          if (document.activeElement) {
            document.activeElement.blur();
          }
        },
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "/Account/Login";
        }
      });
    } else {
      showError(errorDiv, result.message || "Có lỗi xảy ra. Vui lòng thử lại");
    }
  } catch (error) {
    console.error("Error:", error);
    showError(errorDiv, "Không thể kết nối đến server. Vui lòng thử lại");
  } finally {
    resetBtn.disabled = false;
    btnText.style.display = "inline";
    loader.style.display = "none";
  }

  return false;
}

// Quay lại bước 1
function backToForgotStep1() {
  document.getElementById("forgotStep2").style.display = "none";
  document.getElementById("forgotStep1").style.display = "block";

  // Clear form bước 2
  document.getElementById("otpInput").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("resetError").classList.remove("show");
}

// Reset tất cả forms
function resetForgotPasswordForms() {
  // Reset bước 1
  document.getElementById("forgotEmail").value = "";
  document.getElementById("emailError").classList.remove("show");

  // Reset bước 2
  document.getElementById("otpInput").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmPassword").value = "";
  document.getElementById("resetError").classList.remove("show");

  // Show bước 1, hide bước 2
  document.getElementById("forgotStep1").style.display = "block";
  document.getElementById("forgotStep2").style.display = "none";
}

// Helper: Show error
function showError(errorDiv, message) {
  errorDiv.textContent = message;
  errorDiv.classList.add("show");

  // Fix: Ẩn thông báo success nếu đang hiện khi có lỗi
  const successNotice = document.getElementById("otpSuccessNotice");
  if (
    successNotice &&
    window.getComputedStyle(successNotice).display !== "none"
  ) {
    successNotice.style.display = "none";
  }
}

// Auto-format OTP input (chỉ cho nhập số)
document.addEventListener("DOMContentLoaded", function () {
  const otpInput = document.getElementById("otpInput");
  if (otpInput) {
    otpInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/\D/g, "").slice(0, 6);
    });
  }
});

// === END FORGOT PASSWORD LOGIC ===

// Toggle password visibility
function togglePasswordVisibility(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
}

// Check for Account Locked state
document.addEventListener("DOMContentLoaded", function () {
  const lockedInput = document.getElementById("accountLockedState");
  if (lockedInput && lockedInput.value === "true") {
    const logoutUrl =
      document.getElementById("logoutUrl")?.value || "/Account/Logout";

    Swal.fire({
      icon: "error",
      title: "Tài khoản bị khóa!",
      text: "Tài khoản của bạn đã bị khóa do nợ tiền phạt quá hạn. Vui lòng liên hệ thủ thư để giải quyết.",
      confirmButtonColor: "#d33",
      confirmButtonText: "Đã hiểu",
      heightAuto: false,
      scrollbarPadding: false,
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = logoutUrl;
      }
    });
  }
});

// === REMEMBER ME LOGIC ===
function toggleBookmark() {
  const checkbox = document.getElementById("chkRememberMe");
  const ribbonFront = document.getElementById("bookmarkRibbon");
  const ribbonBack = document.getElementById("bookmarkRibbonBack");

  if (checkbox) {
    if (checkbox.checked) {
      if (ribbonFront) ribbonFront.classList.add("active");
      if (ribbonBack) ribbonBack.classList.add("active");
    } else {
      if (ribbonFront) ribbonFront.classList.remove("active");
      if (ribbonBack) ribbonBack.classList.remove("active");
    }
  }
}

// Init state on load (trường hợp browser auto-fill)
document.addEventListener("DOMContentLoaded", function () {
  toggleBookmark();
});
