import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, documentsTable, documentFilesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { sendOrderApprovalEmail } from "../lib/mailer";

const router: IRouter = Router();

const DIAMANOPAY_API_URL = "https://api.diamanopay.com";
const DIAMANOPAY_TOKEN_URL = `${DIAMANOPAY_API_URL}/oauth2/token`;

// ─── OAuth2 token cache ────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const clientId     = process.env.DIAMANOPAY_CLIENT_ID;
  const clientSecret = process.env.DIAMANOPAY_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("DIAMANOPAY_CLIENT_ID or DIAMANOPAY_CLIENT_SECRET not set");

  const body = new URLSearchParams({
    grant_type:    "client_credentials",
    client_id:     clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(DIAMANOPAY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DiamanoPay OAuth2 failed (${res.status}): ${txt}`);
  }

  const data = await res.json() as { accessToken: string; accessTokenExpiresAt: string };
  cachedToken    = data.accessToken;
  tokenExpiresAt = new Date(data.accessTokenExpiresAt).getTime();
  return cachedToken;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function getAppBaseUrl(): string {
  // 1. Explicit override always wins
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // 2. Render.com sets this automatically for web services
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  // 3. Replit dev/prod domains
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const first   = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  // 4. Fallback (localhost — redirect URLs won't work from outside)
  return "http://localhost:80";
}

type DpProvider = "WAVE" | "ORANGE_MONEY";
const VALID_PROVIDERS: DpProvider[] = ["WAVE", "ORANGE_MONEY"];

// ─── POST /payments/initiate-download ─────────────────────────────────────────
// Paid download of a free document (uses downloadPrice field)
router.post("/payments/initiate-download", async (req: Request, res: Response): Promise<void> => {
  const { documentId, customerName, customerEmail, customerPhone, provider } = req.body as {
    documentId?:    number;
    customerName?:  string;
    customerEmail?: string;
    customerPhone?: string;
    provider?:      string;
  };

  if (!documentId || !customerName || !customerEmail || !customerPhone) {
    res.status(400).json({ error: "Paramètres manquants (documentId, nom, email, téléphone)" });
    return;
  }

  const dpProvider: DpProvider = VALID_PROVIDERS.includes((provider ?? "").toUpperCase() as DpProvider)
    ? (provider!.toUpperCase() as DpProvider)
    : "WAVE";

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, documentId)).limit(1);

  if (!doc) {
    res.status(404).json({ error: "Document introuvable" });
    return;
  }

  if (doc.price !== 0) {
    res.status(400).json({ error: "Ce document n'est pas gratuit — utilisez le panier pour l'acheter" });
    return;
  }

  const downloadPrice = (doc as any).downloadPrice as number | null;
  if (!downloadPrice || downloadPrice <= 0) {
    res.status(400).json({ error: "Ce document ne propose pas de téléchargement payant" });
    return;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      customerName,
      customerEmail,
      customerPhone,
      totalAmount:   downloadPrice,
      status:        "pending",
      paymentMethod: "diamanopay",
      adminNote:     `Téléchargement payant — document #${doc.id} "${doc.title}"`,
    })
    .returning();

  await db.insert(orderItemsTable).values([{ orderId: order.id, documentId: doc.id, price: downloadPrice }]);

  const base       = getAppBaseUrl();
  const successUrl = `${base}/order/${order.id}?email=${encodeURIComponent(customerEmail)}&payment=success`;
  const cancelUrl  = `${base}/order/${order.id}?email=${encodeURIComponent(customerEmail)}&payment=cancelled`;
  const webhookUrl = `${base}/api/payments/webhook`;

  logger.info({ base, successUrl, webhookUrl }, "Download payment URLs constructed");

  let checkoutUrl: string;
  let chargeId:    string;

  try {
    const token = await getAccessToken();

    const payload = {
      amount:       downloadPrice,
      currency:     "XOF",
      description:  `Téléchargement #${order.id} — ${doc.title.slice(0, 120)}`,
      provider:     dpProvider,
      customer:     { name: customerName, email: customerEmail, phone: customerPhone },
      metadata:     { orderId: order.id, customerEmail },
      successUrl,   success_url: successUrl,
      returnUrl:    successUrl,  return_url: successUrl,
      redirectUrl:  successUrl,  redirect_url: successUrl,
      callbackUrl:  successUrl,  callback_url: successUrl,
      cancelUrl,    cancel_url: cancelUrl,
      failUrl:      cancelUrl,   fail_url: cancelUrl,
      webhookUrl,   webhook_url: webhookUrl,
      notifyUrl:    webhookUrl,  notify_url: webhookUrl,
    };

    logger.info({ payload: { ...payload, customer: "REDACTED" } }, "DiamanoPay download charge payload");

    const dpRes = await fetch(`${DIAMANOPAY_API_URL}/api/charges`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const rawResponseText = await dpRes.text();
    logger.info({ status: dpRes.status, rawBody: rawResponseText }, "DiamanoPay download raw response");

    if (!dpRes.ok) {
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
      res.status(502).json({ error: "Erreur lors de l'initialisation du paiement. Veuillez réessayer." });
      return;
    }

    let dpData: Record<string, unknown>;
    try { dpData = JSON.parse(rawResponseText); }
    catch {
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
      res.status(502).json({ error: "Réponse DiamanoPay invalide." });
      return;
    }

    chargeId = (dpData.chargeId ?? dpData.charge_id ?? dpData.id ?? dpData.reference ?? dpData.transactionId ?? "") as string;
    checkoutUrl = (
      dpData.paymentUrl ?? dpData.payment_url ?? dpData.checkout_url ??
      dpData.checkoutUrl ?? dpData.redirectUrl ?? dpData.redirect_url ??
      dpData.url ?? dpData.link ?? dpData.paymentLink ?? dpData.payment_link ?? ""
    ) as string;

    if (!checkoutUrl) {
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
      res.status(502).json({ error: "Réponse DiamanoPay invalide. Veuillez réessayer." });
      return;
    }
  } catch (err) {
    logger.error({ err }, "DiamanoPay download API call failed");
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
    res.status(502).json({ error: "Impossible de joindre le service de paiement. Veuillez réessayer." });
    return;
  }

  await db
    .update(ordersTable)
    .set({ diamanopayChargeId: chargeId, diamanopayCheckoutUrl: checkoutUrl })
    .where(eq(ordersTable.id, order.id));

  logger.info({ orderId: order.id, chargeId, downloadPrice, provider: dpProvider }, "DiamanoPay download charge created");

  res.status(201).json({ orderId: order.id, checkoutUrl, totalAmount: downloadPrice, chargeId });
});

