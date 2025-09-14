function rankVec() {
    fetch(`${BASE_URL}/rank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vectors: JSON.parse(document.getElementById("vectors_rank").value) })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("result_rank").innerText = data.rank; // Lấy đúng key "rank"
    })
    .catch(err => {
        document.getElementById("result_rank").innerText = "Lỗi: " + err;
    });
}
