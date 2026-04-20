$(document).ready(function () {
  // Function to generate BookId
  function generateBookId() {
    var categoryId = $("#CategoryId").val();
    var bookNumber = $("#bookNumber").val();

    // Validate inputs
    if (categoryId && bookNumber) {
      // Validate number format (exactly 4 digits)
      if (!/^\d{4}$/.test(bookNumber)) {
        $("#bookNumberError").text("Phải nhập đúng 4 chữ số").show();
        $("#BookId").val("");
        $("#generatedBookId").hide();
        return;
      }

      // Clear error
      $("#bookNumberError").hide();

      // Generate BookId
      var bookId = categoryId + "-" + bookNumber;
      $("#BookId").val(bookId);
      $("#displayBookId").text(bookId);
      $("#generatedBookId").show();
    } else {
      $("#BookId").val("");
      $("#generatedBookId").hide();
    }
  }

  // Trigger generation on category change
  $("#CategoryId").on("change", generateBookId);

  // Trigger generation on number input
  $("#bookNumber").on("input", generateBookId);

  // Validate number input (only allow digits)
  $("#bookNumber").on("keypress", function (e) {
    // Only allow digits
    if (e.which < 48 || e.which > 57) {
      e.preventDefault();
    }
  });
});
