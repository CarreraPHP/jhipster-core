const JDLApplication = require('./jdl_application');
const JDLEntity = require('./jdl_entity');
const JDLEnum = require('./jdl_enum');
const JDLRelationship = require('./jdl_relationship');
const JDLRelationships = require('./jdl_relationships');
const JDLAbstractRelationship = require('./abstract_jdl_option');
const JDLOptions = require('./jdl_options');
const BuildException = require('../exceptions/exception_factory').BuildException;
const exceptions = require('../exceptions/exception_factory').exceptions;

class JDLObject {
  constructor() {
    this.applications = {};
    this.entities = {};
    this.screens = {
      entity: {},
      transaction: {}
    };
    this.enums = {};
    this.relationships = new JDLRelationships();
    this.options = new JDLOptions();
    this.placeholders = {};
  }

  getOptions() {
    return this.options.getOptions();
  }

  /**
   * Adds or replaces an application.
   * @param application the application.
   */
  addApplication(application) {
    const errors = JDLApplication.checkValidity(application);
    if (errors.length !== 0) {
      throw new BuildException(
        exceptions.InvalidObject,
        `The application must be valid in order to be added.\nErrors: ${errors.join(', ')}`);
    }
    this.applications[application.config.baseName] = application;
  }

  setPlaceHolder(name, value) {
    this.placeholders[name] = value;
  }

  /**
   * Adds or replaces an entity.
   * @param entity the entity to add.
   */
  addEntity(entity) {
    const errors = JDLEntity.checkValidity(entity);
    if (errors.length !== 0) {
      throw new BuildException(
        exceptions.InvalidObject,
        `The entity must be valid in order to be added.\nErrors: ${errors.join(', ')}`);
    }
    this.entities[entity.name] = entity;
  }

  /**
   * Adds or replaces an entity.
   * @param entity the entity to add.
   */
  addScreen(screen, type) {
    // const errors = JDLEntity.checkValidity(screen);
    // if (errors.length !== 0) {
    //   throw new BuildException(
    //     exceptions.InvalidObject,
    //     `The Screen must be valid in order to be added.\nErrors: ${errors.join(', ')}`);
    // }
    this.screens[type][screen.name] = screen;
  }

  /**
   * Adds or replaces an enum.
   * @param enumToAdd the enum to add.
   */
  addEnum(enumToAdd) {
    const errors = JDLEnum.checkValidity(enumToAdd);
    if (errors.length !== 0) {
      throw new BuildException(
        exceptions.InvalidObject,
        `The enum must be valid in order to be added.\nErrors: ${errors.join(', ')}`);
    }
    this.enums[enumToAdd.name] = enumToAdd;
  }

  addRelationship(relationship) {
    const errors = JDLRelationship.checkValidity(relationship);
    if (errors.length !== 0) {
      throw new BuildException(
        exceptions.InvalidObject,
        `The relationship must be valid in order to be added.\nErrors: ${errors.join(', ')}`);
    }
    this.relationships.add(relationship);
  }

  addOption(option) {
    const errors = JDLAbstractRelationship.checkValidity(option);
    if (errors.length !== 0) {
      throw new BuildException(
        exceptions.InvalidObject,
        `The option must be valid in order to be added.\nErrors: ${errors.join(', ')}`);
    }
    this.options.addOption(option);
  }

  toString() {
    let string = '';
    string += `${applicationsToString(this.applications)}\n`;
    string += `${entitiesToString(this.entities)}\n`;
    string += `${enumsToString(this.enums)}\n`;
    string += `${relationshipsToString(this.relationships)}\n`;
    string += `${optionsToString(this.options)}`;
    return string;
  }
}

function applicationsToString(applications) {
  let string = '';
  Object.keys(applications).forEach((applicationName) => {
    string += `${applications[applicationName].toString()}\n`;
  });
  return string;
}

function entitiesToString(entities) {
  let string = '';
  Object.keys(entities).forEach((entityName) => {
    string += `${entities[entityName].toString()}\n`;
  });
  return string.slice(0, string.length - 1);
}
function enumsToString(enums) {
  let string = '';
  Object.keys(enums).forEach((enumName) => {
    string += `${enums[enumName].toString()}\n`;
  });
  return string;
}
function relationshipsToString(relationships) {
  const string = relationships.toString();
  if (string === '') {
    return '';
  }
  return `${relationships.toString()}\n`;
}
function optionsToString(options) {
  const string = options.toString();
  if (string === '') {
    return '';
  }
  return `${string}\n`;
}

module.exports = JDLObject;
