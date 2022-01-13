const express = require("express");
const router = express.Router();
const {google} = require("googleapis");
const {startOfWeek, endOfWeek, format} = require("date-fns");
const {cs} = require("date-fns/locale");

const week = () => {
    const weekStart = startOfWeek(new Date, {weekStartsOn: 1});
    const weekEnd = endOfWeek(new Date, {weekStartsOn: 1});
    const week = format(weekStart, 'd.M.Y') + '-' + format(weekEnd, 'd.M.Y');
    return week;
};

/**
 * GET product list.
 *
 * @return product list | empty.
 */
router.get("/", async (req, res) => {
    const target = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const { privateKey } = JSON.parse(process.env.GOOGLE_SHEETS_PRIVATE_KEY);
    const jwt = new google.auth.JWT(
        process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        null,
        privateKey,
        target
    );

    const googleSheetsInstance = google.sheets({version: "v4", auth: jwt});
    const response = await googleSheetsInstance.spreadsheets.values.get({
        spreadsheetId: '11myQ8aDwNwWX3d-uRjqVVZkektY9D96jMkAJgSA4ErU',
        range: week(), // sheet name
    });

    const data = response.data.values;
    const amColIndex = (new Date).getDay() * 2;
    const pmColIndex = amColIndex + 1;

    let amRowIndex;
    let pmRowIndex;

    data.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (colIndex === amColIndex && cell === 'ok') {
                amRowIndex = rowIndex;
            } else if (colIndex === pmColIndex && cell === 'ok') {
                pmRowIndex = rowIndex;
            }
        });
    });

    const unknownName = 'To se neví';
    const vars = {
        amName: data[amRowIndex] ? data[amRowIndex][1] : unknownName,
        pmName: data[pmRowIndex] ? data[pmRowIndex][1] : unknownName,
        title: 'Kdo dnes maká na Pra?',
        date: format(new Date, 'EEEE d. MMMM Y', {locale: cs})
    }
    const template = `<!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${vars.title}</title>
            <link rel="stylesheet" href="https://unpkg.com/purecss@2.0.6/build/pure-min.css">
            <style>
                body {
                    padding: 1rem;
                    text-align: center;
                }
            </style>
        </head>
        <body>
        <h1>${vars.title}</h1>
        <h2>${vars.date}</h2>
        <p>Odpoledne:</p>
        <h3>${vars.amName}</h3>
        <p>Večer:</p>
        <h3>${vars.pmName}</h3>
        </body>
        </html>`;

    try {
        res.status(200).send(template);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Server error");
    }
});

module.exports = router;
