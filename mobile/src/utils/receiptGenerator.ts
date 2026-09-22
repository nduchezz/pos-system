import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Sale } from '../api/sales.api';
import { Business } from '../types';

/**
 * Generate a professional thermal-printer-style receipt HTML
 */
export const buildReceiptHtml = (sale: Sale, business: Business | null): string => {
  const fmt = (n: number) => `KES ${n.toFixed(2)}`;
  const date = new Date(sale.createdAt).toLocaleString();

  const itemsRows = sale.items
    .map(
      (item) => `
      <tr>
        <td class="item-name">${escapeHtml(item.productName)}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${item.sellingPrice.toFixed(2)}</td>
        <td class="right">${item.subtotal.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #000;
          margin: 0;
          padding: 12px;
          max-width: 320px;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .header { text-align: center; margin-bottom: 8px; }
        .business-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .meta { font-size: 11px; margin: 2px 0; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 11px; text-align: left; padding-bottom: 4px; }
        th.center { text-align: center; }
        th.right { text-align: right; }
        td { padding: 3px 0; font-size: 12px; vertical-align: top; }
        .item-name { max-width: 140px; word-wrap: break-word; }
        .totals { margin-top: 8px; }
        .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
        .total-final { font-size: 16px; font-weight: bold; padding-top: 6px; margin-top: 6px; border-top: 1px solid #000; }
        .footer { text-align: center; margin-top: 12px; font-size: 11px; font-style: italic; }
        .payment-info { font-size: 11px; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-name">${escapeHtml(business?.name || 'Business')}</div>
        <div class="meta">Receipt: ${sale.receiptNo}</div>
        <div class="meta">Date: ${date}</div>
        <div class="meta">Cashier: ${escapeHtml(sale.user?.name || 'N/A')}</div>
      </div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="center">Qty</th>
            <th class="right">Price</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${fmt(sale.subtotal)}</span></div>
        ${sale.discount > 0 ? `<div class="totals-row"><span>Discount</span><span>- ${fmt(sale.discount)}</span></div>` : ''}
        ${sale.tax > 0 ? `<div class="totals-row"><span>Tax</span><span>${fmt(sale.tax)}</span></div>` : ''}
        <div class="totals-row total-final"><span>TOTAL</span><span>${fmt(sale.grandTotal)}</span></div>
      </div>

      <div class="divider"></div>

      <div class="payment-info">
        <div class="totals-row"><span>Payment</span><span>${sale.paymentMethod}</span></div>
        <div class="totals-row"><span>Received</span><span>${fmt(sale.amountReceived)}</span></div>
        ${sale.change > 0 ? `<div class="totals-row"><span>Change</span><span>${fmt(sale.change)}</span></div>` : ''}
      </div>

      <div class="divider"></div>

      <div class="footer">
        Thank you for shopping with us!<br/>
        Powered by POS System
      </div>
    </body>
    </html>
  `;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate a plain-text version for WhatsApp / SMS
 */
export const buildReceiptText = (sale: Sale, business: Business | null): string => {
  const fmt = (n: number) => `KES ${n.toFixed(2)}`;
  const date = new Date(sale.createdAt).toLocaleString();

  let text = `*${business?.name || 'Receipt'}*\n`;
  text += `Receipt: ${sale.receiptNo}\n`;
  text += `Date: ${date}\n`;
  text += `Cashier: ${sale.user?.name || 'N/A'}\n`;
  text += `--------------------\n`;

  sale.items.forEach((item) => {
    text += `${item.productName} x ${item.quantity} = ${fmt(item.subtotal)}\n`;
  });

  text += `--------------------\n`;
  text += `Subtotal: ${fmt(sale.subtotal)}\n`;
  if (sale.discount > 0) text += `Discount: -${fmt(sale.discount)}\n`;
  if (sale.tax > 0) text += `Tax: ${fmt(sale.tax)}\n`;
  text += `*TOTAL: ${fmt(sale.grandTotal)}*\n`;
  text += `Paid via: ${sale.paymentMethod}\n`;
  if (sale.change > 0) text += `Change: ${fmt(sale.change)}\n`;
  text += `\nThank you!`;

  return text;
};

/**
 * Generate PDF and open the share sheet
 *
 * On Android (especially in Expo Go), `Print.printToFileAsync` writes the PDF to
 * the app's raw cache directory, which is *not* readable by `expo-sharing` under
 * the scoped file-permission model introduced in SDK 54+. Sharing that URI throws:
 *   "Not allowed to read file under given URL."
 *
 * To work around this, we ask `expo-print` for the PDF as base64 (computed
 * natively, so no read-permission check is needed) and write it into the
 * experience-isolated cache directory exposed by `Paths.cache`, then share that.
 */
export const shareReceiptPdf = async (sale: Sale, business: Business | null) => {
  const html = buildReceiptHtml(sale, business);
  const { base64 } = await Print.printToFileAsync({ html, base64: true });

  if (!base64) {
    throw new Error('Failed to generate PDF');
  }

  if (await Sharing.isAvailableAsync()) {
    const safeReceiptNo = sale.receiptNo.replace(/[^a-zA-Z0-9_-]/g, '-');
    const file = new File(Paths.cache, `receipt-${safeReceiptNo}-${Date.now()}.pdf`);
    file.write(base64, { encoding: 'base64' });

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Receipt ${sale.receiptNo}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing not available on this device');
  }
};

/**
 * Open native print dialog
 */
export const printReceipt = async (sale: Sale, business: Business | null) => {
  const html = buildReceiptHtml(sale, business);
  await Print.printAsync({ html });
};
