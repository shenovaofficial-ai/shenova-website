router.post('/generate', async (req, res) => {

  try {

    const random = Math.floor(1000 + Math.random() * 9000);

    const code = `SHENOVA${random}`;

    const coupon = await Coupon.create({
      code,
      discount: 20
    });

    res.json(coupon);

  } catch (err) {

    res.status(500).json({
      message: 'Coupon generation failed'
    });

  }

});