
//  M-Pesa Routes
//  POST /api/mpesa/till        STK Push to Till Number
//  POST /api/mpesa/pochi        STK Push to Pochi la Biashara
//  POST /api/mpesa/send         B2C Send Money to Phone
//  POST /api/mpesa/query        Transaction Status Check
//  POST /api/mpesa/stk-query    STK Push Status Check
//  GET  /api/mpesa/token       Test: Get access token
//  POST /api/mpesa/callback/*   Daraja webhook callbacks


const express = require("express");
const router = express.Router();
const mpesa = require("../services/mpesa");
const {
  validateStkRequest,
  validateB2CRequest,
  validateQueryRequest,
} = require("../middleware/validate");

// GET /api/mpesa/token 
// Test your credentials — returns an access token
router.get("/token", async (req, res) => {
  try {
    const token = await mpesa.getAccessToken();
    res.json({
      success: true,
      message: "Credentials ARE VALID",
      access_token: token,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to get access token. Check your CONSUMER_KEY and CONSUMER_SECRET.",
      details: err.response?.data || err.message,
    });
  }
});

// POST /api/mpesa/till
/**
 * STK Push to a Till Number (Buy Goods)
 * Body: { phone, amount, tillNumber, accountRef?, description? }
 */
router.post("/till", validateStkRequest, async (req, res) => {
  const { phone, amount, tillNumber, accountRef, description } = req.body;

  if (!tillNumber) {
    return res.status(400).json({ success: false, error: "tillNumber is required" });
  }

  try {
    const result = await mpesa.stkPushTill(
      phone,
      amount,
      tillNumber,
      accountRef || "Payment",
      description || "Till Number Payment"
    );

    res.json({
      success: true,
      message: "STK Push sent to customer's phone SUCCESSFULLY",
      data: {
        merchantRequestID: result.MerchantRequestID,
        checkoutRequestID: result.CheckoutRequestID,
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
        customerMessage: result.CustomerMessage,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "STK Push failed",
      details: err.response?.data || err.message,
    });
  }
});

//  POST /api/mpesa/pochi 
/**
 * STK Push to a Pochi la Biashara number
 * Body: { phone, amount, pochiNumber, accountRef? }
 */
router.post("/pochi", validateStkRequest, async (req, res) => {
  const { phone, amount, pochiNumber, accountRef } = req.body;

  if (!pochiNumber) {
    return res.status(400).json({ success: false, error: "pochiNumber is required" });
  }

  try {
    const result = await mpesa.stkPushPochi(phone, amount, pochiNumber, accountRef);

    res.json({
      success: true,
      message: "STK Push sent for Pochi la Biashara payment SUCCESSFULLY",
      data: {
        merchantRequestID: result.MerchantRequestID,
        checkoutRequestID: result.CheckoutRequestID,
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
        customerMessage: result.CustomerMessage,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Pochi la Biashara STK Push failed",
      details: err.response?.data || err.message,
    });
  }
});

//  POST /api/mpesa/send 
/**
 * B2C — Send Money to a phone number
 * Body: { phone, amount, commandID?, remarks?, occasion? }
 * commandID options: "BusinessPayment" , "SalaryPayment" , "PromotionPayment"
 */
router.post("/send", validateB2CRequest, async (req, res) => {
  const {
    phone,
    amount,
    commandID = "BusinessPayment",
    remarks,
    occasion,
  } = req.body;

  const validCommands = ["BusinessPayment", "SalaryPayment", "PromotionPayment"];
  if (!validCommands.includes(commandID)) {
    return res.status(400).json({
      success: false,
      error: `commandID must be one of: ${validCommands.join(", ")}`,
    });
  }

  try {
    const result = await mpesa.sendMoneyB2C(phone, amount, commandID, remarks, occasion);

    res.json({
      success: true,
      message: "Money sent successfully SUCCESFULLY",
      data: {
        conversationID: result.ConversationID,
        originatorConversationID: result.OriginatorConversationID,
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "B2C Send Money failed",
      details: err.response?.data || err.message,
    });
  }
});

//  POST /api/mpesa/query
/**
 * Check status of any M-Pesa transaction
 * Body: { transactionID, remarks? }
 */
router.post("/query", validateQueryRequest, async (req, res) => {
  const { transactionID, remarks } = req.body;

  try {
    const result = await mpesa.queryTransactionStatus(transactionID, remarks);

    res.json({
      success: true,
      message: "Transaction query submitted SUCCESSFULLY",
      data: {
        conversationID: result.ConversationID,
        originatorConversationID: result.OriginatorConversationID,
        responseCode: result.ResponseCode,
        responseDescription: result.ResponseDescription,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Transaction status query failed",
      details: err.response?.data || err.message,
    });
  }
});

// POST /api/mpesa/stk-query 
/**
 * Query the status of a previous STK Push
 * Body: { checkoutRequestID }
 */
router.post("/stk-query", async (req, res) => {
  const { checkoutRequestID } = req.body;
  if (!checkoutRequestID) {
    return res.status(400).json({ success: false, error: "checkoutRequestID is required" });
  }

  try {
    const result = await mpesa.queryStkPush(checkoutRequestID);
    res.json({
      success: true,
      message: "STK Push query result",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "STK Push query failed",
      details: err.response?.data || err.message,
    });
  }
});


//  CALLBACK ENDPOINTS (Daraja calls these)
//  These receive async results from Safaricom


//  STK Push Callback
router.post("/callback/stk", (req, res) => {
  const body = req.body;
  console.log("\n [STK CALLBACK]", JSON.stringify(body, null, 2));

  const stkCallback = body?.Body?.stkCallback;
  if (!stkCallback) {
    return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const { ResultCode, ResultDesc, CallbackMetadata, CheckoutRequestID, MerchantRequestID } =
    stkCallback;

  if (ResultCode === 0) {
    // Payment successful — extract metadata
    const meta = {};
    CallbackMetadata?.Item?.forEach((item) => {
      meta[item.Name] = item.Value;
    });

    console.log(" GREAT _ STK Push SUCCESS:", {
      checkoutRequestID: CheckoutRequestID,
      merchantRequestID: MerchantRequestID,
      amount: meta.Amount,
      mpesaReceiptNumber: meta.MpesaReceiptNumber,
      transactionDate: meta.TransactionDate,
      phoneNumber: meta.PhoneNumber,
    });

    
  } else {
    console.log(" STK Push FAILED:", { ResultCode, ResultDesc, CheckoutRequestID });
    
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// B2C Result Callback 
router.post("/callback/b2c/result", (req, res) => {
  const body = req.body;
  console.log("\n [B2C RESULT]", JSON.stringify(body, null, 2));

  const result = body?.Result;
  if (result) {
    const { ResultCode, ResultDesc, TransactionID, ConversationID } = result;

    if (ResultCode === 0) {
      const params = {};
      result.ResultParameters?.ResultParameter?.forEach((p) => {
        params[p.Key] = p.Value;
      });
      console.log(" B2C SUCCESS:", {
        transactionID: TransactionID,
        conversationID: ConversationID,
        amount: params.TransactionAmount,
        recipientName: params.RecipientPublicName,
        receivedBy: params.B2CRecipientIsRegisteredCustomer,
        transactionCompleted: params.TransactionCompletedDateTime,
      });
      // later on - Update your database
    } else {
      console.log(" B2C FAILED:", { ResultCode, ResultDesc });
    }
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

//B2C Timeout Callback 
router.post("/callback/b2c/timeout", (req, res) => {
  console.log("\n [B2C TIMEOUT]", JSON.stringify(req.body, null, 2));
  // TODO: Handle timeout — mark transaction as pending/unknown
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// Transaction Query Result 
router.post("/callback/query/result", (req, res) => {
  console.log("\n [QUERY RESULT]", JSON.stringify(req.body, null, 2));

  const result = req.body?.Result;
  if (result?.ResultCode === 0) {
    const params = {};
    result.ResultParameters?.ResultParameter?.forEach((p) => {
      params[p.Key] = p.Value;
    });
    console.log(" QUERY SUCCESS:", params);
    // TODO: Use this data to update transaction records
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

//  Transaction Query Timeout 
router.post("/callback/query/timeout", (req, res) => {
  console.log("\n [QUERY TIMEOUT]", JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

module.exports = router;