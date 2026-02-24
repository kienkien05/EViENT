import crypto from 'crypto';
import qs from 'qs';

/**
 * Sorts an object by its keys. This is required by VNPay before hashing to ensure consistent signatures.
 * @param obj Dictionary of parameters
 * @returns Sorted dictionary
 */
function sortObject(obj: Record<string, string | number>): Record<string, string | number> {
  const sorted: Record<string, string | number> = {};
  const str: string[] = [];
  let key: string;

  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }

  str.sort();

  for (let i = 0; i < str.length; i++) {
    sorted[str[i]] = encodeURIComponent(obj[str[i]]).replace(/%20/g, '+');
  }

  return sorted;
}

/**
 * Creates a payment URL for VNPay.
 *
 * @param amount Amount in VND (Before multiplication) - Example: 10000 -> 10,000 VND
 * @param orderId Unique Order ID string
 * @param ipAddr IP Address of the user (e.g. req.socket.remoteAddress)
 * @param orderInfo Description of the transaction
 * @returns Formatted payment URL to redirect the user
 */
export function buildVNPayUrl(
  amount: number,
  orderId: string,
  ipAddr: string,
  orderInfo: string = 'Thanh toan don hang'
): string {
  const tmnCode = process.env.VNP_TMNCODE!;
  const secretKey = process.env.VNP_HASHSECRET!;
  const vnpUrl = process.env.VNP_URL!;
  const returnUrl = process.env.VNP_RETURN_URL!;

  // Important: VNPay amount requires multiplying by 100
  const finalAmount = amount * 100;

  // Format date: YYYYMMDDHHmmss
  const date = new Date();
  const createDate = 
    date.getFullYear() +
    ('0' + (date.getMonth() + 1)).slice(-2) +
    ('0' + date.getDate()).slice(-2) +
    ('0' + date.getHours()).slice(-2) +
    ('0' + date.getMinutes()).slice(-2) +
    ('0' + date.getSeconds()).slice(-2);

  const expireDateObj = new Date(date.getTime() + 15 * 60000); // Expiration is +15 mins
  const expireDate = 
    expireDateObj.getFullYear() +
    ('0' + (expireDateObj.getMonth() + 1)).slice(-2) +
    ('0' + expireDateObj.getDate()).slice(-2) +
    ('0' + expireDateObj.getHours()).slice(-2) +
    ('0' + expireDateObj.getMinutes()).slice(-2) +
    ('0' + expireDateObj.getSeconds()).slice(-2);

  let vnp_Params: Record<string, string | number> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: finalAmount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  };

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  vnp_Params['vnp_SecureHash'] = signed;
  return vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });
}

/**
 * Verifies the checksum coming from VNPay.
 *
 * @param vnp_Params The query parameters received from VNPay (IPN or Return)
 * @returns true if valid, false if invalid or modified
 */
export function verifyVNPayHash(vnp_Params: any): boolean {
  const secretKey = process.env.VNP_HASHSECRET!;
  let secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === signed;
}
