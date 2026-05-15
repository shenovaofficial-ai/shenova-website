const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  next();
};

exports.admin = (req, res, next) => {
  next();
};