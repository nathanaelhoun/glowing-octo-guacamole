/**
 * Class representing a column specifications
 */
export class ColumnSpecifications {
  /**
   * Create a column specification
   * @param {string} title The column title
   * @param {string} property The property corresponding
   * @param {number} type The columns type (unique, hierarchical, multivalued)
   */
  constructor(title, property, type) {
    this.title = title;
    this.property = property;
    this.type = type;
  }
  isUnique() {
    return this.type === ColumnSpecifications.UNIQUE;
  }
  isHierarchical() {
    return this.type === ColumnSpecifications.HIERARCHICAL;
  }
  isMultiValued() {
    return this.type === ColumnSpecifications.MULTI_VALUED;
  }

  /**
   * Test if a string match the column title (which is a regex)
   * @param {string} value
   */
  matchTitle(value) {
    return new RegExp(this.title).test(value);
  }
}
ColumnSpecifications.HIERARCHICAL = 1;
ColumnSpecifications.UNIQUE = 2;
ColumnSpecifications.MULTI_VALUED = 3;

const columns = [
  new ColumnSpecifications("DCI", "dci", ColumnSpecifications.UNIQUE),
  new ColumnSpecifications("FORMULE_CHIMIQUE", "skeletal_formule", ColumnSpecifications.UNIQUE),
  new ColumnSpecifications("SYSTEME_(\\d+)", "systems", ColumnSpecifications.HIERARCHICAL),
  new ColumnSpecifications("CLASSE_PHARMA_(\\d+)", "classes", ColumnSpecifications.HIERARCHICAL),
  new ColumnSpecifications("MTE", "ntr", ColumnSpecifications.UNIQUE),
  new ColumnSpecifications("INTERACTION", "interactions", ColumnSpecifications.MULTI_VALUED),
  new ColumnSpecifications("INDICATION", "indications", ColumnSpecifications.MULTI_VALUED),
  new ColumnSpecifications("EFFET_INDESIRABLE", "side_effects", ColumnSpecifications.MULTI_VALUED),
  new ColumnSpecifications("NIVEAU_DEBUTANT", "level_easy", ColumnSpecifications.UNIQUE),
  new ColumnSpecifications("NIVEAU_EXPERT", "level_hard", ColumnSpecifications.UNIQUE),
];

export default { columns };
