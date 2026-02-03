// server.js - Node.js backend for Stripe Checkout
import express from 'express';
import Stripe from 'stripe';

// TODO: Replace with your actual Stripe secret key from https://dashboard.stripe.com/test/apikeys
const stripe = new Stripe('sk_test_51Sw3IiPXfOAXW8GLG5wBGREF983jCdIpIqzNGatln6dGPR1XfhlAt6MF6pxq3c4PtKhNgeATQix0yeRgrFqxPTAt00aBdRQNCy');

const app = express();

// Middleware
app.use(express.json());

// CORS middleware to allow React Native app to connect
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Create Checkout Session endpoint
app.post('/create-checkout-session', async (req, res) => {
  try {
    console.log('Creating checkout session...');

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Premium Membership',
              description: 'Monthly subscription with unlimited features',
            },
            unit_amount: 999, // Amount in cents ($9.99)
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription', // Use 'payment' for one-time payments
      // For mobile apps, you need to use a custom success URL that deep links back to your app
      // For now, we'll use a web URL - you can customize this later
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
    });

    console.log('Checkout session created:', session.id);

    // Return the session URL to redirect the customer
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint to handle Stripe events
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  // TODO: Replace with your actual webhook secret from Stripe Dashboard
  const webhookSecret = 'whsec_YOUR_WEBHOOK_SECRET_HERE';

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Payment successful:', session.id);
    
    // TODO: Fulfill the purchase (e.g., activate premium subscription)
    // You can access session.customer, session.subscription, etc.
  }

  // Handle subscription events
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    console.log('Subscription updated:', subscription.id);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    console.log('Subscription cancelled:', subscription.id);
    
    // TODO: Revoke premium access
  }

  res.json({ received: true });
});

// Success page endpoint (optional - for testing in browser)
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Payment Successful</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>✓ Payment Successful!</h1>
        <p>Thank you for subscribing to Premium Membership.</p>
        <p>Session ID: ${req.query.session_id}</p>
        <p>You can close this window and return to the app.</p>
      </body>
    </html>
  `);
});

// Cancel page endpoint (optional - for testing in browser)
app.get('/cancel', (req, res) => {
  res.send(`
    <html>
      <head><title>Payment Cancelled</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>Payment Cancelled</h1>
        <p>You can close this window and return to the app.</p>
      </body>
    </html>
  `);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          Stripe Checkout Server Running                   ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Checkout endpoint: http://localhost:${PORT}/create-checkout-session ║
║  Webhook endpoint:  http://localhost:${PORT}/webhook               ║
╚════════════════════════════════════════════════════════════╝

⚠️  IMPORTANT: Update the following in your code:
1. Replace sk_test_YOUR_SECRET_KEY_HERE with your actual Stripe secret key
2. Update API_URL in CheckoutScreen.js with your computer's IP address
3. Set up webhook secret after deploying (optional for local testing)
  `);
});