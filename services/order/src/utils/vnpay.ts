import { createLogger } from '@evient/shared';
import { HashAlgorithm, ProductCode, VNPay, ignoreLogger } from 'vnpay';
import type { ReturnQueryFromVNPay, VerifyReturnUrl } from 'vnpay/types-only';

const logger = createLogger('vnpay');

let vnpayInstance: VNPay | null = null;

/**
 * Lazily initialize VNPay instance with env config.
 */
export function getVnpay(): VNPay {
  if (!vnpayInstance) {
    const tmnCode = process.env.VNP_TMNCODE;
    const secureSecret = process.env.VNP_HASHSECRET;
    const vnpayHost = process.env.VNP_URL || 'https://sandbox.vnpayment.vn';

    if (!tmnCode || !secureSecret) {
      throw new Error('VNPay config missing: VNP_TMNCODE and VNP_HASHSECRET are required');
    }

    vnpayInstance = new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost,
      testMode: true,
      hashAlgorithm: HashAlgorithm.SHA512,
      enableLog: true,
      loggerFn: ignoreLogger,
    });

    logger.info(`VNPay initialized: tmnCode=${tmnCode}, host=${vnpayHost}`);
  }
  return vnpayInstance;
}

/**
 * Build a VNPay payment URL for a given order.
 */
export function buildPaymentUrl(params: {
  amount: number;
  orderId: string;
  orderInfo: string;
  ipAddr: string;
  returnUrl: string;
}): string {
  const vnpay = getVnpay();
  return vnpay.buildPaymentUrl({
    vnp_Amount: params.amount,
    vnp_IpAddr: params.ipAddr || '127.0.0.1',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.orderInfo,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: params.returnUrl,
  });
}

/**
 * Verify an IPN call from VNPay (server-to-server).
 */
export function verifyIpn(query: ReturnQueryFromVNPay) {
  const vnpay = getVnpay();
  return vnpay.verifyIpnCall({ ...query });
}

/**
 * Verify a return URL redirect from VNPay (user redirect).
 */
export function verifyReturn(query: ReturnQueryFromVNPay): VerifyReturnUrl {
  const vnpay = getVnpay();
  return vnpay.verifyReturnUrl({ ...query });
}
