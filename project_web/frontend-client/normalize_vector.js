function normalizeVec() {
  
  const v = JSON.parse(document.getElementById("v_normz").value);
  callAPI("normalize", { v: v }, "result_normz");
}
