/*
Terraform Provisioner Hook

 */
const _ = require('lodash');
const fs = require('fs-extra');
const { resolve } = require('path');
const { basename, dirname } = require('path');
const request = require('request');
const extract = require('extract-zip');

const walkSync = function(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    const resolved = resolve(dir, file);
    if (fs.statSync(resolved).isDirectory()) {
      filelist = walkSync(resolved , filelist);
    } else {
      filelist.push(resolved);
    }
  });
  return filelist;
};

const installProduct = function(product, tf_path, tf_install_url, tf_zip_path, cb) {
  const download_path = tf_zip_path ? tf_zip_path : tf_path;
  sails.log.verbose("Checking if " + product + " is installed.");
  if (!fs.pathExistsSync(tf_path)) {
    sails.log.verbose("Downloading " + product + " from: " + tf_install_url);
    request.get(tf_install_url)
    .on('end', ()=>{
      if (download_path.indexOf(".zip") != -1) {
        sails.log.verbose("Downloaded "+ product +" to: " + tf_zip_path + ", extracting to: "+ dirname(tf_path));
        extract(tf_zip_path, {dir: dirname(tf_path)}, (error) => {
          if (error) {
            sails.log.error("Error extracting: " + tf_zip_path);
            sails.log.error(error);
            return cb(false);
          } else {
            fs.chmodSync(tf_path, 0o755);
            sails.log.verbose("Extracted "+ product + " to: " + tf_path);
            return cb(true);
          }
        });
      } else {
        fs.chmodSync(tf_path, 0o755);
        sails.log.verbose("Downloaded "+ product + " to: " + tf_path);
        return cb(true);
      }
    })
    .pipe(fs.createWriteStream(download_path));
  } else {
    sails.log.verbose(product + " Already installed.");
    return cb(true);
  }
};

const hook_root_dir = "node_modules/@researchdatabox/redbox-hook-terraform"

module.exports = function (sails) {
  return {
    initialize: function (cb) {
      // Do Some initialisation tasks
      sails.log.info("Terraform Provisioner::Configuring...");
      // read custom configuration and merge with sails.config
      const config_dirs = [hook_root_dir + "/form-config", hook_root_dir + "/config"];
      _.each(config_dirs, (config_dir) => {
        if (fs.pathExistsSync(config_dir)) {
          const files = walkSync(config_dir, []);
          sails.log.info("Terraform Provisioner::Processing:");
          sails.log.info(files);
          const concatArrsFn = function (objValue, srcValue, key) {
            if (_.isArray(objValue)) {
              return objValue.concat(srcValue);
            }
          };
          _.each(files, (file_path) => {
            const config_file = require(file_path);
            _.mergeWith(sails.config, config_file, concatArrsFn);
          });
        } else {
          sails.log.info("Terraform Provisioner::Skipping, directory not found:" + config_dir);
        }
      });

      // language file updates ... only English for now
      // locales directory moved out of assets directory so we can safely merge
      const language_file_path = resolve("assets/locales/en/translation.json");
      const hook_language_file_path = resolve(hook_root_dir, "locales/en/translation.json");
      if (fs.pathExistsSync(language_file_path) && fs.pathExistsSync(hook_language_file_path)) {
        sails.log.info("Terraform Provisioner:: Merging English translation file...");
        const mainTranslation = require(language_file_path);
        const hookTranslation = require(hook_language_file_path);
        _.merge(mainTranslation, hookTranslation);
        fs.writeFileSync(language_file_path, JSON.stringify(mainTranslation, null, 2));
      }

      //If assets directory exists, there must be some assets to copy over
      if(fs.pathExistsSync(hook_root_dir + "/assets/")) {
        sails.log.info("Terraform Provisioner:: Copying branding...");
        fs.copySync(hook_root_dir + "/assets/","assets/");
        fs.copySync(hook_root_dir + "/assets/",".tmp/public/");
      }

      //If views directory exists, there must be some views to copy over
      if(fs.pathExistsSync(hook_root_dir + "/views/")) {
        fs.copySync(hook_root_dir + "/views/","views/");
      }

      // Load up all the services ...
      const servicesDir = resolve(hook_root_dir, "api/services");
      if (fs.pathExistsSync(servicesDir)) {
        const files = walkSync(servicesDir, []);
        _.each(files, (file_path) => {
          const service = require(file_path);
          const serviceName = basename(file_path, '.js')
          sails.services[serviceName] = service;
        });
      }
      // Load up all controllers ...
      const controllersDir = resolve(hook_root_dir, "api/controllers");
      if (fs.pathExistsSync(controllersDir)) {
        const files = walkSync(controllersDir, []);
        _.each(files, (file_path) => {
          const controller = require(file_path);
          sails.controllers[basename(file_path, '.js')] = controller;
        });
      }
      // install terraform and other tools...
      const tf_file_name = "terraform_" + sails.config.terraform.version + "_" + sails.config.terraform.arch + ".zip";
      const tf_install_url = sails.config.terraform.install_base_url + sails.config.terraform.version + "/" + tf_file_name;
      const tf_tmp = sails.config.terraform.tmp;
      const tf_path = sails.config.terraform.path;
      const tf_zip_path = tf_tmp + tf_file_name;

      installProduct("Terraform", tf_path, tf_install_url, tf_zip_path, (status) => {
        if (status) {
          const tg_file_name = "terragrunt_" + sails.config.terraform.arch;
          const tg_install_url = sails.config.terraform.terragrunt.install_base_url + sails.config.terraform.terragrunt.version + "/" + tg_file_name;
          const tg_path = sails.config.terraform.terragrunt.path;
          const tg_zip_path = tf_tmp + tg_file_name;
          installProduct("Terragrunt", tg_path, tg_install_url, null, (status) => {
            if (status) {
              sails.log.info("Terraform Provisioner::Init ok.");
              return cb();
            } else {
              sails.log.info("Terraform Provisioner::Init failed.");
            }
          });
        } else {
          sails.log.info("Terraform Provisioner::Init failed.");
        }
      });
    },
    //If each route middleware do not exist sails.lift will fail during hook.load()
    routes: {
      before: {},
      after: {
      }
    },
    configure: function () {

    }
  }
};
