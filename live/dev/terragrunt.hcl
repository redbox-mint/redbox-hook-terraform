#####################################################################
## DEVELOPMENT ENVIRONMENT - Common Configuration
##
## This configuration applies to all apps in the "DEV" environment
##
## Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
#####################################################################

# Configure Terragrunt to automatically store tfstate files in an S3 bucket
remote_state {
  backend = "gcs"
  config = {
    skip_bucket_creation = true
    bucket = "${get_env("TG_BUCKET_NAME", "")}"
    prefix = "${path_relative_to_include()}"
    # Notes:
    # - Credentials path injected via env var: $GOOGLE_APPLICATION_CREDENTIALS
    # - Customer encryption key injected via env var: $GOOGLE_ENCRYPTION_KEY
  }
}

# Configure root level variables that all resources can inherit. This is especially helpful with multi-account configs
# where terraform_remote_state data sources are placed directly into the modules.
inputs = {
  # Note that these are required, but are commented out as these are expected
  # to be injected via the environment or a variable file.
  // gcp_project_id =
}
