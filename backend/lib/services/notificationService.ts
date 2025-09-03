import dbConnect from '../database/connection';
import { Notification, INotification } from '../database/schemas';
import { UserService } from './userService';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// SMS configuration (initialize only if creds exist)
let twilioClient: ReturnType<typeof twilio> | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
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
      await this.sendEmailNotification(user.email, data.title, data.message, savedNotification._id);
    }

    // Send SMS notification if requested and user has phone
    if (data.sendSMS !== false && user.phone) {
      await this.sendSMSNotification(user.phone, data.message, savedNotification._id);
    }

    return savedNotification;
  }

  static async sendEmailNotification(
    email: string,
    title: string,
    message: string,
    notificationId: string
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@esusu.app',
        to: email,
        subject: `Esusu - ${title}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Esusu</h1>
              <p style="color: white; margin: 5px 0 0 0; opacity: 0.9;">Your Decentralized Savings Platform</p>
            </div>
            
            <div style="background: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px;">${title}</h2>
              <p style="color: #374151; line-height: 1.6; margin: 0;">${message}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://esusu.app'}" 
                 style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Open Esusu App
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated message from Esusu. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      await emailTransporter.sendMail(mailOptions);

      // Update notification status
      await Notification.findByIdAndUpdate(notificationId, {
        'channels.email.sent': true,
        'channels.email.sentAt': new Date()
      });

      console.log(`✅ Email notification sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
    }
  }

  static async sendSMSNotification(
    phone: string,
    message: string,
    notificationId: string
  ): Promise<void> {
    try {
      if (!twilioClient) {
        console.log('⚠️ Twilio credentials not configured, skipping SMS');
        return;
      }

      const smsMessage = `Esusu: ${message}\n\nOpen app: ${process.env.FRONTEND_URL || 'https://esusu.app'}`;

      await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      // Update notification status
      await Notification.findByIdAndUpdate(notificationId, {
        'channels.sms.sent': true,
        'channels.sms.sentAt': new Date()
      });

      console.log(`✅ SMS notification sent to ${phone}`);
    } catch (error) {
      console.error('❌ Failed to send SMS notification:', error);
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

    return Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.offset || 0);
  }

  static async markNotificationAsRead(notificationId: string): Promise<INotification | null> {
    await dbConnect();
    
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

    await Notification.updateMany(
      { user: user._id, read: false },
      { read: true }
    );
  }

  static async getUnreadCount(walletAddress: string): Promise<number> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return 0;

    return Notification.countDocuments({
      user: user._id,
      read: false
    });
  }

  static async deleteNotification(notificationId: string): Promise<boolean> {
    await dbConnect();
    
    const result = await Notification.findByIdAndDelete(notificationId);
    return !!result;
  }

  // Automated notification triggers
  static async sendContributionReminder(groupId: string): Promise<void> {
    // This would be called by a cron job
    await dbConnect();
    
    const Group = require('../database/schemas').Group;
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
    }
  ): Promise<void> {
    if (success) {
      await this.createNotification({
        userWallet: walletAddress,
        type: 'bill_payment_success',
        title: 'Bill Payment Successful ✅',
        message: `Your ${details.type} payment of $${details.amount} to ${details.recipient} was successful.`,
        data: { 
          transactionHash: details.transactionHash,
          type: details.type,
          amount: details.amount,
          recipient: details.recipient
        }
      });
    } else {
      await this.createNotification({
        userWallet: walletAddress,
        type: 'bill_payment_failed',
        title: 'Bill Payment Failed ❌',
        message: `Your ${details.type} payment to ${details.recipient} failed. Please try again.`,
        data: { 
          type: details.type,
          amount: details.amount,
          recipient: details.recipient
        }
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
