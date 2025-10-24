const express = require('express');
const session = require('express-session');
const multer = require('multer');
const sharp = require('sharp');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// static files from src
app.use(express.static(path.join(__dirname, 'src')));

// parse form bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60*60*1000 } // 1 hour
}));

// Simple auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.redirect('/login.html');
}

// Login endpoint (POST from login.html)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // as requested: username "dineth" password "ofc"
  if (username === 'dineth' && password === 'ofc') {
    req.session.authenticated = true;
    return res.redirect('/dashboard.html');
  } else {
    return res.redirect('/login.html?err=1');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Protect dashboard and feature pages
app.get(['/dashboard.html','/catalogue.html','/wp-link.html','/wp-qr.html'], requireAuth, (req, res, next) => {
  next();
});

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({ storage });

// Upload + slice into 6 vertical parts (returns URLs)
app.post('/api/upload-and-slice', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;

    const parts = 6;
    const sliceWidth = Math.floor(width / parts);

    const urls = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    for (let i = 0; i < parts; i++) {
      const left = i * sliceWidth;
      // last slice take remaining width
      const w = (i === parts - 1) ? (width - left) : sliceWidth;
      const outName = `${path.basename(filePath, path.extname(filePath))}_slice_${i+1}.png`;
      const outPath = path.join(UPLOAD_DIR, outName);

      await sharp(filePath)
        .extract({ left: left, top: 0, width: w, height: height })
        .toFile(outPath);

      urls.push(`${baseUrl}/uploads/${outName}`);
    }

    // Also provide original preview url
    const originalUrl = `${baseUrl}/uploads/${path.basename(filePath)}`;

    return res.json({ success: true, original: originalUrl, slices: urls });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Processing failed' });
  }
});

// Serve files under /uploads statically
app.use('/uploads', express.static(UPLOAD_DIR));

// QR code generation endpoint (text -> PNG dataURL)
app.post('/api/qrcode', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ success:false, error:'No text provided' });
  try {
    const dataUrl = await QRCode.toDataURL(text, { margin: 2, scale: 6 });
    return res.json({ success:true, dataUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success:false, error:'QR gen failed' });
  }
});

// Simple health
app.get('/ping', (req, res) => res.send('pong'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});