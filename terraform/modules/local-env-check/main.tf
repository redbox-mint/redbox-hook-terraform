##
## A simple manifest just to check if we could launch terraform
##
resource "null_resource" "local_environment" {
  provisioner "local-exec" {
    command = "terraform version"
  }
}
