jQuery(function ($) {

	// Contact Data
	var contacts = [
		{ firstName: "Dave", lastName: "Reed", age: 32, phones: [
			{ type: "Mobile", number: "(555) 121-2121" },
			{ type: "Home", number: "(555) 123-4567"}]
		},
		{ firstName: "John", lastName: "Doe", age: 87, phones: [
			{ type: "Mobile", number: "5554442222" },
			{ type: "Home", number: "(555) 999-1212"}]
		}
	];

	// Converters
	$.extend($.convertFn, {
		// linking converter that normalizes phone numbers
		phone: function (value) {// turn a string phone number into a normalized one with dashes
			// and parens
			value = (parseInt(value.replace(/[\(\)\- ]/g, ""), 10) || 0).toString();
			value = "0000000000" + value;
			value = value.substr(value.length - 10);
			value = "(" + value.substr(0, 3) + ") " + value.substr(3, 3) + "-" + value.substr(6);
			return value;
		},
		fullname: function (value, source, target) {
			return source.firstName + " " + source.lastName;
		},
		age: function (value, source, target) {
			$(target).width(value + "px");
		}
	});

	// Save
	$("#save").click(function () {
		$("#results").html(JSON.stringify(contacts, null, 4));
	});

	// Add Contact
	$("#insert").click(function () {
		$.push(contacts, { firstName: "first", lastName: "last", phones: [], age: 20 });

	});

	// Remove Contact
	$(".contact-remove").live('click', function () {

		// This is very awkward, especially since the index is not tracked by tmplItem
		$.splice(contacts, $.inArray($(this).tmplItem().data, contacts), 1);
	});

	// Sort Contacts
	$("#sort").click(function () {
		$.sort(contacts, function (a, b) {
			return a.lastName < b.lastName ? -1 : 1;
		});
	});

	// Add Phone
	$(".newphone").live('click', function () {
		$.push($(this).tmplItem().data.phones, { type: "", number: "" });
	});

	// Remove Phone
	$(".phone-remove").live('click', function () {

		// Even more awkward than removing contacts
		var phones = $(this).tmplItem().parent.data.phones;
		$.splice(phones, $.inArray($(this).tmplItem().data, phones), 1);
	});

	$("#contacttmpl").tmpl({ contacts: contacts }).appendTo(".contacts");

});

