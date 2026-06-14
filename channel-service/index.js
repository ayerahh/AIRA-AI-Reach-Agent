const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

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
      fetch(`${callbackBaseUrl || 'http://localhost:3000'}/api/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communicationId: comm.communicationId,
          customerId: comm.customerId,
          campaignId,
          status,
          channel: comm.channel,
          openedAt,
          clickedAt,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error("Webhook Delivery Failed:", err.message));
    }, delay);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Telemetry Channel Simulation Engine online on port ${PORT}`));