// Copyright (c) 2019 Queensland Cyber Infrastructure Foundation (http://www.qcif.edu.au/)
//
// GNU GENERAL PUBLIC LICENSE
//    Version 2, June 1991
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

import { Observable } from 'rxjs/Rx';
import services = require('../core/CoreService.js');
import { Sails } from "sails";
import { Terraform, Terragrunt } from 'js-terraform';
import fs = require('fs-extra');
declare var sails: Sails;
declare var _;
declare var RecordsService, TranslationService, WorkflowStepsService;

export module Services {
  /**
   * Terraform laucher service
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class TerraformService extends services.Services.Core.Service {
    protected _exportedMethods: any = [
      'bootstrap',
      'provision',
      'prepareProvision'
    ];

    private tf_log_header = "Terraform Provisioner Service::";
    private terragrunt: Terragrunt;

    public bootstrap(): Observable<any> {
      sails.log.info(`${this.tf_log_header} Bootstrapping...`);
      this.terragrunt = new Terragrunt();
      sails.log.info(`${this.tf_log_header} Checking if we can execute Terragrunt...`);
      return Observable.from(this.terragrunt.applyAll(sails.config.terraform.terragrunt_base + sails.config.terraform.init_module_terragrunt, {silent:false, autoApprove:true}));

    }

    /**
     * Prepare the records with defaults, etc. This will be called prior to saving the record.
     *
     * @author <a target='_' href='https://github.com/shilob'>Shilo Banihit</a>
     *
     * @param  oid
     * @param  record
     * @param  options
     * @return
     */
    public prepareProvision(oid: string, record:any, options:any) {
      sails.log.verbose(`Preparing to provision: ${oid}`);
      sails.log.verbose(JSON.stringify(record));
      const recType = record.metaMetadata.type;
      if (options.action == "create") {
        // set the default location, we don't put this in the form, as it will clobber the existing value when editing
        record.metadata.location = { label: TranslationService.t(sails.config.workspacetype[recType].defaultLocation), link: null };
      }

      return Observable.of(record);
    }

    /**
     * Provisions by examining the record type. This is usually called after saving the record.
     *
     * This method is designed to be asynchronous, and thus can be called as a post-save trigger.
     *
     * @author <a target='_' href='https://github.com/shilob'>Shilo Banihit</a>
     * @param  oid
     * @param  record
     * @param  options
     * @return void
     */
    public provision(oid:string, record:any, options:any) {
      sails.log.verbose(JSON.stringify(record));
      const recType = record.metaMetadata.type;
      sails.log.verbose(`${this.tf_log_header} Provisioning Workspace Type: ${recType}`);
      const obs = [];
      let rdmp = null;
      let tg_dir = null;
      if (options.action == "create") {
        // associate the workspace in the DMP record: workspaces field
        obs.push(Observable.from(RecordsService.getMeta(record.metadata.rdmpOid))
        .flatMap((rdmpData:any) => {
          rdmp = rdmpData;
          sails.log.verbose(`Got RDMP data:`);
          sails.log.verbose(JSON.stringify(rdmpData));
          rdmpData.metadata.workspaces.push({
            id: oid,
            title: record.metadata.title,
            description: record.metadata.description,
            rmdpOid: record.metadata.rdmpOid,
            rdmpTitle: rdmpData.metadata.title,
            location: { label: TranslationService.t(sails.config.workspacetype[recType].defaultLocation), link: null}
          });
          // Update the DMP...
          return Observable.from(RecordsService.updateMeta(null, record.metadata.rdmpOid, rdmpData));
        })
        .flatMap(() => {
          return this.prepareTargetDir(oid, record, options, recType);
        })
        .flatMap((terragrunt_target_dir:string) => {
          tg_dir = terragrunt_target_dir;
          return this.applyTemplate(terragrunt_target_dir);
        })
        .flatMap(() => {
          sails.log.verbose(`${this.tf_log_header} Template applied, retrieving output...`);
          return this.terragrunt.output(tg_dir, {simple: false});
        })
        .flatMap((output: any) => {
          sails.log.verbose(`${this.tf_log_header} Output received, saving.`);
          // save the output in medata.output
          record.metadata.output = output;
          const serviceName = sails.config.workspacetype[recType].service;
          const location = sails.services[serviceName].getLocation(oid, record, recType);
          const workspaceEntry = _.find(rdmp.metadata.workspaces, (w) => { return w.id == oid });
          workspaceEntry.location = location;
          record.metadata.location = location;
          return Observable.from(RecordsService.updateMeta(null, record.metadata.rdmpOid, rdmp));
        })
        .flatMap(() => {
          // get the next step after provisioned
          return WorkflowStepsService.get(recType, sails.config.workspacetype[recType].postProvisionState);
        })
        .flatMap((wfStep) => {
          RecordsService.updateWorkflowStep(record, wfStep);
          // we update the metadata with the earlier output
          return Observable.from(RecordsService.updateMeta(null, oid, record, null, false, false));
        })
        .flatMap(() => {
          sails.log.verbose(`Provision completed: ${tg_dir}`);
          return Observable.of("");
        })
        );
      }
      return _.isEmpty(obs) ? Observable.of(record) : Observable.zip(...obs);
    }


