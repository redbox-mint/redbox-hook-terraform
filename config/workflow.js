module.exports.workflow = {
  "terraform-gcp-omeka": {
    "draft": {
      config: {
        workflow: {
          stage: 'draft',
          stageLabel: 'Draft',
        },
        authorization: {
          viewRoles: ['Admin', 'Librarians'],
          editRoles: ['Admin', 'Librarians']
        },
        form: 'terraform-gcp-omeka-1.0'
      },
      starting: true
    }
  }
};
