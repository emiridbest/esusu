import dbConnect from '../database/connection';
import { Notification, INotification, Group } from '../database/schemas';
import { UserService } from './userService';
import nodemailer from 'nodemailer';
// @ts-ignore - Optional dependency
import twilio from 'twilio';
import { config } from '../config';

// Email configuration (lazy initialization for serverless environments)
let emailTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function initializeEmailTransporter() {
  if (emailTransporter) {
    return emailTransporter;
  }

  const emailUser = config.EMAIL_USER;
  const emailPassword = config.EMAIL_PASSWORD;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailFrom = config.EMAIL_FROM || process.env.EMAIL_FROM || emailUser;

  if (!emailUser || !emailPassword) {
    console.warn('⚠️ Email credentials not configured (EMAIL_USER and EMAIL_PASSWORD required)');
    console.warn('   EMAIL_USER:', emailUser ? '***' : 'undefined');
    console.warn('   EMAIL_PASSWORD:', emailPassword ? '***' : 'undefined');
    console.warn('   Check environment variables: EMAIL_USER, EMAIL_PASSWORD');
    return null;
  }

  try {
      const baseConfig = emailService.toLowerCase() === 'smtp'
        ? {
            host: process.env.EMAIL_SMTP_HOST,
            port: process.env.EMAIL_SMTP_PORT ? Number(process.env.EMAIL_SMTP_PORT) : 587,
            secure: process.env.EMAIL_SMTP_SECURE === 'true',
            auth: {
              user: emailUser,
              pass: emailPassword
            }
          }
        : {
            service: emailService,
            auth: {
              user: emailUser,
              pass: emailPassword
            }
          };

      emailTransporter = nodemailer.createTransport(baseConfig);
    console.log('✅ Email service configured successfully');
    return emailTransporter;
  } catch (error) {
    console.error('❌ Failed to initialize email transporter:', error);
    return null;
  }
}

// SMS configuration (initialize only if creds exist and are valid)
let twilioClient: ReturnType<typeof twilio> | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC') && 
    process.env.TWILIO_AUTH_TOKEN !== 'your_twilio_auth_token') {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  console.log('✅ SMS service configured');
} else {
  console.warn('⚠️ Twilio credentials not configured, SMS notifications disabled');
}

export class NotificationService {
  static async createNotification(data: {
    userWallet: string;
    type: 'contribution_due' | 'payout_received' | 'bill_payment_success' | 'bill_payment_failed' | 'group_invitation' | 'savings_milestone';
    title: string;
    message: string;
    data?: any;
    sendEmail?: boolean;
    sendSMS?: boolean;
  }): Promise<INotification> {
    await dbConnect();

    // Get or create user
    const user = await UserService.createOrUpdateUser(data.userWallet);

    const notification = new Notification({
      user: user._id,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      channels: {
        email: { sent: false },
        sms: { sent: false },
        push: { sent: false }
      },
      read: false
    });

    const savedNotification = await notification.save();

      // Send email notification if requested and user has email
      if (data.sendEmail !== false && user.email) {
        const emailSent = await this.sendEmailNotification(
          user.email, 
          data.title, 
          data.message, 
          savedNotification._id.toString()
        );
        if (!emailSent) {
          console.warn(`Failed to send email to ${user.email}`);
        }
      }

    // Send SMS notification if requested and user has phone
    if (data.sendSMS !== false && user.phone) {
      const smsSent = await this.sendSMSNotification(user.phone, data.message, savedNotification._id.toString());
      if (!smsSent) {
        console.warn(`Failed to send SMS to ${user.phone}`);
      }
    }

    // Fetch the updated notification with correct channel status
    // @ts-ignore - Mongoose union type compatibility issue
    const updatedNotification = await Notification.findById(savedNotification._id);
    return updatedNotification || savedNotification;
  }

