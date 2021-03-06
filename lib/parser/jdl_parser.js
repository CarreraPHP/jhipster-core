const _ = require("lodash");
const JDLObject = require("../core/jdl_object");
const JDLApplication = require("../core/jdl_application");
const JDLEnum = require("../core/jdl_enum");
const JDLField = require("../core/jdl_field");
const JDLRelationship = require("../core/jdl_relationship");
const JDLValidation = require("../core/jdl_validation");
const JDLUnaryOption = require("../core/jdl_unary_option");
const JDLBinaryOption = require("../core/jdl_binary_option");
const ApplicationTypes = require("../core/jhipster/application_types")
  .APPLICATION_TYPES;
const UnaryOptions = require("../core/jhipster/unary_options");
const BinaryOptions = require("../core/jhipster/binary_options");
const FieldTypes = require("../core/jhipster/field_types");
const DatabaseTypes = require("../core/jhipster/database_types");
const formatComment = require("../utils/format_utils").formatComment;
const isReservedClassName = require("../core/jhipster/reserved_keywords")
  .isReservedClassName;
const isReservedFieldName = require("../core/jhipster/reserved_keywords")
  .isReservedFieldName;
const BuildException = require("../exceptions/exception_factory")
  .BuildException;
const exceptions = require("../exceptions/exception_factory").exceptions;

module.exports = {
  parse
};

const USER = "User";

let document;
let jdlObject;
let isType;

/**
 * Convert the given intermediate object to JDLObject
 */
function parse(args) {
  // document, databaseType, applicationType, applicationName, generatorVersion
  if (!args.document || !args.databaseType) {
    throw new BuildException(
      exceptions.NullPointer,
      "The parsed JDL content and the database type must be passed."
    );
  }
  init(args.document, args.databaseType, args.applicationType);
  fillApplications(args.generatorVersion);
  fillEnums();
  fillPlaceholders();
  fillClassesAndFields(args.databaseType);
  fillHashsetinClasses();
  fillAssociations();
  fillScreens();
  fillCombolist();
  fillTemplates();

  fillOptions(args.databaseType, args.applicationType, args.applicationName);
  return jdlObject;
}

function init(passedDocument, passedDatabaseType, applicationType) {
  document = passedDocument;
  jdlObject = new JDLObject();
  if (applicationType !== "gateway") {
    isType = FieldTypes.getIsType(passedDatabaseType, () => {
      isType = null;
    });
  } else {
    isType = () => true;
  }
}

function fillApplications(generatorVersion) {
  for (let i = 0; i < document.applications.length; i++) {
    document.applications[i].config.jhipsterVersion = generatorVersion;
    jdlObject.addApplication(new JDLApplication(document.applications[i])); // because there are lot of default values
  }
}

function fillEnums() {
  for (let i = 0; i < document.enums.length; i++) {
    const enumObj = document.enums[i];
    if (isReservedClassName(enumObj.name)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          enumObj.name
        }' is reserved keyword and can not be used as enum class name.`
      );
    }
    jdlObject.addEnum(
      new JDLEnum({
        name: enumObj.name,
        values: enumObj.values,
        comment: formatComment(enumObj.javadoc)
      })
    );
  }
}

function fillPlaceholders() {
  for (let i = 0; i < document.placeholders.length; i++) {
    const phObj = document.placeholders[i];
    if (isReservedClassName(phObj.name)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          phObj.name
        }' is reserved keyword and can not be used as enum class name.`
      );
    }
    jdlObject.setPlaceHolder(phObj.name, phObj.path);
    if (phObj.isDefault) {
      jdlObject.setPlaceHolder("default", phObj.path);
    }
  }
}

