import { Resend } from "resend";
import { orderConfirmationTemplate } from "../templates/orderConfirmationTemplate.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOrderConfirmationEmail = async (order) => {
  try {
    console.log("📧 Starting confirmation email...");

    const html = orderConfirmationTemplate(order);

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: order.customerEmail,
      subject: `Your SHENOVA Order Has Been Confirmed ✨`,
      html,
    });

    console.log("✅ Email sent:", response);

    return response;
  } catch (error) {
    console.error("❌ Email failed:", error);
    throw error;
  }
};