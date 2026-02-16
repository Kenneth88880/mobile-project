require('dotenv').config();
const express = require("express");
const app = express();
app.use(express.json());

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.post("/payment-sheet", async (req, res) => {
  try {
    const customer = await stripe.customers.create();
    const customerSession = await stripe.customerSessions.create({
      customer: customer.id,
      components: {
        mobile_payment_element: {
          enabled: true,
          features: {
            payment_method_save: "enabled",
            payment_method_redisplay: "enabled",
            payment_method_remove: "enabled",
          },
        },
      },
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 999,
      currency: "cad",
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      customerSessionClientSecret: customerSession.client_secret,
      customer: customer.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});