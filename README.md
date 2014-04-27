# Myjson Crawler

A simple crawler for [myjson.com](http://myjson.com/).
Implemented for the browser in JavaScript.

## What is myjson.com

[Myjson](http://myjson.com/) describes itself as "a simple JSON store for your
web or mobile app".
You can save JSON data using an interface on the site itself
([example](http://myjson.com/mzl))
or programmatically via an [API](http://myjson.com/api)
([example](https://api.myjson.com/bins/mzl)).
Each saved piece of JSON can be accessed via a randomly-generated URL,
but unfortunately the random part of the URL is very short:
it seems to be three or four characters drawn from a limited alphabet.
This means that it's easy to guess valid URLs, or even to enumerate all of them.
[OWASP](https://www.owasp.org) describe this class of problem as an
"insecure direct object reference",
and list this at fourth place in their
[2013 Top 10](https://www.owasp.org/index.php/Top_10_2013-A4-Insecure_Direct_Object_References)
list of security risks.
It's not fair to criticise Myjson for this as they never advertised their
system as secure,
but I think it is fair to take a look at what people are storing.

## Crawler implementation

The most obvious way (to me, at least) to implement a crawler is as follows:

1. Generate a list of URLs using scripting language _du jour_
2. Use xargs and cURL to crawl.

This has a couple of advantages:
* It's really simple
* [xargs](http://manpages.ubuntu.com/manpages/trusty/man1/xargs.1.html) has a
  handy multi-threaded mode allowing us to crawl several pages in parallel.

Unfortunately that would be too easy, so I decided to use JavaScript.

### How it works

We're going to need a function to output results.
I decided to output HTML of this form:

```html
<dl>
<dt>aaa</dt><dd>{ "json" : "that came from", "url" : "myjson.com/aaa" }</dd>
<!-- ... -->
</dl>
```

Here's a tiny utility function to create this output:

```javascript
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
```

We'll also need a function to crawl the site.
[XMLHttpRequest](http://www.w3.org/TR/XMLHttpRequest/) is the obvious tool.
We write output as each response comes back using an anonymous function which
closes over the current bin name.

```javascript
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
```

Finally we need to iterate over the possible bin names.
Some nested loops would handle this well enough,
but it's probably tidier to encapsulate this functionality.
Here's a function to iterate over an alphabet of characters:

```javascript
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
```

For each character in the alphabet we prepend an existing string and then pass
the result on to the defined callback.
Iterating over all three-character bin names is then simple.
This example calls our output function directly without crawling each bin:

```javascript
var alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

var run = function () {
    'use strict';

    iterateCharacters(alphabet, '', function (string) {
        iterateCharacters(alphabet, string, function (string) {
            iterateCharacters(alphabet, string, outputResult);
        });
    });
};

run();
```

Finally we need an HTML document to host all this:

```html
<!DOCTYPE html>
<html>
  <head></head>
  <body>
    <dl id="results"></dl>
    <script type="text/javascript" src="script.js"></script>
  </body>
</html>
```

Browsers try hard to download data as quickly as possible,
and our crawl runs in parallel across several threads without extra effort.

## Results

### Scope

I restricted the crawl to include three-character names beginning with the
letters 'a' to 'd'.
The above code will crawl all combinations of three-character bin names, and
can also be easily extended to crawl four- and five-character names. 
It's sensible to reduce the scope, however:

* Crawling lots of bins takes lots of time.
* It isn't nice to load myjson.com heavily.
* Thoughts of [Weev](http://en.wikipedia.org/wiki/Weev) make me nervous.

### Brief Analysis

The sample includes 1,637 rows.
The top ten JSON strings are as follows:

| String                                            | Count |
| ------------------------------------------------- | ----- |
| "{}"                                              |   226 |
| "{"key":"value"}"                                 |    92 |
| "{"foo":"bar"}"                                   |    42 |
| "{"hello":"world"}"                               |    34 |
| "{"key":"value","key2":"value2"}"                 |    30 |
| "{"glossary":{"title":"example glossary",...      |    29 |
| "{"key_updated":"value_updated"}"                 |    26 |
| "[]"                                              |    23 |
| "{"test":"test"}"                                 |    17 |
| "{"key":"updated value","key2":"updated value2"}" |    16 |

We can therefore estimate that around 14% of bins contain only the empty object.
Many of the examples above seem likely to have been created to test the service,
and 69% of the extracting strings contain only 50 characters or fewer.

It will be interesting to run a similar scrape in the future and see if the
distribution of data changes:
how many people are using this service as intended?

## Scope for Evil

The API supports updating JSON data by sending an HTTP PUT request.
It would only take a few minutes to overwrite _all_ data stored by Myjson.
Myjson doesn't advertise a secure service,
and they obviously aren't worried that data is disclosed.
They ought to be worried that somebody might trash everything they have stored.
