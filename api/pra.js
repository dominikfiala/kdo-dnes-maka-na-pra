const express = require("express");
const router = express.Router();

const {google} = require("googleapis");
const {startOfWeek, endOfWeek, format} = require("date-fns");
const {cs} = require("date-fns/locale");
const appInfo = require('../package.json');

const rangeSuggestions = () => {
    const weekStart = startOfWeek(new Date, {weekStartsOn: 1});
    const weekEnd = endOfWeek(new Date, {weekStartsOn: 1});
    return [
        format(weekStart, 'd.M.') + '-' + format(weekEnd, 'd.M.Y'),
        format(weekStart, 'd.M.Y') + '-' + format(weekEnd, 'd.M.'),
        format(weekStart, 'd.M.Y') + '-' + format(weekEnd, 'd.M.Y'),
        format(weekStart, 'd.M.') + '-' + format(weekEnd, 'd.M.yy'),
        format(weekStart, 'd.M.yy') + '-' + format(weekEnd, 'd.M.yy'),
    ]
};

function changeTimezone(date, ianatz) {
  // suppose the date is 12:00 UTC
  var invdate = new Date(date.toLocaleString('en-US', {
    timeZone: ianatz
  }));

  // then invdate will be 07:00 in Toronto
  // and the diff is 5 hours
  var diff = date.getTime() - invdate.getTime();

  // so 12:00 in Toronto is 17:00 UTC
  return new Date(date.getTime() - diff); // needs to substract
};

const prepareTplVars = (response) => {
    if (!response) {
        return;
    }

    const data = response.data.values;

    const date = changeTimezone(new Date, 'Europe/Prague');
    // Do osmi rano ziskavam "vcerejsi" smenu
    var dayIndex = date.getHours() > 8
        ? date.getDay()
        : date.getDay() - 1;
    // Pokud jsem datum pretocil z pondeli tak se vratim na nedeli
    if (dayIndex === 0) {
        dayIndex = 7;
    }

    const amColIndex = dayIndex * 2;
    const pmColIndex = amColIndex + 1;

    let amRowIndex;
    let pmRowIndex;

    data.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (colIndex === amColIndex && cell.toLowerCase() === 'ok') {
                amRowIndex = rowIndex;
            } else if (colIndex === pmColIndex && cell.toLowerCase() === 'ok') {
                pmRowIndex = rowIndex;
            }
        });
    });

    const unknownName = 'To se neví';
    return {
        amName: data[amRowIndex] ? data[amRowIndex][1] : unknownName,
        pmName: data[pmRowIndex] ? data[pmRowIndex][1] : unknownName,
        date: format(date, 'EEEE d. MMMM Y kk:mm', {locale: cs})
    }
};

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

    const data = {
        title: appInfo.description,
        ...prepareTplVars(response),
        error: response === undefined,
    };

    console.log(data);

    try {
        res.status(200).render('index', data);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Server error");
    }
});

module.exports = router;