    private prepareTargetDir(oid: string, record:any, options:any, recType:string): Observable<string> {
      let terragrunt_target_dir = null;
      let terragrunt_env_file = null;
      if (options.action == "create") {
        // prepare the required environment overrides...
        // clone the template directory
        const templateDir = `${sails.config.workspacetype[recType].terragrunt_base}templates/${recType}/`;
        const envConfigFile = `${sails.config.workspacetype[recType].terragrunt_base}terragrunt.hcl`;
        sails.log.verbose(`${this.tf_log_header} On create, applying using template from: ${templateDir}`);
        const pathExistsNodeBind = Observable.bindNodeCallback(fs.pathExists);
        return pathExistsNodeBind(templateDir)
        .flatMap((pathExists) => {
          sails.log.debug(`PathExists is: ${pathExists}`)
          if (pathExists) {
            terragrunt_target_dir = `${sails.config.terraform.terragrunt_base}${sails.config.terraform.environment}/${recType}-${oid}/`;
            terragrunt_env_file = `${sails.config.terraform.terragrunt_base}${sails.config.terraform.environment}/terragrunt.hcl`;
            sails.log.verbose(`${this.tf_log_header} Using target directory: ${terragrunt_target_dir}`);
            return pathExistsNodeBind(terragrunt_target_dir);
          }
          sails.log.error(`${this.tf_log_header} Template Path doesn't exist: ${templateDir}`);
          return Observable.throw(new Error(`Template Path doesn't exist: ${templateDir}`))
        })
        .flatMap((pathExists) => {
          sails.log.debug(`PathExists is: ${pathExists}`)
          if (!pathExists) {
            sails.log.verbose(`${this.tf_log_header} Target doesn't exist, creating: ${terragrunt_target_dir}`);
            return Observable.bindNodeCallback(fs.ensureDir)(terragrunt_target_dir);
          }
          return Observable.of("");
        })
        .flatMap(() => {
          sails.log.verbose(`${this.tf_log_header} Copying ${templateDir} into ${terragrunt_target_dir}`);
          return Observable.bindNodeCallback(fs.copy)(templateDir, terragrunt_target_dir);
        })
        .flatMap(() => {
          sails.log.verbose(`${this.tf_log_header} Copying environment config ${envConfigFile} into ${terragrunt_env_file}`);
          return Observable.bindNodeCallback(fs.copy)(envConfigFile, terragrunt_env_file);
        })
        .flatMap(() => {
          sails.log.verbose(`${this.tf_log_header} Copied template: ${templateDir} into ${terragrunt_target_dir}`);
          const serviceName = sails.config.workspacetype[recType].service;
          sails.log.verbose(`${this.tf_log_header} '${recType}' will use service: ${serviceName}`);
          const targetConfigFile = `${terragrunt_target_dir}terragrunt.hcl`;
          // modify the terragrunt config using the export map...
          const appendData = this.inputMapToHcl(sails.services[serviceName].getInputMap(oid, record));
          return Observable.bindNodeCallback(fs.appendFile)(targetConfigFile, appendData);
        })
        .flatMap(() => {
          sails.log.verbose(`${this.tf_log_header} Appended config in: ${terragrunt_target_dir}terragrunt.hcl`);
          return Observable.of(terragrunt_target_dir);
        });
      } else {
        sails.log.verbose(`${this.tf_log_header} Unsupported action, yet.`);
        return Observable.of(terragrunt_target_dir);
      }
    }

    private inputMapToHcl(jsonData:any) {
      let hcl = `inputs = {`;
      _.each(jsonData, (v, k) => {
        if (_.isString(v)) {
          hcl = `${hcl}\n  ${k} = "${v}"`;
        } else if (_.isMap(v) || _.isArray(v)) {
          hcl = `${hcl}\n ${k} = ${JSON.stringify(v)}`;
        }
      });
      hcl = `${hcl}\n}`
      return hcl;
    }

    private applyTemplate(terragrunt_target_dir: string) {
      sails.log.verbose(`${this.tf_log_header} Applying configuration in: ${terragrunt_target_dir}`);
      return this.terragrunt.applyAll(terragrunt_target_dir, {silent: false, autoApprove: true});
    }

  }
}

module.exports = new Services.TerraformService().exports();
