const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'expenseflow_super_secret_jwt_key_2026',
    { expiresIn: '7d' }
  );
};

const authController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // 1. Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields: name, email, and password.'
        });
      }

      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty.'
        });
      }

      // 2. Validate email format
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.'
        });
      }

      // 3. Validate password length
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
        });
      }

      // 4. Check if email already exists
      const existingUser = await userModel.findByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // 5. Hash password with bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 6. Create user record
      const userId = await userModel.create(trimmedName, trimmedEmail, hashedPassword);
      const newUser = await userModel.findById(userId);

      // 7. Generate JWT token
      const token = generateToken(userId);

      // 8. Return response (never include password or password hash)
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: newUser
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // 1. Validate inputs
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both email and password.'
        });
      }

      const trimmedEmail = email.trim().toLowerCase();

      // 2. Find user by email
      const user = await userModel.findByEmail(trimmedEmail);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // 3. Compare password hash using bcrypt
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // 4. Generate JWT token
      const token = generateToken(user.id);

      // 5. Return safe user data (exclude password hash)
      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      };

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: safeUser
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/auth/me (Protected route)
  async getMe(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        message: 'User profile fetched successfully',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
