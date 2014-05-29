(function(UQ3DWA) {
  /** Converts angle in degrees to radians. */
  function deg2rad(deg) {
    return deg * Math.PI / 180;
  }

  /** Performs "map" on object, returning a new object with same keys and mapped values. */
  function mapObject(o, f) {
    return Object.keys(o).reduce(function(a, k) {a[k] = f(o[k], k); return a;}, {});
  }

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

  /**
   * @constructor
   * @param {string} id - id for container element.
   * @param {Object.<string, number>[]} concs -
   *   Array of objects with cation/anion chemical symbols as keys
   *   (Ca, Mg, Na, K, Cl, SO4, CO3, HCO3) and concentrations in mg/L as values.
   */
  UQ3DWA.PiperDiagram = function(id, concs) {
    if (!(this instanceof UQ3DWA.PiperDiagram)) {
        throw new Error('Constructor called as a function');
    }
    var that = this;

    var piperWidth = 800;
    var piperHeight = 700;

    var piper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    piper.setAttribute('class','piper');
    piper.setAttribute('width', piperWidth);
    piper.setAttribute('height', piperHeight);
    piper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    piper.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    var triangleWidth = 300;
    var triangleTranslateY = 350;
    var triangleBaseY = triangleWidth;
    var triangleHeight = (Math.tan(deg2rad(60)) * (triangleWidth / 2));
    var triangleCentreMargin = 50;

    // We use a for-loop to create one set of grid lines fitting a triangle;
    // arbitrarily, this is the set drawn from the base upward to the right side;
    // we put these lines into an SVG symbol element and re-use it by flipping and
    // rotating to generate all lines for the triangles and top/bottom of the diamond.
    (function createTriangleGridRight() {
      var numGridIntervals = 10;
      var gridIntervalWidth = triangleWidth / numGridIntervals;
      var triangleGridRight = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      triangleGridRight.setAttribute('id', 'triangle-grid-right');
      for (var i = 0; i <= numGridIntervals; i++) (function() {
        var x1 = i * gridIntervalWidth;
        var y1 = triangleBaseY;
        var x2 = x1 + ((triangleWidth - x1) / 2);
        var y2 = y1 - Math.tan(deg2rad(60)) * (x2 - x1);
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'grid');
        path.setAttribute('d', 'M ' + x1 + ',' + y1 + ' ' + 'L ' + x2 + ',' + y2);
        triangleGridRight.appendChild(path);
      })();
      piper.appendChild(triangleGridRight);
    })();

    function useTriangleGridRight(parentElem, rotation, flipY) {
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#triangle-grid-right');
      var transforms = [];
      if (flipY) (function() {
        var cx = triangleWidth / 2;
        var cy = triangleBaseY;
        transforms.push('rotate(180 ' + cx + ' ' + cy + ')');
      })();
      if (rotation != 0) (function() {
        var cx = triangleWidth / 2;
        var cy = triangleBaseY - (Math.tan(deg2rad(30)) * (triangleWidth / 2));
        transforms.push('rotate(' + rotation + ' ' + cx + ' ' + cy + ')');
      })();
      if (transforms.length > 0) {
        use.setAttribute('transform', transforms.join(','));
      }
      parentElem.appendChild(use);
    }

    var axisLabelMargin = 20;
    var leftAxisLabelMarginX = Math.cos(deg2rad(30)) * axisLabelMargin;
    var leftAxisLabelX = ((Math.cos(deg2rad(60)) * triangleWidth) / 2) - leftAxisLabelMarginX;
    var rightAxisLabelX = triangleWidth - leftAxisLabelX;
    var topAxisLabelMarginY = Math.sin(deg2rad(30)) * axisLabelMargin;
    var topAxisLabelY = triangleBaseY - ((Math.sin(deg2rad(60)) * triangleWidth) / 2) - topAxisLabelMarginY;
    var bottomAxisLabelY = (2 * triangleBaseY) - topAxisLabelY;
    function createAxisLabel(parentElem, x, y, rotation, text) {
      var textElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElem.setAttribute('class', 'axis-label')
      textElem.setAttribute('x', x)
      textElem.setAttribute('y', y)
      textElem.setAttribute('transform', 'rotate(' + rotation + ' ' + x + ' ' + y + ')')
      textElem.appendChild(new Text(text));
      parentElem.appendChild(textElem);
    }

    var diamondFieldTranslateX = (piperWidth / 2) - (triangleWidth / 2);
    // Ugly expression here to make the sides of the diamond aligned with those of the the triangles.
    // We imagine a small equilateral triangle used as a spacer, its points connecting the bottom point
    // of the diamond and the nearby points of both triangles.
    var diamondFieldTranslateY =
      (triangleTranslateY + triangleBaseY)             // start at base of triangle
      - (Math.tan(deg2rad(60)) * triangleCentreMargin) // go up height of "margin" triangle
      - triangleHeight                                 // go up height of diamond bottom half triangle
      - triangleBaseY;                                 // go up height of sqaure enclosing top half of diamond
    (function createDiamondField() {
      var diamondField = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      diamondField.setAttribute('class', 'diamond-field');
      diamondField.setAttribute('transform', 'translate(' + diamondFieldTranslateX + ',' + diamondFieldTranslateY + ')');
      var diamond = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      diamond.setAttribute('class', 'diamond');
      (function createDiamondGrid() {
        var diamondGrid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        diamondGrid.setAttribute('id', 'diamond-grid');
        useTriangleGridRight(diamondGrid, 0);
        useTriangleGridRight(diamondGrid, 120);
        useTriangleGridRight(diamondGrid, 0, true);
        useTriangleGridRight(diamondGrid, 120, true);
        diamond.appendChild(diamondGrid);
      })();
      (function createDiamondOutline() {
        var leftX = 0;
        var rightX = leftX + triangleWidth;
        var topY = triangleBaseY - triangleHeight;
        var baseY = triangleBaseY + triangleHeight;
        var midY = triangleBaseY;
        var midX = leftX + ((rightX - leftX) / 2);
        var diamondOutline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        diamondOutline.setAttribute('class', 'outline');
        diamondOutline.setAttribute('d',
          'M ' + leftX + ',' + midY + ' ' +
          'L ' + midX + ',' + topY + ' ' +
          rightX + ',' + midY + ' ' +
          midX + ',' + baseY + ' ' +
          'z'
        );
        diamond.appendChild(diamondOutline);
      })();
      diamondField.appendChild(diamond);
      createAxisLabel(diamondField, leftAxisLabelX, topAxisLabelY, -60, 'SO4 + Cl →');
      createAxisLabel(diamondField, rightAxisLabelX, topAxisLabelY, 60, '← Ca + Mg');
      createAxisLabel(diamondField, leftAxisLabelX, bottomAxisLabelY, 60, 'Na + K →');
      createAxisLabel(diamondField, rightAxisLabelX, bottomAxisLabelY, -60, '← CO3 + HCO3');
      piper.appendChild(diamondField);
    })();

    (function createTriangleSymbol() {
      var triangle = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      triangle.setAttribute('id', 'triangle');
      triangle.setAttribute('class', 'triangle');
      (function createTriangleGrid() {
        var triangleGrid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        triangleGrid.setAttribute('id', 'triangle-grid');
        useTriangleGridRight(triangleGrid, 0);
        useTriangleGridRight(triangleGrid, 120);
        useTriangleGridRight(triangleGrid, 240);
        triangle.appendChild(triangleGrid);
      })();
      (function createTriangleOutline() {
        var leftX = 0;
        var rightX = leftX + triangleWidth;
        var topY = triangleBaseY - triangleHeight;
        var midX = leftX + ((rightX - leftX) / 2);
        var triangleOutline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        triangleOutline.setAttribute('class', 'outline');
        triangleOutline.setAttribute('d',
          'M ' + leftX + ',' + triangleBaseY + ' ' +
          'L ' + midX + ',' + topY + ' ' +
          rightX + ',' + triangleBaseY + ' ' +
          'z'
        );
        triangle.appendChild(triangleOutline);
      })();
      piper.appendChild(triangle);
    })();

    function createTriangleChart(className, translateX, translateY, leftLabel, rightLabel, baseLabel) {
      var triangleChart = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      triangleChart.setAttribute('class', className);
      triangleChart.setAttribute('transform', 'translate(' + translateX + ',' + translateY + ')');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#triangle');
      triangleChart.appendChild(use);
      var baseLabelX = triangleWidth / 2;
      var baseLabelY = triangleBaseY + axisLabelMargin;
      createAxisLabel(triangleChart, leftAxisLabelX, topAxisLabelY, -60, leftLabel);
      createAxisLabel(triangleChart, rightAxisLabelX, topAxisLabelY, 60, rightLabel);
      createAxisLabel(triangleChart, baseLabelX, baseLabelY, 0, baseLabel);
      piper.appendChild(triangleChart);
    }
    var cationTranslateX = (piperWidth / 2) - triangleCentreMargin - triangleWidth;
    var anionTranslateX = (piperWidth / 2) + triangleCentreMargin;
    createTriangleChart('cation', cationTranslateX, triangleTranslateY, 'Mg →', 'Na + K →', '← Ca');
    createTriangleChart('anion', anionTranslateX, triangleTranslateY, '← CO3 + HCO3', '← SO4', 'Cl →');

    function plotConcentrations(conc) {
      var ion = mapObject(conc, function(v, sym) {return UQ3DWA.IonFactory.get(sym);});
      var meqL = mapObject(conc, function(v, sym) {return ion[sym].getMeqL(conc[sym]);});
      var cationTotal = Object.keys(meqL)
        .filter(function(sym) {return ion[sym].getValence() > 0;})
        .reduce(function(acc, sym) {return acc + meqL[sym];}, 0);
      var anionTotal = Object.keys(meqL)
        .filter(function(sym) {return ion[sym].getValence() < 0;})
        .reduce(function(acc, sym) {return acc + meqL[sym];}, 0);

      var proportion = mapObject(meqL, function(v, sym) {
        return meqL[sym] / ((ion[sym].getValence() > 0) ? cationTotal : anionTotal);
      });

      var color = 'hsl(' + Math.random() * 360 + ', 100%, 45%)';

      function createDataPoint(x, y) {
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'data-point');
        circle.setAttribute('fill', color);
        circle.setAttribute('r', 5);
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        piper.appendChild(circle);
      }
      var cationOffsetY = Math.sin(deg2rad(60)) * proportion['Mg'] * triangleWidth;
      var cationBaseOffsetX = (1 - proportion['Ca']) * triangleWidth;
      var cationOffsetX = cationBaseOffsetX - (cationOffsetY / Math.tan(deg2rad(60)));
      createDataPoint(cationTranslateX + cationOffsetX, triangleTranslateY + triangleBaseY - cationOffsetY);

      var anionOffsetY = Math.sin(deg2rad(60)) * proportion['SO4'] * triangleWidth;
      var anionBaseOffsetX = proportion['Cl'] * triangleWidth;
      var anionOffsetX = anionBaseOffsetX - (anionOffsetY / Math.tan(deg2rad(60)));
      createDataPoint(anionTranslateX + anionOffsetX, triangleTranslateY + triangleBaseY - anionOffsetY);

      var a = cationBaseOffsetX - ((cationOffsetY / Math.tan(deg2rad(60))) * 2);
      var b = anionBaseOffsetX;
      var diamondPointOffsetX = (a + b) / 2;
      var diamondPointOffsetY = Math.tan(deg2rad(60)) * ((diamondPointOffsetX + (triangleWidth / 2)) - a);
      createDataPoint(
        diamondFieldTranslateX + diamondPointOffsetX,
        diamondFieldTranslateY + triangleBaseY + triangleHeight - diamondPointOffsetY
      );
    }
    concs.forEach(function(conc) {
      plotConcentrations(conc);
    });

    var container = document.getElementById(id);
    container.appendChild(piper);
  };
})(window.UQ3DWA = window.UQ3DWA || {});
