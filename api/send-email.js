const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(noteContent, noteDate, appUrl) {
  const safeContent = escapeHtml(noteContent);
  const safeDate = noteDate ? escapeHtml(noteDate) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#ffffff;border-radius:10px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111111;padding:28px 36px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;
                        letter-spacing:-0.3px;">Pioneer Species</p>
              <p style="margin:4px 0 0;font-size:13px;color:#888888;">
                A note shared with you
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 16px;font-size:14px;color:#555555;">
                Someone thought you'd appreciate this note:
              </p>

              <blockquote style="margin:0 0 24px;padding:16px 20px;
                                 background:#f8f8f8;border-left:4px solid #111111;
                                 border-radius:0 6px 6px 0;font-size:16px;
                                 line-height:1.6;color:#111111;
                                 white-space:pre-wrap;word-break:break-word;">
                ${safeContent}
              </blockquote>

              ${safeDate ? `<p style="margin:0 0 28px;font-size:12px;color:#aaaaaa;">Posted ${safeDate}</p>` : ''}

              <a href="${appUrl}"
                 style="display:inline-block;background:#111111;color:#ffffff;
                        text-decoration:none;padding:12px 24px;border-radius:6px;
                        font-size:14px;font-weight:600;letter-spacing:0.1px;">
                View all notes &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#bbbbbb;line-height:1.5;">
                You received this because someone shared a note from
                <a href="${appUrl}" style="color:#bbbbbb;text-decoration:underline;">
                  Pioneer Species</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, noteContent, noteDate } = req.body ?? {};

  if (!to || !noteContent) {
    return res.status(400).json({ error: 'Missing required fields: to, noteContent' });
  }
  if (!EMAIL_RE.test(String(to))) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (String(noteContent).length > 10000) {
    return res.status(400).json({ error: 'Note content too long' });
  }

  const appUrl = process.env.APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'https://hello-pioneer.vercel.app');

  try {
    const { data, error } = await resend.emails.send({
      from: 'Pioneer Species <onboarding@resend.dev>',
      to: [String(to)],
      subject: 'Someone shared a note with you ✉️',
      html: buildHtml(noteContent, noteDate, appUrl),
    });

    if (error) {
      console.error('[send-email] Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
};
