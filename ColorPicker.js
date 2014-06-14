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

};

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
};

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
};

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
};

ColorSwatch.prototype = {
  /**
           * @param {string} colorString
           */
  setColorString: function(colorString)
  {
    this._swatchInnerElement.style.backgroundColor = colorString;
  }
};

ColorValue = function(element)
{
  var text = element.getAttribute('color');
  var color = WebInspector.Color.parse(text);
  var format = "original";
  var spectrumHelper = new SpectrumPopupHelper();
  var spectrum = spectrumHelper ? spectrumHelper.spectrum() : null;

  var isEditable = true;//!!(this._styleRule && this._styleRule.editable !== false); // |editable| is true by default.
  var colorSwatch = new ColorSwatch();
  colorSwatch.setColorString(text);
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
  colorValueElement.classList.add("value");
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
  colorValueElement.addEventListener("click", function() {ColorValue.prototype.startEditing(colorValueElement)});
  // TODO: Clean this
  colorValueElement.addEventListener("blur", function() {
    colorSwatch.setColorString(colorValueElement.textContent);
    element.setAttribute('color', colorValueElement.textContent); 
  });

  return container;
};

ColorValue.prototype = {
  /**
   * @return {?WebInspector.DOMNode}
   */
  node: function()
  {
    return this._parentPane._node;
  },

  /**
   * @return {?WebInspector.StylesSidebarPane}
   */
  editablePane: function()
  {
    return this._parentPane;
  },

  /**
   * @return {!WebInspector.StylesSidebarPane}
   */
  parentPane: function()
  {
    return this._parentPane;
  },

  /**
   * @return {?WebInspector.StylePropertiesSection}
   */
  section: function()
  {
    return this.treeOutline && this.treeOutline.section;
  },

  /**
   * @param {function()=} userCallback
   */
  _updatePane: function(userCallback)
  {
    var section = this.section();
    if (section && section._parentPane)
      section._parentPane._refreshUpdate(section, false, userCallback);
    else  {
      if (userCallback)
        userCallback();
    }
  },

  /**
   * @param {!WebInspector.CSSStyleDeclaration} newStyle
   */
  _applyNewStyle: function(newStyle)
  {
    newStyle.parentRule = this.style.parentRule;
    var oldStyleRange = /** @type {!WebInspector.TextRange} */ (this.style.range);
    var newStyleRange = /** @type {!WebInspector.TextRange} */ (newStyle.range);
    this.style = newStyle;
    this._styleRule.style = newStyle;
    if (this.style.parentRule) {
      this.style.parentRule.style = this.style;
      this._parentPane._styleSheetRuleEdited(this.style.parentRule, oldStyleRange, newStyleRange);
    }
  },

  /**
   * @param {?Event} event
   */
  toggleEnabled: function(event)
  {
    var disabled = !event.target.checked;

    /**
     * @param {?WebInspector.CSSStyleDeclaration} newStyle
     * @this {WebInspector.StylePropertyTreeElement}
     */
    function callback(newStyle)
    {
      delete this._parentPane._userOperation;

      if (!newStyle)
        return;
      this._applyNewStyle(newStyle);

      var section = this.section();
      if (section && section._parentPane)
        section._parentPane.dispatchEventToListeners("style property toggled");

      this._updatePane();
    }

    this._parentPane._userOperation = true;
    this.property.setDisabled(disabled, callback.bind(this));
    event.consume();
  },

  onpopulate: function()
  {
    // Only populate once and if this property is a shorthand.
    if (this.children.length || !this.isShorthand)
      return;

    var longhandProperties = this.style.longhandProperties(this.name);
    for (var i = 0; i < longhandProperties.length; ++i) {
      var name = longhandProperties[i].name;
      var inherited = false;
      var overloaded = false;

      var section = this.section();
      if (section) {
        inherited = section.isPropertyInherited(name);
        overloaded = section.isPropertyOverloaded(name);
      }

      var liveProperty = this.style.getLiveProperty(name);
      if (!liveProperty)
        continue;

      var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this._styleRule, this.style, liveProperty, false, inherited, overloaded);
      this.appendChild(item);
    }
  },

  onattach: function()
  {
    WebInspector.StylePropertyTreeElementBase.prototype.onattach.call(this);

    this.listItemElement.addEventListener("mousedown", this._mouseDown.bind(this));
    this.listItemElement.addEventListener("mouseup", this._resetMouseDownElement.bind(this));
    this.listItemElement.addEventListener("click", this._mouseClick.bind(this));
  },

  _mouseDown: function(event)
  {
    if (this._parentPane) {
      this._parentPane._mouseDownTreeElement = this;
      this._parentPane._mouseDownTreeElementIsName = this._isNameElement(event.target);
      this._parentPane._mouseDownTreeElementIsValue = this._isValueElement(event.target);
    }
  },

  _resetMouseDownElement: function()
  {
    if (this._parentPane) {
      delete this._parentPane._mouseDownTreeElement;
      delete this._parentPane._mouseDownTreeElementIsName;
      delete this._parentPane._mouseDownTreeElementIsValue;
    }
  },

  updateTitle: function()
  {
    WebInspector.StylePropertyTreeElementBase.prototype.updateTitle.call(this);

    if (this.parsedOk && this.section() && this.parent.root) {
      var enabledCheckboxElement = document.createElement("input");
      enabledCheckboxElement.className = "enabled-button";
      enabledCheckboxElement.type = "checkbox";
      enabledCheckboxElement.checked = !this.disabled;
      enabledCheckboxElement.addEventListener("click", this.toggleEnabled.bind(this), false);
      this.listItemElement.insertBefore(enabledCheckboxElement, this.listItemElement.firstChild);
    }
  },

  _mouseClick: function(event)
  {
    if (!window.getSelection().isCollapsed)
      return;

    event.consume(true);

    if (event.target === this.listItemElement) {
      var section = this.section();
      if (!section || !section.editable)
        return;

      if (section._checkWillCancelEditing())
        return;
      section.addNewBlankProperty(this.property.index + 1).startEditing();
      return;
    }

    if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(event) && this.section().navigable) {
      this._navigateToSource(event.target);
      return;
    }

    this.startEditing(event.target);
  },

  /**
   * @param {!Element} element
   */
  _navigateToSource: function(element)
  {
    console.assert(this.section().navigable);
    var propertyNameClicked = element === this.nameElement;
    WebInspector.Revealer.reveal(this.property.uiLocation(propertyNameClicked));
  },

  /**
   * @param {!Element} element
   */
  _isNameElement: function(element)
  {
    return element.enclosingNodeOrSelfWithClass("webkit-css-property") === this.nameElement;
  },

  /**
   * @param {!Element} element
   */
  _isValueElement: function(element)
  {
    return !!element.enclosingNodeOrSelfWithClass("value");
  },

  startEditing: function(selectElement)
  {
    if (!selectElement)
      selectElement = this.nameElement; // No arguments passed in - edit the name element by default.
    else
      selectElement = selectElement.enclosingNodeOrSelfWithClass("webkit-css-property") || selectElement.enclosingNodeOrSelfWithClass("value");

    if (WebInspector.isBeingEdited(selectElement))
      return;

    // Lie about our children to prevent expanding on double click and to collapse shorthands.
    this.hasChildren = false;

    if (selectElement.parentElement)
      selectElement.parentElement.classList.add("child-editing");
    selectElement.textContent = selectElement.textContent; // remove color swatch and the like

    /**
     * @this {WebInspector.StylePropertyTreeElement}
     */
    function pasteHandler(context, event)
    {
      var data = event.clipboardData.getData("Text");
      if (!data)
        return;
      var colonIdx = data.indexOf(":");
      if (colonIdx < 0)
        return;
      var name = data.substring(0, colonIdx).trim();
      var value = data.substring(colonIdx + 1).trim();

      event.preventDefault();

      if (!("originalName" in context)) {
        context.originalName = this.nameElement.textContent;
        context.originalValue = this.valueElement.textContent;
      }
      this.property.name = name;
      this.property.value = value;
      this.nameElement.textContent = name;
      this.valueElement.textContent = value;
      this.nameElement.normalize();
      this.valueElement.normalize();

      this.editingCommitted(event.target.textContent, context, "forward");
    }

    /**
     * @this {WebInspector.StylePropertyTreeElement}
     */
    function blurListener(context, event)
    {
//       var treeElement = this._parentPane._mouseDownTreeElement;
//       var moveDirection = "";
//       if (treeElement === this) {
//         if (isEditingName && this._parentPane._mouseDownTreeElementIsValue)
//           moveDirection = "forward";
//         if (!isEditingName && this._parentPane._mouseDownTreeElementIsName)
//           moveDirection = "backward";
//       }
//       this.editingCommitted(event.target.textContent, context, moveDirection);
      this.editingCommitted(event.target.textContent, context, "forward");
    }

    delete this.originalPropertyText;

//    this._parentPane._isEditingStyle = true;
//    if (selectElement.parentElement)
//      selectElement.parentElement.scrollIntoViewIfNeeded(false);

//    var applyItemCallback = !isEditingName ? this._applyFreeFlowStyleTextEdit.bind(this, true) : undefined;
    this._prompt = new WebInspector.StylesSidebarPane.CSSPropertyPrompt(WebInspector.CSSMetadata.keywordsForProperty('color'), this, false);
//    if (applyItemCallback) {
//      this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemApplied, applyItemCallback, this);
//      this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemAccepted, applyItemCallback, this);
//    }
//    var proxyElement = this._prompt.attachAndStartEditing(selectElement, blurListener.bind(this, context));
    context = {expanded: false, hasChildren: false, isEditingName: false, previousContent: selectElement.textContent};
    var proxyElement = this._prompt.attachAndStartEditing(selectElement, blurListener.bind(this, context));

    proxyElement.addEventListener("keydown", this.editingNameValueKeyDown.bind(this, context), false);
    proxyElement.addEventListener("keypress", this.editingNameValueKeyPress.bind(this, context), false);
//     if (isEditingName)
//       proxyElement.addEventListener("paste", pasteHandler.bind(this, context), false);

    window.getSelection().setBaseAndExtent(selectElement, 0, selectElement, 1);
  },

  editingNameValueKeyDown: function(context, event)
  {
    if (event.handled)
      return;

    var isEditingName = context.isEditingName;
    var result;

    if (isEnterKey(event)) {
      event.preventDefault();
      result = "forward";
    } else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code || event.keyIdentifier === "U+001B")
      result = "cancel";
    else if (!isEditingName && this._newProperty && event.keyCode === WebInspector.KeyboardShortcut.Keys.Backspace.code) {
      // For a new property, when Backspace is pressed at the beginning of new property value, move back to the property name.
      var selection = window.getSelection();
      if (selection.isCollapsed && !selection.focusOffset) {
        event.preventDefault();
        result = "backward";
      }
    } else if (event.keyIdentifier === "U+0009") { // Tab key.
      result = event.shiftKey ? "backward" : "forward";
      event.preventDefault();
    }

    if (result) {
      switch (result) {
        case "cancel":
          this.editingCancelled(null, context);
        break;
        case "forward":
          case "backward":
          this.editingCommitted(event.target.textContent, context, result);
        break;
      }

      event.consume();
      return;
    }

