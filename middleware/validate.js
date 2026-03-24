
//  Validation Middleware


/** Normalize phone number to 254XXXXXXXXX format */
function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 10)
    return "254" + cleaned.slice(1);
  if (cleaned.startsWith("7") && cleaned.length === 9)
    return "254" + cleaned;
  if (cleaned.startsWith("1") && cleaned.length === 9)
    return "254" + cleaned;

  return null;
}

/** Validate STK Push (Till & Pochi) request body */
function validateStkRequest(req, res, next) {
  const { phone, amount } = req.body;

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({
      success: false,
      error: "Invalid phone number. Use format: 07XXXXXXXX or 254XXXXXXXXX",
    });
  }

  if (!amount || isNaN(amount) || Number(amount) < 1) {
    return res.status(400).json({
      success: false,
      error: "Amount must be a number greater than 0",
    });
  }

  // Attach normalized phone back to body
  req.body.phone = normalizedPhone;
  next();
}

/** Validate B2C request body */
function validateB2CRequest(req, res, next) {
  const { phone, amount } = req.body;

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({
      success: false,
      error: "Invalid phone number. Use format: 07XXXXXXXX or 254XXXXXXXXX",
    });
  }

  if (!amount || isNaN(amount) || Number(amount) < 10) {
    return res.status(400).json({
      success: false,
      error: "Amount must be a number of at least KES 10",
    });
  }

  req.body.phone = normalizedPhone;
  next();
}

/** Validate Transaction Query request */
function validateQueryRequest(req, res, next) {
  const { transactionID } = req.body;
  if (!transactionID || transactionID.trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: "A valid M-Pesa Transaction ID is required (e.g. OEI2AK4Q16)",
    });
  }
  next();
}

module.exports = { validateStkRequest, validateB2CRequest, validateQueryRequest, normalizePhone };