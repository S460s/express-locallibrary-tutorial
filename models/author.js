const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
	first_name: { type: String, required: true, maxLength: 100 },
	family_name: { type: String, required: true, maxLength: 100 },
	date_of_birth: { type: Date },
	date_of_death: { type: Date },
});

AuthorSchema.virtual('name').get(function () {
	return this.family_name + ', ' + this.first_name;
});

AuthorSchema.virtual('dates').get(function () {
	if (!this.date_of_birth) return ' (No dates provided)';

	const dob = DateTime.fromJSDate(this.date_of_birth).toLocaleString(
		DateTime.DATE_MED
	);
	const dod = this.date_of_death
		? DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED)
		: '';

	return ` (${dob} - ${dod})`;
});

AuthorSchema.virtual('formated_date').get(function () {
	const dt = DateTime.fromJSDate(this.date_of_birth);
	const dt2 = DateTime.fromJSDate(this.date_of_death);
	return { birth: dt.toISODate(), death: dt2.toISODate() };
});

AuthorSchema.virtual('url').get(function () {
	return '/catalog/author/' + this._id;
});

module.exports = mongoose.model('Author', AuthorSchema);
