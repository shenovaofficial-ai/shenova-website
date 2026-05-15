const express = require('express');

const router = express.Router();

const SpinLead =
require('../models/SpinLead');

router.post('/apply', async(req,res)=>{

  try{

    const { coupon } = req.body;

    const found =
    await SpinLead.findOne({ coupon });

    if(!found){

      return res.status(400).json({
        message:'Invalid coupon'
      });

    }

    if(found.used){

      return res.status(400).json({
        message:'Coupon already used'
      });

    }

    res.json({
      success:true,
      discount:found.discount
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      message:'Server error'
    });

  }

});

router.post('/use', async(req,res)=>{

  try{

    const { coupon } = req.body;

    await SpinLead.findOneAndUpdate(
      { coupon },
      { used:true }
    );

    res.json({
      success:true
    });

  }catch(err){

    res.status(500).json({
      message:'Server error'
    });

  }

});

module.exports = router;