function fillClassesAndFields(passedDatabaseType) {
  for (let i = 0; i < document.entities.length; i++) {
    const entity = document.entities[i];
    if (isReservedClassName(entity.name)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          entity.name
        }' is reserved keyword and can not be used as entity class name.`
      );
    }
    const tableName = entity.tableName || entity.name;
    let multilingualFields = [];
    let hasMultiLingualFields = false;

    // get multilingual fields.
    for (let j = 0; j < document.multilingual.length; j++) {
      const record = document.multilingual[j];
      if (record.name === entity.name) {
        hasMultiLingualFields = true;
        multilingualFields = getFields(record, passedDatabaseType);
        break;
      }
    }

    jdlObject.addEntity({
      name: entity.name,
      tableName,
      fields: getFields(entity, passedDatabaseType),
      comment: formatComment(entity.javadoc),
      placeAt: entity.placeholder,
      hasMultiLingualFields,
      multilingualFields
    });
  }

  const relationToUser = document.relationships.filter(
    val => val.to.name.toLowerCase() === USER.toLowerCase()
  );
  if (relationToUser && relationToUser.length && !jdlObject.entities[USER]) {
    jdlObject.addEntity({
      name: USER,
      tableName: "jhi_user",
      fields: {}
    });
  }
}

function fillHashsetinClasses() {
  const consolidatedHashSet = {};

  for (let i = 0; i < document.hashsets.length; i++) {
    const hashset = document.hashsets[i];
    if (isReservedClassName(hashset.entity)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          hashset.entity
        }' is reserved keyword and can not be used as entity class name.`
      );
    }

    if (!(hashset.entity in jdlObject.entities)) {
      console.log(
        `Hashset Entry found for '${
          hashset.entity
        }', but entity definition is missing in JDL file...`
      );
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          hashset.entity
        }' doesn't match with the entity class names available.`
      );
    }

    if (!(hashset.target.entity in jdlObject.entities)) {
      console.log(
        `Hashset Entry found for '${
          hashset.target.entity
        }', but entity definition is missing in JDL file...`
      );
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          hashset.target.entity
        }' doesn't match with the entity class names available.`
      );
    }

    if (!(hashset.entity in consolidatedHashSet)) {
      consolidatedHashSet[hashset.entity] = {
        hashsets: []
      };
    }

    consolidatedHashSet[hashset.entity].hashsets.push({
      targetEntity: hashset.target.entity,
      isHashSet: hashset.target.isHashSet,
      isObject: hashset.target.isObject,
      javadoc: formatComment(hashset.javadoc)
    });
  }

  for (let i = 0, k = Object.keys(jdlObject.entities); i < k.length; i++) {
    const key = k[i];
    jdlObject.entities[key].hashsets = [];
  }

  for (let i = 0, k = Object.keys(consolidatedHashSet); i < k.length; i++) {
    const key = k[i];
    jdlObject.entities[key].hashsets = consolidatedHashSet[key].hashsets;
  }
}

function getFields(entity, passedDatabaseType) {
  const fields = {};
  for (let i = 0; i < entity.body.length; i++) {
    const field = entity.body[i];
    const fieldName = _.lowerFirst(field.name);
    if (fieldName.toLowerCase() === "id") {
      continue; // eslint-disable-line no-continue
    }
    if (isReservedFieldName(fieldName)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${fieldName}' is a reserved keyword and can not be used as entity field name.`
      );
    }
    if (jdlObject.enums[field.type] || isType(field.type)) {
      const fieldObject = new JDLField({
        name: fieldName,
        type: field.type,
        label: field.label,
        cmmod: field.cmmod,
        cmmodname: field.cmmodname,
        precision: field.precision,
        validations: getValidations(field, jdlObject.enums[field.type])
      });
      if (field.javadoc) {
        fieldObject.comment = formatComment(field.javadoc);
      }
      fields[fieldName] = fieldObject;
    } else {
      throw new BuildException(
        exceptions.WrongType,
        `The type '${field.type}' doesn't exist for ${passedDatabaseType}.`
      );
    }
  }
  return fields;
}

function getValidations(field, isAnEnum) {
  const validations = {};
  for (let i = 0; i < field.validations.length; i++) {
    const validation = field.validations[i];
    if (!FieldTypes.hasValidation(field.type, validation.key, isAnEnum)) {
      throw new BuildException(
        exceptions.WrongValidation,
        `The validation '${validation.key}' isn't supported for the type '${
          field.type
        }'.`
      );
    }
    if (validation.constant) {
      validation.value = document.constants[validation.value];
    }
    validations[validation.key] = new JDLValidation({
      name: validation.key,
      value: validation.value
    });
  }
  return validations;
}

