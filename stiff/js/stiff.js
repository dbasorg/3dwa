(function(UQ3DWA) {
  /**
   * @constructor
   * @param {string} id - id for container element.
   * @param {string[][]} ions - ion symbol groups (e.g. [['Na', 'K'], ['Ca'], ['Mg'], ['Cl'], ['HCO3', 'CO3'], ['SO4']]).
   * @param {Object.<string, number>} conc - Object with ion symbols as keys and concentrations in mg/L as values.
   */
  UQ3DWA.StiffDiagram = function(id, ions, conc) {
    if (!(this instanceof UQ3DWA.StiffDiagram)) {
        throw new Error('Constructor called as a function');
    }
    var that = this;

    var ionGroups = ions.map(function(syms) {
      var ionObjs = syms.map(function(sym) {return UQ3DWA.IonFactory.get(sym);});
      var meqL = ionObjs.reduce(function(a, ion) {return a + ion.getMeqL(conc[ion.getSymbol()]);}, 0);
      return {ions: ionObjs, meqL: meqL};
    });
    var cationGroups = ionGroups.filter(function(ionGroup) {return ionGroup.ions[0].getValence() > 0;});
    var anionGroups = ionGroups.filter(function(ionGroup) {return ionGroup.ions[0].getValence() < 0;});
    var maxMeqL = ionGroups.reduce(function(a, ionGroup) {return Math.max(a, ionGroup.meqL);}, 0);

    var svgNamespaceURI = 'http://www.w3.org/2000/svg';
    var stiffWidth = 600;
    var stiffHeight = 500;
    var horzAxisWidth = 175; // width of one side: multiply by 2 for total width of symmetrical axis
    var horzAxisY = 120;
    var horzAxisLabelOffsetY = 60;
    var horzAxisMajorTicks = 2;
    var horzAxisMinorTicks = 10;
    var horzAxisMajorTickLength = 15;
    var horzAxisMinorTickLength = 10;
    var horzAxisTickLabelOffsetY = 25;
    var vertAxisX = stiffWidth / 2;
    var vertAxisHeight = 330;
    var vertAxisPaddingTop = 0.2;
    var vertAxisPaddingBottom = 0.225;
    var pointLabelOffsetX = 15;
    var pointLabelOffsetY = 5;
    var valenceLabelMarginBottom = 20;

    var stiff = document.createElementNS(svgNamespaceURI, 'svg');
    stiff.setAttribute('xmlns', svgNamespaceURI);
    stiff.setAttribute('class','stiff');
    stiff.setAttribute('viewBox', [0, 0, stiffWidth, stiffHeight].join(' '));

    (function createHorzAxis() {
      var horzAxis = document.createElementNS(svgNamespaceURI, 'path');
      horzAxis.setAttribute('class', 'axis');
      horzAxis.setAttribute('d',
        'M ' + (vertAxisX - horzAxisWidth) + ',' + horzAxisY + ' ' +
        'L ' + (vertAxisX + horzAxisWidth) + ',' + horzAxisY
      );
      stiff.appendChild(horzAxis);
    })();

    (function createHorzAxisTicks() {
      for (var i = -horzAxisMinorTicks; i <= horzAxisMinorTicks; i++) {
        var tickIsMajor = i % (horzAxisMinorTicks / horzAxisMajorTicks) == 0;
        var tickMeqL = (Math.abs(i) / horzAxisMinorTicks) * maxMeqL;
        var tickX = vertAxisX + (i / horzAxisMinorTicks) * horzAxisWidth;
        var tick = document.createElementNS(svgNamespaceURI, 'path');
        tick.setAttribute('class', 'axis-tick');
        tick.setAttribute('d',
          'M ' + tickX + ',' + (horzAxisY + (tickIsMajor ? horzAxisMajorTickLength : 0)) + ' ' +
          'L ' + tickX + ',' + (horzAxisY - (tickIsMajor ? horzAxisMajorTickLength : horzAxisMinorTickLength))
        );
        stiff.appendChild(tick);
        if (tickIsMajor) {
          var textElem = document.createElementNS(svgNamespaceURI, 'text');
          textElem.setAttribute('class', 'axis-tick-label');
          textElem.setAttribute('x', tickX);
          textElem.setAttribute('y', horzAxisY - horzAxisTickLabelOffsetY);
          textElem.appendChild(new Text(tickMeqL.toFixed(1)));
          stiff.appendChild(textElem);
        }
      }
    })();

    (function createHorzAxisLabel() {
      var textElem = document.createElementNS(svgNamespaceURI, 'text');
      textElem.setAttribute('class', 'axis-label');
      textElem.setAttribute('x', vertAxisX);
      textElem.setAttribute('y', horzAxisY - horzAxisLabelOffsetY);
      textElem.appendChild(new Text('Milliequivalents per litre (mEq/L)'));
      stiff.appendChild(textElem);
    })();

    (function createValenceLabels() {
      function createLabel(text, horzMult) {
        var textElem = document.createElementNS(svgNamespaceURI, 'text');
        textElem.setAttribute('class', 'valence-label');
        textElem.setAttribute('x', vertAxisX + horzMult * horzAxisWidth / 2);
        textElem.setAttribute('y', horzAxisY + vertAxisHeight - valenceLabelMarginBottom);
        textElem.appendChild(new Text(text));
        stiff.appendChild(textElem);
      }
      createLabel('Cations', -1);
      createLabel('Anions', 1);
    })();

    (function createVertAxis() {
      var vertAxis = document.createElementNS(svgNamespaceURI, 'path');
      vertAxis.setAttribute('class', 'axis');
      vertAxis.setAttribute('d',
        'M ' + vertAxisX + ',' + horzAxisY + ' ' +
        'L ' + vertAxisX + ',' + (horzAxisY + vertAxisHeight)
      );
      stiff.appendChild(vertAxis);
    })();

    function pointCreator(horzMult) {
      var vertAxisPaddedOffsetY = horzAxisY + (vertAxisPaddingTop * vertAxisHeight);
      var vertAxisInnerHeight = vertAxisHeight * (1 - vertAxisPaddingTop - vertAxisPaddingBottom);
      return function(ionGroup, i) {
        var x = vertAxisX + horzMult * horzAxisWidth * (ionGroup.meqL / maxMeqL);
        var y = vertAxisPaddedOffsetY + i * (vertAxisInnerHeight / (Math.max(cationGroups.length, anionGroups.length) - 1));
        return [x, y];
      }
    }
    var cationPoints = cationGroups.map(pointCreator(-1));
    var anionPoints = anionGroups.map(pointCreator(1));

    (function createPolygon() {
      var polygon = document.createElementNS(svgNamespaceURI, 'polygon');
      polygon.setAttribute('class', 'polygon');
      polygon.setAttribute('points',
        cationPoints                              // points down left side
          .concat(anionPoints.slice().reverse())  // points up right side
          .map(function(p) {return p.join(',');}) // "x,y" coordinates
          .join(' ')                              // space-separated coordinates
      );
      stiff.appendChild(polygon);
    })();

    function createIonLabels(ionGroups, points, horzMult) {
      ionGroups.forEach(function(ionGroup, i) {
        var x = points[i][0] + horzMult * pointLabelOffsetX;
        var y = points[i][1] + pointLabelOffsetY;
        var textElem = document.createElementNS(svgNamespaceURI, 'text');
        textElem.setAttribute('class', 'point-label');
        textElem.setAttribute('style', 'text-anchor: ' + ((horzMult < 0) ? 'end' : 'start') + ';');
        textElem.setAttribute('x', x);
        textElem.setAttribute('y', y);
        textElem.appendChild(new Text(ionGroup.ions.map(function (ion) {return ion.getSymbol();}).join(' + ')));
        stiff.appendChild(textElem);
      });
    }
    createIonLabels(cationGroups, cationPoints, -1);
    createIonLabels(anionGroups, anionPoints, 1);

    var container = document.getElementById(id);
    container.appendChild(stiff);
  };
})(window.UQ3DWA = window.UQ3DWA || {});
