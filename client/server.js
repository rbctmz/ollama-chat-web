const express = require('express');
const path = require('path');
const app = express();

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(__dirname));

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`\n[Client Server] Web interface running at http://localhost:${PORT}`);
  console.log('[Client Server] Serving files from:', __dirname);
});
