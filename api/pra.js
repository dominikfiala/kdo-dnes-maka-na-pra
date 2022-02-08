const express = require("express");
const router = express.Router();

const {google} = require("googleapis");
const {startOfWeek, endOfWeek, format} = require("date-fns");
const {cs} = require("date-fns/locale");
const package = require('../package.json');

const rangeSuggestions = () => {
    const weekStart = startOfWeek(new Date, {weekStartsOn: 1});
    const weekEnd = endOfWeek(new Date, {weekStartsOn: 1});
    return [
        format(weekStart, 'd.M.') + '-' + format(weekEnd, 'd.M.Y'),
        format(weekStart, 'd.M.Y') + '-' + format(weekEnd, 'd.M.'),
        format(weekStart, 'd.M.Y') + '-' + format(weekEnd, 'd.M.Y'),
    ]
};

const prepareTplVars = (response) => {
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
    return {
        amName: data[amRowIndex] ? data[amRowIndex][1] : unknownName,
        pmName: data[pmRowIndex] ? data[pmRowIndex][1] : unknownName,
        title: 'Kdo dnes maká na Pra?',
        date: format(new Date, 'EEEE d. MMMM Y', {locale: cs})
    }
};

const template = (vars) => `<!DOCTYPE html>
    <html lang="cs">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/icon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"><!-- 180×180 -->
        <link rel="manifest" href="/manifest.webmanifest">
        <title>${vars.title}</title>
        <link rel="stylesheet" href="https://unpkg.com/purecss@2.0.6/build/pure-min.css">
        <style>
            body {
                padding: 1rem;
                text-align: center;
            }
        </style>
        <script>
            self._ga = {
                // Full Measurement Protocol param reference:
                // https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters
                data: {
                    v: "1", // Measurement Protocol version.
                    tid: "UA-217210080-1", // Tracking ID.
                    cid: \`${Date.now()}${Math.random()}\`, // Client ID.
                    dl: location.href, // Document location.
                    aip: 1, // Anonymize IP
                    dr: document.referrer,
                },
                send(additionalParams) {
                    navigator.sendBeacon(
                        "https://google-analytics.com/collect",
                        new URLSearchParams({
                            ...this.data,
                            ...additionalParams,
                        }).toString()
                    );
                },
            };
            _ga.send({t: "pageview"});
        </script>
    </head>
    <body>
    <h1>${vars.title}</h1>
    ${vars.body}
    </body>
    </html>`;

router.get("/", async (req, res) => {
    const target = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
    const {privateKey} = JSON.parse(process.env.GOOGLE_SHEETS_PRIVATE_KEY);
    const jwt = new google.auth.JWT(
        process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        null,
        privateKey,
        target
    );

    const googleSheetsInstance = google.sheets({version: "v4", auth: jwt});

    let response;
    for (const rangeSuggestion of rangeSuggestions()) {
        try {
            response = await googleSheetsInstance.spreadsheets.values.get({
                spreadsheetId: '11myQ8aDwNwWX3d-uRjqVVZkektY9D96jMkAJgSA4ErU',
                range: rangeSuggestion, // sheet name
            })
        } catch (e) {
        }
    }

    let body = '<h2>Chyba získávání dat 🥺</h2>';
    if (response) {
        let vars = prepareTplVars(response);
        body = `<h2>${vars.date}</h2>
            <p>Odpoledne:</p>
            <h3>${vars.amName}</h3>
            <p>Večer:</p>
            <h3>${vars.pmName}</h3>`;
    }

    const data = {
        title: package.description,
        body: body,
    };
    const payload = template(data);

    try {
        res.status(200).send(payload);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Server error");
    }
});

module.exports = router;
