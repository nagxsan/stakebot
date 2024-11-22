const express = require('express');

const app = express()

app.post("/api/v1/signup", (req, res) => {
    console.log(req.body)
    res.json({
        message: `Sign Up`
    })
})

app.post("/api/v1/signin", (req, res) => {
    res.json({
        message: "Sign In"
    })
})

app.post("/api/v1/txn/sign", (req, res) => {
    res.json({
        message: "Sign Txn"
    })
})

app.get("/api/v1/txn/", (req, res) => {
    res.json({
        message: "Txn id"
    })
})

app.listen(8080, () => {
    console.log("Listening on port 8080");
})