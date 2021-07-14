const Genre = require('../models/genre');
const Book = require('../models/book');

const { body, validationResult } = require('express-validator');
const async = require('async');
const objPromiseAll = require('obj-promise-all');

// Display list of all Genre.
exports.genre_list = function (req, res, next) {
	Genre.find().exec(function (err, genres) {
		if (err) return next(err);
		res.render('genre_list', { title: 'Genre List', genre_list: genres });
	});
};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res, next) {
	async.parallel(
		{
			genre: function (callback) {
				Genre.findById(req.params.id).exec(callback);
			},
			genre_books: function (callback) {
				Book.find({ genre: req.params.id }).exec(callback);
			},
		},
		function (err, results) {
			if (err) return next(err);
			if (results.genre === null) {
				const err = new Error('Genrer not found');
				err.status = 404;
				return next(err);
			}
			res.render('genre_details', {
				title: 'Genre Detail',
				genre: results.genre,
				genre_books: results.genre_books,
			});
		}
	);
};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res) {
	res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
	body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),
	(req, res, next) => {
		const errors = validationResult(req);
		const genre = new Genre({ name: req.body.name });
		if (!errors.isEmpty()) {
			res.render('genre_form', {
				title: 'Create Genre',
				genre,
				errors: errors.array(),
			});
		} else {
			Genre.findOne({ name: req.body.name }).exec(function (err, found_genre) {
				if (err) return next(err);
				if (found_genre) {
					res.redirect(found_genre.url);
				} else {
					genre.save(function (err) {
						if (err) return next(err);
						res.redirect(genre.url);
					});
				}
			});
		}
	},
];

// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res) {
	const genre = Genre.findById(req.params.id);
	const books = Book.find({ genre: req.params.id });

	objPromiseAll({ genre, books })
		.then(({ genre, books }) => {
			if (!genre) {
				res.redirect('/catalog/genres');
			}
			res.render('genre_delete', { title: 'Delete Genre', genre, books });
		})
		.catch((err) => next(err));
};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res) {
	const genre = Genre.findById(req.body.genreid);
	const books = Book.find({ genre: req.body.genreid });
	objPromiseAll({ genre, books })
		.then(({ genre, books }) => {
			if (books.length > 0) {
				res.render('genre_delete', { title: 'Delete Title', genre, books });
			} else {
				Genre.findByIdAndRemove(req.body.genreid, (err) => {
					if (err) return next(err);
					res.redirect('/catalog/genres');
				});
			}
		})
		.catch((err) => next(err));
};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res) {
	Genre.findById(req.params.id)
		.then((result) => {
			if (!result) {
				const err = new Error('Genre not found');
				err.status = 404;
				return next(err);
			}
			res.render('genre_form', { title: 'Update Genre', genre: result });
		})
		.catch((err) => next(err));
};

// Handle Genre update on POST.
exports.genre_update_post = [
	body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),
	(req, res, next) => {
		const errors = validationResult(req);
		const genre = new Genre({ name: req.body.name, _id: req.params.id });
		if (!errors.isEmpty()) {
			res.render('genre_form', { title: 'Update Genre', genre });
			return;
		} else {
			Genre.findByIdAndUpdate(req.params.id, genre, {}, (err, thegenre) => {
				if (err) return next(err);
				res.redirect(thegenre.url);
			});
		}
	},
];
