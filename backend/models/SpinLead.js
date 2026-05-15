const mongoose = require('mongoose');

const spinLeadSchema = new mongoose.Schema({

  email:{
    type:String,
    required:true,
    unique:true
  },

  phone:{
    type:String,
    required:true,
    unique:true
  },

  discount:{
    type:Number,
    required:true
  },

  coupon:{
    type:String,
    required:true,
    unique:true
  },

  used:{
    type:Boolean,
    default:false
  },

  createdAt:{
    type:Date,
    default:Date.now
  }

});

module.exports = mongoose.model(
  'SpinLead',
  spinLeadSchema
);