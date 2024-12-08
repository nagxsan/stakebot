require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bs58 = require('bs58').default;

const userModel = require('./models');
const { Keypair, Transaction, Connection } = require("@solana/web3.js");

const { validateSignUpInputs, encrypt, decrypt } = require("./utils/utils");

const connection = new Connection(process.env.ALCHEMY_SOLANA_DEVNET_RPC_ENDPOINT)

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
    const encryptedPrivateKey = encrypt(bs58.encode(keypair.secretKey), `${username}:${hashedPassword}`);

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
        publicKey: keypair.publicKey.toString()
    });
});

app.post("/api/v1/wallet", async (req, res) => {
    const { publicKey } = req.body
    const response = await axios.post(process.env.ALCHEMY_SOLANA_DEVNET_RPC_ENDPOINT, {
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [
          publicKey,
          {
            "encoding": "base58"
          }
        ]
    })

    res.json({
        message: "Wallet details",
        value: response.data?.result?.value
    })
})

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

app.post("/api/v1/txn/sign", async (req, res) => {
    try {
        const { serializedTx, retry, publicKey } = req.body
        const tx = Transaction.from(serializedTx.data);
        const user = await userModel.findOne({
            publicKey: publicKey
        })

        if (!user) {
            res.status(400).json({
                message: 'User does not exist.'
            })
            return
        }

        const secretKey = decrypt(user.privateKey, `${user.username}:${user.password}`);
        const keypair = Keypair.fromSecretKey(bs58.decode(secretKey));

        tx.sign(keypair)

        const signature = await connection.sendTransaction(tx, [keypair]);

        console.log(signature);
    } catch (error) {
        console.log(error.response?.data || error.message);
        res.status(500).json({
            message: 'Error making the transaction'
        })
        return
    }

    res.json({
        message: "Sign Txn"
    });
});

app.get("/api/v1/txn", (req, res) => {
    res.json({
        message: "Txn id"
    });
});

app.listen(8080, () => {
    console.log("Listening on port 8080");
});