const express = require('express');

const router = express.Router();

const Newsletter =
require('../models/Newsletter');

router.post('/', async(req,res)=>{

  try{

    const { email } = req.body;

    const exists =
    await Newsletter.findOne({
      email
    });

    if(exists){

      return res.status(400).json({
        message:'Email already joined'
      });

    }

    await Newsletter.create({
      email
    });

    res.json({
      success:true
    });

  }catch(err){

    console.log(err);

    res.status(500).json({
      message:'Server error'
    });

  }

});

module.exports = router;