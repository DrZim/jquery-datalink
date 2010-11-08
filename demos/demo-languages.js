
// Proficiencies
var proficiencies = [
	{ id: 0, name: "None" },
	{ id: 1, name: "Low" },
	{ id: 2, name: "Medium" },
	{ id: 3, name: "High" }
];

// Languages
var languages = [
	{ id: 0, name: "Fortran", year: 1957, used: true, proficiency: proficiencies[1] },
	{ id: 1, name: "LISP", year: 1959, used: false, proficiency: proficiencies[0] },
	{ id: 2, name: "COBOL", year: 1960, used: false, proficiency: proficiencies[0] },
	{ id: 3, name: "BASIC", year: 1964, used: true, proficiency: proficiencies[1], predecessors: [ "Fortran" ] },
	{ id: 4, name: "Pascal", year: 1970, used: true, proficiency: proficiencies[2] },
	{ id: 5, name: "C", year: 1972, used: true, proficiency: proficiencies[2] },
	{ id: 6, name: "Delphi", year: 1995, used: true, proficiency: proficiencies[2], predecessors: [ "Pascal" ] },
	{ id: 7, name: "Java", year: 1995, used: true, proficiency: proficiencies[2], predecessors: [ "C" ] },
	{ id: 8, name: "Javascript", year: 1996, used: true, proficiency: proficiencies[3], predecessors: [ "C" ] },
	{ id: 9, name: "C#", year: 2000, used: true, proficiency: proficiencies[3], predecessors: [ "C", "Delphi" ] }
];

// Setup Recursive Predecessor Relationship
$(languages).each(function () {
	
	// Link predecessors
	if (this.predecessors) {
		this.predecessors = $(this.predecessors).map(function (index) {
			for (var l in languages) {
				if (languages[l].name == this)
					return languages[l];
			}
		}).get();
	}
	else {
		this.predecessors = [];
	}

	// Bind to change events
	$([this.predecessors]).bind("arrayChange.predecessors", function () {
		updateDescendents();
	});
});

updateDescendents();

// Descendents Rule
function updateDescendents() {
		
	// Remove descendents, but do not replace array
	$(languages).each(function () {

		var language = this;

		// Initialize the descendents array
		if (!$.isArray(language.descendents)) {
			
			language.descendents = [];

			// Bind to change events
			$([language.descendents]).bind("arrayChange.descendents", function () {
				updateAllowedPredecessors(language);
			});

		}

		// Clear the descendents array
		else {
			language.descendents.splice(0, language.descendents.length);
		}
	});

	function update(descendent, anscestors) {
		$(anscestors).each(function () {
			var anscestor = this;
			if ($.inArray(descendent, anscestor.descendents) < 0)
				anscestor.descendents.push(descendent);
			update(descendent, anscestor.predecessors);
		});
	}

	// Populate descendents
	$(languages).each(function() {
		update(this, this.predecessors);
	});

	// Trigger the change event indicating that the descendents have changed
	$(languages).each(function() {
		$.event.trigger("arrayChange", null, this.descendents);
	});
}

// Allowed Predecessors Rule
function updateAllowedPredecessors(language) {

	// Initialize the allowed predecessors array
	if (!$.isArray(language.allowedPredecessors)) {
		language.allowedPredecessors = [];
	}

	// Clear the allowed predecessors array
	else {
		language.allowedPredecessors.splice(0, language.allowedPredecessors.length);
	}

	// Populate the set of allowed predecessors
	$(languages).each(function () {
		var lang = language;
		if (this !== lang && $.inArray(this, lang.descendents) < 0)
			lang.allowedPredecessors.push(this);
	});

	// Trigger the change event indicating that the allowed predecessors have changed
	$.event.trigger("arrayChange", null, language.allowedPredecessors);
}

jQuery(function ($) {

	// Converters
	$.extend($.converters, {

		// Proficiency
		proficiency: {
			convert: function (val) {
				return val.id;
			},
			convertBack: function (id) {
				return proficiencies[id];
			}
		},

		// Language
		language: {
			convert: function (val) {
				return val.id;
			},
			convertBack: function (id) {
				return languages[id];
			}
		},

		// ShortDate
		shortDate: {
			convert: function (val) {
				return $.format(val, "M/d/yyyy");
			},
			convertBack: function (str) {
				var val = $.parseDate(str);

				if (val) {
					return val;
				}
				// else raise validation error
			}
		},

		// Year
		year: {
			convertBack: function (str) {
				var val = $.parseInt(str);

				if (val && val > 1900 && val < 9999) {
					return val;
				}
				// else raise validation error
			}
		}
	});

	// Add Language
	$("#insert").click(function () {
		$.push(languages, { name: "", year: "", used: false, proficiency: proficiencies[0] });

	});

	// Remove Language
	$(".language-remove").live('click', function () {

		// This is very awkward, especially since the index is not tracked by tmplItem
		$.splice(languages, $.inArray($(this).tmplItem().data, languages), 1);
	});

	// Sort Languages
	$("#sort").click(function () {
		$.sort(languages, function (a, b) {
			return a.lastName < b.lastName ? -1 : 1;
		});
	});

	// Save
	$("#save").click(function () {
		$("#results").html(JSON.stringify(languages, null, 4));
	});

	// Initial Template Render
	$("#form").tmpl({ languages: languages }).appendTo(".languages");

});

