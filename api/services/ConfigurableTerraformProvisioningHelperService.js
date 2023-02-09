"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = void 0;
const Rx_1 = require("rxjs/Rx");
const redbox_core_types_1 = require("@researchdatabox/redbox-core-types");
var Services;
(function (Services) {
    class ConfigurableTerraformProvisioningHelperService extends redbox_core_types_1.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'getInputMap',
                'getLocation'
            ];
        }
        bootstrap() {
            return Rx_1.Observable.of("");
        }
        getInputMap(oid, record, recType) {
            const inputMap = {};
            let inputMappings = sails.config.workspacetype[recType].inputMappings;
            if (!_.isEmpty(inputMappings)) {
                for (let inputKey in inputMappings) {
                    let template = _.template(inputMappings[inputKey], { imports: { record: record, oid: oid, recType: recType } });
                    inputMap[inputKey] = template();
                }
            }
            sails.log.debug(`The input map generated for oid ${oid} is:`);
            sails.log.debug(inputMap);
            return inputMap;
        }
        getLocation(oid, record, recType, output = {}) {
            let location = record.metadata.location;
            let locationMapping = sails.config.workspacetype[recType].locationMapping;
            if (!_.isEmpty(locationMapping)) {
                let labelTemplate = _.template(locationMapping['label'], { imports: { output: output, record: record, oid: oid, recType: recType } });
                let linkTemplate = _.template(locationMapping['link'], { imports: { output: output, record: record, oid: oid, recType: recType } });
                location = {
                    label: labelTemplate(),
                    link: linkTemplate()
                };
            }
            sails.log.debug(`The location generated for oid ${oid} is:`);
            sails.log.debug(location);
            return location;
        }
    }
    Services.ConfigurableTerraformProvisioningHelperService = ConfigurableTerraformProvisioningHelperService;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.ConfigurableTerraformProvisioningHelperService().exports();
