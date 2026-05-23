const express = require("express");
const crypto = require("crypto");

const router = express.Router();

router.post("/track", async (req, res) => {

  try {

    const {
      event_name,
      event_id,
      value,
      currency,
      email,
      phone
    } = req.body;

    // HASH EMAIL
    const hashedEmail = email
      ? crypto
          .createHash("sha256")
          .update(email.trim().toLowerCase())
          .digest("hex")
      : undefined;

    // HASH PHONE
    const hashedPhone = phone
      ? crypto
          .createHash("sha256")
          .update(phone.replace(/\D/g, ""))
          .digest("hex")
      : undefined;

    const payload = {

      data: [

        {

          event_name,

          event_time: Math.floor(Date.now() / 1000),

          action_source: "website",

          event_id,

          user_data: {

            em: hashedEmail,

            ph: hashedPhone,

            client_ip_address:
              req.headers["x-forwarded-for"],

            client_user_agent:
              req.headers["user-agent"],
          },

          custom_data: {

            currency: currency || "INR",

            value: value || 0,
          },
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`,
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log(data);

    res.status(200).json(data);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;