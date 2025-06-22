import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import ErrorBoundary from './ErrorBoundary';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// GiveWP Form ID - Update this with your actual form ID
const GIVEWP_FORM_ID = '123';

const DonationFormContent: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [donationComplete, setDonationComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setMessage({ type: 'error', text: 'Stripe has not loaded yet. Please try again.' });
      return;
    }

    // Validate form data
    if (!firstName || !lastName || !email || !amount) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 1) {
      setMessage({ type: 'error', text: 'Please enter a valid donation amount.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Create payment method
      const { error: paymentError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
        params: {
          billing_details: {
            name: `${firstName} ${lastName}`,
            email: email,
          },
        },
      });

      if (paymentError) {
        setMessage({ type: 'error', text: paymentError.message || 'Payment method creation failed.' });
        setIsProcessing(false);
        return;
      }

      // Submit donation to our API
      const response = await fetch('/api/submit-donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: GIVEWP_FORM_ID,
          amount: amountValue,
          firstName: firstName,
          lastName: lastName,
          email: email,
          paymentMethodId: paymentMethod.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDonationComplete(true);
        setMessage({ 
          type: 'success', 
          text: 'Thank you for your donation! Your support helps us build stronger communities through technology.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || 'Donation processing failed. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Donation error:', error);
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (donationComplete) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h3>
        <p className="text-gray-600 mb-6">
          Your donation has been processed successfully. You should receive a confirmation email shortly.
        </p>
        <button 
          onClick={() => {
            setDonationComplete(false);
            setFirstName('');
            setLastName('');
            setEmail('');
            setAmount('');
            setMessage(null);
          }}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
        >
          Make Another Donation
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Donation Amount ($) *
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          step="0.01"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Information
        </label>
        <div className="border border-gray-300 rounded-lg p-4">
          <PaymentElement />
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isProcessing ? 'Processing...' : 'Donate Now'}
      </button>
    </form>
  );
};

const DonationForm: React.FC = () => {
  const options = {
    mode: 'payment' as const,
    amount: 2500, // $25.00 default
    currency: 'usd',
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <ErrorBoundary>
      <div className="max-w-md mx-auto">
        <Elements stripe={stripePromise} options={options}>
          <DonationFormContent />
        </Elements>
      </div>
    </ErrorBoundary>
  );
};

export default DonationForm;