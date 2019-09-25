# ReDBox Provisioner: Terraform

A Terraform provisioner for ReDBox.

This hook allows ReDBox to manage and execute Terraform manifests from ReDBox.

Responsibilities:

- Launch and parse Terraform return codes
- Manage Terraform modules and corresponding variables
- Capture and manage Terraform output

On it's own, this plugin doesn't come with any cloud-specific provisioners. You will need to install a cloud specific provisioner, as part of this Terraform-specific platform.

## Installation

To add this plugin to ReDBox portal:

- Clone this repo
- On your ReDBox portal source directory, run: `yarn add file:<local-path-to-repo-clone>`

Start ReDBox Portal as usual.

If you are looking to develop this tool, see further information below.

## API
Your API files are in `typescript/api/**`.  

- controllers
- services

## config & form-config

This configurations are redbox-portal dependent. They will allow redbox to be available as a record
If you require to have a form in your portal

- `config/recordtype`
- `config/workflow`
- `form-config/template-1.0-draft`

## index

Main entry point for the hook

### initialize

Init code before it gets hooked.

### routes

Controller routes exposed to the sails front-end

```javascript
'get /your/route' : YourController.method
```

### configure

Add configuration and services to your sails app

```javascript
sails.services['YourService'] = function() { };
sails.config = _.merge(sails.config, {object});
```

## test

First run `npm install`

Test your sails hook with mocha by running `npm test` before adding the hook to your redbox-portal.
It may cause your application to not lift.    

```sh
$ npm test

> @uts-eresearch/sails-hook-redbox-template@1.0.0 test /Users/moises/source/code.research/sails-hook-redbox-template
> NODE_ENV=test node_modules/.bin/mocha



  Basic tests ::
    ✓ should have a service
    ✓ should have a form
    ✓ should have a route
    ✓ sails does not crash


  4 passing (864ms)

```

For more information on testing your hook go to : https://sailsjs.com/documentation/concepts/testing


## Development in redbox-portal

Requirements:
- Clone redbox-portal
- Create a symbolic link from `<root dir>/api/core --> <redbox-portal-source>/api/core`
- Build the core files

A docker-compose.yml file is present in support/development and is setup to run the full ReDBox stack and install the hook. To run the stack there is a ReDBox Sails Hook Run Utility in the root of the project.

Usage
```
ReDBox Sails Hook Run Utility
Usage: ./runForDev.sh [-a|--(no-)angular] [-h|--help]
	-a,--angular,--no-angular: Angular mode. Will ensure permissions are set correctly on the Sails working directory so that changes can be applied (off by default)
	-h,--help: Prints help
```

Note: The first time the stack runs it may take some time as yarn initialises the hook within ReDBox Portal. All subsequent runs should be faster.
