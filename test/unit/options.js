"use strict";

require('mocha-generators').install();
var path = require('path');
var fs = require("fs");
var https = require('https');

describe('Nightmare', function () {

    describe('options', function () {
        var nightmare;

        var server;

        before(function (done) {
            // set up an HTTPS server using self-signed certificates -- Nightmare
            // will only be able to talk to it if 'ignore-certificate-errors' is set.
            server = https.createServer({
                key: fs.readFileSync(path.join(__dirname, '../files', 'server.key')),
                cert: fs.readFileSync(path.join(__dirname, '../files', 'server.crt'))
            }, function (request, response) {
                response.end('ok\n');
            }).listen(0, 'localhost', function () {
                var address = server.address();
                server.url = `https://${address.address}:${address.port}`;
                done();
            });
        });

        after(function () {
            server.close();
            server = null;
        });


        afterEach(function* () {
            nightmare.end();
        });

        it('should set audio muted state', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            var audioMuted = yield nightmare
                .setAudioMuted(false);

            audioMuted.should.eql(false);
        });

        it('should set useragent', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            var useragent = yield nightmare.chain()
                .useragent('firefox')
                .goto(fixture('options'))
                .evaluate(function () {
                    return window.navigator.userAgent;
                });
            useragent.should.eql('firefox');
        });

        it('should complete setting useragent', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            yield nightmare.useragent("firefox");
            yield nightmare.goto(fixture('options'));
            var useragent = yield nightmare.evaluate(function () {
                return window.navigator.userAgent;
            });

            useragent.should.eql('firefox');
        });

        it('should wait and fail with waitTimeout', function () {
            nightmare = new Nightmare({ waitTimeout: 254 });

            return nightmare.chain()
                .goto(fixture('navigation'))
                .wait('foobar')
                .should.be.rejected;
        });

        it('should wait and fail with waitTimeout and a ms wait time', function () {
            nightmare = new Nightmare({ waitTimeout: 254 });

            return nightmare.chain()
                .goto(fixture('navigation'))
                .wait(1000)
                .should.be.rejected;
        });

        it('should wait and fail with waitTimeout with queued functions', function () {
            nightmare = new Nightmare({ waitTimeout: 254 });

            return nightmare.chain()
                .goto(fixture('navigation'))
                .wait('foobar')
                .exists('baz')
                .should.be.rejected;
        });

        it('should set authentication', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            var data = yield nightmare.chain()
                .setAuthenticationCredentials('my', 'auth')
                .goto(fixture('auth'))
                .evaluate(function () {
                    return JSON.parse(document.querySelector('pre').innerHTML);
                });
            data.should.eql({ name: 'my', pass: 'auth' });
        });

        it('should set viewport', function* () {
            var size = { width: 400, height: 300, 'useContentSize': true };
            nightmare = new Nightmare(size);
            yield nightmare.init();

            var result = yield nightmare.chain()
                .goto(fixture('options'))
                .evaluate(function () {
                    return {
                        width: window.innerWidth,
                        height: window.innerHeight
                    };
                });
            result.width.should.eql(size.width);
            result.height.should.eql(size.height);
        });

        it('should set a single header', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            var headers = yield nightmare.chain()
                .header('X-Nightmare-Header', 'hello world')
                .goto(fixture('headers'))
                .evaluate(function () {
                    return JSON.parse(document.querySelector('pre').innerHTML);
                });
            headers['x-nightmare-header'].should.equal('hello world');
        });

        it('should set all headers', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            var headers = yield nightmare.chain()
                .header({ 'X-Foo': 'foo', 'X-Bar': 'bar' })
                .goto(fixture('headers'))
                .evaluate(function () {
                    return JSON.parse(document.querySelector('pre').innerHTML);
                });
            headers['x-foo'].should.equal('foo');
            headers['x-bar'].should.equal('bar');
        });

        it('should set headers for that request', function* () {
            nightmare = new Nightmare();
            yield nightmare.init();

            var headers = yield nightmare.chain()
                .goto(fixture('headers'), { 'X-Nightmare-Header': 'hello world' })
                .evaluate(function () {
                    return JSON.parse(document.querySelector('pre').innerHTML);
                });
            headers['x-nightmare-header'].should.equal('hello world');
        });

        it('should allow webPreferences settings', function* () {
            nightmare = new Nightmare({ webPreferences: { webSecurity: false } });

            var result = yield nightmare.chain()
                .goto(fixture('options'))
                .evaluate(function () {
                   return document.getElementById('example-iframe').contentDocument;
                });
                
            result.should.be.ok;
        });

        it('should be constructable with paths', function* () {
            nightmare = new Nightmare({ paths: { userData: __dirname } });
            yield nightmare.init();
            nightmare.should.be.ok;
        });

        it('should be constructable with electronArgs', function* () {
            nightmare = new Nightmare({
                electronArgs: {
                    switches: {
                        // empty string and non-string values all represent no value
                        'ignore-certificate-errors': null,
                        'touch-events': ''
                    }
                }
            });
            nightmare.should.be.ok;
            var touchEvents = yield nightmare.chain()
                .goto(server.url)
                .evaluate(function () {
                    return 'ontouchstart' in window;
                });
            touchEvents.should.be.true;
        });

        it('should support electronArgs with values', function* () {
            nightmare = new Nightmare({ electronArgs: { switches: {'force-device-scale-factor': '5' } } });
            nightmare.should.be.ok;
            var scaleFactor = yield nightmare.chain()
                .goto('about:blank')
                .evaluate(function () {
                    return window.devicePixelRatio;
                });
            scaleFactor.should.equal(5);
        });

        it('should allow to use external Electron', function* () {
            nightmare = new Nightmare({ electronPath: require('electron-prebuilt') });
            yield nightmare.init();
            nightmare.should.be.ok;
        });
    });

    describe('custom preload script', function () {
        it('should support passing your own preload script in', function* () {
            var nightmare = new Nightmare({
                webPreferences: {
                    preload: path.join(__dirname, '..', 'fixtures', 'preload', 'index.js')
                }
            });

            try {
                var value = yield nightmare.chain()
                    .goto(fixture('preload'))
                    .evaluate(function () {
                        return window.preload;
                    });
                value.should.equal('custom');
            } finally {
                nightmare.end();
            }
        });
    });
});