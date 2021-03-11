import { createSqlToInsertInto } from "../importationUtils.js";
import Logger from "../Logger.js";

import { parseMoleculesFromCsv } from "./moleculesParser.js";

export const MOLECULES_MAX_LENGTHS = {
  DCI: 128,
  PROPERTY_VALUE: 128,
  CLASSIFICATION_VALUE: 128,
  SKELETAL_FORMULA: 64,
};

const propertiesId = {
  sideEffects: 1,
  interactions: 2,
  indications: 3,
};

/**
 * Parse a csv file and create the sql script to insert it in database
 * @param {string} filename The csv file to parse
 * @returns {Promise<string>} The sql script
 */
export async function parseAndCreateSqlToInsertAllData(filename) {
  const json = await parseMoleculesFromCsv(filename);
  return createSqlToInsertAllData(JSON.parse(json));
}

/**
 * Create a script to insert parsed data in database
 * @param {object} data The parsed data
 * @returns {string} The sql script
 */
export function createSqlToInsertAllData(data) {
  let script = "START TRANSACTION; SET AUTOCOMMIT=0; SET FOREIGN_KEY_CHECKS = 0; ";

  script +=
    ["molecule", "class", "system", "property", "property_value", "molecule_property"].reduce(
      (script, table) => {
        return script + `DELETE FROM ${table}; `;
      },
      ""
    ) + "SET FOREIGN_KEY_CHECKS = 1; ";

  script += createSqlToInsertClassification("class", data["classes"]);
  script += createSqlToInsertClassification("system", data["systems"]);

  for (let property of ["sideEffects", "indications", "interactions"]) {
    script += createSqlToInsertProperty(property, data[property]);
  }
  script += createSqlToInsertAllMolecules(data.molecules);
  script += "COMMIT; SET AUTOCOMMIT=1;";
  return script;
}

/**
 * Create the script to insert all values of classification
 * @param {string} name The classification table
 * @param {object[]} classification The list of higher nodes
 * @returns {string}
 */
function createSqlToInsertClassification(name, classification) {
  const insertNodeAndChildren = createClassificationNodeInserter(name);
  return classification.reduce((sql, node) => sql + insertNodeAndChildren(node, null, 1), "");
}

/**
 * Create the function that creates the sql script to insert a node and its children
 * @param {string} classification
 * @returns {function({id : number, name : string, children : object[]}, higher : number, level : number) : string}
 */
function createClassificationNodeInserter(classification) {
  function insertNode(id, name, higher, level) {
    name = String(name).substr(0, MOLECULES_MAX_LENGTHS.CLASSIFICATION_VALUE);
    return createSqlToInsertInto(classification)()([id, name, higher, level]);
  }

  return function createSqlToInsertNodeAndChildren({ id, name, children }, higher, level) {
    return (
      insertNode(id, name, higher, level) +
      children.reduce(
        (sql, node) => sql + createSqlToInsertNodeAndChildren(node, id, level + 1),
        ""
      )
    );
  };
}

/**
 * Create the sql script to insert a property and its values
 * @param {string} name The property name
 * @param {{name : string, id : number}[]} values The property values
 * @returns {string}
 */
function createSqlToInsertProperty(name, values) {
  const id = propertiesId[name];
  let script = createSqlToInsertInto("property")("pr_id", "pr_name")(id, name);

  return values.reduce((sql, value) => {
    const valueId = newIdForPropertyValue(id, value.id);
    return (
      sql +
      createSqlToInsertInto("property_value")("pv_id", "pv_name", "pv_property")(
        valueId,
        String(value.name).substr(0, MOLECULES_MAX_LENGTHS.PROPERTY_VALUE),
        id
      )
    );
  }, script);
}

/**
 * Create a unique id for a property values, from the id of the property and the id of the value
 * @param {number} propertyId
 * @param {number} valueId
 * @returns {number}
 */
function newIdForPropertyValue(propertyId, valueId) {
  return Number(String(propertyId) + String(valueId));
}

/**
 * Create the sql script to insert all molecules in database
 * @param {object[]} molecules
 * @returns {string}
 */
function createSqlToInsertAllMolecules(molecules) {
  return molecules.reduce(
    (sql, molecule) => sql + createSqlToInsertMolecule(new FormattedMolecule(molecule)),
    ""
  );
}

/**
 * Create the sql command to insert a molecule in database
 * @param {FormattedMolecule} molecule
 * @returns {string}
 */
function createSqlToInsertMolecule(molecule) {
  if (!FormattedMolecule.isInstance(molecule)) {
    Logger.error(new Error("Molecule must be formatted to be inserted"));
    return;
  }

  const columns = [
    "mo_id",
    "mo_dci",
    "mo_skeletal_formula",
    "mo_ntr",
    "mo_difficulty",
    "mo_system",
    "mo_class",
  ];

  const values = ["id", "dci", "skeletalFormula", "ntr", "difficulty", "system", "class"].map((p) =>
    molecule.getValue(p)
  );

  return (
    createSqlToInsertInto("molecule")(...columns)(...values) +
    createSqlToInsertMoleculeProperties(molecule)
  );
}

/**
 * Create sql script to insert all referenced property values of a molecule
 * @param {FormattedMolecule} molecule
 * @returns {string}
 */
function createSqlToInsertMoleculeProperties(molecule) {
  return Object.keys(molecule.properties).reduce((script, property) => {
    const insertIntoMoleculeProperty = createSqlToInsertInto("molecule_property")("mo_id", "pv_id");

    return (
      script +
      molecule.properties[property].reduce(
        (sql, value) =>
          sql +
          insertIntoMoleculeProperty(
            molecule.id,
            newIdForPropertyValue(propertiesId[property], value)
          ),
        ""
      )
    );
  }, "");
}

/**
 * Class representing a formatted molecule, ready to be inserted into the database
 */
class FormattedMolecule {
  /**
   * Format a given molecule
   * @param {object} molecule
   */
  constructor(molecule) {
    this.id = Number(molecule.id);
    this.dci = String(molecule.dci).substr(0, MOLECULES_MAX_LENGTHS.DCI);
    this.ntr = Number(molecule.ntr) || 0;
    this.system = molecule.system;
    this.class = molecule.class;
    this.skeletalFormula = molecule.skeletalFormula
      ? String(molecule.skeletalFormula).substr(0, MOLECULES_MAX_LENGTHS.SKELETAL_FORMULA)
      : "";
    this.difficulty = molecule.levelHard ? "HARD" : "EASY";
    this.properties = Object.create(null);
    this.properties.indications = molecule.indications.slice();
    this.properties.sideEffects = molecule.sideEffects.slice();
    this.properties.interactions = molecule.interactions.slice();
  }

  /**
   * Get the value for a property
   * @param {string} property
   */
  getValue(property) {
    return this[property];
  }

  /**
   * Check if an object is an instance of FormattedMolecule
   * @param {*} o
   */
  static isInstance(o) {
    return o instanceof FormattedMolecule;
  }
}
