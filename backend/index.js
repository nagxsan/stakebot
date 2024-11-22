require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const { z } = require('zod');
const bcrypt = require('bcrypt');

const userModel = require('./models')

const app = express();
app.use(bodyParser.json());

const signUpBodyObject = z.object({
    username: z.string(),
    password: z.string()
})

const salt = bcrypt.genSaltSync(10);

function validateSignUpInputs(req, res, next) {
    try {
        signUpBodyObject.parse(req.body)
        next()
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.log(error.issues);
        }

        res.status(400).json({
            message: "Zod validation failed. Wrong type of data sent for username or password."
        })
    }
}

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

    const hashedPassword = bcrypt.hashSync(password, salt);

    try {
        const newUser = await userModel.create({
            username: username,
            password: hashedPassword
        });
    } catch (error) {
        console.log(`Error saving user ${username} in database.`)
        res.status(500).json({
            message: "Sign up failed. Error saving user in database."
        })
        return;
    }
    
    res.json({
        message: "Sign Up successful"
    });
});

app.post("/api/v1/signin", (req, res) => {
    res.json({
        message: "Sign In"
    });
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