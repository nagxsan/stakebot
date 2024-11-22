const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_CONNECTION_URI);

const UserSchema = mongoose.Schema({
    username: String,
    password: String,
    privateKey: String,
    publicKey: String
});

const userModel = mongoose.model("users", UserSchema);

module.exports = userModel;
