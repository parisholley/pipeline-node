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

const mustache = require('mustache');
const fs = require('fs');
const querystring = require('querystring');

const template = fs.readFileSync(
  __dirname + '/JavaScriptResource.mustache',
  'utf8'
);

const FlowElement = require('./flowElement.js');
const EvidenceKeyFilter = require('./evidenceKeyFilter.js');
const ElementDataDictionary = require('./elementDataDictionary.js');
var uglifyJS = require('uglify-js');

class JSEvidenceKeyFilter extends EvidenceKeyFilter {
  filterEvidenceKey (key) {
    return key.indexOf('query.') !== -1 || key.indexOf('header.') !== -1;
  }
}

class JavaScriptBuilderElement extends FlowElement {
  constructor ({
    _objName = 'fod',
    _protocol = '',
    _host = '',
    _endPoint = '',
    _enableCookies = true,
    _minify = true
  } = {}) {
    super(...arguments);

    this.settings = {
      _objName: _objName,
      _protocol: _protocol,
      _host: _host,
      _endPoint: _endPoint,
      _enableCookies: _enableCookies,
      _minify: _minify
    };

    this.dataKey = 'javascriptbuilder';
    this.evidenceKeyFilter = new JSEvidenceKeyFilter();
  }

  /**
   * The JavaScriptBuilder serves JavaScript properties and allows for a fetch request to retrieve additional properties populated with data from the client side
   * @param {flowData} flowData
   */
  processInternal (flowData) {
    // Get output of jsonbuilder

    const json = flowData.jsonbundler.json;

    const settings = { _jsonObject: JSON.stringify(json) };

    for (const setting in this.settings) {
      settings[setting] = this.settings[setting];
    }

    // Generate url from parts
    let protocol = this.settings._protocol;
    let host = this.settings._host;

    if (!protocol) {
      // Check if protocol is provided in evidence
      if (flowData.evidence.get('header.protocol')) {
        protocol = flowData.evidence.get('header.protocol');
      }
    }
    if (!protocol) {
      protocol = 'https';
    }

    if (!host) {
      // Check if host is provided in evidence
      if (flowData.evidence.get('header.host')) {
        host = flowData.evidence.get('header.host');
      }
    }

    settings._host = host;
    settings._protocol = protocol;

    if (settings._host && settings._protocol && settings._endPoint) {
      settings._url =
        settings._protocol + '://' + settings._host + settings._endPoint;

      // Get query parameters to add to the URL

      const queryParams = this.evidenceKeyFilter.filterEvidence(
        flowData.evidence.getAll()
      );

      const query = {};

      for (const param in queryParams) {
        if (param.indexOf('query') !== -1) {
          const paramKey = param.split('.')[1];

          query[paramKey] = queryParams[param];
        }
      }

      const urlQuery = querystring.stringify(query);

      // Does the URL already have a query string in it?

      if (settings._url.indexOf('?') === -1) {
        settings._url += '?';
      } else {
        settings._url += '&';
      }

      settings._url += urlQuery;

      settings._updateEnabled = true;
    } else {
      settings._updateEnabled = false;
    }

    // Use results from device detection if available to determine
    // if the browser supports promises.
    const promises =
      flowData.device !== undefined &&
      flowData.device.promise !== undefined &&
      flowData.device.promise.hasValue === true &&
      flowData.device.promise.value === true;
    settings._supportsPromises = promises;

    let output = mustache.render(template, settings);

    if (settings._minify) {
      const minified = uglifyJS.minify(output);
      if (minified.error === null) {
        output = minified.code;
      }
    }

    const data = new ElementDataDictionary({
      flowElement: this,
      contents: { javascript: output }
    });

    flowData.setElementData(data);
  }
}

module.exports = JavaScriptBuilderElement;