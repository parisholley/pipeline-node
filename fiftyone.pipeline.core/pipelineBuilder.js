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

const Pipeline = require('./pipeline');

const fs = require('fs');
const path = require('path');

class PipelineBuilder {
  constructor (settings = {}) {
    this.flowElements = [];

    if (settings.addJavaScriptBuilder) {
      this.addJavaScriptBuilder = settings.addJavascriptBuilder;
    } else {
      this.addJavaScriptBuilder = true;
    }

    if (settings.javascriptBuilderSettings) {
      this.javascriptBuilderSettings = settings.javascriptBuilderSettings;
    }
  }

  /**
   * Helper that loads a JSON configuration file from the filesystem and calls pipelineBuilder.buildFromConfiguration
   * @param {String} path path to a JSON configuration file
   */
  buildFromConfigurationFile (configPath) {
    const file = fs.readFileSync(configPath, 'utf8');

    const parsedFile = JSON.parse(file);

    return this.buildFromConfiguration(parsedFile);
  }

  /**
   * Create a pipeline from a JSON configuration
   * @param {Object} config a JSON configuration object
   */
  buildFromConfiguration (config) {
    let flowElements = [];

    config.PipelineOptions.Elements.forEach(function (element) {
      let FlowElement;

      try {
        FlowElement = require(element.elementName);
      } catch (e) {
        try {
          const localPath = path.resolve(process.cwd(), element.elementName);

          FlowElement = require(localPath);
        } catch (e) {
          throw "Can't find " + element.elementName;
        }
      }

      if (!element.elementParameters) {
        element.elementParameters = {};
      }

      flowElements.push(new FlowElement(element.elementParameters));
    });

    flowElements = flowElements.concat(this.getJavaScriptElements());

    return new Pipeline(flowElements);
  }

  getJavaScriptElements () {
    const flowElements = [];

    if (this.addJavaScriptBuilder) {
      // Add JavaScript elements

      const JavascriptBuilder = require('./javascriptbuilder');
      const JsonBundler = require('./jsonbundler');
      const SequenceElement = require('./sequenceElement');

      flowElements.push(new SequenceElement());
      flowElements.push(new JsonBundler());

      if (this.javascriptBuilderSettings) {
        flowElements.push(
          new JavascriptBuilder(this.javascriptBuilderSettings)
        );
      } else {
        flowElements.push(new JavascriptBuilder({}));
      }
    }

    return flowElements;
  }

  /**
   * Add a single flowElement to be executed in series
   * @param {FlowElement} flowElement
   */
  add (flowElement) {
    this.flowElements.push(flowElement);

    return this;
  }

  /**
   * Add an array of flowElements to be executed in parallel
   * @param {FlowElement[]} flowElements
   */
  addParallel (flowElements) {
    this.flowElements.push(flowElements);

    return this;
  }

  /**
   * Build the pipeline from the flowElements that have been added
   * @returns {Pipeline}
   */
  build () {
    this.flowElements = this.flowElements.concat(this.getJavaScriptElements());

    return new Pipeline(this.flowElements);
  }
}

module.exports = PipelineBuilder;
