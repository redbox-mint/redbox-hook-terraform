"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const js_terraform_1 = require("js-terraform");
var Services;
(function (Services) {
    class TerraformService extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap'
            ];
            this.tf_log_header = "Terraform Provisioner Service::";
        }
        bootstrap() {
            sails.log.info(`${this.tf_log_header} Bootstrapping...`);
            this.terraform = new js_terraform_1.Terraform();
            sails.log.info(`${this.tf_log_header} Checking if we can execute terraform...`);
            return Rx_1.Observable.from(this.terraform.init(sails.config.terraform.init_module, { silent: false }))
                .flatMap(() => {
                return Rx_1.Observable.from(this.terraform.apply(sails.config.terraform.init_module, { silent: false, autoApprove: true }));
            });
        }
    }
    Services.TerraformService = TerraformService;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.TerraformService().exports();
