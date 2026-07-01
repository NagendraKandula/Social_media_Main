export const getPasswordResetEmail = (otp: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
    <h2 style="color: #1f2937;">Password Reset Request</h2>
    <p style="color: #4b5563;">Use the following security code to verify your identity. This token is strictly confidential.</p>
    <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 4px;">${otp}</span>
    </div>
    <p style="color: #9ca3af; font-size: 12px;">This code expires in 10 minutes. If you did not make this request, please secure your account credentials immediately.</p>
  </div>
`;