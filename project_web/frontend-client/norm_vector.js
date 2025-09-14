
    function vectorNorm() {
      callAPI("vector_norm", {
        v: JSON.parse(document.getElementById("v_norm").value)
      }, "result_norm");
    }