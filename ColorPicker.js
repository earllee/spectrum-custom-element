Spectrum = function()
{
  WebInspector.VBox.call(this);
  this.registerRequiredCSS("spectrum.css");

  this.element = document.createElement("div");
  this.element.classList.add("spectrum-container");
  this.element.tabIndex = 0;

  var topElement = this.element.createChild("div", "spectrum-top");
  topElement.createChild("div", "spectrum-fill");

  var topInnerElement = topElement.createChild("div", "spectrum-top-inner fill");
  this._draggerElement = topInnerElement.createChild("div", "spectrum-color");
  this._dragHelperElement = this._draggerElement.createChild("div", "spectrum-sat fill").createChild("div", "spectrum-val fill").createChild("div", "spectrum-dragger");

  this._sliderElement = topInnerElement.createChild("div", "spectrum-hue");
  this.slideHelper = this._sliderElement.createChild("div", "spectrum-slider");

  var rangeContainer = this.element.createChild("div", "spectrum-range-container");
  var alphaLabel = rangeContainer.createChild("label");
  alphaLabel.textContent = "\u03B1:";

  this._alphaElement = rangeContainer.createChild("input", "spectrum-range");
  this._alphaElement.setAttribute("type", "range");
  this._alphaElement.setAttribute("min", "0");
  this._alphaElement.setAttribute("max", "100");
  this._alphaElement.addEventListener("input", alphaDrag.bind(this), false);
  this._alphaElement.addEventListener("change", alphaDrag.bind(this), false);

  var swatchElement = document.createElement("span");
  swatchElement.className = "swatch";
  this._swatchInnerElement = swatchElement.createChild("span", "swatch-inner");

  var displayContainer = this.element.createChild("div");
  displayContainer.appendChild(swatchElement);
  this._displayElement = displayContainer.createChild("span", "source-code spectrum-display-value");

  Spectrum.draggable(this._sliderElement, hueDrag.bind(this));
  Spectrum.draggable(this._draggerElement, colorDrag.bind(this), colorDragStart.bind(this));

  /**
   * @param {!Element} element
   * @param {number} dragX
   * @param {number} dragY
   * @this {WebInspector.Spectrum}
   */
  function hueDrag(element, dragX, dragY)
  {
    this._hsv[0] = (this.slideHeight - dragY) / this.slideHeight;

    this._onchange();
  }

  var initialHelperOffset;

  /**
   * @this {WebInspector.Spectrum}
   */
  function colorDragStart()
  {
    initialHelperOffset = { x: this._dragHelperElement.offsetLeft, y: this._dragHelperElement.offsetTop };
  }

  /**
   * @param {!Element} element
   * @param {number} dragX
   * @param {number} dragY
   * @param {!MouseEvent} event
   * @this {WebInspector.Spectrum}
   */
  function colorDrag(element, dragX, dragY, event)
  {
    if (event.shiftKey) {
      if (Math.abs(dragX - initialHelperOffset.x) >= Math.abs(dragY - initialHelperOffset.y))
        dragY = initialHelperOffset.y;
      else
        dragX = initialHelperOffset.x;
    }

    this._hsv[1] = dragX / this.dragWidth;
    this._hsv[2] = (this.dragHeight - dragY) / this.dragHeight;

    this._onchange();
  }

  /**
   * @this {WebInspector.Spectrum}
   */
  function alphaDrag()
  {
    this._hsv[3] = this._alphaElement.value / 100;

    this._onchange();
  }
};

Spectrum.Events = {
  ColorChanged: "ColorChanged"
};

/**
 * @param {!Element} element
 * @param {function(!Element, number, number, !MouseEvent)=} onmove
 * @param {function(!Element, !MouseEvent)=} onstart
 * @param {function(!Element, !MouseEvent)=} onstop
 */
