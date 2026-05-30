import { env } from "../config/env";

const baseStyle = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #f9f9f9;
  padding: 40px 20px;
`;

const cardStyle = `
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;

const headerStyle = `
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 32px 40px;
  text-align: center;
`;

const bodyStyle = `
  padding: 40px;
  color: #374151;
  line-height: 1.6;
`;

const buttonStyle = `
  display: inline-block;
  background: #e91e8c;
  color: #ffffff !important;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin: 24px 0;
`;

const footerStyle = `
  padding: 24px 40px;
  background: #f3f4f6;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
`;

const logo = `
  <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:1px;">
    Shine Bright ✨
  </h1>
`;

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export const welcomeEmailHtml = (name: string): string => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Welcome, ${name}! 🎉</h2>
      <p>Thank you for joining <strong>Shine Bright</strong> — your go-to destination for premium beauty & skincare.</p>
      <p>Your account is all set. Explore our latest products and find your perfect glow!</p>
      <div style="text-align:center;">
        <a href="${env.CLIENT_URL}" style="${buttonStyle}">Shop Now</a>
      </div>
      <p style="color:#6b7280; font-size:14px;">If you didn't create this account, please ignore this email.</p>
    </div>
    <div style="${footerStyle}">
      &copy; ${new Date().getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
export const verificationEmailHtml = (name: string, url: string): string => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Verify your email address</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Click the button below to verify your email address and activate your Shine Bright account.</p>
      <div style="text-align:center;">
        <a href="${url}" style="${buttonStyle}">Verify Email</a>
      </div>
      <p style="color:#6b7280; font-size:13px;">
        This link expires in <strong>24 hours</strong>. If you didn't create a Shine Bright account, you can safely ignore this email.
      </p>
      <p style="color:#6b7280; font-size:12px; word-break:break-all;">
        Or copy this URL: <a href="${url}" style="color:#e91e8c;">${url}</a>
      </p>
    </div>
    <div style="${footerStyle}">
      &copy; ${new Date().getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────────────────────────────────────────
export const passwordResetEmailHtml = (name: string, url: string): string => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Reset your password</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <div style="text-align:center;">
        <a href="${url}" style="${buttonStyle}">Reset Password</a>
      </div>
      <p style="color:#6b7280; font-size:13px;">
        This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email — your account is safe.
      </p>
      <p style="color:#6b7280; font-size:12px; word-break:break-all;">
        Or copy this URL: <a href="${url}" style="color:#e91e8c;">${url}</a>
      </p>
    </div>
    <div style="${footerStyle}">
      &copy; ${new Date().getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CONFIRMATION
// ─────────────────────────────────────────────────────────────────────────────
export const orderConfirmationEmailHtml = (
  name: string,
  orderNumber: string,
  total: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Order Confirmed! 🎊</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your order has been successfully placed. Here's your summary:</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr>
          <td style="padding:10px 0; color:#6b7280; font-size:14px;">Order Number</td>
          <td style="padding:10px 0; font-weight:600; text-align:right;">${orderNumber}</td>
        </tr>
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:10px 0; color:#6b7280; font-size:14px;">Total Amount</td>
          <td style="padding:10px 0; font-weight:700; color:#e91e8c; text-align:right;">৳${total}</td>
        </tr>
      </table>
      <div style="text-align:center;">
        <a href="${env.CLIENT_URL}/orders" style="${buttonStyle}">Track Order</a>
      </div>
      <p style="color:#6b7280; font-size:14px;">
        Thank you for shopping with Shine Bright. We'll notify you when your order is on its way!
      </p>
    </div>
    <div style="${footerStyle}">
      &copy; ${new Date().getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