function fillAssociations() {
  for (let i = 0; i < document.relationships.length; i++) {
    const relationship = document.relationships[i];
    let actualColumns = [];
    checkEntityDeclaration(relationship);
    actualColumns = addActualColumnsToAssociations(relationship);
    jdlObject.addRelationship(
      new JDLRelationship({
        from: jdlObject.entities[relationship.from.name],
        to: jdlObject.entities[relationship.to.name],
        type: _.upperFirst(_.camelCase(relationship.cardinality)),
        injectedFieldInFrom: relationship.from.injectedfield,
        injectedFieldInTo: relationship.to.injectedfield,
        isInjectedFieldInFromRequired: relationship.from.required,
        isInjectedFieldInToRequired: relationship.to.required,
        commentInFrom: formatComment(relationship.from.javadoc),
        commentInTo: formatComment(relationship.to.javadoc),
        injectActualFields: actualColumns
      })
    );
  }
}

function addActualColumnsToAssociations(relationship) {
  const foreignKeys = document.foreignKeys;
  let toName = relationship.to.name;
  let fromName = relationship.from.name;
  if (relationship.cardinality === "one-to-many") {
    toName = relationship.from.name;
    fromName = relationship.to.name;
  }
  for (let i = 0; i < foreignKeys.length; i++) {
    if (foreignKeys[i].from === fromName && foreignKeys[i].to === toName) {
      return foreignKeys[i].columns;
    }
  }
  return [];
}

function checkEntityDeclaration(relationship) {
  const absentEntities = [];

  if (relationship.from.name.toLowerCase() === USER.toLowerCase()) {
    throw new BuildException(
      exceptions.IllegalAssociation,
      `Relationships from User entity is not supported in the declaration between ${
        relationship.from.name
      } and ` + `${relationship.to.name}.`
    );
  }
  if (!jdlObject.entities[relationship.from.name]) {
    absentEntities.push(relationship.from.name);
  }
  if (
    relationship.to.name.toLowerCase() !== USER.toLowerCase() &&
    !jdlObject.entities[relationship.to.name]
  ) {
    absentEntities.push(relationship.to.name);
  }
  if (absentEntities.length !== 0) {
    throw new BuildException(
      exceptions.UndeclaredEntity,
      `In the relationship between ${relationship.from.name} and ` +
        `${relationship.to.name}, ${absentEntities.join(" and ")} ` +
        `${absentEntities.length === 1 ? "is" : "are"} not declared.`
    );
  }
}

function fillOptions(passedDatabaseType, applicationType, applicationName) {
  fillUnaryOptions();
  fillBinaryOptions(passedDatabaseType);
  if (applicationType === ApplicationTypes.MICROSERVICE) {
    globallyAddMicroserviceOption(applicationName);
  }
}

function fillScreens() {
  // console.log(document);
  for (let i = 0; i < document.screens.entity.length; i++) {
    const screen = document.screens.entity[i];
    if (isReservedClassName(screen.name)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          screen.name
        }' is reserved keyword and can not be used as entity class name.`
      );
    }

    jdlObject.addScreen(
      {
        name: screen.name,
        comment: formatComment(screen.javadoc)
      },
      "entity"
    );
  }

  for (let i = 0; i < document.screens.transaction.length; i++) {
    const screen = document.screens.transaction[i];
    if (isReservedClassName(screen.name)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          screen.name
        }' is reserved keyword and can not be used as entity class name.`
      );
    }

    jdlObject.addScreen(
      {
        name: screen.name,
        comment: formatComment(screen.javadoc)
      },
      "transaction"
    );
  }
}

