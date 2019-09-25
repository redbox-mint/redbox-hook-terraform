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
import { Terraform } from 'js-terraform';
declare var sails: Sails;
declare var _;

export module Services {
  /**
   * Terraform laucher service
   *
   * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
   *
   */
  export class TerraformService extends services.Services.Core.Service {
    protected _exportedMethods: any = [
      'bootstrap'
    ];

    private tf_log_header = "Terraform Provisioner Service::";
    private terraform: Terraform;

    public bootstrap(): Observable<any> {
      sails.log.info(`${this.tf_log_header} Bootstrapping...`);
      this.terraform = new Terraform();
      sails.log.info(`${this.tf_log_header} Checking if we can execute terraform...`);
      return Observable.from(this.terraform.init(sails.config.terraform.init_module, {silent:false}))
      .flatMap(() => {
        return Observable.from(this.terraform.apply(sails.config.terraform.init_module, {silent:false, autoApprove: true}));
      });
    }
  }
}

module.exports = new Services.TerraformService().exports();
