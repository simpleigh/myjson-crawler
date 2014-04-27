/*jslint browser: true */

/**
 * Adds a row to the list of results with the query and the response
 * @param {string} query
 * @param {string} response
 */
var outputResult = function (bin, contents) {
    'use strict';

    var binElement      = document.createElement('dt'),
        contentsElement = document.createElement('dd');

    binElement.textContent      = bin      || '';
    contentsElement.textContent = contents || '';
    document.getElementById('results').appendChild(binElement);
    document.getElementById('results').appendChild(contentsElement);
};

/**
 * Looks up the contents of a myjson bin and adds them to the list of results
 * @param {string} bin
 */
var lookupBin = function (bin) {
    'use strict';

    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'http://api.myjson.com/bins/' + bin);
    xhr.onload = function () {
        if (this.status === 200) {
            outputResult(bin, this.responseText);
        }
    };
    xhr.send();
};

/**
 * Iterates over a list of characters
 * @param {string}   alphabet List to iterate across
 * @param {string}   prefix   String to prepend before calling CALLBACK
 * @param {function} callback Callback function, called with current string
 */
var iterateCharacters = function (alphabet, prefix, callback) {
    'use strict';
    var i;
    for (i = 0; i < alphabet.length; i = i + 1) {
        callback(prefix + alphabet[i]);
    }
};

var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

var run = function () {
    'use strict';

    iterateCharacters(alphabet, '', function (string) {
        iterateCharacters(alphabet, string, function (string) {
            iterateCharacters(alphabet, string, lookupBin);
        });
    });
};

run();
