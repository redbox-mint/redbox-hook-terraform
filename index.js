/*
Terraform Provisioner Hook

 */
const _ = require('lodash');
const fs = require('fs-extra');
const { resolve } = require('path');

async function getFiles(dir) {
  const subdirs = await fs.readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = resolve(dir, subdir);
    return (await fs.stat(res)).isDirectory() ? getFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

var walkSync = function(dir, filelist) {
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

const hook_root_dir = "node_modules/redbox-hook-terraform"

module.exports = function (sails) {
  return {
    initialize: function (cb) {
      // Do Some initialisation tasks
      // This can be for example: copy files or images to the redbox-portal front end
      return cb();
    },
    //If each route middleware do not exist sails.lift will fail during hook.load()
    routes: {
      before: {},
      after: {
      }
    },
    configure: function () {
      sails.log.info("Terraform Provisioner::Configuring...");
      // read custom configuration and merge with sails.config
      const config_dirs = [hook_root_dir + "/form-config", hook_root_dir + "/config"];
      _.each(config_dirs, (config_dir) => {
        if (fs.pathExistsSync(config_dir)) {
          let files = [];
          files = walkSync(config_dir, files);
          sails.log.info("Terraform Provisioner::Processing:");
          sails.log.info(files);
          _.each(files, (file_path) => {
            const config_file = require(file_path);
            _.merge(sails.config, config_file);
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
    }
  }
};
