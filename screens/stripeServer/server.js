const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.stripePublishableKey;
const STRIPE_SECRET_KEY =
  Constants.expoConfig?.extra?.stripeSecretKey;

const stripe = require('stripe')(STRIPE_SECRET_KEY);
// This example sets up an endpoint using the Express framework.

app.post('/payment-sheet', async (req, res) => {
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create(stripeAccount:'{{CONNECTED_ACCOUNT_ID}}');
  const customerSession = await stripe.customerSessions.create({
    customer: customer.id,
    components: {
      mobile_payment_element: {
        enabled: true,
        features: {
          payment_method_save: 'enabled',
          payment_method_redisplay: 'enabled',
          payment_method_remove: 'enabled'
        }
      },
    },
  });
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1099,
    currency: 'eur',
    customer: customer.id,
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter
    // is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    customerSessionClientSecret: customerSession.client_secret,
    customer: customer.id,
    publishableKey: STRIPE_PUBLISHABLE_KEY
  });
});