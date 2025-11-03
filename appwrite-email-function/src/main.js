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

    // Validate required fields
    if (!emailData || !emailData.to || !emailData.items) {
      throw new Error('Missing required fields: to, items');
    }

    // Validate required environment variables
    if (!process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD || !process.env.SUBMIT_EMAIL) {
      throw new Error('Missing required environment variables: SMTP_USERNAME, SMTP_PASSWORD, or SUBMIT_EMAIL');
    }

    // Get SMTP configuration from environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    };

    log('🔧 SMTP Config:', {
      host: smtpConfig.host,
      user: smtpConfig.auth.user,
      submitEmail: process.env.SUBMIT_EMAIL
    });

    // Create transporter
    const transporter = nodemailer.createTransport(smtpConfig);
    
    // Verify connection
    await transporter.verify();
    log('✅ SMTP connection verified successfully');

    // Prepare email content with safe access
    const itemsList = emailData.items
      .map(item => {
        const itemName = item.name || item.nameAr || 'Item';
        const itemQty = item.quantity || 1;
        const itemTotal = item.total || item.price || 0;
        return `• ${itemName} x ${itemQty} = ${itemTotal.toFixed(2)} TND`;
      })
      .join('\n');

    // Handle both shippingAddress and shippingInfo for flexibility
    const shipping = emailData.shippingAddress || emailData.shippingInfo || {};
    
    // Build customer name
    const customerName = emailData.customerName || 
                        (shipping.firstName && shipping.lastName ? `${shipping.firstName} ${shipping.lastName}` : null) ||
                        shipping.name || 
                        'Valued Customer';
    
    // Build full address safely
    const addressParts = [];
    if (shipping.name || (shipping.firstName && shipping.lastName)) {
      addressParts.push(shipping.name || `${shipping.firstName} ${shipping.lastName}`);
    }
    if (shipping.address) addressParts.push(shipping.address);
    if (shipping.city && shipping.postalCode) {
      addressParts.push(`${shipping.city}, ${shipping.postalCode}`);
    } else if (shipping.city) {
      addressParts.push(shipping.city);
    }
    if (shipping.governorate) addressParts.push(shipping.governorate);
    if (shipping.country) addressParts.push(shipping.country);
    if (shipping.phone) addressParts.push(`Phone: ${shipping.phone}`);
    
    const fullAddress = addressParts.length > 0 ? addressParts.join('\n') : 'No address provided';
    
    // Get order details with defaults
    const orderNumber = emailData.orderNumber || `ORDER-${Date.now()}`;
    const orderDate = emailData.orderDate || new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const totalAmount = emailData.totalAmount || emailData.total || 0;

    // Send customer confirmation email
    const customerEmail = {
      from: `"ONSi - Quranic Verses Box" <${process.env.SMTP_USERNAME}>`,
      to: emailData.to,
      subject: `✅ Order Confirmation - ${orderNumber} | تأكيد الطلب`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #d97706 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🕌 ONSi</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Quranic Verses Box</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Thank You for Your Order! 🎉</h2>
              <h2 style="color: #1e293b; margin: 0 0 30px 0; font-size: 18px; direction: rtl; text-align: right;">شكراً لك على طلبك! 🎉</h2>
              
              <p style="color: #475569; line-height: 1.6; margin: 0 0 15px 0;">Dear ${customerName},</p>
              <p style="color: #475569; line-height: 1.6; margin: 0 0 30px 0;">Thank you for your order! We're excited to prepare your ONSi Quranic Verses Box. Your spiritual journey with divine verses is about to begin.</p>
              
              <!-- Order Details -->
              <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #d97706;">
                <h3 style="color: #334155; margin: 0 0 20px 0; font-size: 20px;">📦 Order Details</h3>
                <div style="margin-bottom: 15px;">
                  <span style="color: #64748b; font-weight: 600;">Order Number:</span> 
                  <span style="color: #1e293b; font-weight: bold;">${orderNumber}</span>
                </div>
                <div style="margin-bottom: 20px;">
                  <span style="color: #64748b; font-weight: 600;">Order Date:</span> 
                  <span style="color: #1e293b;">${orderDate}</span>
                </div>
                
                <h4 style="color: #334155; margin: 20px 0 10px 0;">Items Ordered:</h4>
                <div style="background-color: white; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; border: 1px solid #e2e8f0;">${itemsList}</div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #d97706;">
                  <span style="color: #1e293b; font-size: 18px; font-weight: bold;">💰 Total: ${totalAmount.toFixed(2)} TND</span>
                </div>
              </div>
              
              <!-- Shipping Address -->
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #334155; margin: 0 0 15px 0;">🚚 Shipping Address:</h4>
                <div style="background-color: white; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; border: 1px solid #e2e8f0;">${fullAddress}</div>
              </div>
              
              <!-- Next Steps -->
              <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #10b981;">
                <h4 style="color: #065f46; margin: 0 0 10px 0;">✨ What's Next?</h4>
                <p style="color: #047857; margin: 0; line-height: 1.6;">We'll contact you shortly to confirm your order and arrange delivery. Your beautifully crafted Quranic verses will be prepared with care and love.</p>
              </div>
              
              <p style="color: #475569; line-height: 1.6; margin: 30px 0 0 0;">If you have any questions, please don't hesitate to contact us at <a href="mailto:${process.env.SUBMIT_EMAIL}" style="color: #d97706; text-decoration: none;">${process.env.SUBMIT_EMAIL}</a></p>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #64748b; margin: 0;">Best regards,</p>
                <p style="color: #1e293b; font-weight: bold; margin: 5px 0 20px 0;">The ONSi Team 🕌</p>
                <p style="color: #64748b; font-size: 14px; margin: 0;">May these verses bring peace to your heart</p>
                <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0; direction: rtl;">عسى أن تجلب هذه الآيات السلام إلى قلبك</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send customer email with error handling
    try {
      const customerResult = await transporter.sendMail(customerEmail);
      log('✅ Customer email sent successfully:', {
        to: emailData.to,
        messageId: customerResult.messageId,
        orderNumber: orderNumber
      });
    } catch (customerError) {
      error('❌ Failed to send customer email:', customerError);
      // Continue to admin email even if customer email fails
    }

    // Send admin notification email
    const adminEmail = {
      from: `"ONSi Order System" <${process.env.SMTP_USERNAME}>`,
      to: process.env.SUBMIT_EMAIL || process.env.SMTP_USERNAME,
      subject: `🛒 New Order Alert - ${orderNumber} | طلب جديد`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Alert</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">🔔 New Order Alert</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">ONSi Order Management System</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background-color: #fef2f2; padding: 25px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 30px;">
                <h2 style="color: #991b1b; margin: 0 0 20px 0; font-size: 22px;">📋 Order Summary</h2>
                
                <div style="margin-bottom: 25px;">
                  <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #7f1d1d; font-weight: 600;">Order Number: </span>
                    <span style="color: #991b1b; font-weight: bold;">${orderNumber}</span>
                  </div>
                  <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #7f1d1d; font-weight: 600;">Customer Name: </span>
                    <span style="color: #991b1b;">${customerName}</span>
                  </div>
                  <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #7f1d1d; font-weight: 600;">Email: </span>
                    <span style="color: #991b1b;"><a href="mailto:${emailData.to}" style="color: #991b1b; text-decoration: none;">${emailData.to}</a></span>
                  </div>
                  <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #7f1d1d; font-weight: 600;">Phone: </span>
                    <span style="color: #991b1b;">${shipping.phone || 'Not provided'}</span>
                  </div>
                  <div style="padding: 8px 0; border-bottom: 1px solid #fecaca;">
                    <span style="color: #7f1d1d; font-weight: 600;">Order Date: </span>
                    <span style="color: #991b1b;">${orderDate}</span>
                  </div>
                </div>
                
                <h3 style="color: #991b1b; margin: 25px 0 15px 0;">🛍️ Items Ordered:</h3>
                <div style="background-color: white; padding: 20px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; border: 1px solid #fecaca; font-size: 14px;">${itemsList}</div>
                
                <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #dc2626; text-align: center;">
                  <span style="color: #7f1d1d; font-size: 20px; font-weight: bold;">💰 Total Amount: ${totalAmount.toFixed(2)} TND</span>
                </div>
              </div>
              
              <!-- Shipping Information -->
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #334155; margin: 0 0 15px 0;">🚚 Shipping Address:</h3>
                <div style="background-color: white; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; border: 1px solid #e2e8f0; font-size: 14px;">${fullAddress}</div>
              </div>
              
              <!-- Action Required -->
              <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #f59e0b; margin-bottom: 25px;">
                <h4 style="color: #92400e; margin: 0 0 10px 0;">⚡ Action Required</h4>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Process this order in your fulfillment system</li>
                  <li>Contact the customer to confirm delivery details</li>
                  <li>Prepare the Quranic verses box with care</li>
                  <li>Update order status and tracking information</li>
                </ul>
              </div>
              
              <!-- Quick Actions -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; margin: 0 0 15px 0;">Quick Actions:</p>
                <a href="mailto:${emailData.to}?subject=Order ${orderNumber} - Confirmation" style="display: inline-block; background-color: #d97706; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 0 10px; font-weight: 600;">📧 Email Customer</a>
                <a href="tel:${shipping.phone || ''}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 0 10px; font-weight: 600;">📞 Call Customer</a>
              </div>
              
              <div style="margin-top: 30px; text-align: center;">
                <p style="color: #64748b; font-size: 14px; margin: 0;">ONSi Order Management System</p>
                <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Spreading the divine word, one order at a time 🕌</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send admin email with error handling
    try {
      const adminResult = await transporter.sendMail(adminEmail);
      log('✅ Admin email sent successfully:', {
        to: process.env.SUBMIT_EMAIL,
        messageId: adminResult.messageId,
        orderNumber: orderNumber
      });
    } catch (adminError) {
      error('❌ Failed to send admin email:', adminError);
    }

    return res.json({
      success: true,
      message: 'Order emails processed successfully',
      orderNumber: orderNumber,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    error('❌ Critical error in email function:', err);
    return res.json({
      success: false,
      error: 'Failed to process order emails',
      details: err.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
};