  static async sendEmailNotification(
    email: string,
    title: string,
    message: string,
    notificationId: string
  ): Promise<boolean> {
    try {
      // Lazy initialize email transporter (important for serverless environments)
      const transporter = initializeEmailTransporter();
      if (!transporter) {
        console.log('⚠️ Email service not configured, skipping email notification');
        return false;
      }

      const defaultFrom = config.EMAIL_FROM || process.env.EMAIL_FROM || process.env.EMAIL_USER;
      const mailOptions = {
        from: defaultFrom || 'noreply@esusuafrica.com',
        to: email,
        subject: `Esusu (Farcaster) - ${title}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="dark">
          </head>
          <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0a0d14 0%, #0e1018 50%, #0a0d14 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', 'Inter', 'Roboto', Arial, sans-serif; min-height: 100vh;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #0a0d14 0%, #0e1018 50%, #0a0d14 100%);">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #0e1018; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
                    <!-- Header with Logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #FFD100 0%, #FFE066 100%); padding: 40px 32px; text-align: center;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td align="center" style="padding-bottom: 16px;">
                              <div style="display: inline-flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center;">
                                <img src="https://www.esusuafrica.com/_next/image?url=%2Fesusu.png&w=256&q=75" 
                                     alt="Esusu" 
                                     style="width: 64px; height: 64px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); background: rgba(255, 255, 255, 0.1); padding: 8px; object-fit: contain;"
                                     onerror="this.style.display='none';">
                                <img src="https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/farcaster-1qt4vvlal5qi31fhf4ge4gt.png/farcaster-6adzrdj305mt3u4g2jbzmr.png?_a=DATAg1AAZAA0" 
                                     alt="Farcaster" 
                                     style="width: 64px; height: 64px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); background: rgba(255, 255, 255, 0.1); padding: 8px; object-fit: contain;"
                                     onerror="this.style.display='none';">
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <h1 style="color: rgba(255, 255, 255, 0.95); font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin: 0;">Esusu (Farcaster)</h1>
                              <div style="color: rgba(255, 255, 255, 0.9); font-size: 13px; font-weight: 500; letter-spacing: 0.5px; margin-top: 8px;">Decentralized Savings Platform</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px 32px; background-color: #191d26;">
                        <!-- Title with Icon -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                          <tr>
                            <td style="border-bottom: 2px solid #282c35; padding-bottom: 20px;">
                              <h1 style="color: #FFD100; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">${title}</h1>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Message -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                          <tr>
                            <td>
                              <p style="color: #d1d5db; font-size: 16px; line-height: 1.75; margin: 0; font-weight: 400;">${message}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                      <td style="padding: 0 32px 32px; background-color: #191d26; text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://farcaster-flame.vercel.app'}" 
                           style="display: inline-block; background: linear-gradient(135deg, #FFD100 0%, #FFE066 100%); color: white; padding: 16px 48px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; letter-spacing: -0.3px; box-shadow: 0 8px 24px rgba(247, 147, 26, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset; transition: all 0.2s;">
                          Open Esusu (Farcaster) App →
                        </a>
                      </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                      <td style="padding: 0 32px 32px; background-color: #191d26;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #0a0d14 0%, #0e1018 100%); border: 1px solid #282c35; border-radius: 12px; overflow: hidden;">
                          <tr>
                            <td style="padding: 24px; text-align: center;">
                              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                                <tr>
                                  <td align="center" style="padding-bottom: 12px;">
                                    <div style="display: inline-flex; align-items: center; gap: 12px;">
                                      <div style="background: linear-gradient(135deg, #0e1018 0%, #191d26 100%); border: 1px solid #FFD100; border-radius: 8px; padding: 10px 16px;">
                                        <span style="color: #FFD100; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; font-family: 'Courier New', 'Monaco', monospace;">ANTI-PHISHING</span>
                                      </div>
                                      <div style="background: linear-gradient(135deg, #0e1018 0%, #191d26 100%); border: 1px solid #10b981; border-radius: 8px; padding: 10px 16px;">
                                        <span style="color: #10b981; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; font-family: 'Courier New', 'Monaco', monospace;">🔒 SECURE</span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0;">
                                <strong>Esusu (Farcaster):</strong> This is an official email from Esusu Farcaster application. Always verify transactions in your wallet.<br>
                                <span style="color: #6b7280; font-size: 12px;">Never share your private key or recovery phrase with anyone.</span>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px; background-color: #0e1018; border-top: 1px solid #282c35; text-align: center;">
                        <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 500;">
                          © ${new Date().getFullYear()} Esusu (Farcaster). All rights reserved.
                        </p>
                        <p style="color: #4b5563; font-size: 12px; margin: 0;">
                          This is an automated message from your Esusu Farcaster application. Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email notification sent to ${email}`, { 
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      });

      // Update notification status
      // @ts-ignore - Mongoose union type compatibility issue
      await Notification.findByIdAndUpdate(notificationId, {
        'channels.email.sent': true,
        'channels.email.sentAt': new Date()
      });

      return true;
    } catch (error: any) {
      console.error('❌ Failed to send email notification:', error);
      console.error('   Error details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        message: error.message
      });
      
      // Log specific error types
      if (error.code === 'EAUTH') {
        console.error('   Authentication failed - check EMAIL_USER and EMAIL_PASSWORD');
      } else if (error.code === 'ECONNECTION') {
        console.error('   Connection failed - check network or SMTP settings');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   Connection timeout - SMTP server may be unreachable');
      }
      
      return false;
    }
  }

  static async sendSMSNotification(
    phone: string,
    message: string,
    notificationId: string
  ): Promise<boolean> {
    try {
      if (!twilioClient) {
        console.log('⚠️ Twilio credentials not configured, skipping SMS');
        return false;
      }

      const smsMessage = `Esusu: ${message}\n\nOpen app: ${process.env.FRONTEND_URL || 'https://www.esusuafrica.com'}`;

      await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      // Update notification status
      // @ts-ignore - Mongoose union type compatibility issue
      await Notification.findByIdAndUpdate(notificationId, {
        'channels.sms.sent': true,
        'channels.sms.sentAt': new Date()
      });

      console.log(`✅ SMS notification sent to ${phone}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send SMS notification:', error);
      return false;
    }
  }

  static async getUserNotifications(
    walletAddress: string,
    options: {
      unreadOnly?: boolean;
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<INotification[]> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return [];

    const query: any = { user: user._id };
    if (options.unreadOnly) query.read = false;
    if (options.type) query.type = options.type;

    // @ts-ignore - Mongoose union type compatibility issue
    return Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.offset || 0);
  }

  static async markNotificationAsRead(notificationId: string): Promise<INotification | null> {
    await dbConnect();
    
    // @ts-ignore - Mongoose union type compatibility issue
    return Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
  }

  static async markAllNotificationsAsRead(walletAddress: string): Promise<void> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return;

    // @ts-ignore - Mongoose union type compatibility issue
    await Notification.updateMany(
      { user: user._id, read: false },
      { read: true }
    );
  }

  static async getUnreadCount(walletAddress: string): Promise<number> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return 0;

    // @ts-ignore - Mongoose union type compatibility issue
    return Notification.countDocuments({
      user: user._id,
      read: false
    });
  }

  static async deleteNotification(notificationId: string): Promise<boolean> {
    await dbConnect();
    
    // @ts-ignore - Mongoose union type compatibility issue
    const result = await Notification.findByIdAndDelete(notificationId);
    return !!result;
  }

  // Automated notification triggers
  static async sendContributionReminder(groupId: string): Promise<void> {
    // This would be called by a cron job
    await dbConnect();
    
    const Group = require('../database/schemas').Group;
    // @ts-ignore - Mongoose union type compatibility issue
    const group = await Group.findById(groupId).populate('members.user');
    
    if (!group || group.status !== 'active') return;

    for (const member of group.members) {
      if (member.isActive && member.user.walletAddress) {
        await this.createNotification({
          userWallet: member.user.walletAddress,
          type: 'contribution_due',
          title: 'Contribution Reminder',
          message: `Your contribution of ${group.settings.contributionAmount} ${group.settings.contributionToken} is due for group "${group.name}"`,
          data: { groupId: group._id }
        });
      }
    }
  }

  static async sendSavingsMilestone(walletAddress: string, milestone: number): Promise<void> {
    await this.createNotification({
      userWallet: walletAddress,
      type: 'savings_milestone',
      title: 'Savings Milestone Reached! 🎉',
      message: `Congratulations! You've reached $${milestone} in total savings. Keep up the great work!`,
      data: { milestone }
    });
  }

  static async sendUtilityPaymentNotification(
    walletAddress: string,
    success: boolean,
    details: {
      type: string;
      amount: number;
      recipient: string;
      transactionHash?: string;
      paymentToken?: string;
      currency?: string;
    }
  ): Promise<INotification> {
    if (success) {
      // Format amount with proper currency symbol
      // Use currency if provided, otherwise fall back to paymentToken
      const currency = details.currency || details.paymentToken || 'USD';
      
      // Currency codes that should be displayed as-is (not with $ prefix)
      const localCurrencies = ['NGN', 'GHS', 'KES', 'UGX', 'ZAR', 'G$', 'CELO', 'cUSD', 'USDC', 'USDT'];
      
      let amountStr: string;
      if (localCurrencies.includes(currency)) {
        // For local currencies, show amount with currency code (e.g., "50 NGN", "100 KES")
        amountStr = `${details.amount.toFixed(2)} ${currency}`;
      } else {
        // For USD and other currencies, use $ prefix
        amountStr = `$${details.amount.toFixed(2)}`;
      }
      
      return await this.createNotification({
        userWallet: walletAddress,
        type: 'bill_payment_success',
        title: 'Bill Payment Successful ✅',
        message: `Your ${details.type} payment of ${amountStr} to ${details.recipient} was successful. Transaction: ${typeof details.transactionHash === 'string' ? details.transactionHash.substring(0, 10) : String(details.transactionHash || '').substring(0, 10)}...`,
        data: { 
          transactionHash: typeof details.transactionHash === 'string' ? details.transactionHash : String(details.transactionHash || ''),
          type: details.type,
          amount: details.amount,
          recipient: details.recipient,
          paymentToken: details.paymentToken
        },
        sendEmail: true, // Explicitly send email
        sendSMS: true    // Explicitly send SMS
      });
    } else {
      return await this.createNotification({
        userWallet: walletAddress,
        type: 'bill_payment_failed',
        title: 'Bill Payment Failed ❌',
        message: `Your ${details.type} payment to ${details.recipient} failed. Please try again.`,
        data: { 
          type: details.type,
          amount: details.amount,
          recipient: details.recipient
        },
        sendEmail: true, // Explicitly send email
        sendSMS: true    // Explicitly send SMS
      });
    }
  }

  // Bulk notification system for important updates
  static async sendBulkNotification(
    userWallets: string[],
    notification: {
      type: 'contribution_due' | 'payout_received' | 'bill_payment_success' | 'bill_payment_failed' | 'group_invitation' | 'savings_milestone';
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<void> {
    const promises = userWallets.map(wallet => 
      this.createNotification({
        userWallet: wallet,
        ...notification
      })
    );

    await Promise.allSettled(promises);
    console.log(`📢 Bulk notification sent to ${userWallets.length} users`);
  }
}
