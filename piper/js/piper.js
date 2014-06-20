(function(UQ3DWA) {
  /**
   * @constructor
   * @param {string} id - id for container element.
   * @param {Object[]} groups -
   *   Array of group objects, each having a name and an array of concentration sets.
   *   Concentration sets are denoted as objects with cation/anion chemical symbols as
   *   keys (Ca, Mg, Na, K, Cl, SO4, CO3, HCO3) and concentrations in mg/L as values.
   *
   *   Example:
   *
   *     [
   *       {
   *         name: 'Well 123456',
   *         values: [
   *           {'Ca': 61, 'Mg':  43, 'Na': 475, 'K': 1, 'Cl': 740, 'SO4':  10, 'CO3': 0.6, 'HCO3': 386},
   *           {'Ca': 14, 'Mg': 6.9, 'Na':  25, 'K': 4, 'Cl':  26, 'SO4': 4.6, 'CO3': 0.4, 'HCO3': 106},
   *           ...
   *         ]
   *       },
   *       ...
   *     ]
   */
  UQ3DWA.PiperDiagram = function(id, groups) {
    if (!(this instanceof UQ3DWA.PiperDiagram)) {
        throw new Error('Constructor called as a function');
    }
    var that = this;

    var ions = ['Ca', 'Mg', 'Na', 'K', 'Cl', 'SO4', 'CO3', 'HCO3'];

    var svgNamespaceURI = 'http://www.w3.org/2000/svg';
    var xlinkNamespaceURI = 'http://www.w3.org/1999/xlink';
    var xlinkNamespacePrefix = 'xlink';
    var piperWidth = 800;
    var piperHeight = 700;
    var triangleWidth = 300;
    var triangleTranslateY = 350;
    var triangleBaseY = triangleWidth;
    var triangleHeight = (Math.tan(Math.PI / 3) * (triangleWidth / 2));
    var triangleCentreMargin = 50;
    var numGridIntervals = 10;
    var axisLabelMargin = 20;
    var pointRadius = 5;
    var legendRowHeight = 15;
    var legendX = piperWidth * 0.73;
    var legendY = 30;
    var legendWidth = piperWidth - legendX - legendY;
    var legendHeight = legendRowHeight * groups.length + 7;

    var piper = document.createElementNS(svgNamespaceURI, 'svg');
    piper.setAttribute('class','piper');
    piper.setAttribute('width', piperWidth);
    piper.setAttribute('height', piperHeight);
    piper.setAttribute('xmlns', svgNamespaceURI);
    piper.setAttribute('xmlns:xlink', xlinkNamespaceURI);

    // We use a for-loop to create one set of grid lines fitting a triangle;
    // arbitrarily, this is the set drawn from the base upward to the right side;
    // we put these lines into an SVG symbol element and re-use it by flipping and
    // rotating to generate all lines for the triangles and top/bottom of the diamond.
    (function createTriangleGridRight() {
      var gridIntervalWidth = triangleWidth / numGridIntervals;
      var triangleGridRight = document.createElementNS(svgNamespaceURI, 'symbol');
      triangleGridRight.setAttribute('id', 'triangle-grid-right');
      for (var i = 0; i <= numGridIntervals; i++) (function() {
        var x1 = i * gridIntervalWidth;
        var y1 = triangleBaseY;
        var x2 = x1 + ((triangleWidth - x1) / 2);
        var y2 = y1 - Math.tan(Math.PI / 3) * (x2 - x1);
        var path = document.createElementNS(svgNamespaceURI, 'path');
        path.setAttribute('class', 'grid');
        path.setAttribute('d', 'M ' + x1 + ',' + y1 + ' ' + 'L ' + x2 + ',' + y2);
        triangleGridRight.appendChild(path);
      })();
      piper.appendChild(triangleGridRight);
    })();

    function useTriangleGridRight(parentElem, rotation, flipY) {
      var use = document.createElementNS(svgNamespaceURI, 'use');
      use.setAttributeNS(xlinkNamespaceURI, xlinkNamespacePrefix + ':href', '#triangle-grid-right');
      var transforms = [];
      if (flipY) (function() {
        var cx = triangleWidth / 2;
        var cy = triangleBaseY;
        transforms.push('rotate(180 ' + cx + ' ' + cy + ')');
      })();
      if (rotation != 0) (function() {
        var cx = triangleWidth / 2;
        var cy = triangleBaseY - (Math.tan(Math.PI / 6) * (triangleWidth / 2));
        transforms.push('rotate(' + rotation + ' ' + cx + ' ' + cy + ')');
      })();
      if (transforms.length > 0) {
        use.setAttribute('transform', transforms.join(','));
      }
      parentElem.appendChild(use);
    }

    var leftAxisLabelMarginX = Math.cos(Math.PI / 6) * axisLabelMargin;
    var leftAxisLabelX = ((Math.cos(Math.PI / 3) * triangleWidth) / 2) - leftAxisLabelMarginX;
    var rightAxisLabelX = triangleWidth - leftAxisLabelX;
    var topAxisLabelMarginY = Math.sin(Math.PI / 6) * axisLabelMargin;
    var topAxisLabelY = triangleBaseY - ((Math.sin(Math.PI / 3) * triangleWidth) / 2) - topAxisLabelMarginY;
    var bottomAxisLabelY = (2 * triangleBaseY) - topAxisLabelY;
    function createAxisLabel(parentElem, x, y, rotation, text) {
      var textElem = document.createElementNS(svgNamespaceURI, 'text');
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
      - (Math.tan(Math.PI / 3) * triangleCentreMargin) // go up height of "margin" triangle
      - triangleHeight                                 // go up height of diamond bottom half triangle
      - triangleBaseY;                                 // go up height of sqaure enclosing top half of diamond
    (function createDiamondField() {
      var diamondField = document.createElementNS(svgNamespaceURI, 'g');
      diamondField.setAttribute('class', 'diamond-field');
      diamondField.setAttribute('transform', 'translate(' + diamondFieldTranslateX + ',' + diamondFieldTranslateY + ')');
      var diamond = document.createElementNS(svgNamespaceURI, 'g');
      diamond.setAttribute('class', 'diamond');
      (function createDiamondGrid() {
        var diamondGrid = document.createElementNS(svgNamespaceURI, 'g');
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
        var diamondOutline = document.createElementNS(svgNamespaceURI, 'path');
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
      var triangle = document.createElementNS(svgNamespaceURI, 'symbol');
      triangle.setAttribute('id', 'triangle');
      triangle.setAttribute('class', 'triangle');
      (function createTriangleGrid() {
        var triangleGrid = document.createElementNS(svgNamespaceURI, 'g');
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
        var triangleOutline = document.createElementNS(svgNamespaceURI, 'path');
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
      var triangleChart = document.createElementNS(svgNamespaceURI, 'g');
      triangleChart.setAttribute('class', className);
      triangleChart.setAttribute('transform', 'translate(' + translateX + ',' + translateY + ')');
      var use = document.createElementNS(svgNamespaceURI, 'use');
      use.setAttributeNS(xlinkNamespaceURI, xlinkNamespacePrefix + ':href', '#triangle');
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

    function createDataPoint(x, y, color) {
      var circle = document.createElementNS(svgNamespaceURI, 'circle');
      circle.setAttribute('class', 'data-point');
      circle.setAttribute('fill', color);
      circle.setAttribute('r', pointRadius);
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      piper.appendChild(circle);
    }

    function plotConcentrations(conc, color) {
      var ionObj = ions.reduce(function(a, sym) {a[sym] = UQ3DWA.IonFactory.get(sym); return a;}, {});
      var cations = ions.filter(function(sym) {return ionObj[sym].getValence() > 0;});
      var anions = ions.filter(function(sym) {return ionObj[sym].getValence() < 0;});
      var meqL = ions.reduce(function(a, sym) {a[sym] = ionObj[sym].getMeqL(conc[sym]); return a;}, {});

      var cationTotal = cations.reduce(function(a, sym) {return a + meqL[sym];}, 0);
      var anionTotal = anions.reduce(function(a, sym) {return a + meqL[sym];}, 0);

      var proportion = {};
      cations.reduce(function(a, sym) {a[sym] = meqL[sym] / cationTotal; return a;}, proportion);
      anions.reduce(function(a, sym) {a[sym] = meqL[sym] / anionTotal; return a;}, proportion)

      var cationOffsetY = Math.sin(Math.PI / 3) * proportion['Mg'] * triangleWidth;
      var cationBaseOffsetX = (1 - proportion['Ca']) * triangleWidth;
      var cationOffsetX = cationBaseOffsetX - (cationOffsetY / Math.tan(Math.PI / 3));
      createDataPoint(cationTranslateX + cationOffsetX, triangleTranslateY + triangleBaseY - cationOffsetY, color);

      var anionOffsetY = Math.sin(Math.PI / 3) * proportion['SO4'] * triangleWidth;
      var anionBaseOffsetX = proportion['Cl'] * triangleWidth;
      var anionOffsetX = anionBaseOffsetX - (anionOffsetY / Math.tan(Math.PI / 3));
      createDataPoint(anionTranslateX + anionOffsetX, triangleTranslateY + triangleBaseY - anionOffsetY, color);

      var a = cationBaseOffsetX - ((cationOffsetY / Math.tan(Math.PI / 3)) * 2);
      var b = anionBaseOffsetX;
      var diamondPointOffsetX = (a + b) / 2;
      var diamondPointOffsetY = Math.tan(Math.PI / 3) * ((diamondPointOffsetX + (triangleWidth / 2)) - a);
      createDataPoint(
        diamondFieldTranslateX + diamondPointOffsetX,
        diamondFieldTranslateY + triangleBaseY + triangleHeight - diamondPointOffsetY,
        color
      );
    }
    function getGroupColor(i) {
      return 'hsl(' + ((54 * i++) % 360) + ', 100%, 45%)';
    }
    groups.forEach(function(group, i) {
      var color = getGroupColor(i);
      group.values.forEach(function(conc) {
        plotConcentrations(conc, color);
      });
    });

    (function createLegend() {
      var legendBorder = document.createElementNS(svgNamespaceURI, 'rect');
      legendBorder.setAttribute('class', 'legend-border');
      legendBorder.setAttribute('x', legendX);
      legendBorder.setAttribute('y', legendY);
      legendBorder.setAttribute('width', legendWidth);
      legendBorder.setAttribute('height', legendHeight);
      piper.appendChild(legendBorder);

      groups.forEach(function(group, i) {
        createDataPoint(legendX + 14, legendY + legendRowHeight * (i + 0.5) + 4, getGroupColor(i));
        var legendLabel = document.createElementNS(svgNamespaceURI, 'text');
        legendLabel.setAttribute('class', 'legend-label');
        legendLabel.setAttribute('x', legendX + 25);
        legendLabel.setAttribute('y', legendY + legendRowHeight * (i + 1));
        legendLabel.appendChild(new Text(group.name));
        piper.appendChild(legendLabel);
      });
    })();

    var container = document.getElementById(id);
    container.appendChild(piper);
  };
})(window.UQ3DWA = window.UQ3DWA || {});
