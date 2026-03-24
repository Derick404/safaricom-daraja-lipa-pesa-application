
//  M-Pesa Daraja API Configuration


const isSandbox = process.env.MPESA_ENV !== "production";

const config = {
  isSandbox,

  // Base URLs
  baseURL: isSandbox
    ? "https://sandbox.safaricom.co.ke"
    : "https://api.safaricom.co.ke",

  // Auth
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,

  // STK Push (Lipa na M-Pesa Online)
  stk: {
    shortCode: process.env.BUSINESS_SHORT_CODE || "174379",
    passkey:
      process.env.PASSKEY ||
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    callbackURL: `${process.env.BASE_CALLBACK_URL}/api/mpesa/callback/stk`,
  },

  // B2C – Send Money
  b2c: {
    shortCode: process.env.B2C_SHORT_CODE || "600999",
    initiatorName: process.env.INITIATOR_NAME || "testapi",
    initiatorPassword: process.env.INITIATOR_PASSWORD || "Safaricom999!*!",
    resultURL: `${process.env.BASE_CALLBACK_URL}/api/mpesa/callback/b2c/result`,
    queueTimeOutURL: `${process.env.BASE_CALLBACK_URL}/api/mpesa/callback/b2c/timeout`,
  },

  // Transaction Status Query
  query: {
    shortCode: process.env.BUSINESS_SHORT_CODE || "174379",
    initiatorName: process.env.INITIATOR_NAME || "testapi",
    initiatorPassword: process.env.INITIATOR_PASSWORD || "Safaricom999!*!",
    resultURL: `${process.env.BASE_CALLBACK_URL}/api/mpesa/callback/query/result`,
    queueTimeOutURL: `${process.env.BASE_CALLBACK_URL}/api/mpesa/callback/query/timeout`,
  },
};

module.exports = config;
