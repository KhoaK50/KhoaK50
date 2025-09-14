
    function subVectors() {
      callAPI("sub_vectors", {
        v1: JSON.parse(document.getElementById("v1_sub").value),
        v2: JSON.parse(document.getElementById("v2_sub").value)
      }, "result_sub");
    }