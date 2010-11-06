/*
* jQuery Templating with Declarative Linking Plugin
* by Jamie Thomas
* www.vc3.com
*/
(function (jQuery, undefined) {

	// Called during template execution to set up a linked field
	$.tmpl.linkAttr = function link(tmplItem, data, field, value, converter) {

		// Set the rendered callback
		tmplItem.rendered = rendered;

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
		tmplItem._links.push({ data: data, field: field, value: value, converter: converter });

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

	// Binds element attributes that are linked to javascript attributes
	function bindAttr(tmplItem, elem, attr) {

		var binding = getBinding(tmplItem, elem, attr.nodeValue);
		if (binding) {

			// Update the attribute value to the correct untagged value
			// Cannot use $(elem).attr(name, value) because this causes latency
			// and flickering during rendering
			attr.nodeValue = binding.value;

			var attrName = attr.nodeName,
				mapping = {};

			// Setup two-way linking for form input elements
			if (/^(textarea|input|select)$/i.test(elem.nodeName) && attrName == "value") {

				// Create the link mapping
				mapping[binding.field] = $.extend({ name: elem.name }, { convert: binding.converter.convertBack, convertBack: binding.converter.convert });
			}

			// Otherwise, setup one-way linking
			else {

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
			$(elem).link(binding.data, mapping);
		}
	}

	// Gets the binding attached to a template item if the expression represents a binding
	function getBinding(tmplItem, elem, expr) {
		var match = expr.match(/^\{\{link\((\d+)\)\}\}$/);
		if (match) {

			var index = parseInt(match[1]),
				binding = tmplItem._links[index];

			// Convert the value if a converter was specified
			if (binding.converter && binding.converter.convert) {
				var convertedValue = binding.converter.convert(binding.value, binding.data, elem);
				if (convertedValue !== undefined) {
					binding.value = convertedValue;
				}
			}

			return binding;
		}
		return null;
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
			open: "_.push($.tmpl.linkAttr($item,$data,'$1',$1a,$2));"
		}
	});

})(jQuery);