Spectrum.draggable = function(element, onmove, onstart, onstop) {

  var doc = document;
  var dragging;
  var offset;
  var scrollOffset;
  var maxHeight;
  var maxWidth;

  /**
   * @param {?Event} e
   */
  function consume(e)
  {
    e.consume(true);
  }

  /**
   * @param {?Event} e
   */
  function move(e)
  {
    if (dragging) {
      var dragX = Math.max(0, Math.min(e.pageX - offset.left + scrollOffset.left, maxWidth));
      var dragY = Math.max(0, Math.min(e.pageY - offset.top + scrollOffset.top, maxHeight));

      if (onmove)
        onmove(element, dragX, dragY, /** @type {!MouseEvent} */ (e));
    }
  }

  /**
   * @param {?Event} e
   */
  function start(e)
  {
    var mouseEvent = /** @type {!MouseEvent} */ (e);
    var rightClick = mouseEvent.which ? (mouseEvent.which === 3) : (mouseEvent.button === 2);

    if (!rightClick && !dragging) {

      if (onstart)
        onstart(element, mouseEvent);

      dragging = true;
      maxHeight = element.clientHeight;
      maxWidth = element.clientWidth;

      scrollOffset = element.scrollOffset();
      offset = element.totalOffset();

      doc.addEventListener("selectstart", consume, false);
      doc.addEventListener("dragstart", consume, false);
      doc.addEventListener("mousemove", move, false);
      doc.addEventListener("mouseup", stop, false);

      move(mouseEvent);
      consume(mouseEvent);
    }
  }

  /**
   * @param {?Event} e
   */
  function stop(e)
  {
    if (dragging) {
      doc.removeEventListener("selectstart", consume, false);
      doc.removeEventListener("dragstart", consume, false);
      doc.removeEventListener("mousemove", move, false);
      doc.removeEventListener("mouseup", stop, false);

      if (onstop)
        onstop(element, /** @type {!MouseEvent} */ (e));
    }

    dragging = false;
  }

  element.addEventListener("mousedown", start, false);
};

Spectrum.prototype = {
  /**
   * @param {!WebInspector.Color} color
   */
  setColor: function(color)
  {
    this._hsv = color.hsva();
  },

  /**
   * @return {!WebInspector.Color}
   */
color: function()
       {
         return WebInspector.Color.fromHSVA(this._hsv);
       },

_colorString: function()
              {
                var cf = WebInspector.Color.Format;
                var format = this._originalFormat;
                var color = this.color();
                var originalFormatString = color.toString(this._originalFormat);
                if (originalFormatString)
                  return originalFormatString;

                if (color.hasAlpha()) {
                  // Everything except HSL(A) should be returned as RGBA if transparency is involved.
                  if (format === cf.HSLA || format === cf.HSL)
                    return color.toString(cf.HSLA);
                  else
                    return color.toString(cf.RGBA);
                }

  if (format === cf.ShortHEX)
    return color.toString(cf.HEX);
  console.assert(format === cf.Nickname);
  return color.toString(cf.RGB);
},


set displayText(text)
{
  this._displayElement.textContent = text;
},

_onchange: function()
{
  this._updateUI();
  this.dispatchEventToListeners(Spectrum.Events.ColorChanged, this._colorString());
},

_updateHelperLocations: function()
{
  var h = this._hsv[0];
  var s = this._hsv[1];
  var v = this._hsv[2];

  // Where to show the little circle that displays your current selected color.
  var dragX = s * this.dragWidth;
  var dragY = this.dragHeight - (v * this.dragHeight);

  dragX = Math.max(-this._dragHelperElementHeight,
                   Math.min(this.dragWidth - this._dragHelperElementHeight, dragX - this._dragHelperElementHeight));
                   dragY = Math.max(-this._dragHelperElementHeight,
                                    Math.min(this.dragHeight - this._dragHelperElementHeight, dragY - this._dragHelperElementHeight));

                                    this._dragHelperElement.positionAt(dragX, dragY);

                                    // Where to show the bar that displays your current selected hue.
                                    var slideY = this.slideHeight - ((h * this.slideHeight) + this.slideHelperHeight);
                                    this.slideHelper.style.top = slideY + "px";

                                    this._alphaElement.value = this._hsv[3] * 100;
},

_updateUI: function()
{
  this._updateHelperLocations();

  this._draggerElement.style.backgroundColor = WebInspector.Color.fromHSVA([this._hsv[0], 1, 1, 1]).toString(WebInspector.Color.Format.RGB);
  this._swatchInnerElement.style.backgroundColor = this.color().toString(WebInspector.Color.Format.RGBA);

  this._alphaElement.value = this._hsv[3] * 100;
},

wasShown: function()
{
  this.slideHeight = this._sliderElement.offsetHeight;
  this.dragWidth = this._draggerElement.offsetWidth;
  this.dragHeight = this._draggerElement.offsetHeight;
  this._dragHelperElementHeight = this._dragHelperElement.offsetHeight / 2;
  this.slideHelperHeight = this.slideHelper.offsetHeight / 2;
  this._updateUI();
},

__proto__: WebInspector.VBox.prototype

}

