export default {
    async email(message, env, ctx) {
        try {
            // 1. Read the raw MIME stream 
            const rawEmail = await new Response(message.raw).text();

            // 2. Identify the webhook URL
            // If deployed locally, you can use ngrok for testing: https://your-ngrok.app/api/webhooks/inbound-email
            // In production, use your actual domain url
            const WEBHOOK_URL = env.WEBHOOK_URL || "https://tesseraos.ai/api/webhooks/inbound-email";

            // 3. Forward the exact payload safely to your python backend
            const response = await fetch(WEBHOOK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Add basic authentication to ensure random hits don't spam your backend
                    "X-Webhook-Secret": env.CF_WEBHOOK_SECRET || "tessera-os-cloud-worker-secret-key"
                },
                body: JSON.stringify({
                    from: message.from,
                    to: message.to,
                    raw_mime: rawEmail
                })
            });

            if (!response.ok) {
                console.error(`Webhook rejected with status: ${response.status}`);
                message.setReject("Internal backend failed to process incoming email representation.");
            } else {
                console.log(`Successfully dispatched email destined for ${message.to}`);
            }
        } catch (e) {
            console.error("Worker failed to route email.", e);
            message.setReject("Edge routing error occurred.");
        }
    }
}
