export default async ({ req, res, log, error }) => {
  // Handle CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
  
  res.headers = {
    'Access-Control-Allow-Origin': allowedOrigins,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Appwrite-Project',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.send('', 200);
  }

  try {
    // Appwrite function receives body as a string, need to parse it
    log('📧 Request received');
    log('📧 Body type:', typeof req.body);
    log('📧 Body length:', req.body?.length || 0);
    log('📧 Body content:', req.body ? req.body.substring(0, 200) : 'empty');
    
    let emailData;
    
    // Handle different body formats
    if (!req.body || req.body === '') {
      throw new Error('Request body is empty');
    }
    
    if (typeof req.body === 'string') {
      try {
        emailData = JSON.parse(req.body);
      } catch (parseError) {
        log('❌ JSON parse error:', parseError.message);
        log('❌ Body was:', req.body);
        throw new Error(`Invalid JSON in request body: ${parseError.message}`);
      }
    } else {
      emailData = req.body;
    }
    
    log('📧 Email data parsed successfully');
    log('📧 Email data keys:', Object.keys(emailData).join(', '));
    
    // Parse items if it's a string
    if (typeof emailData.items === 'string') {
      try {
        emailData.items = JSON.parse(emailData.items);
        log('✅ Parsed items from string to array');
      } catch (e) {
        log('❌ Failed to parse items:', e.message);
        emailData.items = [];
      }
    }
    
    log('📧 Order number:', emailData.orderNumber);
    log('📧 Items count:', emailData.items?.length || 0);

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || 'onsmaitii@gmail.com';

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Extract customer info
    const customerInfo = emailData.customerInfo || {};
    const customerName = customerInfo.name || emailData.customerName || 'Customer';
    const customerEmail = customerInfo.email || emailData.customerEmail;
    const customerPhone = customerInfo.phone || emailData.customerPhone;
    
    log('📧 Customer email:', customerEmail);
    log('📧 Customer name:', customerName);
    
    // Build shipping address
    const shippingAddress = emailData.shippingAddress || 
      `${customerInfo.address || ''}<br>
      ${customerInfo.city || ''}, ${customerInfo.postalCode || ''}<br>
      ${customerInfo.governorate || customerInfo.city || ''}<br>
      ${customerInfo.country || ''}`;

    // Format items list
    const itemsList = (emailData.items || [])
      .map(item => `• ${item.name || item.nameAr || 'Product'} x ${item.quantity} = ${(item.total || 0).toFixed(2)} TND`)
      .join('\n');
    
    log('📧 Items list created, length:', itemsList.length);

    const orderDate = new Date(emailData.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Customer email HTML
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .items { margin: 15px 0; white-space: pre-line; }
          .total { font-size: 1.2em; font-weight: bold; color: #1e293b; margin-top: 15px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Confirmed!</h1>
            <p>Thank you for your order, ${customerName}!</p>
          </div>
          <div class="content">
            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> ${emailData.orderNumber}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              <div class="items">
                <h3>Items:</h3>
                ${itemsList}
              </div>
              <p class="total">Total: ${(emailData.total || 0).toFixed(2)} TND</p>
              <h3>Shipping Address:</h3>
              <p>${shippingAddress}</p>
            </div>
            <div class="footer">
              <p>We'll process your order shortly and keep you updated.</p>
              <p>© 2025 ONSi Koran Shop. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Admin email HTML
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .items { margin: 15px 0; white-space: pre-line; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Order Received!</h1>
          </div>
          <div class="content">
            <div class="order-details">
              <h2>Order #${emailData.orderNumber}</h2>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Email:</strong> ${customerEmail}</p>
              <p><strong>Phone:</strong> ${customerPhone}</p>
              <p><strong>Date:</strong> ${orderDate}</p>
              <h3>Items:</h3>
              <div class="items">${itemsList}</div>
              <p><strong>Total:</strong> ${(emailData.total || 0).toFixed(2)} TND</p>
              <h3>Shipping Address:</h3>
              <p>${shippingAddress}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send customer email
    log('Sending customer email to:', customerEmail);
    const customerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ONSi Koran Shop <noreply@onsi.shop>',
        to: [customerEmail],
        subject: `Order Confirmation - ${emailData.orderNumber}`,
        html: customerEmailHtml
      })
    });

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      error('❌ Customer email failed:', errorText);
      throw new Error(`Customer email failed: ${errorText}`);
    }

    const customerResult = await customerResponse.json();
    log('✅ Customer email sent:', customerResult.id);

    // Send admin notification
    log('Sending admin notification to:', adminEmail);
    const adminResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ONSi Koran Shop <orders@onsi.shop>',
        to: [adminEmail],
        subject: `New Order: ${emailData.orderNumber}`,
        html: adminEmailHtml
      })
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      error('⚠️ Admin email failed:', errorText);
    } else {
      const adminResult = await adminResponse.json();
      log('✅ Admin email sent:', adminResult.id);
    }

    return res.json({
      success: true,
      message: 'Emails sent successfully',
      customerEmailId: customerResult.id
    }, 200);

  } catch (err) {
    error('❌ Function error:', err.message);
    error('❌ Error stack:', err.stack);
    
    // Return proper JSON error response
    return res.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, 500);
  }
};