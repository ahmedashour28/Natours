/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51RNMADImsg6OerSKZGGaX1eSAIbQBw7udwL5DzcZigJqhDGggZJJ75UWtJKMs13zrDqGnFhGWmoki59gQ3rFOi6s00BWY4D3cs',
);

export const bookTour = async (tourId) => {
  try {
    // get the checkout session from the API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);

    // create checkout form
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
