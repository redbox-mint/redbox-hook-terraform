/**
 * Service interface for helping the TerraformService provision a module
 */

export interface TerraformProvisioningHelperService {
  getInputMap(oid: string, record: any, recType:string);
  getLocation(oid:string, record:any, recType:string, output:any);
}
