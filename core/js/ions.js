(function(UQ3DWA) {
  /**
   * @constructor
   * @param {string} symbol - Chemical symbol (e.g. HCO3).
   * @param {string} name - Chemical name (e.g. Bicarbonate).
   * @param {number} valence - Electrical charge (e.g. -1).
   * @param {number} formulaWeight - Sum of atomic weights (e.g. 61.016).
   */
  UQ3DWA.Ion = function(symbol, name, valence, formulaWeight) {
    if (!(this instanceof UQ3DWA.Ion)) {
        throw new Error('Constructor called as a function');
    }
    var that = this;

    that.getSymbol = function() {
      return symbol;
    };
    that.getName = function() {
      return name;
    };
    that.getValence = function() {
      return valence;
    };
    that.getFormulaWeight = function() {
      return formulaWeight;
    };
    that.getMeqL = function(concMgL) {
      return concMgL * Math.abs(that.getValence()) / that.getFormulaWeight()
    };
  };

  UQ3DWA.IonFactory = new (function() {
    var that = this;

    var ions = [
      new UQ3DWA.Ion('Ca', 'Calcium', 2, 40.078),
      new UQ3DWA.Ion('Mg', 'Magnesium', 2, 24.305),
      new UQ3DWA.Ion('Na', 'Sodium', 1, 22.98976928),
      new UQ3DWA.Ion('K', 'Potassium', 1, 39.0983),
      new UQ3DWA.Ion('Cl', 'Chloride', -1, 35.45),
      new UQ3DWA.Ion('SO4', 'Sulfate', -2, 32.066 + 15.999 * 4),
      new UQ3DWA.Ion('CO3', 'Carbonate', -2, 12.011 + 15.999 * 3),
      new UQ3DWA.Ion('HCO3', 'Bicarbonate', -1, 1.008 + 12.011 + 15.999 * 3)
    ];

    that.get = function(symbol) {
      var matches = ions.filter(function(ion) {return ion.getSymbol() == symbol;});
      return (matches.length > 0) ? matches[0] : null;
    };
  })();
})(window.UQ3DWA = window.UQ3DWA || {});
