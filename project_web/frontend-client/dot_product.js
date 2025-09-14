
    function dotProduct() {
      callAPI("dot_product", {
        v1: JSON.parse(document.getElementById("v1_dot").value),
        v2: JSON.parse(document.getElementById("v2_dot").value)
      }, "result_dot");
    }