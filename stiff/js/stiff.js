(function(UQ3DWA) {
  /** Performs "map" on object, returning a new object with same keys and mapped values. */
  function mapObject(o, f) {
    return Object.keys(o).reduce(function(a, k) {a[k] = f(o[k], k); return a;}, {});
  }

  /**
   * @constructor
   * @param {string} id - id for container element.
   * @param {string[]} ions - array of ion symbols (e.g. 'Na', 'Ca', 'Mg', 'K', 'Cl', 'HCO3', 'SO4', 'CO3').
   * @param {Object.<string, number>} conc - Object with ion symbols as keys and concentrations in mg/L as values.
   */
  UQ3DWA.StiffDiagram = function(id, ions, conc) {
    if (!(this instanceof UQ3DWA.StiffDiagram)) {
        throw new Error('Constructor called as a function');
    }
    var that = this;

    var ionObj = mapObject(conc, function(v, sym) {return UQ3DWA.IonFactory.get(sym);});
    var cations = ions.filter(function(sym) {return ionObj[sym].getValence() > 0;});
    var anions = ions.filter(function(sym) {return ionObj[sym].getValence() < 0;});
    var meqL = mapObject(conc, function(v, sym) {return ionObj[sym].getMeqL(conc[sym]);});
    var maxMeqL = Object.keys(meqL).reduce(function(a, k) {return Math.max(a, meqL[k]);}, 0);

    var svgNamespaceURI = 'http://www.w3.org/2000/svg';
    var stiffWidth = 500;
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
    stiff.setAttribute('class','stiff');
    stiff.setAttribute('width', stiffWidth);
    stiff.setAttribute('height', stiffHeight);
    stiff.setAttribute('xmlns', svgNamespaceURI);

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
      return function(sym, i) {
        var x = vertAxisX + horzMult * horzAxisWidth * (meqL[sym] / maxMeqL);
        var y = vertAxisPaddedOffsetY + i * (vertAxisInnerHeight / (Math.max(cations.length, anions.length) - 1));
        return [x, y];
      }
    }
    var cationPoints = cations.map(pointCreator(-1));
    var anionPoints = anions.map(pointCreator(1));

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

    function createIonLabels(syms, points, horzMult) {
      syms.forEach(function(sym, i) {
        var x = points[i][0] + horzMult * pointLabelOffsetX;
        var y = points[i][1] + pointLabelOffsetY;
        var textElem = document.createElementNS(svgNamespaceURI, 'text');
        textElem.setAttribute('class', 'point-label');
        textElem.setAttribute('style', 'text-anchor: ' + ((horzMult < 0) ? 'end' : 'start') + ';');
        textElem.setAttribute('x', x);
        textElem.setAttribute('y', y);
        textElem.appendChild(new Text(sym));
        stiff.appendChild(textElem);
      });
    }
    createIonLabels(cations, cationPoints, -1);
    createIonLabels(anions, anionPoints, 1);

    var container = document.getElementById(id);
    container.appendChild(stiff);
  };
})(window.UQ3DWA = window.UQ3DWA || {});
