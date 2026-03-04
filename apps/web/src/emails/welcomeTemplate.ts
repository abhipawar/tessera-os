export function welcomeTemplate(name: string, companyName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Tessera OS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ececf1;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" max-width="500" style="max-width: 500px; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 40px;">
                    <tr>
                        <td align="center" style="padding-bottom: 30px;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Tessera OS</h1>
                            <p style="margin: 8px 0 0 0; font-size: 15px; color: #10b981;">Environment Provisioned Automatically</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <p style="margin: 0; font-size: 16px; line-height: 24px; color: #d4d4d8;">
                                Welcome aboard, ${name}.
                            </p>
                            <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 24px; color: #d4d4d8;">
                                We have successfully spun up the digital orchestration twin for <strong>${companyName}</strong>. 
                                Your lead Supervisor Co-Pilot is standing by and ready to be configured.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding-bottom: 30px; padding-top: 10px;">
                            <a href="https://tesseraos.ai/studio" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Enter Studio</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="border-top: 1px solid #27272a; padding-top: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center; line-height: 1.5;">
                                Welcome to the future of enterprise orchestration.<br>
                                — The Tessera OS Team
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
