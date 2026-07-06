const NAVY = "#0f3460";
const PRIMARY = "#DC3545";
const BG = "#f4f6f8";
const CARD = "#ffffff";
const MUTED = "#64748b";
const TEXT = "#1e293b";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHawalaStatusEmailHtml(input: {
  appName?: string;
  transferNumber: string;
  heading: string;
  message: string;
  note?: string;
}): string {
  const app = input.appName ?? "Online Mandawee";
  const heading = escapeHtml(input.heading);
  const message = escapeHtml(input.message);
  const note = input.note ? escapeHtml(input.note) : null;
  const transferNumber = escapeHtml(input.transferNumber);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(app)} — Hawala transfer update</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${CARD};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,52,96,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,${NAVY} 0%,#0a2847 100%);padding:22px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${escapeHtml(app)}</p>
              <p style="margin:10px 0 0;font-size:20px;font-weight:800;color:#fff;line-height:1.25;">Hawala transfer update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <p style="margin:0 0 16px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.04em;color:${MUTED};">Transfer #${transferNumber}</p>
              <div style="text-align:center;margin:0 0 20px;padding:20px 16px;background:${BG};border-radius:12px;border:1px solid #e2e8f0;border-top:4px solid ${PRIMARY};">
                <p style="margin:0;font-size:22px;font-weight:800;line-height:1.35;color:${NAVY};">${heading}</p>
              </div>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${TEXT};">${message}</p>
              ${note ? `<p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:${MUTED};">${note}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <p style="margin:0;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:${MUTED};text-align:center;">This is an automated update from ${escapeHtml(app)}. If you have questions about this transfer, please contact support.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
