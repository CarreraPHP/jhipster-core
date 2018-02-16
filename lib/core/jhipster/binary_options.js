const values = require('../../utils/object_utils').values;

const BINARY_OPTIONS = {
  DTO: 'dto',
  SERVICE: 'service',
  PAGINATION: 'pagination',
  MICROSERVICE: 'microservice',
  SEARCH_ENGINE: 'searchEngine',
  ANGULAR_SUFFIX: 'angularSuffix',
  FEATURES: 'features',
  AUTO_APPROVAL: 'autoapproval',
  APPROVAL: 'approval'
};
const VALUES = {
  dto: { MAPSTRUCT: 'mapstruct' },
  service: { SERVICE_CLASS: 'serviceClass', SERVICE_IMPL: 'serviceImpl' },
  pagination: {
    PAGER: 'pager',
    PAGINATION: 'pagination',
    'INFINITE-SCROLL': 'infinite-scroll'
  },
  searchEngine: {
    ELASTIC_SEARCH: 'elasticsearch',
    ADVANCE_SEARCH: 'advancesearch',
    COLUMN_SEARCH: 'columnsearch'
  },
  features: {
    IMPORT: 'import',
    EXPORT: 'export',
    BULK_APPROVAL: 'bulkapproval',
    BULK_SUBMIT: 'bulksubmit',
    VIEW_HISTORY: 'viewhistory'
  },
  autoapproval: {
    MAKER_CHECKER: 'makerchecker'
  },
  approval: {
    MAKER_CHECKER: 'makerchecker'
  }
};

function exists(passedOption, passedValue) {
  const options = Object.keys(BINARY_OPTIONS).map(key => BINARY_OPTIONS[key]);
  return options.some(option => passedOption === option
      && (passedOption === BINARY_OPTIONS.MICROSERVICE || passedOption === BINARY_OPTIONS.ANGULAR_SUFFIX
        || values(VALUES[option]).indexOf(passedValue) !== -1));
}

module.exports = {
  BINARY_OPTIONS,
  BINARY_OPTION_VALUES: VALUES,
  exists
};
