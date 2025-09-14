
    function crossProduct() {
      callAPI("cross_product", {
        v1: JSON.parse(document.getElementById("v1_cross").value),
        v2: JSON.parse(document.getElementById("v2_cross").value)
      }, "result_cross");
    }