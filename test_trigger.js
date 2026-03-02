const payload = {
    workspace_id: "a0d3eb89-9360-4e9a-a0aa-1d1a21aad4de",
    event_type: "test_script",
    payload: {
        metrics_data: "Q3 Revenue hit $1.2M, which is up 18% YoY. Server costs dropped by $50k. Customer churn rate stabilized at 2.1%."
    }
};

fetch("http://localhost:8000/api/async/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
})
    .then(res => res.json())
    .then(data => console.log("Response:", data))
    .catch(err => console.error("Error:", err));
