
    function addVectors() {
      callAPI("add_vectors", {
        v1: JSON.parse(document.getElementById("v1_add").value),
        v2: JSON.parse(document.getElementById("v2_add").value)
      }, "result_add");
    }