/**
 * @constructor
 * @extends {WebInspector.Object}
 */
SpectrumPopupHelper = function()
{
  this._spectrum = new Spectrum();
  this._spectrum.element.addEventListener("keydown", this._onKeyDown.bind(this), false);

  this._popover = new WebInspector.Popover();
  this._popover.setCanShrink(false);
  this._popover.element.addEventListener("mousedown", consumeEvent, false);

  this._hideProxy = this.hide.bind(this, true);
}

SpectrumPopupHelper.Events = {
  Hidden: "Hidden"
};

SpectrumPopupHelper.prototype = {
  /**
   * @return {!WebInspector.Spectrum}
   */
  spectrum: function()
  {
    return this._spectrum;
  },

  /**
   * @return {boolean}
   */
toggle: function(element, color, format)
        {
          if (this._popover.isShowing())
            this.hide(true);
          else
            this.show(element, color, format);

          return this._popover.isShowing();
        },

        /**
         * @return {boolean}
         */
show: function(element, color, format)
      {
        if (this._popover.isShowing()) {
          if (this._anchorElement === element)
            return false;

          // Reopen the picker for another anchor element.
          this.hide(true);
        }

        this._anchorElement = element;

        this._spectrum.setColor(color);
        this._spectrum._originalFormat = format !== WebInspector.Color.Format.Original ? format : color.format();
        this.reposition(element);

        document.addEventListener("mousedown", this._hideProxy, false);
        window.addEventListener("blur", this._hideProxy, false);
        return true;
      },

reposition: function(element)
            {

              if (!this._previousFocusElement)
                this._previousFocusElement = WebInspector.currentFocusElement();
              this._popover.showView(this._spectrum, element);
              WebInspector.setCurrentFocusElement(this._spectrum.element);

            },

            /**
             * @param {boolean=} commitEdit
             */
  hide: function(commitEdit)
  {
    if (!this._popover.isShowing())
      return;
    this._popover.hide();

    document.removeEventListener("mousedown", this._hideProxy, false);
    window.removeEventListener("blur", this._hideProxy, false);

    this.dispatchEventToListeners(SpectrumPopupHelper.Events.Hidden, !!commitEdit);

    WebInspector.setCurrentFocusElement(this._previousFocusElement);
    delete this._previousFocusElement;

    delete this._anchorElement;
  },

  _onKeyDown: function(event)
  {
    if (event.keyIdentifier === "Enter") {
      this.hide(true);
      event.consume(true);
      return;
    }
    if (event.keyIdentifier === "U+001B") { // Escape key
      this.hide(false);
      event.consume(true);
    }
  },

  __proto__: WebInspector.Object.prototype
        }

