import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { formId, amount, firstName, lastName, email, paymentMethodId } = body;

    // Validate required fields
    if (!formId || !amount || !firstName || !lastName || !email || !paymentMethodId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get environment variables
    const GIVEWP_URL = import.meta.env.GIVEWP_URL;
    const GIVEWP_API_KEY = import.meta.env.GIVEWP_API_KEY;
    const GIVEWP_API_TOKEN = import.meta.env.GIVEWP_API_TOKEN;

    // For development/demo purposes, simulate a successful donation
    if (!GIVEWP_URL || !GIVEWP_API_KEY || !GIVEWP_API_TOKEN) {
      console.log('Demo mode: Simulating successful donation', {
        amount,
        firstName,
        lastName,
        email
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        donation: {
          id: `demo_${Date.now()}`,
          amount: amount,
          status: 'completed',
          message: 'Demo donation processed successfully'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare the donation payload for GiveWP
    const donationPayload = {
      give_form_id: formId,
      give_price: amount,
      give_first: firstName,
      give_last: lastName,
      give_email: email,
      payment_meta: {
        stripe_payment_method: paymentMethodId
      }
    };

    // Make request to GiveWP API with correct Basic authentication
    const giveWPResponse = await fetch(`${GIVEWP_URL}/wp-json/give-api/v2/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${GIVEWP_API_KEY}:${GIVEWP_API_TOKEN}`)}`
      },
      body: JSON.stringify(donationPayload)
    });

    if (!giveWPResponse.ok) {
      const errorText = await giveWPResponse.text();
      console.error('GiveWP API Error:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment processing failed' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const giveWPResult = await giveWPResponse.json();

    return new Response(JSON.stringify({ 
      success: true, 
      donation: giveWPResult 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Donation submission error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};