import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  try {
    const { name, country, email, phone, productCategory, quantity, message } = await req?.json();

    // Get Resend API key from environment
    const resendApiKey = Deno?.env?.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Send email to business owner
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'hollandsefgbv@gmail.com',
        subject: `New Quote Request from ${name} - ${productCategory}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Quote Request</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Contact Information</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Country:</strong> ${country}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
            </div>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Product Details</h3>
              <p><strong>Product Category:</strong> ${productCategory}</p>
              <p><strong>Quantity:</strong> ${quantity}</p>
            </div>
            ${message ? `
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Message</h3>
              <p>${message}</p>
            </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This email was sent from your website contact form at Hollandse Facility Group B.V.
            </p>
          </div>
        `
      })
    });

    if (!emailResponse?.ok) {
      const errorData = await emailResponse?.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse?.json();

    return new Response(JSON.stringify({
      success: true,
      message: 'Email sent successfully',
      emailId: emailData.id
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
