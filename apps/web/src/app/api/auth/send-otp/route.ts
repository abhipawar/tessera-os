import { API_URL } from "@/config";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/utils/rateLimit";
export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ success: false, error: "Invalid email address." }, { status: 400 });
        }

        // 1. Enforce IP / Email Rate Limiting (Max 3 OTP requests per minute)
        const { success: allowed } = rateLimit(`send_otp_${email}`, 3, 60000);
        if (!allowed) {
            return NextResponse.json({ success: false, error: "Too many code requests. Please wait a minute." }, { status: 429 });
        }

        // 2. Delegate secure OTP generation and dispatch to the Python backend
        const res = await fetch(`${API_URL}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await res.json();

        if (data.error) {
            return NextResponse.json({ success: false, error: data.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: data.message || "Code sent successfully." });

    } catch (e: any) {
        console.error("OTP Generation Error:", e.message);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
