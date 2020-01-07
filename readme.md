![51Degrees](https://51degrees.com/DesktopModules/FiftyOne/Distributor/Logo.ashx?utm_source=github&utm_medium=repository&utm_content=readme_main&utm_campaign=node-open-source "THE Fastest and Most Accurate Device Detection") **v4 Node Pipeline**

[Developer Documentation](https://docs.51degrees.com?utm_source=github&utm_medium=repository&utm_content=documentation&utm_campaign=node-open-source "advanced developer documentation") | [Available Properties](https://51degrees.com/resources/property-dictionary?utm_source=github&utm_medium=repository&utm_content=property_dictionary&utm_campaign=node-open-source "View all available properties and values")

## Introduction
This project is an early access repository for the latest v4 Pipeline using Node.Js.

The Pipeline is a generic web request intelligence and data processing solution with the ability to add a range of 51Degrees and/or custom plug ins (Engines) 

### Device detection

Device detection can be performed 'on-premise' using a local data file or via the 51Degrees cloud service. 

When running on-premise, two detection methods are supported.

**Pattern:**  Searches for device signatures in a User-Agent returning metrics about the validity of the results. Does NOT use regular expressions.

**Hash:** A large binary file populated with User-Agent signatures allowing very fast detection speeds.

All methods use an external data file which can easily be updated.

Usage examples are available in both ``fiftyone.pipeline.devicedetection`` and ``fiftyone.pipeline.core``

### Geo location

A Geo location solution, backed by several different vendors, is available via the 51Degrees cloud service. 
Regardless of vendor, this currently requires longitude and latitude information from the client device, which is retrieved seamlessly by the pipeline.

#### Pipeline Builder Settings
 - String ``licenceKeys`` - The license key supplied with your available product.
 
 - String ``dataFile`` - The path to the data file. This will default to using the 51Degrees Cloud service if empty.

 - Boolean ``autoUpdate`` - Whether to update automatically update the data file. 

 - Boolean ``shareUsage`` - Whether to update send usage data to 51Degrees. This helps improve the per
 
 - String ``resourceKey`` - Resource Key is evidence used within the Cloud service for monitoring usage.
 
 - Number ``cacheSize`` - Sets the default cache size.
