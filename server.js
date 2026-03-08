const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const app = express();

app.use(cors());
app.use(express.json());

// KeyAuth config
const KEYAUTH = {
  ownerid: 'DCMnTVTL6h',
  appname: 'Veron Optimize\'s Application',
  secret: '7cae8e8803e2ca7330561c68ab3b17761c09245361a95045224d14a1a36ffc69',
  version: '1.0'
};

// Helper: generate session
function genSession() {
  return crypto.randomBytes(16).toString('hex');
}

// Helper: KeyAuth API call
function keyauthRequest(params) {
  return new Promise(function(resolve, reject) {
    var query = new URLSearchParams(params).toString();
    var options = {
      hostname: 'keyauth.cc',
      path: '/api/1.2/?' + query,
      method: 'GET',
      headers: { 'User-Agent': 'VERON/1.0' }
    };
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk){ data += chunk; });
      res.on('end', function(){
        try { resolve(JSON.parse(data)); }
        catch(e){ reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── INIT SESSION ──
app.post('/api/init', async function(req, res) {
  try {
    var sessionid = genSession();
    var result = await keyauthRequest({
      type: 'init',
      ver: KEYAUTH.version,
      name: KEYAUTH.appname,
      ownerid: KEYAUTH.ownerid,
      sessionid: sessionid
    });
    if (result.success) {
      res.json({ success: true, sessionid: sessionid, message: result.message });
    } else {
      res.json({ success: false, message: result.message || 'Init gagal' });
    }
  } catch(e) {
    res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

// ── LOGIN ──
app.post('/api/login', async function(req, res) {
  try {
    var { username, password, sessionid, hwid } = req.body;
    if (!username || !password || !sessionid) {
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }
    var result = await keyauthRequest({
      type: 'login',
      username: username,
      pass: password,
      sessionid: sessionid,
      name: KEYAUTH.appname,
      ownerid: KEYAUTH.ownerid,
      hwid: hwid || 'web-' + crypto.randomBytes(8).toString('hex')
    });
    if (result.success) {
      res.json({
        success: true,
        message: 'Login berhasil!',
        info: {
          username: result.info?.username || username,
          expiry: result.info?.expiry || '-',
          rank: result.info?.subscriptions?.[0]?.subscription || 'user',
          hwid: result.info?.hwid || hwid
        }
      });
    } else {
      res.json({ success: false, message: result.message || 'Login gagal' });
    }
  } catch(e) {
    res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

// ── LICENSE / KEY LOGIN ──
app.post('/api/license', async function(req, res) {
  try {
    var { key, sessionid, hwid } = req.body;
    if (!key || !sessionid) {
      return res.json({ success: false, message: 'Key & session diperlukan' });
    }
    var result = await keyauthRequest({
      type: 'license',
      key: key,
      sessionid: sessionid,
      name: KEYAUTH.appname,
      ownerid: KEYAUTH.ownerid,
      hwid: hwid || 'web-' + crypto.randomBytes(8).toString('hex')
    });
    if (result.success) {
      res.json({
        success: true,
        message: 'Key valid!',
        info: {
          username: result.info?.username || 'User',
          expiry: result.info?.expiry || '-',
          rank: result.info?.subscriptions?.[0]?.subscription || 'user',
          hwid: result.info?.hwid || hwid
        }
      });
    } else {
      res.json({ success: false, message: result.message || 'Key tidak valid' });
    }
  } catch(e) {
    res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

// ── REGISTER ──
app.post('/api/register', async function(req, res) {
  try {
    var { username, password, key, sessionid, hwid } = req.body;
    if (!username || !password || !key || !sessionid) {
      return res.json({ success: false, message: 'Data tidak lengkap' });
    }
    var result = await keyauthRequest({
      type: 'register',
      username: username,
      pass: password,
      key: key,
      sessionid: sessionid,
      name: KEYAUTH.appname,
      ownerid: KEYAUTH.ownerid,
      hwid: hwid || 'web-' + crypto.randomBytes(8).toString('hex')
    });
    res.json({
      success: result.success,
      message: result.message || (result.success ? 'Register berhasil!' : 'Gagal register')
    });
  } catch(e) {
    res.status(500).json({ success: false, message: 'Server error: ' + e.message });
  }
});

// ── HEALTH CHECK ──
app.get('/health', function(req, res) {
  res.json({ status: 'ok', app: 'VERON Backend', version: '1.0' });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('VERON Backend running on port ' + PORT);
});
