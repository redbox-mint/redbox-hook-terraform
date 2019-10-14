"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const js_terraform_1 = require("js-terraform");
const fs = require("fs-extra");
var Services;
(function (Services) {
    class TerraformService extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'provision',
                'prepareProvision'
            ];
            this.tf_log_header = "Terraform Provisioner Service::";
        }
        bootstrap() {
            sails.log.info(`${this.tf_log_header} Bootstrapping...`);
            this.terragrunt = new js_terraform_1.Terragrunt();
            sails.log.info(`${this.tf_log_header} Checking if we can execute Terragrunt...`);
            return Rx_1.Observable.from(this.terragrunt.applyAll(sails.config.terraform.terragrunt_base + sails.config.terraform.init_module_terragrunt, { silent: false, autoApprove: true }));
        }
        prepareProvision(oid, record, options) {
            sails.log.verbose(`Preparing to provision: ${oid}`);
            sails.log.verbose(JSON.stringify(record));
            const recType = record.metaMetadata.type;
            if (options.action == "create") {
                record.metadata.location = { label: TranslationService.t(sails.config.workspacetype[recType].defaultLocation), link: null };
            }
            return Rx_1.Observable.of(record);
        }
        provision(oid, record, options) {
            sails.log.verbose(JSON.stringify(record));
            const recType = record.metaMetadata.type;
            sails.log.verbose(`${this.tf_log_header} Provisioning Workspace Type: ${recType}`);
            const obs = [];
            let rdmp = null;
            let tg_dir = null;
            if (options.action == "create") {
                obs.push(RecordsService.getMeta(record.metadata.rdmpOid)
                    .flatMap((rdmpData) => {
                    rdmp = rdmpData;
                    sails.log.verbose(`Got RDMP data:`);
                    sails.log.verbose(JSON.stringify(rdmpData));
                    rdmpData.metadata.workspaces.push({
                        id: oid,
                        title: record.metadata.title,
                        description: record.metadata.description,
                        rmdpOid: record.metadata.rdmpOid,
                        rdmpTitle: rdmpData.metadata.title,
                        location: { label: TranslationService.t(sails.config.workspacetype[recType].defaultLocation), link: null }
                    });
                    return RecordsService.updateMeta(null, record.metadata.rdmpOid, rdmpData);
                })
                    .flatMap(() => {
                    return this.prepareTargetDir(oid, record, options, recType);
                })
                    .flatMap((terragrunt_target_dir) => {
                    tg_dir = terragrunt_target_dir;
                    return this.applyTemplate(terragrunt_target_dir);
                })
                    .flatMap(() => {
                    sails.log.verbose(`${this.tf_log_header} Template applied, retrieving output...`);
                    return this.terragrunt.output(tg_dir, { simple: false });
                })
                    .flatMap((output) => {
                    sails.log.verbose(`${this.tf_log_header} Output received, saving.`);
                    record.metadata.output = output;
                    const serviceName = sails.config.workspacetype[recType].service;
                    const location = sails.services[serviceName].getLocation(oid, record, recType);
                    const workspaceEntry = _.find(rdmp.metadata.workspaces, (w) => { return w.id == oid; });
                    workspaceEntry.location = location;
                    record.metadata.location = location;
                    return RecordsService.updateMeta(null, record.metadata.rdmpOid, rdmp);
                })
                    .flatMap(() => {
                    return WorkflowStepsService.get(recType, sails.config.workspacetype[recType].postProvisionState);
                })
                    .flatMap((wfStep) => {
                    RecordsService.updateWorkflowStep(record, wfStep);
                    return RecordsService.updateMeta(null, oid, record, null, false, false);
                })
                    .flatMap(() => {
                    sails.log.verbose(`Provision completed: ${tg_dir}`);
                    return Rx_1.Observable.of("");
                }));
            }
            return _.isEmpty(obs) ? Rx_1.Observable.of(record) : Rx_1.Observable.zip(...obs);
        }
        prepareTargetDir(oid, record, options, recType) {
            let terragrunt_target_dir = null;
            let terragrunt_env_file = null;
            if (options.action == "create") {
                const templateDir = `${sails.config.workspacetype[recType].terragrunt_base}templates/${recType}/`;
                const envConfigFile = `${sails.config.workspacetype[recType].terragrunt_base}terragrunt.hcl`;
                sails.log.verbose(`${this.tf_log_header} On create, applying using template from: ${templateDir}`);
                const pathExistsNodeBind = Rx_1.Observable.bindNodeCallback(fs.pathExists);
                return pathExistsNodeBind(templateDir)
                    .flatMap((pathExists) => {
                    if (pathExists) {
                        terragrunt_target_dir = `${sails.config.terraform.terragrunt_base}${sails.config.terraform.environment}/${recType}-${oid}/`;
                        terragrunt_env_file = `${sails.config.terraform.terragrunt_base}${sails.config.terraform.environment}/terragrunt.hcl`;
                        sails.log.verbose(`${this.tf_log_header} Using target directory: ${terragrunt_target_dir}`);
                        return pathExistsNodeBind(terragrunt_target_dir);
                    }
                    sails.log.error(`${this.tf_log_header} Template Path doesn't exist: ${templateDir}`);
                    return Rx_1.Observable.throw(new Error(`Template Path doesn't exist: ${templateDir}`));
                })
                    .flatMap((pathExists) => {
                    if (!pathExists) {
                        sails.log.verbose(`${this.tf_log_header} Target doesn't exist, creating: ${terragrunt_target_dir}`);
                        return Rx_1.Observable.bindNodeCallback(fs.ensureDir)(terragrunt_target_dir);
                    }
                    return Rx_1.Observable.of("");
                })
                    .flatMap(() => {
                    sails.log.verbose(`${this.tf_log_header} Copying ${templateDir} into ${terragrunt_target_dir}`);
                    return Rx_1.Observable.bindNodeCallback(fs.copy)(templateDir, terragrunt_target_dir);
                })
                    .flatMap(() => {
                    sails.log.verbose(`${this.tf_log_header} Copying environment config ${envConfigFile} into ${terragrunt_env_file}`);
                    return Rx_1.Observable.bindNodeCallback(fs.copy)(envConfigFile, terragrunt_env_file);
                })
                    .flatMap(() => {
                    sails.log.verbose(`${this.tf_log_header} Copied template: ${templateDir} into ${terragrunt_target_dir}`);
                    const serviceName = sails.config.workspacetype[recType].service;
                    sails.log.verbose(`${this.tf_log_header} '${recType}' will use service: ${serviceName}`);
                    const targetConfigFile = `${terragrunt_target_dir}terragrunt.hcl`;
                    const appendData = this.inputMapToHcl(sails.services[serviceName].getInputMap(oid, record));
                    return Rx_1.Observable.bindNodeCallback(fs.appendFile)(targetConfigFile, appendData);
                })
                    .flatMap(() => {
                    sails.log.verbose(`${this.tf_log_header} Appended config in: ${terragrunt_target_dir}terragrunt.hcl`);
                    return Rx_1.Observable.of(terragrunt_target_dir);
                });
            }
            else {
                sails.log.verbose(`${this.tf_log_header} Unsupported action, yet.`);
                return Rx_1.Observable.of(terragrunt_target_dir);
            }
        }
        inputMapToHcl(jsonData) {
            let hcl = `inputs = {`;
            _.each(jsonData, (v, k) => {
                if (_.isString(v)) {
                    hcl = `${hcl}\n  ${k} = "${v}"`;
                }
                else if (_.isMap(v) || _.isArray(v)) {
                    hcl = `${hcl}\n ${k} = ${JSON.stringify(v)}`;
                }
            });
            hcl = `${hcl}\n}`;
            return hcl;
        }
        applyTemplate(terragrunt_target_dir) {
            sails.log.verbose(`${this.tf_log_header} Applying configuration in: ${terragrunt_target_dir}`);
            return this.terragrunt.applyAll(terragrunt_target_dir, { silent: false, autoApprove: true });
        }
    }
    Services.TerraformService = TerraformService;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.TerraformService().exports();
