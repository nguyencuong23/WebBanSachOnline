// Common form utilities for validation and password toggle
$(document).ready(function () {
  if ($(".validation-summary-errors").length > 0) {
    $(".alert-danger").show();
  }
});

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

function togglePasswordVisibility(inputId, button) {
  togglePassword(inputId, button);
}
