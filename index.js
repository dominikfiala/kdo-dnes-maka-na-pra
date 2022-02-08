const express = require("express");
const app = express();
const pra = require("./api/pra");
const path = require("path");
require('dotenv').config();

app.use('/static', express.static(path.join(__dirname + '/public')));
app.use("/", pra);

const PORT = process.env.PORT || 1991;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