/**
 * @constructor
 * @param {boolean=} readOnly
 */
        ColorSwatch = function(readOnly)
        {
          this.element = document.createElement("span");
          this._swatchInnerElement = this.element.createChild("span", "swatch-inner");
          var shiftClickMessage = WebInspector.UIString("Shift-click to change color format.");
          this.element.title = readOnly ? shiftClickMessage : String.sprintf("%s\n%s", WebInspector.UIString("Click to open a colorpicker."), shiftClickMessage);
          this.element.className = "swatch";
          this.element.addEventListener("mousedown", consumeEvent, false);
          this.element.addEventListener("dblclick", consumeEvent, false);
        }

        ColorSwatch.prototype = {
          /**
           * @param {string} colorString
           */
          setColorString: function(colorString)
          {
            this._swatchInnerElement.style.backgroundColor = colorString;
          }
        }

        processColor = function(element)
        {
          var text = element.getAttribute('color');
          var color = WebInspector.Color.parse(text);
          var format = "original";
          var spectrumHelper = new SpectrumPopupHelper();
          var spectrum = spectrumHelper ? spectrumHelper.spectrum() : null;

          var isEditable = !!(this._styleRule && this._styleRule.editable !== false); // |editable| is true by default.
          var colorSwatch = new ColorSwatch();
          colorSwatch.setColorString(text)
          colorSwatch.element.addEventListener("click", swatchClick.bind(element), false);

          var scrollerElement;
          var boundSpectrumChanged = spectrumChanged.bind(element);
          var boundSpectrumHidden = spectrumHidden.bind(element);

          /**
           * @param {!WebInspector.Event} e
           * @this {WebInspector.StylePropertyTreeElementBase}
           */
          function spectrumChanged(e)
          {
            var colorString = /** @type {string} */ (e.data);
            spectrum.displayText = colorString;
            colorValueElement.textContent = colorString;
            colorSwatch.setColorString(colorString);
            this.setAttribute('color', colorString);
            //this.applyStyleText(nameElement.textContent + ": " + valueElement.textContent, false, false, false);
          }

          /**
           * @param {!WebInspector.Event} event
           * @this {WebInspetor.StylePropertyTreeElementBase}
           */
          function spectrumHidden(event)
          {
            if (scrollerElement)
              scrollerElement.removeEventListener("scroll", repositionSpectrum, false);
            var commitEdit = event.data;
            this.setAttribute('color', colorValueElement.textContent);
            spectrum.removeEventListener(Spectrum.Events.ColorChanged, boundSpectrumChanged);
            spectrumHelper.removeEventListener(SpectrumPopupHelper.Events.Hidden, boundSpectrumHidden);

            //delete this.editablePane()._isEditingStyle;
            delete this.originalPropertyText;
          }

          function repositionSpectrum()
          {
            spectrumHelper.reposition(colorSwatch.element);
          }

          /**
           * @param {?Event} e
           * @this {WebInspector.StylePropertyTreeElementBase}
           */
          function swatchClick(e)
          {
            e.consume(true);

            color = WebInspector.Color.parse(element.getAttribute('color'));

            // Shift + click toggles color formats.
            // Click opens colorpicker, only if the element is not in computed styles section.
            if (!spectrumHelper || e.shiftKey) {
              changeColorDisplay();
              return;
            }

            var visible = spectrumHelper.toggle(colorSwatch.element, color, format);
            if (visible) {
              spectrum.displayText = color.toString(format);
              spectrum.addEventListener(Spectrum.Events.ColorChanged, boundSpectrumChanged);
              spectrumHelper.addEventListener(SpectrumPopupHelper.Events.Hidden, boundSpectrumHidden);

              scrollerElement = colorSwatch.element.enclosingNodeOrSelfWithClass("scroll-target");
              if (scrollerElement)
                scrollerElement.addEventListener("scroll", repositionSpectrum, false);
              //else
              //    console.error("Unable to handle color picker scrolling");
            }
          }

          var colorValueElement = document.createElement("span");
          colorValueElement.textContent = color.toString(format);

          /**
           * @param {string} curFormat
           */
          function nextFormat(curFormat)
          {
            // The format loop is as follows:
            // * original
            // * rgb(a)
            // * hsl(a)
            // * nickname (if the color has a nickname)
            // * if the color is simple:
            //   - shorthex (if has short hex)
            //   - hex
            var cf = WebInspector.Color.Format;

            switch (curFormat) {
              case cf.Original:
                return !color.hasAlpha() ? cf.RGB : cf.RGBA;

              case cf.RGB:
                case cf.RGBA:
                return !color.hasAlpha() ? cf.HSL : cf.HSLA;

              case cf.HSL:
                case cf.HSLA:
                if (color.nickname())
              return cf.Nickname;
              if (!color.hasAlpha())
                return color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
              else
                return cf.Original;

              case cf.ShortHEX:
                return cf.HEX;

              case cf.HEX:
                return cf.Original;

              case cf.Nickname:
                if (!color.hasAlpha())
              return color.canBeShortHex() ? cf.ShortHEX : cf.HEX;
              else
                return cf.Original;

              default:
                return cf.RGBA;
            }
          }

          function changeColorDisplay()
          {
            do {
              format = nextFormat(format);
              var currentValue = color.toString(format);
            } while (currentValue === colorValueElement.textContent);
            colorValueElement.textContent = currentValue;
          }

          var container = document.createElement("nobr");
          container.appendChild(colorSwatch.element);
          container.appendChild(colorValueElement);

          return container;
        }
