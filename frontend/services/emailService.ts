import emailjs from '@emailjs/browser';

// --- EMAILJS CONFIGURATION PLACEHOLDERS ---
// Replace these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID_WELCOME = 'YOUR_WELCOME_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_UPGRADE = 'YOUR_UPGRADE_TEMPLATE_ID';
const EMAILJS_TEMPLATE_ID_EXPIRY = 'YOUR_EXPIRY_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  try {
    if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
      console.log(`[EmailJS Mock] Welcome email sent to ${userEmail} (${userName})`);
      return;
    }
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_WELCOME, {
      to_email: userEmail,
      to_name: userName,
    }, EMAILJS_PUBLIC_KEY);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};

export const sendUpgradeEmail = async (userEmail: string, userName: string) => {
  try {
    if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
      console.log(`[EmailJS Mock] Pro Upgrade receipt email sent to ${userEmail} (${userName}) for ₹999`);
      return;
    }
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_UPGRADE, {
      to_email: userEmail,
      to_name: userName,
      plan_name: 'Pro Plan',
      amount: '₹999',
    }, EMAILJS_PUBLIC_KEY);
  } catch (error) {
    console.error('Failed to send upgrade email:', error);
  }
};

export const sendExpiryEmail = async (userEmail: string, userName: string) => {
  try {
    if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
      console.log(`[EmailJS Mock] Subscription Expiry email sent to ${userEmail} (${userName})`);
      return;
    }
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_EXPIRY, {
      to_email: userEmail,
      to_name: userName,
    }, EMAILJS_PUBLIC_KEY);
  } catch (error) {
    console.error('Failed to send expiry email:', error);
  }
};
