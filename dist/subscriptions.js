"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseSubscriptions(rawSubsText) {
    var subsText = rawSubsText.replace('\r', '');
    var subsRows = subsText.match(/^\*.+/gm);
    var subscriptions = {};
    // eslint-disable-next-line github/array-foreach
    subsRows.forEach(function (row) {
        var labelMatch = row.match(/^\* +([^@]+)/);
        if (labelMatch) {
            var label = labelMatch[1].trim();
            var users = row.match(/@[a-zA-Z0-9-/]+/g);
            subscriptions[label] = users.map(function (u) { return u.substring(1); });
        }
    });
    return subscriptions;
}
exports.parseSubscriptions = parseSubscriptions;
