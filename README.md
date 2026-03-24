# M-Pesa Express System 

A complete Node.js/Express integration with Safaricom's **Daraja API** supporting:
-  **STK Push -- Till Number** (Buy Goods)
-  **STK Push -- Pochi la Biashara**
-  **B2C -- Send Money** to any phone
-  **Transaction Status** checking

---

## Some Prerequisites

- Node.js v16+
- Safaricom Daraja account → [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
- [ngrok](https://ngrok.com) (for local callback URLs during testing)

---

## In Order To Setup You Need To...

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` with your Daraja sandbox credentials.

### 3. Expose local server with ngrok (for callbacks)
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`) and set it as `BASE_CALLBACK_URL` in your `.env`.

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

##  Sandbox Test Credentials (Daraja defaults)

| Field | Value |
|-------|-------|
| Business Short Code | `174379` |
| Passkey | `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` |
| B2C Short Code | `600999` |
| Initiator Name | `testapi` |
| Initiator Password | `Safaricom999!*!` |
| Test Phone | `254708374149` |

---

##  API Reference

### Test Credentials
```
GET /api/mpesa/token
```
Returns an access token — verifies your credentials work.

---

### 1. STK Push → Till Number
```
POST /api/mpesa/till
```
```json
{
  "phone":       "0712345678",
  "amount":      500,
  "tillNumber":  "123456",
  "accountRef":  "Order001",
  "description": "Payment for goods"
}
```

---

### 2. STK Push → Pochi la Biashara
```
POST /api/mpesa/pochi
```
```json
{
  "phone":       "0712345678",
  "amount":      200,
  "pochiNumber": "0798765432",
  "accountRef":  "PoshiPay"
}
```

---

### 3. B2C — Send Money
```
POST /api/mpesa/send
```
```json
{
  "phone":     "0712345678",
  "amount":    1000,
  "commandID": "BusinessPayment",
  "remarks":   "Staff reimbursement",
  "occasion":  ""
}
```
`commandID` options: `BusinessPayment` | `SalaryPayment` | `PromotionPayment`

---

### 4. Check Transaction Status
```
POST /api/mpesa/query
```
```json
{
  "transactionID": "OEI2AK4Q16",
  "remarks":       "Verify payment"
}
```

---

### 5. Check STK Push Status
```
POST /api/mpesa/stk-query
```
```json
{
  "checkoutRequestID": "ws_CO_DMZ_12345678_23012023_..."
}
```

---

##  Callbacks

Daraja sends async results to your callback URLs. The server logs them to console and you can add DB logic inside:

| Callback Route | Purpose |
|----------------|---------|
| `POST /api/mpesa/callback/stk` | STK Push payment result |
| `POST /api/mpesa/callback/b2c/result` | B2C payment result |
| `POST /api/mpesa/callback/b2c/timeout` | B2C timeout |
| `POST /api/mpesa/callback/query/result` | Transaction query result |

---

##  Quick Test with curl

```bash
# 1. Test credentials
curl http://localhost:3000/api/mpesa/token

# 2. STK Push to Till
curl -X POST http://localhost:3000/api/mpesa/till \
  -H "Content-Type: application/json" \
  -d '{"phone":"254708374149","amount":1,"tillNumber":"174379","accountRef":"Test"}'

# 3. Send Money B2C
curl -X POST http://localhost:3000/api/mpesa/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"254708374149","amount":10,"remarks":"Test send"}'
```



##  Going to Production

1. Change `MPESA_ENV=production` in `.env`
2. Use your **live** Consumer Key/Secret from Daraja
3. Update `BUSINESS_SHORT_CODE` and `B2C_SHORT_CODE` with real values
4. Deploy to a server with a real HTTPS domain (no ngrok needed)
5. For B2C, download the **Production certificate** from Daraja and use it to encrypt `INITIATOR_PASSWORD`


##  Application ui

<img width="767" height="443" alt="lipapesa" src="https://github.com/user-attachments/assets/f6461a31-9a86-400a-977f-1d5aa8bf5b92" />
