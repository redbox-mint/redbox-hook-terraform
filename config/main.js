module.exports.terraform = {
  install_base_url: "https://releases.hashicorp.com/terraform/",
  version: "0.12.9",
  arch: "linux_amd64",
  tmp: "/tmp/",
  path: "/bin/terraform",
  init_module: "/opt/redbox-portal/node_modules/redbox-hook-terraform/terraform/modules/local-env-check",
  use_terragrunt: true,
  terragrunt: {
    install_base_url: "https://github.com/gruntwork-io/terragrunt/releases/download/",
    version: "v0.19.26",
    path: "/bin/terragrunt"
  },
  installed_modules: []
};
