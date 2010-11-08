/*
* jQuery Templating with Declarative Linking Plugin
* by Jamie Thomas
* www.vc3.com
*/
(function (jQuery, undefined) {

	// Called during template execution to set up a linked field
	$.tmpl.linkAttr = function link(tmplItem, data, field, converter, context) {

		// Set the rendered callback
		tmplItem.rendered = rendered;

		// Use the alternate update function
		tmplItem.update = tiUpdate;

		if (converter) {

			// Lookup named converters
			if (typeof converter === "string") {
				converter = $.converters[converter];
			}

			var convert = converter.convert,
				convertBack = converter.convertBack;

			if (converter.convert && typeof converter.convert === "string") {
				converter.convert = $.convertFn[converter.convert];
			}
			if (converter.convertBack && typeof converter.convertBack === "string") {
				converter.convertBack = $.convertFn[converter.convertBack];
			}
		}
		else
			converter = {};

		// Add the link to the current template item
		if (!tmplItem._links)
			tmplItem._links = [];
		tmplItem._links.push({ data: data, field: field, converter: converter, context: context });

		// Return a tagged expression to be located in the DOM immediately after rendering
		return "{{link(" + (tmplItem._links.length - 1) + ")}}";
	};

	// Called after template execution on the source item, enabling element binding
	function rendered(tmplItem) {
		for (var elem in tmplItem.nodes) {
			bind(tmplItem, tmplItem.nodes[elem]);
		}
	}

	// Recursively enables binding on all elements
	function bind(tmplItem, elem) {

		// See if any attributes contain a binding expression
		for (var i = 0; i < elem.attributes.length; i++) {
			bindAttr(tmplItem, elem, elem.attributes[i]);
		}

		// See if the content of the element is a binding expression
		if (elem.childNodes.length == 1 && elem.childNodes[0].nodeType == 3) {
			var binding = getBinding(tmplItem, elem, elem.innerHTML);
			if (binding) {
				elem.innerHTML = binding.value;
				var mapping = {};
				mapping[binding.field] = {

					convert: function (value, source, target) {
						if (binding.converter && binding.converter.convert) {
							value = binding.converter.convert(value, source, target)
							if (value === undefined)
								return;
						}
						$(target).text(value);
					}
				};
				$(elem).link(binding.data, mapping);
			}
		}

		// Recursively process child elements
		for (var i = 0; i < elem.childNodes.length; i++) {
			var child = elem.childNodes[i];
			if (child.nodeType == 1) {
				childTmplItem = $(child).tmplItem();

				// Only recursively bind elements associated with the same template item
				if (childTmplItem && childTmplItem === tmplItem)
					bind(tmplItem, child);
			}
		}
	}

	var rInputSelectTextarea = /^(?:input|select|textarea)$/i,
		rRadioCheck = /^(?:radio|checkbox)$/i;

	// Binds element attributes that are linked to javascript attributes
	function bindAttr(tmplItem, elem, attr) {

		var binding = getBinding(tmplItem, elem, attr.nodeValue);
		if (binding) {

			var attrName = attr.nodeName.toLowerCase(),
				mapping = {},
				wrappedElem = $(elem);

			// Setup two-way linking for form input elements
			if (rInputSelectTextarea.test(elem.nodeName)) {

				// Checkbox and radio buttons
				if ($.nodeName(elem, "input") && rRadioCheck.test(elem.type)) {

					// Make the element name unique relative to other template item contexts
					elem.name = elem.name + "_" + tmplItem.key;

					// Linked to "checked", bind as boolean
					if (attrName == "checked") {

						// Remove the checked attribute to clean up the binding
						wrappedElem.removeAttr("checked");

						// Set the initial checked status
						elem.checked = binding.value == "true";

						// Perform custom two-way linking since the datalink API does not support checkboxes or radio buttons
						wrappedElem.bind("change", function (e) {
							$(binding.data).data(binding.field, e.target.checked);
						});

						$(binding.data).bind("changeData", function (e, field, value) {
							if (field == binding.field)
								elem.checked = value;
						});
					}

					// Linked to "value", bind as single value for radio, set of values for checkbox
					else if (attrName == "value") {

						// Get the value of the current context
						var context = convert(binding.context, binding.converter);

						// Set the value of the element
						elem.value = context;

						// Radio-buttons
						if (elem.type.toLowerCase() == "radio") {

							// Check the element if the element value matches the current field value
							elem.checked = context == binding.value;

							// Update the field value when the radio button value changes
							wrappedElem.bind("change", function (e) {

								// Get the value of the element
								var currentValue = e.target.value;
								if (binding.converter && binding.converter.convertBack) {
									var convertedValue = binding.converter.convertBack(context);
									if (convertedValue !== undefined)
										currentValue = convertedValue;
								}

								// Set the value of the field
								$(binding.data).data(binding.field, currentValue);
							});

							// Update the radio button when the field value changes
							$(binding.data).bind("changeData", function (e, field, value) {
								if (field == binding.field) {

									// Get the current selected value of the field
									var selectedValue = convert(value, binding.converter, binding.data, elem);

									// Set the checked status of the element based on whether it is the selected value
									elem.checked = elem.value == selectedValue;
								}
							});
						}

						// Check-boxes
						else {

							// Check the element if the element value is in the current field value array
							elem.checked = $.inArray(context, binding.value) >= 0

							// Update the field array when the checkbox value changes
							wrappedElem.bind("change", function (e) {

								// Get the value of the element
								var currentValue = e.target.value;
								if (binding.converter && binding.converter.convertBack) {
									var convertedValue = binding.converter.convertBack(context);
									if (convertedValue !== undefined)
										currentValue = convertedValue;
								}

								// Add or remove the element from the linked array
								var fieldValue = binding.data[binding.field];
								if ($.isArray(fieldValue)) {
									var index = $.inArray(currentValue, fieldValue);

									// Add the selected item
									if (index < 0 && elem.checked) {
										$.push(fieldValue, currentValue);
									}

									// Remove the deselected item
									else if (index >= 0 && !elem.checked) {
										$.splice(fieldValue, index, 1);
									}
								}
							});

							// Update the checkbox when the field array changes
							$(binding.data).bind("changeData", function (e, field, value) {
								if (field == binding.field)
									elem.checked = $.inArray(elem.value, value) >= 0;
							});
						}
					}

					// Exit because the link has already been established manually for check-boxes and radio-buttons
					return;
				}

				// All other input controls
				else if (attrName == "value") {

					// Set the value of the form input element
					if ($.nodeName(elem, "select") || !$.browser.mozilla) {
						wrappedElem.val(binding.value);
					}

					else {
						// Cannot use .val() or set .value because this appears to 
						// yield briefly in FireFox, causing premature DOM rendering (yuck!)
						elem.attributes['value'].nodeValue = binding.value;
					}

					// Create the link mapping
					mapping[binding.field] = $.extend({ name: elem.name }, { convert: binding.converter.convertBack, convertBack: binding.converter.convert });
				}
			}

			// Otherwise, setup one-way linking
			else {

				// Update the attribute value to the correct untagged value
				// Cannot use $(elem).attr(name, value) because this causes latency
				// and flickering during rendering
				attr.nodeValue = binding.value;

				// Create the link mapping
				mapping[binding.field] = {

					convert: function (value, source, target) {
						if (binding.converter && binding.converter.convert) {
							value = binding.converter.convert(value, source, target)
							if (value === undefined)
								return;
						}
						$(target).attr(attrName, value);
					}
				};
			}

			// Set up the link
			wrappedElem.link(binding.data, mapping);
		}
	}

	// Gets the binding attached to a template item if the expression represents a binding
	function getBinding(tmplItem, elem, expr) {
		var match = expr.match(/^\{\{link\((\d+)\)\}\}$/);
		if (match) {

			// Get the binding
			var index = parseInt(match[1]),
				binding = tmplItem._links[index];

			// Get the value of the linked field
			binding.value = convert(binding.data[binding.field], binding.converter, binding.data, elem);

			return binding;
		}
		return null;
	}

	// Convert the specified value
	function convert(value, converter, data, elem) {

		// Get the convert function to use
		var convert = converter ? converter.convert : null,
			result;

		// Array
		if ($.isArray(value)) {
			result = [];
			for (var i = 0; i < value.length; i++) {
				result[i] = convert ? convert(value[i], data, elem) : value[i];
				result[i] = result[i] === undefined ? value[i] + "" : result[i] + "";
			}
		}

		// Single Value
		else {
			result = convert ? convert(value, data, elem) : value;
			result = result === undefined ? value + "" : result + "";
		}

		return result;
	}

	// Alternate update implementation that hides new elements during the render event to avoid flickering
	function tiUpdate() {
		var coll = this.nodes,
			ncol = jQuery.tmpl(null, null, null, this),
			disp = [],
			node;
		for (var i = 0; i < ncol.length; i++) {
			disp[i] = null;
			node = ncol.get(i);
			if (node.style) {
				disp[i] = node.style.display || "";
				node.style.display = "none";
			}
		};
		ncol.insertBefore(coll[0]).each(function (i) {
			if (disp[i] != null) {
				this.style.display = disp[i];
			}
		});
		jQuery(coll).remove();
	}


	// Note: The following two functions where copyed from:
	// http://infinity88.com/jquery-datalink/jquery.datalink.js
	// which was an early version of the jquery.datalink plugin that supported array change events

	// Helper function to raise array events
	function raiseEvents(type, context, change, setValue) {
		// todo: peek if there are any listeners to avoid extra work
		var ret,
			event = $.Event(type + "Changing"),
			isArray = type === "array";
		event.newValue = isArray ? change.arguments : change.newValue;
		$.event.trigger(event, [change], context);
		if (!event.isDefaultPrevented()) {
			var newvalue = isArray ? change.arguments : event.newValue;
			ret = setValue(newvalue);
			var oldvalue = change.oldValue;
			if (isArray || typeof oldvalue === "undefined" || newvalue !== oldvalue) {
				isArray ? (change.arguments = newvalue) : (change.newValue = newvalue);
				$.event.trigger(type + "Change", [change], context);
			}
		}
		return ret;
	}

	// Raises arrayChanging and arrayChange events when arrays are manipulated with $.x methods
	$.each("pop push reverse shift sort splice unshift".split(" "), function (i, name) {
		$[name] = function (arr) {
			var args = $.makeArray(arguments);
			args.splice(0, 1);
			return raiseEvents("array", arr, { change: name, arguments: args }, function (arguments) {
				arr[name].apply(arr, arguments);
			});
		}
	});

	// Subscribes to array changes to update a template automatically
	$.tmpl.linkArray = function loop(tmplItem, data, field) {
		var source = data[field];
		if ($.isArray(source)) {
			$([source]).bind("arrayChange.loop", function (event) {
				$([source]).unbind("arrayChange.loop");
				tmplItem.update();
			});
		}
	};

	// Extends the jQuery template tags to support binding element and attribute values, and update when arrays change
	jQuery.extend(jQuery.tmpl.tag, {
		"each": {
			_default: { $2: "$index, $value" },
			open: "$.tmpl.linkArray($item,$data,'$1');if($notnull_1){$.each($1a,function($2){with(this){",
			close: "}});}"
		},
		"tmpl": {
			_default: { $2: "null" },
			open: "$.tmpl.linkArray($item,$data,'$2');if($notnull_1){_=_.concat($item.nest($1,$2));}"
		},
		"link": {
			_default: { $1: "$data", $2: "null" },
			open: "_.push($.tmpl.linkAttr($item,$data,'$1',$2,this));"
		}
	});

})(jQuery);