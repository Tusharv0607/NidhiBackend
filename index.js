const express = require('express');
const cors = require('cors');
const connect = require('./database');

connect();
const app = express();
const port = 80;

app.use(cors());
app.use(express.json());

app.get('/', function (req, res) {
    res.send("Hello World")
});

app.use('/authenticate', require('./routes/authentication'))

app.listen(port, () => {
    console.log(`Backend listening on port`)
});