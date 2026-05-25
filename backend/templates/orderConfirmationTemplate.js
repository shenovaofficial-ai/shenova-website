export const orderConfirmationTemplate = (order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #eee;">
          <div style="font-size:16px;font-weight:600;">
            ${item.name}
          </div>

          <div style="font-size:14px;color:#666;margin-top:5px;">
            Size: ${item.size}
          </div>

          <div style="font-size:14px;color:#666;">
            Qty: ${item.quantity}
          </div>
        </td>

        <td align="right" style="padding:14px 0;border-bottom:1px solid #eee;">
          ₹${item.price}
        </td>
      </tr>
    `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <body style="
    margin:0;
    padding:0;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
  ">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 15px;">

        <table width="620" cellpadding="0" cellspacing="0"
        style="
          background:#fff;
          border-radius:22px;
          overflow:hidden;
        ">

          <tr>
            <td style="
              padding:45px 40px 20px;
              text-align:center;
            ">

              <div style="
                font-size:34px;
                letter-spacing:8px;
                font-weight:700;
                color:#111;
              ">
                SHENOVA
              </div>

              <div style="
                margin-top:12px;
                color:#777;
                font-size:14px;
                letter-spacing:2px;
              ">
                LUXURY FASHION
              </div>

            </td>
          </tr>

          <tr>
            <td style="padding:10px 40px 25px;">

              <div style="
                font-size:30px;
                font-weight:700;
                color:#111;
              ">
                Order Confirmed ✨
              </div>

              <div style="
                margin-top:18px;
                color:#555;
                font-size:16px;
                line-height:1.8;
              ">
                Hi ${order.customerName},
                <br/><br/>
                Thank you for shopping with SHENOVA.
                Your order has been successfully confirmed.
              </div>

            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 20px;">

              <table width="100%"
              style="
                background:#fafafa;
                border-radius:18px;
                padding:22px;
              ">

                <tr>
                  <td style="padding-bottom:12px;">
                    <div style="font-size:13px;color:#777;">
                      ORDER ID
                    </div>

                    <div style="
                      margin-top:6px;
                      font-size:18px;
                      font-weight:700;
                      color:#111;
                    ">
                      ${order.orderId}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:12px;">
                    <div style="font-size:13px;color:#777;">
                      PAYMENT STATUS
                    </div>

                    <div style="
                      margin-top:8px;
                      display:inline-block;
                      background:#ebf7ef;
                      color:#1f7a45;
                      padding:8px 14px;
                      border-radius:999px;
                      font-size:13px;
                      font-weight:700;
                    ">
                      PAID
                    </div>
                  </td>
                </tr>

                <tr>
                  <td>
                    <div style="font-size:13px;color:#777;">
                      DELIVERY ESTIMATE
                    </div>

                    <div style="
                      margin-top:8px;
                      font-size:16px;
                      font-weight:600;
                    ">
                      3-7 Business Days
                    </div>
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 10px;">

              <div style="
                font-size:21px;
                font-weight:700;
                margin-bottom:18px;
              ">
                Order Summary
              </div>

              <table width="100%">
                ${itemsHtml}
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;">

              <table width="100%">
                <tr>
                  <td style="font-size:16px;color:#555;">
                    Total Paid
                  </td>

                  <td align="right"
                  style="
                    font-size:24px;
                    font-weight:700;
                    color:#111;
                  ">
                    ₹${order.totalAmount}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:10px 40px 30px;">

              <div style="
                font-size:20px;
                font-weight:700;
                margin-bottom:14px;
              ">
                Shipping Address
              </div>

              <div style="
                color:#555;
                line-height:1.8;
                font-size:15px;
              ">
                ${order.shippingAddress}
              </div>

            </td>
          </tr>

          <tr>
            <td style="
              padding:30px 40px;
              text-align:center;
            ">

              <a href="${process.env.FRONTEND_URL}"
              style="
                display:inline-block;
                background:#111;
                color:#fff;
                text-decoration:none;
                padding:16px 32px;
                border-radius:999px;
                font-weight:600;
                font-size:14px;
              ">
                Continue Shopping
              </a>

            </td>
          </tr>

          <tr>
            <td style="
              padding:35px;
              background:#fafafa;
              text-align:center;
            ">

              <div style="
                font-size:16px;
                font-weight:700;
                color:#111;
              ">
                Need Help?
              </div>

              <div style="
                margin-top:12px;
                color:#666;
                line-height:1.8;
                font-size:14px;
              ">
                ${process.env.SUPPORT_EMAIL}
                <br/>
                ${process.env.SUPPORT_PHONE}
              </div>

              <div style="
                margin-top:24px;
                color:#999;
                font-size:13px;
              ">
                Confirmed → Processing → Preparing for Shipment
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

  </body>
  </html>
  `;
};