// ─── GET /payments/debug-url (development helper — shows what URLs are built) ─
router.get("/payments/debug-url", (_req, res) => {
  const base = getAppBaseUrl();
  res.json({
    base,
    successUrl: `${base}/order/TEST?email=test%40test.com&payment=success`,
    webhookUrl: `${base}/api/payments/webhook`,
    env: {
      APP_URL:              process.env.APP_URL ?? null,
      RENDER_EXTERNAL_URL:  process.env.RENDER_EXTERNAL_URL ?? null,
      REPLIT_DOMAINS:       process.env.REPLIT_DOMAINS ?? null,
      NODE_ENV:             process.env.NODE_ENV ?? null,
    },
  });
});

// ─── POST /payments/initiate ───────────────────────────────────────────────
router.post("/payments/initiate", async (req: Request, res: Response): Promise<void> => {
  const { customerName, customerEmail, customerPhone, items, provider } = req.body as {
    customerName?:  string;
    customerEmail?: string;
    customerPhone?: string;
    provider?:      string;
    items?:         { documentId: number }[];
  };

  if (!customerName || !customerEmail || !customerPhone || !items?.length) {
    res.status(400).json({ error: "Paramètres manquants (nom, email, téléphone, articles)" });
    return;
  }

  const dpProvider: DpProvider = VALID_PROVIDERS.includes((provider ?? "").toUpperCase() as DpProvider)
    ? (provider!.toUpperCase() as DpProvider)
    : "WAVE";

  const docIds = items.map((i) => i.documentId);
  const docs   = await db
    .select()
    .from(documentsTable)
    .where(docIds.length === 1 ? eq(documentsTable.id, docIds[0]) : inArray(documentsTable.id, docIds));

  if (docs.length !== docIds.length) {
    res.status(400).json({ error: "Certains documents sont introuvables" });
    return;
  }

  const totalAmount = docs.reduce((sum, d) => sum + d.price, 0);

  const [order] = await db
    .insert(ordersTable)
    .values({ customerName, customerEmail, customerPhone, totalAmount, status: "pending", paymentMethod: "diamanopay" })
    .returning();

  await db.insert(orderItemsTable).values(
    docs.map((d) => ({ orderId: order.id, documentId: d.id, price: d.price })),
  );

  const base       = getAppBaseUrl();
  const successUrl = `${base}/order/${order.id}?email=${encodeURIComponent(customerEmail)}&payment=success`;
  const cancelUrl  = `${base}/order/${order.id}?email=${encodeURIComponent(customerEmail)}&payment=cancelled`;
  const webhookUrl = `${base}/api/payments/webhook`;

  logger.info({ base, successUrl, webhookUrl }, "Payment URLs constructed");

  let checkoutUrl: string;
  let chargeId:    string;

  try {
    const token = await getAccessToken();

    // Every possible redirect/success URL field name DiamanoPay might accept
    const payload = {
      amount:       totalAmount,
      currency:     "XOF",
      description:  `Commande XamXam #${order.id} — ${docs.map((d) => d.title).join(", ").slice(0, 120)}`,
      provider:     dpProvider,
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
      metadata:     { orderId: order.id, customerEmail },
      // Redirect URL variants (all possible field names)
      successUrl:   successUrl,
      success_url:  successUrl,
      returnUrl:    successUrl,
      return_url:   successUrl,
      redirectUrl:  successUrl,
      redirect_url: successUrl,
      callbackUrl:  successUrl,
      callback_url: successUrl,
      cancelUrl:    cancelUrl,
      cancel_url:   cancelUrl,
      failUrl:      cancelUrl,
      fail_url:     cancelUrl,
      // Webhook variants
      webhookUrl:   webhookUrl,
      webhook_url:  webhookUrl,
      notifyUrl:    webhookUrl,
      notify_url:   webhookUrl,
    };

    logger.info({ payload: { ...payload, customer: "REDACTED" } }, "DiamanoPay charge payload sent");

    const dpRes = await fetch(`${DIAMANOPAY_API_URL}/api/charges`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const rawResponseText = await dpRes.text();
    logger.info({ status: dpRes.status, rawBody: rawResponseText }, "DiamanoPay raw response");

    if (!dpRes.ok) {
      logger.error({ status: dpRes.status, body: rawResponseText }, "DiamanoPay charge creation failed");
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
      res.status(502).json({ error: "Erreur lors de l'initialisation du paiement. Veuillez réessayer." });
      return;
    }

    let dpData: Record<string, unknown>;
    try {
      dpData = JSON.parse(rawResponseText);
    } catch {
      logger.error({ rawResponseText }, "DiamanoPay response is not valid JSON");
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
      res.status(502).json({ error: "Réponse DiamanoPay invalide." });
      return;
    }

    // Log ALL fields returned — this shows us exactly what DiamanoPay uses
    logger.info({ dpData, orderId: order.id }, "DiamanoPay charge created — full response");

    chargeId = (
      dpData.chargeId ?? dpData.charge_id ?? dpData.id ?? dpData.reference ?? dpData.transactionId ?? ""
    ) as string;

    checkoutUrl = (
      dpData.paymentUrl ?? dpData.payment_url ?? dpData.checkout_url ??
      dpData.checkoutUrl ?? dpData.redirectUrl ?? dpData.redirect_url ??
      dpData.url ?? dpData.link ?? dpData.paymentLink ?? dpData.payment_link ?? ""
    ) as string;

    if (!checkoutUrl) {
      logger.error({ dpData }, "DiamanoPay response missing payment URL — all fields logged above");
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
      res.status(502).json({ error: "Réponse DiamanoPay invalide. Veuillez réessayer." });
      return;
    }
  } catch (err) {
    logger.error({ err }, "DiamanoPay API call failed");
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    await db.delete(ordersTable).where(eq(ordersTable.id, order.id));
    res.status(502).json({ error: "Impossible de joindre le service de paiement. Veuillez réessayer." });
    return;
  }

  await db
    .update(ordersTable)
    .set({ diamanopayChargeId: chargeId, diamanopayCheckoutUrl: checkoutUrl })
    .where(eq(ordersTable.id, order.id));

  logger.info({ orderId: order.id, chargeId, totalAmount, provider: dpProvider }, "DiamanoPay charge created");

  res.status(201).json({ orderId: order.id, checkoutUrl, totalAmount, chargeId });
});

// ─── POST /payments/webhook ────────────────────────────────────────────────
router.post("/payments/webhook", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  logger.info({ body }, "DiamanoPay webhook received");

  const chargeId = (body.chargeId ?? body.id ?? body.charge_id ?? body.reference) as string | undefined;
  const status   = (body.status ?? body.payment_status) as string | undefined;
  const metadata = (body.metadata ?? body.meta) as Record<string, unknown> | undefined;

  // Signature optionnelle
  const signature = req.headers["x-diamanopay-signature"] as string | undefined;
  if (signature && process.env.DIAMANOPAY_WEBHOOK_SECRET) {
    const { createHmac } = await import("crypto");
    const rawBody  = JSON.stringify(body);
    const expected = createHmac("sha256", process.env.DIAMANOPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    if (signature !== expected && `sha256=${expected}` !== signature) {
      logger.warn({ signature }, "Invalid webhook signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  res.json({ received: true });

  if (!chargeId || !status) {
    logger.warn({ body }, "Webhook missing chargeId or status — ignored");
    return;
  }

  let order = (await db
    .select().from(ordersTable).where(eq(ordersTable.diamanopayChargeId, chargeId)).limit(1))[0];

  if (!order && metadata?.orderId) {
    const id = parseInt(String(metadata.orderId), 10);
    if (!isNaN(id)) {
      order = (await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1))[0];
    }
  }

  if (!order) { logger.warn({ chargeId }, "Webhook: no matching order found"); return; }

  const isSuccess = ["success", "paid", "completed", "succeeded", "successful"].includes(status.toLowerCase());
  const isFailed  = ["failed", "cancelled", "canceled", "expired", "rejected"].includes(status.toLowerCase());

  if (isSuccess && order.status !== "approved") {
    await db
      .update(ordersTable)
      .set({ status: "approved", paymentMethod: "diamanopay", updatedAt: new Date() })
      .where(eq(ordersTable.id, order.id));

    logger.info({ orderId: order.id, chargeId }, "Order approved via webhook");

    const items = await db
      .select({
        id:              orderItemsTable.id,
        documentId:      orderItemsTable.documentId,
        documentTitle:   documentsTable.title,
        documentSubject: documentsTable.subject,
        documentLevel:   documentsTable.level,
        price:           orderItemsTable.price,
      })
      .from(orderItemsTable)
      .leftJoin(documentsTable, eq(orderItemsTable.documentId, documentsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));

    if (items.length > 0) {
      const docIds = items.map((i) => i.documentId);
      const { sql } = await import("drizzle-orm");
      await db
        .update(documentsTable)
        .set({ downloadCount: sql`${documentsTable.downloadCount} + 1` })
        .where(docIds.length === 1 ? eq(documentsTable.id, docIds[0]) : inArray(documentsTable.id, docIds));

      const allFiles = await db.select().from(documentFilesTable).where(
        docIds.length === 1
          ? eq(documentFilesTable.documentId, docIds[0])
          : inArray(documentFilesTable.documentId, docIds),
      );

      const filesByDoc = new Map<number, typeof allFiles>();
      for (const f of allFiles) {
        const arr = filesByDoc.get(f.documentId) ?? [];
        arr.push(f);
        filesByDoc.set(f.documentId, arr);
      }

      sendOrderApprovalEmail({
        orderId:       order.id,
        customerName:  order.customerName,
        customerEmail: order.customerEmail,
        totalAmount:   order.totalAmount,
        adminNote:     null,
        items: items.map((item) => ({
          documentTitle:   item.documentTitle   ?? "",
          documentSubject: item.documentSubject ?? "",
          documentLevel:   item.documentLevel   ?? "",
          price:           item.price,
          files: (filesByDoc.get(item.documentId) ?? []).map((f) => ({
            id:       f.id,
            fileName: f.fileName,
            fileSize: f.fileSize ?? null,
          })),
        })),
      }).catch(() => {});
    }
  } else if (isFailed && order.status === "pending") {
    await db
      .update(ordersTable)
      .set({ status: "rejected", adminNote: `Paiement ${status} via DiamanoPay`, updatedAt: new Date() })
      .where(eq(ordersTable.id, order.id));

    logger.info({ orderId: order.id, chargeId, status }, "Order rejected via webhook");
  }
});

// ─── GET /payments/verify/:chargeId ───────────────────────────────────────
router.get("/payments/verify/:chargeId", async (req: Request, res: Response): Promise<void> => {
  const { chargeId } = req.params;

  if (!chargeId) {
    res.status(400).json({ error: "chargeId requis" });
    return;
  }

  try {
    const token  = await getAccessToken();
    const dpRes  = await fetch(`${DIAMANOPAY_API_URL}/api/charges/${chargeId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!dpRes.ok) {
      res.status(dpRes.status).json({ error: "Charge introuvable" });
      return;
    }

    const data   = await dpRes.json() as { chargeId?: string; id?: string; status?: string; amount?: number };
    const status = data.status?.toLowerCase() ?? "";

    if (["success", "paid", "completed", "succeeded", "successful"].includes(status)) {
      const [order] = await db
        .select().from(ordersTable).where(eq(ordersTable.diamanopayChargeId, chargeId as string)).limit(1);

      if (order && order.status !== "approved") {
        await db
          .update(ordersTable)
          .set({ status: "approved", paymentMethod: "diamanopay", updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id));

        logger.info({ orderId: order.id, chargeId }, "Order approved via manual verify — sending email");

        const orderItems = await db
          .select({
            id:              orderItemsTable.id,
            documentId:      orderItemsTable.documentId,
            documentTitle:   documentsTable.title,
            documentSubject: documentsTable.subject,
            documentLevel:   documentsTable.level,
            price:           orderItemsTable.price,
          })
          .from(orderItemsTable)
          .leftJoin(documentsTable, eq(orderItemsTable.documentId, documentsTable.id))
          .where(eq(orderItemsTable.orderId, order.id));

        if (orderItems.length > 0) {
          const docIds = orderItems.map((i) => i.documentId);
          const { sql } = await import("drizzle-orm");
          await db
            .update(documentsTable)
            .set({ downloadCount: sql`${documentsTable.downloadCount} + 1` })
            .where(docIds.length === 1 ? eq(documentsTable.id, docIds[0]) : inArray(documentsTable.id, docIds));

          const allFiles = await db.select().from(documentFilesTable).where(
            docIds.length === 1
              ? eq(documentFilesTable.documentId, docIds[0])
              : inArray(documentFilesTable.documentId, docIds),
          );

          const filesByDoc = new Map<number, typeof allFiles>();
          for (const f of allFiles) {
            const arr = filesByDoc.get(f.documentId) ?? [];
            arr.push(f);
            filesByDoc.set(f.documentId, arr);
          }

          sendOrderApprovalEmail({
            orderId:       order.id,
            customerName:  order.customerName,
            customerEmail: order.customerEmail,
            totalAmount:   order.totalAmount,
            adminNote:     null,
            items: orderItems.map((item) => ({
              documentTitle:   item.documentTitle   ?? "",
              documentSubject: item.documentSubject ?? "",
              documentLevel:   item.documentLevel   ?? "",
              price:           item.price,
              files: (filesByDoc.get(item.documentId) ?? []).map((f) => ({
                id:       f.id,
                fileName: f.fileName,
                fileSize: f.fileSize ?? null,
              })),
            })),
          }).catch(() => {});
        }
      }
    }

    res.json({ status: data.status, amount: data.amount });
  } catch (err) {
    logger.error({ err, chargeId }, "DiamanoPay verify failed");
    res.status(502).json({ error: "Impossible de vérifier le paiement" });
  }
});

export default router;
