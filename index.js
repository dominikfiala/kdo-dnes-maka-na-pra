const path = require("path");
const express = require("express");
const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');
app.use('/static', express.static(path.join(__dirname + '/public')));
app.use("/", require("./api/pra"));

const PORT = process.env.PORT || 1991;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
