module.exports.terraform = {
  environment: "dev",
  hookTimeout: "60000",
  install_base_url: "https://releases.hashicorp.com/terraform/",
  version: "0.12.9",
  arch: "linux_amd64",
  tmp: "/tmp/",
  path: "/bin/terraform",
  // Terragrunt-specific
  use_terragrunt: true,
  terragrunt_base: '/opt/redbox-portal/node_modules/redbox-hook-terraform/live/',
  init_module_terragrunt: "local/init",
  terragrunt: {
    install_base_url: "https://github.com/gruntwork-io/terragrunt/releases/download/",
    version: "v0.19.26",
    path: "/bin/terragrunt"
  }
};
