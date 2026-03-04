import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/utils/rateLimit";
import { verificationCodeTemplate } from "@/emails/verificationCodeTemplate";

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

        // 2. Generate a random 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60000); // 15 mins expiry

        // 3. Save to Supabase (bypass RLS using Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Delete any old unused codes for this email so they aren't spammed
        await supabase.from('otp_verifications').delete().eq('email', email);

        const { error: dbErr } = await supabase.from('otp_verifications').insert({
            email,
            code,
            expires_at: expiresAt.toISOString()
        });

        if (dbErr) throw dbErr;

        // 4. Dispatch Email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) throw new Error("Missing RESEND_API_KEY in environment");

        const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "Tessera OS Security <security@tesseraos.ai>",
                to: email,
                subject: "Your Tessera OS Verification Code",
                html: verificationCodeTemplate(code)
            })
        });

        if (!resendRes.ok) {
            const errBody = await resendRes.text();
            console.error("Resend API Error:", errBody);
            throw new Error("Failed to dispatch email provider.");
        }

        return NextResponse.json({ success: true, message: "Code sent successfully." });

    } catch (e: any) {
        console.error("OTP Generation Error:", e.message);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
