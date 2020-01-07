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

let engine = require(__dirname + "/../engine");
let pipelineBuilder = require(__dirname + "/../../fiftyone.pipeline.core/pipelineBuilder");
let aspectDataDictionary = require(__dirname + "/../aspectDataDictionary");
let basicListEvidenceKeyFilter = require(__dirname + "/../../fiftyone.pipeline.core/basicListEvidenceKeyFilter");
let lruCache = require(__dirname + "/../lruCache");

let cache = new lruCache({ size: 1 });

// Flag to test cache

let hasRun = false;

let testEngine = new engine(
    {
        dataKey: "testEngine",
        cache: cache,
        restrictedProperties: ["one", "noCache"],
        evidenceKeyFilter: new basicListEvidenceKeyFilter(["header.user-agent"]),
        properties: {
            "one": {
                "meta": {
                    "type": "int"
                }
            },
            "two": {
                "meta": {
                    "type": "int"
                }
            }
        },
        processInternal: function (flowData) {

            let contents = { "one": 1, "two": 2 };

            // Check if flowData has been processed before (for cache test)

            contents.noCache = hasRun;

            let data = new aspectDataDictionary({ flowElement: this, contents: contents });

            flowData.setElementData(data);

            hasRun = true;

        }
    }
);

let flowData = new pipelineBuilder().add(testEngine).build().createFlowData();

test('engine process', done => {

    flowData.process().then(function () {

        expect(flowData.get("testEngine").get("one")).toBe(1);

        done();

    });

});

test('restricted properties', done => {

    flowData.process().then(function () {

        try {

            flowData.get("testEngine").get("two");

        } catch (e) {

            expect(e.indexOf("excluded") !== -1).toBe(true);

        }

        done();

    });

});

test('missing property service', done => {

    flowData.process().then(function () {

        try {

            flowData.get("testEngine").get("three");

        } catch (e) {

            expect(e.indexOf("not found") !== -1).toBe(true);

        }

        done();

    });

});

test('cache', done => {

    flowData.process().then(function () {

        expect(flowData.get("testEngine").get("noCache")).toBe(false);

        done();

    });

});
