/**
 * Razorpay server-side instance helper
 * ⚠️  SERVER ONLY — never import this from client components.
 * RAZORPAY_KEY_SECRET must never have a NEXT_PUBLIC_ prefix.
 */
import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        "Razorpay keys not configured. Check NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local"
      );
    }

    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayInstance;
}
