import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_SMTP_USER;
const GMAIL_PASS = process.env.GMAIL_SMTP_PASS;

const transport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: GMAIL_USER && GMAIL_PASS ? { user: GMAIL_USER, pass: GMAIL_PASS } : undefined,
});

export const correoConfigurado = Boolean(GMAIL_USER && GMAIL_PASS);

// Correo de recuperación (Gmail SMTP + STARTTLS). HTML table-based e inline:
// se ve bien en Gmail/Outlook y sigue la paleta del proyecto
// (#ea580c brand / #0f172a ink / #f8fafc surface), mobile-first.
export async function enviarCorreoRecuperacion(destinatario, link, nombre) {
  if (!correoConfigurado) {
    console.warn("[mailer] GMAIL_SMTP_USER/GMAIL_SMTP_PASS no configurados: no se envió el correo.");
    return;
  }
  await transport.sendMail({
    from: `Marketplace Moa <${GMAIL_USER}>`,
    to: destinatario,
    subject: "Recupera tu contraseña — Marketplace Moa",
    html: `
      <div style="font-family:Arial,Helvetica,system-ui,sans-serif;background-color:#f8fafc;padding:24px 12px;color:#0f172a">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center">
            <table role="presentation" width="100%" style="max-width:520px;min-width:320px" cellpadding="0" cellspacing="0" border="0">
              <!-- Logo -->
              <tr>
                <td style="padding:8px 0 16px">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:34px;height:34px;background-color:#ea580c;border-radius:8px">
                          <tr><td align="center" style="color:#ffffff;font-size:18px;font-weight:bold;font-family:Arial,Helvetica,sans-serif">M</td></tr>
                        </table>
                      </td>
                      <td style="padding-left:10px;vertical-align:middle;font-size:18px;font-weight:bold;color:#0f172a">Marketplace Moa</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Tarjeta -->
              <tr><td style="background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
                <h2 style="margin:0 0 10px;font-size:20px;color:#0f172a">Hola${nombre ? " " + escapeHtml(nombre) : ""}</h2>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
                  Recibimos una solicitud para restablecer tu contraseña. Para elegir una
                  nueva, pulsa el botón de abajo. El enlace expira en
                  <strong style="color:#0f172a">30 minutos</strong>.
                </p>
                <!-- CTA -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">
                  <tr>
                    <td style="border-radius:10px;background-color:#ea580c">
                      <a href="${link}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">Restablecer contraseña</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8">
                  Si no fuiste tú, ignora este correo: tu contraseña actual no cambiará.
                  Si tienes dudas, no compartas este enlace con nadie.
                </p>
              </td></tr>
              <!-- Pie -->
              <tr><td style="padding:16px 8px 0;text-align:center;font-size:12px;color:#94a3b8">
                Marketplace Moa — Compra y vende en tu comunidad
              </td></tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}