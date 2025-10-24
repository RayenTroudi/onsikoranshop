import nodemailer from 'nodemailer';

export default async ({ req, res, log, error }) => {
  // Handle CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
  
  // Set CORS headers
  res.headers = {
    'Access-Control-Allow-Origin': allowedOrigins,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Appwrite-Project, X-Appwrite-Response-Format',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.send('', 200);
  }

  try {
    // Parse request body
    const emailData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    log('📧 Received email request:', JSON.stringify(emailData));

    // Get SMTP configuration from environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    };

    // Create transporter
    const transporter = nodemailer.createTransport(smtpConfig);

    // Prepare email content
    const itemsList = emailData.items
      .map(item => `• ${item.name} x ${item.quantity} = ${item.total.toFixed(2)} TND`)
      .join('\n');

    const shippingInfo = emailData.shippingAddress;
    const fullAddress = `${shippingInfo.name}\n${shippingInfo.address}\n${shippingInfo.city}, ${shippingInfo.postalCode}\n${shippingInfo.country}\nPhone: ${shippingInfo.phone}`;

    // Send customer confirmation email
    const customerEmail = {
      from: `"ONSi Shop" <${process.env.SMTP_USERNAME}>`,
      to: emailData.to,
      subject: `Order Confirmation - ${emailData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Thank You for Your Order! 🎉</h2>
          
          <p>Dear ${emailData.customerName},</p>
          
          <p>Thank you for your order! We're excited to prepare your ONSi Quranic Verses Box.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #334155; margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${emailData.orderNumber}</p>
            <p><strong>Order Date:</strong> ${emailData.orderDate}</p>
            
            <h4 style="color: #334155;">Items:</h4>
            <pre style="font-family: monospace; white-space: pre-wrap;">${itemsList}</pre>
            
            <h4 style="color: #334155; margin-top: 20px;">Total: ${emailData.totalAmount.toFixed(2)} TND</h4>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #334155; margin-top: 0;">Shipping Address:</h4>
            <pre style="font-family: monospace; white-space: pre-wrap;">${fullAddress}</pre>
          </div>
          
          <p>We'll contact you shortly to confirm your order and arrange delivery.</p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>The ONSi Team</strong></p>
        </div>
      `
    };

    await transporter.sendMail(customerEmail);
    log('✅ Customer email sent to:', emailData.to);

    // Send admin notification email
    const adminEmail = {
      from: `"ONSi Shop" <${process.env.SMTP_USERNAME}>`,
      to: process.env.SUBMIT_EMAIL || process.env.SMTP_USERNAME,
      subject: `New Order Received - ${emailData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🔔 New Order Received!</h2>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">Order Information</h3>
            <p><strong>Order Number:</strong> ${emailData.orderNumber}</p>
            <p><strong>Order Date:</strong> ${emailData.orderDate}</p>
            <p><strong>Customer:</strong> ${emailData.customerName}</p>
            <p><strong>Email:</strong> ${emailData.to}</p>
            <p><strong>Phone:</strong> ${shippingInfo.phone}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #334155; margin-top: 0;">Items Ordered:</h4>
            <pre style="font-family: monospace; white-space: pre-wrap;">${itemsList}</pre>
            <h4 style="color: #334155; margin-top: 20px;">Total: ${emailData.totalAmount.toFixed(2)} TND</h4>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #334155; margin-top: 0;">Shipping Address:</h4>
            <pre style="font-family: monospace; white-space: pre-wrap;">${fullAddress}</pre>
          </div>
          
          <p><strong>Action Required:</strong> Contact the customer to confirm the order and arrange delivery.</p>
        </div>
      `
    };

    await transporter.sendMail(adminEmail);
    log('✅ Admin email sent to:', process.env.SUBMIT_EMAIL);

    return res.json({
      success: true,
      message: 'Emails sent successfully',
      orderNumber: emailData.orderNumber
    });

  } catch (err) {
    error('❌ Error sending emails:', err);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
