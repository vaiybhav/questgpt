import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Admin-only route to manually trigger a notification email (for testing)
export async function POST() {
  try {
    // You might want to add authentication here in a real application
    // This is for demonstration purposes and should be protected
    
    console.log("Testing email notification endpoint");
    
    // Check if email configuration is present
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.error("Email configuration missing in environment variables");
      return NextResponse.json(
        { 
          error: 'Email configuration missing',
          details: 'EMAIL_USER and/or EMAIL_APP_PASSWORD not set in .env file'
        },
        { status: 500 }
      );
    }
    
    console.log(`Creating email transporter with user: ${process.env.EMAIL_USER}`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });

    console.log("Preparing test email");
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'vaiybhavc@gmail.com',
      subject: '⚠️ QuestGPT: Test Notification',
      text: `This is a test notification from QuestGPT. If you're seeing this, the email notification system is working correctly.`,
      html: `
        <h2>⚠️ QuestGPT Test Notification</h2>
        <p>This is a test notification from QuestGPT.</p>
        <p>If you're seeing this, the email notification system is working correctly.</p>
      `
    };
    
    // Send email with detailed logging
    const info = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email send error:', error);
          reject(error);
        } else {
          console.log('Test email sent successfully:', info.response);
          resolve(info);
        }
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test notification email sent successfully',
      info
    });
    
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send test notification', 
        details: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 