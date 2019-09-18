module.exports.recordtype = {
  "terraform-gcp-omeka": {
    "packageType": "workspace",
    "searchFilters": [
      {
        name: "text_title",
        title: "search-refine-title",
        type: "exact",
        typeLabel: "search-refine-contains"
      },
      {
        name: "text_description",
        title: "search-refine-description",
        type: "exact",
        typeLabel: "search-refine-contains"
      }
    ]
  }
};
