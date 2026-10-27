import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// --- WhatsApp Business Cloud API Configuration Status ---
app.get('/api/whatsapp/status', (_req: Request, res: Response) => {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();

  const isConfigured = Boolean(token && phoneId);

  res.json({
    configured: isConfigured,
    provider: 'Meta WhatsApp Business Cloud API',
    phoneNumberId: phoneId ? `${phoneId.slice(0, 4)}...${phoneId.slice(-4)}` : null,
    businessAccountId: wabaId ? `${wabaId.slice(0, 4)}...${wabaId.slice(-4)}` : null,
    statusText: isConfigured ? 'Connected & Active' : 'Not Configured',
    missingKeys: [
      !token && 'WHATSAPP_API_TOKEN',
      !phoneId && 'WHATSAPP_PHONE_NUMBER_ID',
    ].filter(Boolean),
  });
});

// --- Official WhatsApp Statement Dispatch Route ---
app.post('/api/whatsapp/send-statement', async (req: Request, res: Response) => {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  const {
    recipientPhone,
    customerName,
    customerCode,
    statementNumber,
    periodLabel,
    totalBilled,
    paymentsReceived,
    previousOutstanding,
    totalAmountDue,
    statementText,
  } = req.body;

  if (!recipientPhone) {
    return res.status(400).json({
      success: false,
      status: 'Failed',
      error: 'Missing recipient phone number.',
    });
  }

  // Sanitize UAE phone number (clean non-digits, ensure country code 971)
  let cleanPhone = String(recipientPhone).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('05')) {
    cleanPhone = '971' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('971') && cleanPhone.length === 9) {
    cleanPhone = '971' + cleanPhone;
  }

  // Format message text
  const messageBody =
    statementText ||
    `*WIN WHITE LAUNDRY – MONTHLY STATEMENT*\n` +
      `--------------------------------\n` +
      `Customer: *${customerName || 'Valued Customer'}* (${customerCode || 'MC'})\n` +
      `Statement: *${statementNumber || 'STMT'}*\n` +
      `Billing Cycle: *${periodLabel || 'Monthly'}*\n` +
      `--------------------------------\n` +
      `• Total Billed for Cycle: AED ${(Number(totalBilled) || 0).toFixed(2)}\n` +
      `• Payments Received: AED ${(Number(paymentsReceived) || 0).toFixed(2)}\n` +
      `• Prior Outstanding Balance: AED ${(Number(previousOutstanding) || 0).toFixed(2)}\n` +
      `--------------------------------\n` +
      `*TOTAL AMOUNT DUE: AED ${(Number(totalAmountDue) || 0).toFixed(2)}*\n\n` +
      `Thank you for choosing WIN WHITE LAUNDRY.\n` +
      `Tel: 02 440 3012 | Mobile: 056 657 5169\n` +
      `Zayed Street, Tourist Club, Abu Dhabi, U.A.E.`;

  // If WhatsApp credentials are not configured on server
  if (!token || !phoneId) {
    return res.status(200).json({
      success: false,
      status: 'Not Configured',
      error:
        'WhatsApp Business Cloud API credentials (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured in server environment variables.',
      providerResponse: 'CREDENTIALS_MISSING',
      recipientPhone: cleanPhone,
    });
  }

  // Real Meta WhatsApp Cloud API HTTP request
  try {
    const metaEndpoint = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const response = await fetch(metaEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: messageBody,
        },
      }),
    });

    const data = (await response.json()) as any;

    if (response.ok && data.messages?.[0]?.id) {
      return res.json({
        success: true,
        status: 'Sent',
        messageId: data.messages[0].id,
        providerResponse: JSON.stringify(data),
      });
    }

    const errorMsg = data?.error?.message || 'Meta Cloud API rejected message request.';
    return res.status(200).json({
      success: false,
      status: 'Failed',
      error: errorMsg,
      providerResponse: JSON.stringify(data),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      status: 'Failed',
      error: err.message || 'Network exception communicating with Meta WhatsApp API.',
    });
  }
});

// --- Server-side Background Scheduler for Asia/Dubai Timezone ---
// Evaluates every minute for scheduled statement distributions
setInterval(() => {
  try {
    const nowDubai = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dubai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    // Logging scheduler heartbeat
    // In production, queries pending statements scheduled for today at this Dubai time
    if (nowDubai.endsWith(':00')) {
      console.log(`[WhatsApp Scheduler] Running Dubai time check: ${nowDubai}`);
    }
  } catch (err) {
    console.error('[WhatsApp Scheduler] Error in background timer', err);
  }
}, 60000);

// --- Vite Mounting & Static Asset Server ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite in middleware mode for hot development
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WIN WHITE LAUNDRY server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
