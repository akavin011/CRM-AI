import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  }
});

export class AuthService {
  // Generate JWT token
  static generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate refresh token
  static generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Register new user
  static async register(userData) {
    try {
      const { email, password, firstName, lastName, organization, role = 'viewer' } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        organization,
        role,
        emailVerificationToken
      });

      // Send verification email (skip in development if SMTP not configured)
      try {
        await this.sendVerificationEmail(user.email, emailVerificationToken);
      } catch (emailError) {
        console.log('Email verification skipped (SMTP not configured):', emailError.message);
        // In development, mark email as verified if SMTP is not configured
        if (process.env.NODE_ENV !== 'production') {
          user.emailVerified = true;
          await user.save();
        }
      }

      // Generate tokens
      const token = this.generateToken({ 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      });
      const refreshToken = this.generateRefreshToken({ 
        userId: user.id, 
        email: user.email 
      });

      return {
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  // Login user
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await user.update({ lastLogin: new Date() });

      // Generate tokens
      const token = this.generateToken({ 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      });
      const refreshToken = this.generateRefreshToken({ 
        userId: user.id, 
        email: user.email 
      });

      return {
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  // Refresh token
  static async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      const newToken = this.generateToken({ 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      });

      return { token: newToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Forgot password
  static async forgotPassword(email) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('User not found');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      await this.sendPasswordResetEmail(user.email, resetToken);

      return { message: 'Password reset email sent' };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    try {
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            [User.sequelize.Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      await user.update({
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  // Verify email
  static async verifyEmail(token) {
    try {
      const user = await User.findOne({
        where: { emailVerificationToken: token }
      });

      if (!user) {
        throw new Error('Invalid verification token');
      }

      await user.update({
        emailVerified: true,
        emailVerificationToken: null
      });

      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  // Get user profile
  static async getProfile(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user.toJSON();
    } catch (error) {
      throw new Error(`Profile fetch failed: ${error.message}`);
    }
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive fields
      const { password, email, role, ...allowedUpdates } = updateData;
      
      await user.update(allowedUpdates);
      return user.toJSON();
    } catch (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      await user.update({ password: newPassword });
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  // Send verification email
  static async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@yourcrm.com',
      to: email,
      subject: 'Verify Your Email - AI CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to AI CRM!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
          <p>If the button doesn't work, copy and paste this link: ${verificationUrl}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }

  // Send password reset email
  static async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@yourcrm.com',
      to: email,
      subject: 'Reset Your Password - AI CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to reset it.</p>
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link: ${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  }
}
