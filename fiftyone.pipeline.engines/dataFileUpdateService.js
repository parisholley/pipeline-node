/* *********************************************************************
 * This Original Work is copyright of 51 Degrees Mobile Experts Limited.
 * Copyright 2019 51 Degrees Mobile Experts Limited, 5 Charlotte Close,
 * Caversham, Reading, Berkshire, United Kingdom RG4 7BY.
 *
 * This Original Work is licensed under the European Union Public Licence (EUPL) 
 * v.1.2 and is subject to its terms as set out below.
 *
 * If a copy of the EUPL was not distributed with this file, You can obtain
 * one at https://opensource.org/licenses/EUPL-1.2.
 *
 * The 'Compatible Licences' set out in the Appendix to the EUPL (as may be
 * amended by the European Commission) shall be deemed incompatible for
 * the purposes of the Work and the provisions of the compatibility
 * clause in Article 5 of the EUPL shall not apply.
 * 
 * If using the Work as, or as part of, a network application, by 
 * including the attribution notice(s) required under Article 5 of the EUPL
 * in the end user terms of the application under an appropriate heading, 
 * such notice(s) shall fulfill the requirements of that article.
 * ********************************************************************* */

const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const url = require("url");

const minToMs = (min) => min * 60000;

class dataFileUpdateService {

    constructor(pipeline) {

        this.pipeline = pipeline;

    }

    updateDataFile(dataFile) {

        let dataFileUpdateService = this;

        if (dataFile.updating) {

            return false;

        } else {

            dataFile.updating = true;

        }

        let urlParts = url.parse(dataFile.updateUrl);

        let requestOptions = urlParts;

        if (dataFile.verifyIfModifiedSince) {

            try {
                requestOptions.headers = {
                    'If-Modified-Since': dataFile.getDatePublished(),
                }
            } catch (e) {

                // getPublished might not exist if no datafile

            }

        }

        let request;

        if (urlParts.protocol === "https:") {

            request = https.get(requestOptions);

        } else {

            request = http.get(requestOptions);

        }

        request.on("response", function (response) {

            if (response.statusCode !== 200) {

                dataFile.updating = false;

                switch (response.statusCode) {
                    case (429):
                        dataFileUpdateService.pipeline.log("error", "Too many requests to '" + dataFile.updateUrl + "' for engine '" +
                            dataFile.flowElement.dataKey + "'");
                        break;
                    case (304):
                        dataFileUpdateService.pipeline.log("warn", "No data update available from " + dataFile.updateUrl + "' for engine '" +
                            dataFile.flowElement.dataKey + "'");
                        break;
                    case (403):
                        dataFileUpdateService.pipeline.log("error", "Access denied from " + dataFile.updateUrl + "' for engine '" +
                            dataFile.flowElement.dataKey + "'");
                        break;
                    default:
                        dataFileUpdateService.pipeline.log("error", "Error" + response.statusCode + " from " + dataFile.updateUrl + "' for engine '" +
                            dataFile.flowElement.dataKey + "'");
                        break;
                }

                dataFileUpdateService.checkNextUpdate(dataFile);

                return false;

            }

            let filename = dataFile.tempDataDirectory + "/" + dataFile.identifier + Date.now();

            response.pipe(fs.createWriteStream(filename));

            response.on("end", function () {

                // Open file

                if (dataFile.verifyMD5) {

                    let headerMD5 = response.headers["content-md5"];

                    var fd = fs.createReadStream(filename);

                    var hash = crypto.createHash('md5');
                    hash.setEncoding('hex');

                    fd.on('end', function () {
                        hash.end();
                        if (hash.read() !== headerMD5) {

                            dataFileUpdateService.pipeline.log("error", "MD5 doesn't match from '" + dataFile.updateUrl + "' for engine '" + dataFile.flowElement.dataKey + "'");

                            dataFile.updating = false;
                            dataFileUpdateService.checkNextUpdate(dataFile);

                        } else {

                            dataFileUpdateService.processFile(dataFile, filename);

                        }
                    });

                    fd.pipe(hash);

                } else {

                    dataFileUpdateService.processFile(dataFile, filename);

                }

            });

        });

    }

    fileReady(dataFile, filename) {

        let dataFileUpdateService = this;

        fs.readFile(filename, function (err, data) {

            fs.writeFile(dataFile.path, data, function (err) {

                if (err) {

                    dataFileUpdateService.pipe.log("error", err);

                }

                dataFile.refresh();

                dataFileUpdateService.checkNextUpdate(dataFile);

                dataFile.updating = false;

                // Delete the temp file
                fs.unlink(filename, function (err) {

                    if (err) {

                        dataFileUpdateService.pipeline.log("error", err);

                    }

                });

            });

        });

    }

    processFile(dataFile, filename) {

        let dataFileUpdateService = this;

        if (dataFile.decompress) {

            fs.readFile(filename, function (err, buffer) {

                zlib.gunzip(buffer, function (err, data) {

                    let doneFileName = filename + "_done";

                    fs.writeFile(doneFileName, data, function () {

                        dataFileUpdateService.fileReady(dataFile, doneFileName);

                    })

                });

            })

        } else {

            dataFileUpdateService.fileReady(dataFile, filename);

        }

    }

    checkNextUpdate(dataFile) {

        try {

            let dataFileUpdateService = this;

            let interval = minToMs((Math.floor(Math.random() * dataFile.updateTimeMaximumRandomisation) + 1) + dataFile.pollingInterval);

            interval += dataFile.getNextUpdate().getMilliseconds();

            // Run update on start if specified to do so
            if (dataFile.updateOnStart) {

                dataFileUpdateService.updateDataFile(dataFile);

            } else {

                setTimeout(function () {

                    dataFileUpdateService.updateDataFile(dataFile);

                }, interval);

            }

        } catch (e) {

            // Catch any extra errors with datafile updates

            this.pipeline.log("error", e);

        }

    }

    registerDataFile(dataFile) {

        dataFile.registered = true;

        if (dataFile.updateOnStart) {

            this.updateDataFile(dataFile);

        } else {

            if (dataFile.autoUpdate) {

                this.checkNextUpdate(dataFile);

            }

        }

        // check if fileSystemWatcher is enabled and listen for datafile changes

        if (dataFile.fileSystemWatcher) {

            let watch = function () {

                fs.watch(dataFile.path, { persistent: false }, function (event) {

                    if (!dataFile.updating) {

                        dataFile.refresh();

                    }

                });

            };

            if (fs.existsSync(dataFile.path)) {

                watch();

            } else {

                let checkWatcherCanStart = setInterval(function () {

                    try {

                        watch();

                        clearInterval(checkWatcherCanStart);

                    } catch (e) {



                    }

                }, 500);

            }

        }


    }

}

module.exports = dataFileUpdateService;
