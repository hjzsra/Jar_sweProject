// ... existing code ...
/**
 * Generates a 6-digit numeric OTP.
 * @returns {string} The generated OTP.
 */
export function generateSmsOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends an OTP to a specified phone number.
 * In a real application, this would use an SMS gateway like Twilio.
 * For now, it will log the OTP to the console for simulation.
 * @param {string} phone - The recipient's phone number.
 * @param {string} otp - The OTP to send.
 */
export async function sendSmsOTP(phone: string, otp: string): Promise<void> {
  console.log(`Simulating OTP send to ${phone}: ${otp}`);
  // In a real implementation, you would have something like:
  // await twilio.messages.create({
  //   body: `Your verification code is: ${otp}`,
  //   from: 'your-twilio-number',
  //   to: phone,
  // });
}