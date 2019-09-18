module.exports.form = {
  forms: {
    "terraform-gcp-omeka-1.0": {
      name: "terraform-gcp-omeka-1.0",
      type: "terraform-gcp-omeka",
      skipValidationOnSave: true,
      editCssClasses: 'row col-md-12',
      viewCssClasses: 'row col-md-offset-1 col-md-10',
      messages: {
        "saving": ["@dmpt-form-saving"],
        "validationFail": ["@dmpt-form-validation-fail-prefix", "@dmpt-form-validation-fail-suffix"],
        "saveSuccess": ["@dmpt-form-save-success"],
        "saveError": ["@dmpt-form-save-error"]
      },
      fields: [
        {
          class: 'Container',
          compClass: 'TextBlockComponent',
          viewOnly: false,
          definition: {
            name: 'title',
            value: '@hook-tf-gcp-omeka-title',
            type: 'h2'
          }
        },
        {
          class: 'Container',
          compClass: 'TextBlockComponent',
          viewOnly: false,
          definition: {
            name: 'subtitle',
            value: '@hook-tf-gcp-omeka-description',
            type: 'h4'
          }
        },
        {
          class: "ParameterRetriever",
          compClass: 'ParameterRetrieverComponent',
          definition: {
            name: 'parameterRetriever',
            parameterName:'rdmp'
          }
        },
        {
          class: 'RecordMetadataRetriever',
          compClass: 'RecordMetadataRetrieverComponent',
          definition: {
            name: 'rdmpGetter',
            subscribe: {
              'parameterRetriever': {
                onValueUpdate: [{
                  action: 'publishMetadata'
                }]
              }
            }
          }
        },

      ]
    }
  }
};