function fillCombolist() {
  const keys = Object.keys(document.combolist);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const clItem = document.combolist[key];

    if (isReservedClassName(clItem.entity)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          clItem.entity
        }' is reserved keyword and can not be used as entity class name.`
      );
    }

    if (!(clItem.entity in jdlObject.entities)) {
      console.log(
        `Combolist Entry found for '${
          clItem.entity
        }', but entity definition is missing in JDL file...`
      );
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          clItem.entity
        }' doesn't match with the entity class names available.`
      );
    }

    jdlObject.entities[key].combolist = {
      key: clItem.key,
      value: clItem.value
    };
  }
}

function fillTemplates() {
  const keys = Object.keys(document.templates);

  // debugger;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const clItem = document.templates[key];

    if (isReservedClassName(clItem.entity)) {
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          clItem.entity
        }' is reserved keyword and can not be used as entity class name.`
      );
    }

    if (!(clItem.entity in jdlObject.entities)) {
      console.log(
        `Template Entry found for '${
          clItem.entity
        }', but entity definition is missing in JDL file...`
      );
      throw new BuildException(
        exceptions.IllegalName,
        `The name '${
          clItem.entity
        }' doesn't match with the entity class names available.`
      );
    }

    jdlObject.entities[key].template = clItem.template;
    jdlObject.entities[key].templateFileName = clItem.templatedetail.filename;
    jdlObject.entities[key].templateDomainGroup =
      clItem.templatedetail.domaingroup;
    jdlObject.entities[key].templateUIProjectName =
      clItem.templatedetail.uiproject;
    jdlObject.entities[key].templateIsChild = clItem.templatedetail.isChild;
  }
}

function globallyAddMicroserviceOption(applicationName) {
  jdlObject.addOption(
    new JDLBinaryOption({
      name: BinaryOptions.BINARY_OPTIONS.MICROSERVICE,
      value: applicationName,
      entities: document.entities.map(entity => entity.name)
    })
  );
}

function fillUnaryOptions() {
  if (document.noClient.list.length !== 0) {
    jdlObject.addOption(
      new JDLUnaryOption({
        name: UnaryOptions.UNARY_OPTIONS.SKIP_CLIENT,
        entityNames: document.noClient.list,
        excludedNames: document.noClient.excluded
      })
    );
  }
  if (document.noServer.list.length !== 0) {
    jdlObject.addOption(
      new JDLUnaryOption({
        name: UnaryOptions.UNARY_OPTIONS.SKIP_SERVER,
        entityNames: document.noServer.list,
        excludedNames: document.noServer.excluded
      })
    );
  }
  if (document.noFluentMethod.list.length !== 0) {
    jdlObject.addOption(
      new JDLUnaryOption({
        name: UnaryOptions.UNARY_OPTIONS.NO_FLUENT_METHOD,
        entityNames: document.noFluentMethod.list,
        excludedNames: document.noFluentMethod.excluded
      })
    );
  }
  if (document.filter.list.length !== 0) {
    jdlObject.addOption(
      new JDLUnaryOption({
        name: UnaryOptions.UNARY_OPTIONS.FILTER,
        entityNames: document.filter.list,
        excludedNames: document.filter.excluded
      })
    );
  }
}

function addOption(key, value) {
  const option = new JDLBinaryOption({
    name: key,
    value,
    entityNames: document[key][value].list,
    excludedNames: document[key][value].excluded
  });
  if (document[key].value !== undefined || !JDLBinaryOption.isValid(option)) {
    throw new BuildException(
      exceptions.InvalidObject,
      `The parsed ${key} option is not valid for value ${value}.`
    );
  }
  jdlObject.addOption(option);
}

function fillBinaryOptions(passedDatabaseType) {
  _.forEach(BinaryOptions.BINARY_OPTIONS, optionValue => {
    _.forEach(
      document[optionValue],
      (documentOptionValue, documentOptionKey) => {
        if (
          optionValue === BinaryOptions.BINARY_OPTIONS.PAGINATION &&
          passedDatabaseType === DatabaseTypes.Types.cassandra
        ) {
          throw new BuildException(
            exceptions.IllegalOption,
            "Pagination isn't allowed when the app uses Cassandra."
          );
        }
        addOption(optionValue, documentOptionKey);
      }
    );
  });
}
