// app.js
const deck = require("./spades");



const express = require('express')
const sls = require('serverless-http')
const app = express()


app.get('/', async (req, res, next) => {
  res.status(200).send('Welcome to BMC Spades App')
});

app.get(
  "/deck/new",
  deck.createNewDeck
);





module.exports.server = sls(app)

