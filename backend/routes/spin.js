const express = require('express');

const router = express.Router();

const SpinLead =
require('../models/SpinLead');

router.post('/', async(req,res)=>{

  try{

    const {
      email,
      phone
    } = req.body;

    const exists =
    await SpinLead.findOne({
      $or:[
        { email },
        { phone }
      ]
    });

    if(exists){

      return res.status(400).json({
        message:
        'You already used the spin wheel'
      });

    }

    const discounts =
    [5,10,15];

    const discount =
    discounts[
      Math.floor(
        Math.random() *
        discounts.length
      )
    ];

    const coupon =
    'SHENOVA' +
    Math.floor(
      1000 +
      Math.random()*9000
    );

    await SpinLead.create({

      email,
      phone,

      coupon,

      discount,

      used:false

    });

    res.json({

      success:true,

      coupon,

      discount

    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      message:'Server error'
    });

  }

});

module.exports = router;