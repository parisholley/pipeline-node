const evidenceKeyFilterBase = require("./evidenceKeyFilter");

class flowElement {

    /**
     * Constructor for flowElement class
     *
     * @param {Object} options
     * @param {String} options.dataKey the dataKey the flowElement's elementData will be stored under
     * @param {Function} options.processInternal callback to act on flowData
     * @param {Object} options.properties list of properties including metadata
     * @param {{Function(new:evidenceKeyFilter)}} options.evidenceKeyFilter an instance of an evidenceKeyFilter
    */
    constructor(
        {
            processInternal,
            dataKey,
            properties = {},
            evidenceKeyFilter

        } = {}) {

        this.dataKey = dataKey;

        if (processInternal) {

            this.processInternal = processInternal;

        }

        this.properties = properties;

        if (evidenceKeyFilter) {

            this.evidenceKeyFilter = evidenceKeyFilter;

        } else {

            this.evidenceKeyFilter = new evidenceKeyFilterBase();

        }

        this.registrationCallbacks = [];

        // List of pipelines the flowElement has been added to
        this.pipelines = [];

    }

    /**
     * Function to be called when a flowElement is added to pipeline, runs through any registrationCallbacks on the flowElement     
    * */
    onRegistration(pipeline, flowElement) {

        this.registrationCallbacks.forEach(function (registrationCallback) {

            registrationCallback(pipeline, flowElement);

        });

    }

    /**
     * Internal process function for a particular flowElement called (via the flowElement.process() method) when flowData generated by a pipleline is processsed. Overriden by instances of this base class
    */
    processInternal() {

        return true;

    }

    /**
     * To allow actions to take place before and after a flowElement's processInternal function runs, a process wrapper is run first
    */
    process(flowData) {

        return Promise.resolve(this.processInternal(flowData));

    }

    /**
     * Call this function to update the properties meta database in all the pipelines this flowElement has been added to
    */
    updateProperties() {

        let flowElement = this;

        let updates = [];

        this.pipelines.forEach(function (pipeline) {

            updates.push(pipeline.updatePropertyDataBaseForElement(flowElement));

        });

        return Promise.all(updates);

    }

    /**
     * Get a flowElement's properties. By default returns a promise wrapped version of the object's properties list
     * Can return standard value or promise
    */
    getProperties() {

        return this.properties;

    }

}

module.exports = flowElement;