

const { Resend } = require("resend");
const {
  orderConfirmationTemplate,
} = require("../templates/orderConfirmationTemplate");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOrderConfirmationEmail = async (order) => {
  try {
    const html = orderConfirmationTemplate(order);

    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: order.customerEmail,
      subject: `Your SHENOVA Order Has Been Confirmed ✨`,
      html,
    });

    console.log("✅ Email sent");

    return response;

  } catch (error) {
    console.error("❌ Email error:", error);
  }
};

module.exports = {
  sendOrderConfirmationEmail,
};