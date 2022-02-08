const express = require("express");
const app = express();
const pra = require("./api/pra");
require('dotenv').config();

app.use(express.static('public'));
app.use("/", pra);

const PORT = process.env.PORT || 1991;
app.listen(PORT, () => console.log(`Server is running in port ${PORT}`));
