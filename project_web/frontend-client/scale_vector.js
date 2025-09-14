
    function scaleVector() {
      callAPI("scale_vector", {
        v: JSON.parse(document.getElementById("v_scale").value),
        scalar: parseFloat(document.getElementById("scalar").value)
      }, "result_scale");
    }