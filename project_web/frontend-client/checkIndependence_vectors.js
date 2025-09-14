
    function checkIndependence() {
      callAPI("linear_independence", {
        vectors: JSON.parse(document.getElementById("vectors_indep").value)
      }, "result_indep");
    }