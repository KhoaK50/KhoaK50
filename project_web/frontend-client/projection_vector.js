
    function projection() {
      callAPI("projection", {
        v: JSON.parse(document.getElementById("v_proj").value),
        u: JSON.parse(document.getElementById("u_proj").value)
      }, "result_proj");
    }