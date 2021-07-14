const { body, validationResult } = require('express-validator');
const Author = require('../models/author');
const Book = require('../models/book');
const debug = require('debug')('author');

// Using my package
const objPromiseAll = require('obj-promise-all');
// Display list of all Authors.
exports.author_list = function (req, res, next) {
	Author.find()
		.sort([['familyname', 'ascending']])
		.exec(function (err, list_authors) {
			if (err) return next(err);
			res.render('author_list', {
				title: 'Author List',
				author_list: list_authors,
			});
		});
};

// Display detail page for a specific Author.
exports.author_detail = function (req, res, next) {
	const author = Author.findById(req.params.id);
	const author_books = Book.find({ author: req.params.id }, 'title summary');
	Promise.all([author, author_books])
		.then((result) => {
			debug('Author is queried', result[0]);
			if (result[0] == null) {
				var err = new Error('Author not found');
				err.status = 404;
				return next(err);
			}
			res.render('author_detail', {
				title: 'Author Detail',
				author: result[0],
				author_books: result[1],
			});
		})
		.catch((err) => next(err));
};

// Display Author create form on GET.
exports.author_create_get = function (req, res) {
	res.render('author_form', { title: 'Create Author' });
};

// Handle Author create on POST.
exports.author_create_post = [
	body('first_name')
		.trim()
		.isLength({ min: 1 })
		.escape()
		.withMessage('First name must be specified')
		.isAlphanumeric()
		.withMessage('First name has non-alphanumeric characters'),
	body('family_name')
		.trim()
		.isLength({ min: 1 })
		.escape()
		.withMessage('Family name must be specified')
		.isAlphanumeric()
		.withMessage('Gamily name has non-alphanumeric characters'),
	body('date_of_birth', 'Invalid date of birth')
		.optional({ checkFalsy: true })
		.isISO8601()
		.toDate(),
	body('date_of_death', 'Invalid date of death')
		.optional({ checkFalsy: true })
		.isISO8601()
		.toDate(),
	(req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()) {
			res.render('author_form', {
				title: 'Create Author',
				author: req.body,
				errors: errors.array(),
			});
			return;
		} else {
			var author = new Author(req.body);
			author.save(function (err) {
				if (err) return next(err);
				res.redirect(author.url);
			});
		}
	},
];

// Display Author delete form on GET.
exports.author_delete_get = function (req, res) {
	const author = Author.findById(req.params.id);
	const author_books = Book.find({ author: req.params.id });
	objPromiseAll({ author_books, author })
		.then(({ author_books, author }) => {
			if (author == null) {
				res.redirect('/catalog/authors');
			}
			res.render('author_delete', {
				title: 'Delete Author',
				author,
				author_books,
			});
		})
		.catch((err) => next(err));
};

// Handle Author delete on POST.
exports.author_delete_post = function (req, res) {
	const author = Author.findById(req.body.authorid);
	const author_books = Book.find({ author: req.body.authorid });
	objPromiseAll({ author, author_books })
		.then(({ author, author_books }) => {
			if (author_books.length > 0) {
				res.render('author_delete', {
					title: 'Delete Author',
					author,
					author_books,
				});
				return;
			} else {
				Author.findByIdAndRemove(req.body.authorid, (err) => {
					if (err) next(err);
					res.redirect('/catalog/authors');
				});
			}
		})
		.catch((err) => next(err));
};

// Display Author update form on GET.
exports.author_update_get = function (req, res) {
	Author.findById(req.params.id)
		.then((author) => {
			if (!author) {
				const err = new Error('Author not found');
				err.status = 404;
				return next(err);
			}
			res.render('author_form', { title: 'Update Author', author });
		})
		.catch((err) => next(err));
};

// Handle Author update on POST.
exports.author_update_post = [
	body('first_name')
		.trim()
		.isLength({ min: 1 })
		.escape()
		.withMessage('First name must be specified')
		.isAlphanumeric()
		.withMessage('First name has non-alphanumeric characters'),
	body('family_name')
		.trim()
		.isLength({ min: 1 })
		.escape()
		.withMessage('Family name must be specified')
		.isAlphanumeric()
		.withMessage('Gamily name has non-alphanumeric characters'),
	body('date_of_birth', 'Invalid date of birth')
		.optional({ checkFalsy: true })
		.isISO8601()
		.toDate(),
	body('date_of_death', 'Invalid date of death')
		.optional({ checkFalsy: true })
		.isISO8601()
		.toDate(),
	(req, res, next) => {
		const errors = validationResult(req);
		const author = new Author({
			...req.body,
			_id: req.params.id,
		});

		if (!errors.isEmpty()) {
			res.render('author_form', {
				title: 'Update Author',
				author,
				errors: errors.array(),
			});
		} else {
			Author.findByIdAndUpdate(
				req.params.id,
				author,
				{},
				function (err, theauthor) {
					if (err) return next(err);
					res.redirect(theauthor.url);
				}
			);
		}
	},
];
