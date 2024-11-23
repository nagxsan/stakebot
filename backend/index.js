require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userModel = require('./models');
const { Keypair } = require("@solana/web3.js");

const { validateSignUpInputs, encrypt, decrypt } = require("./utils/utils");

const app = express();
app.use(bodyParser.json());

app.post("/api/v1/signup", validateSignUpInputs, async (req, res) => {
    const { username, password } = req.body;
    const existingUser = await userModel.findOne({
        username: username
    });
    if (existingUser) {
        console.log("User already exists");
        res.status(400).json({
            message: "Sign Up failed. User already exists for this username." 
        })
        return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const keypair = new Keypair();
    const encryptedPrivateKey = encrypt(keypair.secretKey.toString(), `${username}:${hashedPassword}`);

    try {
        const newUser = await userModel.create({
            username: username,
            password: hashedPassword,
            publicKey: keypair.publicKey.toString(),
            privateKey: encryptedPrivateKey
        });
    } catch (error) {
        console.log(`Error saving user ${username} in database.`)
        res.status(500).json({
            message: "Sign up failed. Error saving user in database."
        })
        return;
    }
    
    res.json({
        message: "Sign Up successful",
        publickKey: keypair.publicKey.toString()
    });
});

app.post("/api/v1/signin", async (req, res) => {
    const { username, password } = req.body;

    const user = await userModel.findOne({
        username: username
    });

    if (user && bcrypt.compareSync(password, user.password)) {
        const jwtToken = jwt.sign({
            id: user
        }, process.env.JWT_SECRET);
        res.json({
            message: "Sign in successful",
            jwt: jwtToken
        });
        return;
    } else {
        res.status(400).json({
            message: "Incorrect credentials, check username or password and try again."
        })
        return;
    }
});

app.post("/api/v1/txn/sign", (req, res) => {
    res.json({
        message: "Sign Txn"
    });
});

app.get("/api/v1/txn/", (req, res) => {
    res.json({
        message: "Txn id"
    });
});

app.listen(8080, () => {
    console.log("Listening on port 8080");
});