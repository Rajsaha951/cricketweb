
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Static files with proper headers
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      res.setHeader('Content-Type', `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}`);
    } else if (['.mp4', '.webm'].includes(ext)) {
      res.setHeader('Content-Type', `video/${ext.slice(1)}`);
    }
  }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cricbytes', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Error:', err));

// Models
const memeSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  likes: { type: Number, default: 0 },
  uploader: { type: String, required: true },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, default: '' }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  resetToken: String,
  resetTokenExpiry: Date
}, { timestamps: true });

const Meme = mongoose.model('Meme', memeSchema);
const User = mongoose.model('User', userSchema);

// File Upload Configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const validTypes = /jpeg|jpg|png|gif|mp4|webm/;
    const isValid = validTypes.test(path.extname(file.originalname).toLowerCase());
    cb(null, isValid);
  }
}).single('memeFile');

// Auth Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded._id });
    
    if (!user) throw new Error();
    req.user = user;
    req.token = token;
    next();
  } catch (e) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};

// API Endpoints

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Meme Endpoints
app.post('/api/memes/upload', authenticate, (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false,
            error: 'File size exceeds 30MB limit' 
          });
        }
        return res.status(400).json({ 
          success: false,
          error: 'Invalid file type. Only images (JPEG, PNG, GIF) and videos (MP4, WebM) are allowed'
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: 'No file was uploaded' 
        });
      }

      // Verify user exists
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // Create meme record
      const meme = await Meme.create({
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        uploader: user.name,
        uploaderId: user._id,
        caption: req.body.caption || ''
      });

      // Verify file was actually saved
      if (!fs.existsSync(req.file.path)) {
        throw new Error('File was not saved to disk');
      }

      res.status(201).json({
        success: true,
        data: {
          _id: meme._id,
          type: meme.type,
          filename: meme.filename,
          caption: meme.caption,
          uploaderName: meme.uploader,
          createdAt: meme.createdAt,
          likes: meme.likes,
          imageUrl: `/uploads/${meme.filename}`
        }
      });

    } catch (error) {
      console.error('Upload processing error:', error);
      
      // Clean up if file was saved but DB operation failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ 
        success: false,
        error: 'Failed to process your upload. Please try again.' 
      });
    }
  });
});
app.get('/api/memes', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const memes = await Meme.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Meme.countDocuments();

    res.json({
      data: memes.map(meme => ({
        _id: meme._id,
        type: meme.type,
        filename: meme.filename,
        caption: meme.caption,
        uploaderName: meme.uploader,
        createdAt: meme.createdAt,
        likes: meme.likes || 0,
        imageUrl: `/uploads/${meme.filename}`
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMemes: total
      }
    });
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({ error: 'Failed to load memes' });
  }
});

app.post('/api/memes/:id/like', authenticate, async (req, res) => {
  try {
    const meme = await Meme.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    ).lean();
    
    if (!meme) {
      return res.status(404).json({ error: 'Meme not found' });
    }

    res.json({
      _id: meme._id,
      likes: meme.likes
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

// Auth Endpoints 

// Auth Endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'cricbytessecret');
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'cricbytessecret');
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If email exists, reset link sent' });
    
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'cricbytessecret', { expiresIn: '1h' });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // In production, send email with reset link
    const resetLink = `http://localhost:3001/reset-password.html?token=${token}`;
    console.log(`Password reset link: ${resetLink}`);
    
    res.json({ message: 'If email exists, reset link sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricbytessecret');
    
    const user = await User.findOne({
      _id: decoded._id,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Match Endpoints
app.get('/api/matches/:id', async (req, res) => {
  try {
    const match = await Match.findOne({ id: req.params.id }).lean();
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json({
      status: 'success',
      data: match
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load match' });
  }
});


// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Endpoints:`);
  console.log(`- Memes: http://localhost:${PORT}/api/memes`);
  console.log(`- Auth: http://localhost:${PORT}/api/auth`);
});