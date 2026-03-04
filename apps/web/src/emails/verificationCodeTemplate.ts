export function verificationCodeTemplate(code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tessera OS Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ececf1;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" max-width="500" style="max-width: 500px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 40px;">
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Tessera OS</h1>
                            <p style="margin: 8px 0 0 0; font-size: 15px; color: #a1a1aa;">Orchestration Environment Setup</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <p style="margin: 0; font-size: 16px; line-height: 24px; color: #d4d4d8;">
                                You are one step away from deploying your digital workforce. Enter this verification code into the onboarding portal:
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px 24px; display: inline-block;">
                                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #10b981;">${code}</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
                                <strong>Security Note:</strong> This code expires in 15 minutes.<br>If you did not initiate this request, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}
