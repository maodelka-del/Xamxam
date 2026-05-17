import nodemailer from "nodemailer";
import { logger } from "./logger";

interface DocumentFileInfo {
  id: number;
  fileName: string;
  fileSize: number | null;
}

interface OrderItem {
  documentTitle: string;
  documentSubject: string;
  documentLevel: string;
  price: number;
  files: DocumentFileInfo[];
}

interface SendApprovalEmailOptions {
  orderId: number;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  adminNote?: string | null;
  items: OrderItem[];
}

function getBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const first = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  return "http://localhost:80";
}

function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-FR") + " FCFA";
}

function buildEmailHtml(opts: SendApprovalEmailOptions): string {
  const base = getBaseUrl();
  const email = opts.customerEmail;

  const filesHtml = opts.items
    .map((item) => {
      const filesBlock =
        item.files.length === 0
          ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Aucun fichier disponible pour ce document.</p>`
          : item.files
              .map((f) => {
                const viewUrl = `${base}/order/${opts.orderId}/view/${f.id}?email=${encodeURIComponent(email)}&name=${encodeURIComponent(f.fileName)}`;
                const dlUrl = `${base}/api/orders/${opts.orderId}/view-file/${f.id}?email=${encodeURIComponent(email)}&download=1`;
                const sizeMb = f.fileSize ? (f.fileSize / 1024 / 1024).toFixed(1) + " MB" : "";
                return `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#374151;">
                          📄 <strong>${f.fileName}</strong>${sizeMb ? ` <span style="color:#9ca3af;font-size:12px;">(${sizeMb})</span>` : ""}
                        </td>
                        <td align="right" style="white-space:nowrap;">
                          <a href="${viewUrl}" style="display:inline-block;background:#1a4731;color:#fff;font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;text-decoration:none;margin-left:6px;">Lire</a>
                          <a href="${dlUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;text-decoration:none;margin-left:6px;">Télécharger</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
              })
              .join("");

      return `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827;">${item.documentTitle}</p>
        <p style="margin:0 0 10px;font-size:12px;color:#6b7280;">${item.documentSubject} — ${item.documentLevel} — ${formatPrice(item.price)}</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${filesBlock}
        </table>
      </div>`;
    })
    .join("");

  const trackUrl = `${base}/order/${opts.orderId}?email=${encodeURIComponent(email)}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Commande approuvée — XamXam</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#1a4731;border-radius:12px 12px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">XamXam</span>
                  <span style="color:#6ee7b7;font-size:13px;margin-left:8px;">Documents Numériques</span>
                </td>
                <td align="right">
                  <span style="background:#16a34a;color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;">✓ Approuvée</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
            <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">Vos documents sont prêts !</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
              Bonjour <strong>${opts.customerName}</strong>, votre paiement a été validé. Vous pouvez maintenant accéder à vos documents.
            </p>

            <!-- Documents -->
            <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.5px;">Vos documents</h2>
            ${filesHtml}

            ${opts.adminNote ? `
            <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:12px 16px;margin-top:16px;">
              <p style="margin:0;font-size:13px;color:#854d0e;"><strong>Note de l'équipe :</strong> ${opts.adminNote}</p>
            </div>` : ""}

            <!-- Total -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:20px;display:flex;">
              <p style="margin:0;font-size:15px;color:#166534;">
                <strong>Total payé :</strong> ${formatPrice(opts.totalAmount)}
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-top:28px;">
              <a href="${trackUrl}" style="display:inline-block;background:#1a4731;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Accéder à ma commande →
              </a>
            </div>

            <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
              Commande #${opts.orderId} · XamXam — La connaissance accessible à tous<br>
              En cas de problème, répondez à cet email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEmailText(opts: SendApprovalEmailOptions): string {
  const base = getBaseUrl();
  const email = opts.customerEmail;
  const lines: string[] = [
    `Bonjour ${opts.customerName},`,
    ``,
    `Votre commande #${opts.orderId} est approuvée ! Vos documents sont disponibles :`,
    ``,
  ];

  for (const item of opts.items) {
    lines.push(`• ${item.documentTitle} (${item.documentSubject} — ${item.documentLevel})`);
    for (const f of item.files) {
      const dlUrl = `${base}/api/orders/${opts.orderId}/view-file/${f.id}?email=${encodeURIComponent(email)}&download=1`;
      lines.push(`  - ${f.fileName}: ${dlUrl}`);
    }
    lines.push(``);
  }

  if (opts.adminNote) lines.push(`Note : ${opts.adminNote}`, ``);

  lines.push(
    `Total : ${formatPrice(opts.totalAmount)}`,
    ``,
    `Accédez à votre commande : ${base}/order/${opts.orderId}?email=${encodeURIComponent(email)}`,
    ``,
    `— L'équipe XamXam`
  );

  return lines.join("\n");
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  return transporter;
}

export async function sendOrderApprovalEmail(opts: SendApprovalEmailOptions): Promise<void> {
  const t = getTransporter();

  if (!t) {
    logger.warn(
      { orderId: opts.orderId },
      "SMTP not configured — skipping approval email. Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable."
    );
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@xamxam.sn";
  const subject = `✅ Commande #${opts.orderId} approuvée — vos documents sont prêts !`;

  try {
    await t.sendMail({
      from: `XamXam <${from}>`,
      to: opts.customerEmail,
      subject,
      html: buildEmailHtml(opts),
      text: buildEmailText(opts),
    });
    logger.info({ orderId: opts.orderId, to: opts.customerEmail }, "Approval email sent");
  } catch (err) {
    logger.error({ err, orderId: opts.orderId }, "Failed to send approval email");
  }
}
