const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// RFC 5322 Compliant Email Regex Validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 150;

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

      if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data types.'
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

      if (trimmedName.length > MAX_NAME_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Name must not exceed ${MAX_NAME_LENGTH} characters.`
        });
      }

      if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.'
        });
      }

      // 2. Validate password length
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
        });
      }

      if (password.length > MAX_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`
        });
      }

      // 3. Check if email already exists
      const existingUser = await userModel.findByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // 4. Hash password with bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 5. Create user record
      const userId = await userModel.create(trimmedName, trimmedEmail, hashedPassword);
      const newUser = await userModel.findById(userId);

      // 6. Generate JWT token
      const token = generateToken(userId);

      // 7. Return response (never include password or password hash)
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
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
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
