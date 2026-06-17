const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// Dead-letter log — captures callbacks that exhausted all retries
const deadLetters = [];

async function fireWithRetry(url, payload, headers, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      console.warn(`[channel] Callback attempt ${attempt} returned ${res.status}`);
    } catch (err) {
      console.warn(`[channel] Callback attempt ${attempt} failed: ${err.message}`);
    }
    if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 1000));
  }
  // All retries exhausted — record in dead-letter log
  deadLetters.push({ url, payload, failedAt: new Date().toISOString() });
  console.error(`[channel] Webhook delivery failed after ${retries} attempts. Dead-lettered.`);
}

app.get('/dead-letters', (_req, res) => {
  res.json({ count: deadLetters.length, items: deadLetters.slice(-50) });
});

app.post('/send', (req, res) => {
  const { communications, campaignId, callbackBaseUrl } = req.body;
  
  // Instantly acknowledge receipt back to the CRM main pipeline
  res.json({ success: true, acceptedAt: new Date().toISOString() });
  
  // Background processing asynchronously simulates user engagement metrics
  communications.forEach(comm => {
    const delay = Math.random() * 4000 + 1000; // 1-5 second random propagation latency
    setTimeout(() => {
      const rand = Math.random();
      let status = rand < 0.05 ? 'failed' : 'delivered';
      let openedAt = null;
      let clickedAt = null;
      
      if (status === 'delivered' && Math.random() < 0.6) {
        status = 'opened';
        openedAt = new Date().toISOString();
        if (Math.random() < 0.4) {
          status = 'clicked';
          clickedAt = new Date().toISOString();
        }
      }
      
      // Fire webhook callback back to AIRA CRM application telemetry engine
      const headers = {
        'Content-Type': 'application/json',
        ...(process.env.WEBHOOK_SECRET ? { 'x-webhook-secret': process.env.WEBHOOK_SECRET } : {}),
      };
      const payload = {
        communicationId: comm.communicationId,
        customerId: comm.customerId,
        campaignId,
        status,
        channel: comm.channel,
        openedAt,
        clickedAt,
        timestamp: new Date().toISOString(),
      };
      fireWithRetry(`${callbackBaseUrl || 'http://localhost:3000'}/api/receipts`, payload, headers);
    }, delay);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Telemetry Channel Simulation Engine online on port ${PORT}`));