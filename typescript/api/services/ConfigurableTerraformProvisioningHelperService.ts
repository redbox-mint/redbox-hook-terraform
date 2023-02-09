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

import {
  Observable
} from 'rxjs/Rx';
import { Services as services} from '@researchdatabox/redbox-core-types';
import { TerraformProvisioningHelperService } from './TerraformProvisioningHelperService.js';

import { Sails } from "sails";
import { Terraform, Terragrunt } from 'js-terraform';
declare var sails: Sails;
declare var _;
declare var RecordsService, TranslationService;

export module Services {
  /**
   * Terraform laucher service
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class ConfigurableTerraformProvisioningHelperService extends services.Core.Service implements TerraformProvisioningHelperService {
    protected _exportedMethods: any = [
      'bootstrap',
      'getInputMap',
      'getLocation'
    ];

    public bootstrap(): Observable<any> {
      // nothing to do
      return Observable.of("");
    }


    public getInputMap(oid: string, record: any, recType:string) {
      const inputMap = {};
      let inputMappings = sails.config.workspacetype[recType].inputMappings;
      if(!_.isEmpty(inputMappings)) {
        for(let inputKey in inputMappings) {
          let template = _.template(inputMappings[inputKey], {imports:{record: record, oid: oid, recType:recType}})
          inputMap[inputKey] = template();
        }
      }
      sails.log.debug(`The input map generated for oid ${oid} is:`)
      sails.log.debug(inputMap)
      
      
      return inputMap;
    }

    public getLocation(oid:string, record:any, recType:string, output:any = {}) {
     let location = record.metadata.location;
      let locationMapping = sails.config.workspacetype[recType].locationMapping;
      if(!_.isEmpty(locationMapping)) {
        
          let labelTemplate = _.template(locationMapping['label'], {imports:{output: output,record: record, oid: oid, recType:recType}})
          let linkTemplate = _.template(locationMapping['link'], {imports:{output: output,record: record, oid: oid, recType:recType}})
          location = {
            label: labelTemplate(),
            link: linkTemplate()
          };
      }
      sails.log.debug(`The location generated for oid ${oid} is:`)
      sails.log.debug(location)
      return location;
    }
  }
}
module.exports = new Services.ConfigurableTerraformProvisioningHelperService().exports();
