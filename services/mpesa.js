
//  M-Pesa Service Layer
//  Handles: Auth, STK Push, B2C, Pochi, Query


const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../config/mpesa");

// Helpers 

/** Generate OAuth access token */
async function getAccessToken() {
  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  const response = await axios.get(
    `${config.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.access_token;
}

/** Generate STK Push password (Base64 of ShortCode + Passkey + Timestamp) */
function generateStkPassword(shortCode, passkey, timestamp) {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
}

/** Generate timestamp in YYYYMMDDHHmmss format */
function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
}

/** Encrypt initiator password using Safaricom public cert */
function encryptInitiatorPassword(password) {
  // In sandbox, Safaricom accepts plain base64 — for production,
  // encrypt with the downloaded SandboxCertificate.cer / ProductionCertificate.cer
  // For sandbox testing, we return the password as-is (Daraja accepts it)
  return Buffer.from(password).toString("base64");
}

// 1. STK Push — Till Number (Buy Goods)

/**
 * Initiate STK Push to a Till Number (Buy Goods)
 * @param {string} phone  - Customer phone e.g. 254712345678
 * @param {number} amount - Amount in KES
 * @param {string} tillNumber - Business Till Number
 * @param {string} accountRef - Reference shown on customer phone
 * @param {string} description - Transaction description
 */
async function stkPushTill(phone, amount, tillNumber, accountRef, description) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  // For Buy Goods (Till), BusinessShortCode = the till number itself
  // Password is also generated using the till number, not the paybill shortcode
  const password = generateStkPassword(tillNumber, config.stk.passkey, timestamp);

  const payload = {
    BusinessShortCode: tillNumber,               //  Must be the till number
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline",   //  Till Number
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: tillNumber,                          // The Till Number
    PhoneNumber: phone,
    CallBackURL: config.stk.callbackURL,
    AccountReference: accountRef,
    TransactionDesc: description || "Till Payment",
  };

  const response = await axios.post(
    `${config.baseURL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

//2. STK Push — Pochi la Biashara

/**
 * Send money to a Pochi la Biashara number via STK Push
 * Pochi la Biashara uses CustomerPayBillOnline with the Pochi till/short code
 * @param {string} phone        - Customer's phone e.g. 254712345678
 * @param {number} amount       - Amount in KES
 * @param {string} pochiNumber  - Pochi la Biashara number (same as phone registered)
 * @param {string} accountRef   - Reference
 */
async function stkPushPochi(phone, amount, pochiNumber, accountRef) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const shortCode = config.stk.shortCode;
  const password = generateStkPassword(shortCode, config.stk.passkey, timestamp);

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",    // Pochi la Biashara
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: pochiNumber,                         //  Pochi number
    PhoneNumber: phone,
    CallBackURL: config.stk.callbackURL,
    AccountReference: accountRef || "Pochi Payment",
    TransactionDesc: "Pochi la Biashara Payment",
  };

  const response = await axios.post(
    `${config.baseURL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

// 3. B2C  Send Money to Phone 

/**
 * Send money directly to a phone number (B2C)
 * @param {string} phone       - Recipient phone e.g. 254712345678
 * @param {number} amount      - Amount in KES
 * @param {string} commandID   - "BusinessPayment" | "SalaryPayment" | "PromotionPayment"
 * @param {string} remarks     - Remarks (max 100 chars)
 * @param {string} occasion    - Optional occasion text
 */
async function sendMoneyB2C(phone, amount, commandID = "BusinessPayment", remarks, occasion) {
  const token = await getAccessToken();
  const securityCredential = encryptInitiatorPassword(config.b2c.initiatorPassword);

  const payload = {
    OriginatorConversationID: uuidv4(),          // unique ID per request
    InitiatorName: config.b2c.initiatorName,
    SecurityCredential: securityCredential,
    CommandID: commandID,                        // "BusinessPayment" for general send
    Amount: Math.round(amount),
    PartyA: config.b2c.shortCode,               // Your B2C short code
    PartyB: phone,                              // Recipient phone
    Remarks: remarks || "B2C Payment",
    QueueTimeOutURL: config.b2c.queueTimeOutURL,
    ResultURL: config.b2c.resultURL,
    Occasion: occasion || "",
  };

  const response = await axios.post(
    `${config.baseURL}/mpesa/b2c/v3/paymentrequest`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

//4. Transaction Status Query 

/**
 * Check the status of any M-Pesa transaction
 * @param {string} transactionID - M-Pesa transaction ID e.g. "OEI2AK4Q16"
 * @param {string} remarks       - Optional remarks
 */
async function queryTransactionStatus(transactionID, remarks) {
  const token = await getAccessToken();
  const securityCredential = encryptInitiatorPassword(config.query.initiatorPassword);

  const payload = {
    Initiator: config.query.initiatorName,
    SecurityCredential: securityCredential,
    CommandID: "TransactionStatusQuery",
    TransactionID: transactionID,
    OriginalConversationID: "",
    PartyA: config.query.shortCode,
    IdentifierType: "4",                        // 4 = Organization short code
    ResultURL: config.query.resultURL,
    QueueTimeOutURL: config.query.queueTimeOutURL,
    Remarks: remarks || "Transaction Status Query",
    Occasion: "",
  };

  const response = await axios.post(
    `${config.baseURL}/mpesa/transactionstatus/v1/query`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

// 5. STK Push Query (check STK Push status) 

/**
 * Query the result of an STK Push request
 * @param {string} checkoutRequestID - From the original STK Push response
 */
async function queryStkPush(checkoutRequestID) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const shortCode = config.stk.shortCode;
  const password = generateStkPassword(shortCode, config.stk.passkey, timestamp);

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestID,
  };

  const response = await axios.post(
    `${config.baseURL}/mpesa/stkpushquery/v1/query`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

module.exports = {
  getAccessToken,
  stkPushTill,
  stkPushPochi,
  sendMoneyB2C,
  queryTransactionStatus,
  queryStkPush,
};