//     if (!isEditingName)
//       this._applyFreeFlowStyleTextEdit(false);
  },

  editingNameValueKeyPress: function(context, event)
  {
    function shouldCommitValueSemicolon(text, cursorPosition)
    {
      // FIXME: should this account for semicolons inside comments?
      var openQuote = "";
      for (var i = 0; i < cursorPosition; ++i) {
        var ch = text[i];
        if (ch === "\\" && openQuote !== "")
          ++i; // skip next character inside string
        else if (!openQuote && (ch === "\"" || ch === "'"))
          openQuote = ch;
        else if (openQuote === ch)
          openQuote = "";
      }
      return !openQuote;
    }

    var keyChar = String.fromCharCode(event.charCode);
    var isFieldInputTerminated = (context.isEditingName ? keyChar === ":" : keyChar === ";" && shouldCommitValueSemicolon(event.target.textContent, event.target.selectionLeftOffset()));
    if (isFieldInputTerminated) {
      // Enter or colon (for name)/semicolon outside of string (for value).
      event.consume(true);
      this.editingCommitted(event.target.textContent, context, "forward");
      return;
    }
  },
  _applyFreeFlowStyleTextEdit: function(now)
  {
    if (this._applyFreeFlowStyleTextEditTimer)
      clearTimeout(this._applyFreeFlowStyleTextEditTimer);

    /**
     * @this {WebInspector.StylePropertyTreeElement}
     */
    function apply()
    {
      var valueText = this.valueElement.textContent;
      if (valueText.indexOf(";") === -1)
        this.applyStyleText(this.nameElement.textContent + ": " + valueText, false, false, false);
    }
    if (now)
      apply.call(this);
    else
      this._applyFreeFlowStyleTextEditTimer = setTimeout(apply.bind(this), 100);
  },

    kickFreeFlowStyleEditForTest: function()
    {
      this._applyFreeFlowStyleTextEdit(true);
    },

    editingEnded: function(context)
    {
      this._resetMouseDownElement();
      if (this._applyFreeFlowStyleTextEditTimer)
        clearTimeout(this._applyFreeFlowStyleTextEditTimer);

      this.hasChildren = context.hasChildren;
      if (context.expanded)
        this.expand();
      var editedElement = context.isEditingName ? this.nameElement : this.valueElement;
      // The proxyElement has been deleted, no need to remove listener.
      if (editedElement && editedElement.parentElement)
        editedElement.parentElement.classList.remove("child-editing");

//       delete this._parentPane._isEditingStyle;
    },

    editingCancelled: function(element, context)
    {
      this._removePrompt();
      this._revertStyleUponEditingCanceled(this.originalPropertyText);
      // This should happen last, as it clears the info necessary to restore the property value after [Page]Up/Down changes.
      this.editingEnded(context);
    },

    _revertStyleUponEditingCanceled: function(originalPropertyText)
    {
      if (typeof originalPropertyText === "string") {
        delete this.originalPropertyText;
        this.applyStyleText(originalPropertyText, true, false, true);
      } else {
        if (this._newProperty)
          this.treeOutline.removeChild(this);
        else
          this.updateTitle();
      }
    },

    _findSibling: function(moveDirection)
    {
      var target = this;
      do {
        target = (moveDirection === "forward" ? target.nextSibling : target.previousSibling);
      } while(target && target.inherited);

      return target;
    },

    /**
     * @param {string} userInput
     * @param {!Object} context
     * @param {string} moveDirection
     */
    editingCommitted: function(userInput, context, moveDirection)
    {
      this._removePrompt();
      this.editingEnded(context);
      var isEditingName = context.isEditingName;

      // Determine where to move to before making changes
      var createNewProperty, moveToPropertyName, moveToSelector;
      var isDataPasted = "originalName" in context;
      var isDirtyViaPaste = isDataPasted && (this.nameElement.textContent !== context.originalName || this.valueElement.textContent !== context.originalValue);
      var isPropertySplitPaste = isDataPasted && isEditingName && this.valueElement.textContent !== context.originalValue;
      var moveTo = this;
      var moveToOther = (isEditingName ^ (moveDirection === "forward"));
      var abandonNewProperty = this._newProperty && !userInput && (moveToOther || isEditingName);
      if (moveDirection === "forward" && (!isEditingName || isPropertySplitPaste) || moveDirection === "backward" && isEditingName) {
        moveTo = moveTo._findSibling(moveDirection);
        if (moveTo)
          moveToPropertyName = moveTo.name;
        else if (moveDirection === "forward" && (!this._newProperty || userInput))
          createNewProperty = true;
        else if (moveDirection === "backward")
          moveToSelector = true;
      }

      // Make the Changes and trigger the moveToNextCallback after updating.
      var moveToIndex = moveTo && this.treeOutline ? this.treeOutline.children.indexOf(moveTo) : -1;
      var blankInput = /^\s*$/.test(userInput);
      var shouldCommitNewProperty = this._newProperty && (isPropertySplitPaste || moveToOther || (!moveDirection && !isEditingName) || (isEditingName && blankInput));
      var section = this.section();
      if (((userInput !== context.previousContent || isDirtyViaPaste) && !this._newProperty) || shouldCommitNewProperty) {
//         section._afterUpdate = moveToNextCallback.bind(this, this._newProperty, !blankInput, section);
//         var propertyText;
//         if (blankInput || (this._newProperty && /^\s*$/.test(this.valueElement.textContent)))
//           propertyText = "";
//         else {
//           if (isEditingName)
//             propertyText = userInput + ": " + this.property.value;
//           else
//             propertyText = this.property.name + ": " + userInput;
//         }
//         this.applyStyleText(propertyText, true, true, false);
      } else {
        if (isEditingName)
          this.property.name = userInput;
        else
          this.property.value = userInput;
        if (!isDataPasted && !this._newProperty)
          this.updateTitle();
        moveToNextCallback.call(this, this._newProperty, false, section);
      }

      /**
       * The Callback to start editing the next/previous property/selector.
       * @this {WebInspector.StylePropertyTreeElement}
       */
      function moveToNextCallback(alreadyNew, valueChanged, section)
      {
        if (!moveDirection)
          return;

        // User just tabbed through without changes.
        if (moveTo && moveTo.parent) {
          moveTo.startEditing(!isEditingName ? moveTo.nameElement : moveTo.valueElement);
          return;
        }

        // User has made a change then tabbed, wiping all the original treeElements.
        // Recalculate the new treeElement for the same property we were going to edit next.
        if (moveTo && !moveTo.parent) {
          var propertyElements = section.propertiesTreeOutline.children;
          if (moveDirection === "forward" && blankInput && !isEditingName)
            --moveToIndex;
          if (moveToIndex >= propertyElements.length && !this._newProperty)
            createNewProperty = true;
          else {
            var treeElement = moveToIndex >= 0 ? propertyElements[moveToIndex] : null;
            if (treeElement) {
              var elementToEdit = !isEditingName || isPropertySplitPaste ? treeElement.nameElement : treeElement.valueElement;
              if (alreadyNew && blankInput)
                elementToEdit = moveDirection === "forward" ? treeElement.nameElement : treeElement.valueElement;
              treeElement.startEditing(elementToEdit);
              return;
            } else if (!alreadyNew)
              moveToSelector = true;
          }
        }

        // Create a new attribute in this section (or move to next editable selector if possible).
        if (createNewProperty) {
          if (alreadyNew && !valueChanged && (isEditingName ^ (moveDirection === "backward")))
            return;

          section.addNewBlankProperty().startEditing();
          return;
        }

        if (abandonNewProperty) {
          moveTo = this._findSibling(moveDirection);
          var sectionToEdit = (moveTo || moveDirection === "backward") ? section : section.nextEditableSibling();
          if (sectionToEdit) {
            if (sectionToEdit.rule)
              sectionToEdit.startEditingSelector();
            else
              sectionToEdit._moveEditorFromSelector(moveDirection);
          }
          return;
        }

        if (moveToSelector) {
          if (section.rule)
            section.startEditingSelector();
          else
            section._moveEditorFromSelector(moveDirection);
        }
      }
    },

    _removePrompt: function()
    {
      // BUG 53242. This cannot go into editingEnded(), as it should always happen first for any editing outcome.
      if (this._prompt) {
        this._prompt.detach();
        delete this._prompt;
      }
    },

    _hasBeenModifiedIncrementally: function()
    {
      // New properties applied via up/down or live editing have an originalPropertyText and will be deleted later
      // on, if cancelled, when the empty string gets applied as their style text.
      return typeof this.originalPropertyText === "string" || (!!this.property.propertyText && this._newProperty);
    },

    styleTextAppliedForTest: function()
    {
    },

    applyStyleText: function(styleText, updateInterface, majorChange, isRevert)
    {
      function userOperationFinishedCallback(parentPane, updateInterface)
      {
        if (updateInterface)
          delete parentPane._userOperation;
      }

      // Leave a way to cancel editing after incremental changes.
      if (!isRevert && !updateInterface && !this._hasBeenModifiedIncrementally()) {
        // Remember the rule's original CSS text on [Page](Up|Down), so it can be restored
        // if the editing is canceled.
        this.originalPropertyText = this.property.propertyText;
      }

      if (!this.treeOutline)
        return;

      var section = this.section();
      styleText = styleText.replace(/\s/g, " ").trim(); // Replace &nbsp; with whitespace.
      var styleTextLength = styleText.length;
      if (!styleTextLength && updateInterface && !isRevert && this._newProperty && !this._hasBeenModifiedIncrementally()) {
        // The user deleted everything and never applied a new property value via Up/Down scrolling/live editing, so remove the tree element and update.
        this.parent.removeChild(this);
        section.afterUpdate();
        return;
      }

      var currentNode = this._parentPane._node;
      if (updateInterface)
        this._parentPane._userOperation = true;

      /**
       * @param {function()} userCallback
       * @param {string} originalPropertyText
       * @param {?WebInspector.CSSStyleDeclaration} newStyle
       * @this {WebInspector.StylePropertyTreeElement}
       */
      function callback(userCallback, originalPropertyText, newStyle)
      {
        if (!newStyle) {
          if (updateInterface) {
            // It did not apply, cancel editing.
            this._revertStyleUponEditingCanceled(originalPropertyText);
          }
          userCallback();
          return;
        }
        this._applyNewStyle(newStyle);

        if (this._newProperty)
          this._newPropertyInStyle = true;

        this.property = newStyle.propertyAt(this.property.index);
        if (section && section._parentPane)
          section._parentPane.dispatchEventToListeners("style edited");

        if (updateInterface && currentNode === this.node()) {
          this._updatePane(userCallback);
          this.styleTextAppliedForTest();
          return;
        }

        userCallback();
        this.styleTextAppliedForTest();
      }

      // Append a ";" if the new text does not end in ";".
      // FIXME: this does not handle trailing comments.
      if (styleText.length && !/;\s*$/.test(styleText))
      styleText += ";";
      var overwriteProperty = !!(!this._newProperty || this._newPropertyInStyle);
      this.property.setText(styleText, majorChange, overwriteProperty, callback.bind(this, userOperationFinishedCallback.bind(null, this._parentPane, updateInterface), this.originalPropertyText));
    },

  __proto__: WebInspector.StylePropertyTreeElementBase.prototype

}


