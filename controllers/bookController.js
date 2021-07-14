var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');
const { validationResult, body } = require('express-validator');
const objPromiseAll = require('obj-promise-all');
exports.index = function (req, res) {
	async.parallel(
		{
			book_count: function (callback) {
				Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
			},
			book_instance_count: function (callback) {
				BookInstance.countDocuments({}, callback);
			},
			book_instance_available_count: function (callback) {
				BookInstance.countDocuments({ status: 'Available' }, callback);
			},
			author_count: function (callback) {
				Author.countDocuments({}, callback);
			},
			genre_count: function (callback) {
				Genre.countDocuments({}, callback);
			},
		},
		function (err, results) {
			res.render('index', {
				title: 'Local Library Home',
				error: err,
				data: results,
			});
		}
	);
};

// Display list of all books.
exports.book_list = function (req, res) {
	Book.find({}, 'title author')
		.populate('author')
		.exec(function (err, list_books) {
			res.render('book_list', { title: 'Book List', book_list: list_books });
		});
};

// Display detail page for a specific book.
exports.book_detail = function (req, res, next) {
	const book = Book.findById(req.params.id)
		.populate('author')
		.populate('genre');
	const bookInstance = BookInstance.find({ book: req.params.id });
	Promise.all([book, bookInstance])
		.then((result) => {
			if (result[0] === null) {
				const err = new Error('Book not found');
				err.status = 404;
				return next(err);
			}
			res.render('book_detail', {
				title: result[0].title,
				book: result[0],
				book_instances: result[1],
			});
		})
		.catch((err) => next(err));
};

// Display book create form on GET.
exports.book_create_get = function (req, res, next) {
	const authors = Author.find();
	const genres = Genre.find();

	Promise.all([authors, genres])
		.then((result) => {
			res.render('book_form', {
				title: 'Create Book',
				authors: result[0],
				genres: result[1],
			});
		})
		.catch((err) => next(err));
};

// Handle book create on POST.
exports.book_create_post = [
	(req, res, next) => {
		if (!(req.body.genre instanceof Array)) {
			if (typeof req.body.genre === 'undefined') req.body.genre = [];
			else req.body.genre = new Array(req.body.genre);
		}
		next();
	},
	body('title', 'Title must not be empty').trim().isLength({ min: 1 }).escape(),
	body('author', 'Author must not be empty.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('summary', 'Summary must not be empty.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
	body('genre.*').escape(),

	(req, res, next) => {
		const errors = validationResult(req);
		const book = new Book(req.body);
		if (!errors.isEmpty()) {
			Promise.all([Author.find(), Genre.find()])
				.then((result) => {
					for (let i = 0; i < result[1].length; i++) {
						if (book.genre.indexOf(result[1][i]._id) > -1) {
							result[1][i].checked = 'true';
						}
					}
					res.render('book_form', {
						title: 'Create Book',
						authors: result[0],
						genres: result[1],
						book,
						errors: errors.array(),
					});
					return;
				})
				.catch((err) => next(err));
		} else {
			book.save(function (err) {
				if (err) return next(err);
				res.redirect(book.url);
			});
		}
	},
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res) {
	const book = Book.findById(req.params.id);
	const bookInstances = BookInstance.find({ book: req.params.id });

	objPromiseAll({ book, bookInstances })
		.then(({ book, bookInstances }) => {
			if (!book) {
				res.redirect('/catalog/books');
			}
			res.render('book_delete', { title: 'Delete Book', book, bookInstances });
		})
		.catch((err) => next(err));
};

// Handle book delete on POST.
exports.book_delete_post = function (req, res) {
	const book = Book.findById(req.body.bookid);
	const bookInstances = BookInstance.find({ book: req.body.bookid });
	objPromiseAll({ book, bookInstances }).then(({ book, bookInstances }) => {
		if (bookInstances.length > 0) {
			res.render('book_delete', { title: 'Delete Book', book, bookInstances });
		}
		Book.findByIdAndRemove(req.body.bookid, (err) => {
			if (err) return next(err);
			res.redirect('/catalog/books');
		});
	});
};

// Display book update form on GET.
exports.book_update_get = function (req, res, next) {
	const book = Book.findById(req.params.id)
		.populate('author')
		.populate('genre');
	const authors = Author.find();
	const genres = Genre.find();

	objPromiseAll({ book, authors, genres }).then(({ book, authors, genres }) => {
		if (book == null) {
			const err = new Error('Book not found');
			err.status = 404;
			return next(err);
		}
		for (let all_g_iter = 0; all_g_iter < genres.length; all_g_iter++) {
			for (
				let book_g_iter = 0;
				book_g_iter < book.genre.length;
				book_g_iter++
			) {
				if (
					genres[all_g_iter]._id.toString() ===
					book.genre[book_g_iter]._id.toString()
				) {
					genres[all_g_iter].checked = 'true';
				}
			}
		}
		res.render('book_form', { title: 'Update Book', authors, genres, book });
	});
};

// Handle book update on POST.
exports.book_update_post = [
	(req, res, next) => {
		if (!(req.body.genre instanceof Array)) {
			if (typeof req.body.genre === 'undefined') {
				req.body.genre = [];
			} else {
				req.body.genre = new Array(req.body.genre);
			}
		}
		next();
	},
	body('title', 'Title must not be empty.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('author', 'Author must not be empty.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('summary', 'Summary must not be empty.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
	body('genre.*').escape(),
	(req, res, next) => {
		const errors = validationResult(req);
		const book = new Book({
			title: req.body.title,
			author: req.body.author,
			summary: req.body.summary,
			isbn: req.body.isbn,
			genre: typeof req.body.genre === 'undefined' ? [] : req.body.genre,
			_id: req.params.id, //This is required, or a new ID will be assigned!
		});
		if (!errors.isEmpty()) {
			const authors = Author.find();
			const genres = Genre.find();
			objPromiseAll({ authors, genres })
				.then(({ authors, genres }) => {
					for (let i = 0; i < genres.length; i++) {
						if (book.genre.indexOf(genres[i]._id) > -1) {
							genres[i].checked = 'true';
						}
						res.render('book_form', {
							title: 'Update Book',
							authors,
							genres,
							book,
							errors: errors.array(),
						});
					}
				})
				.catch((err) => next(err));
		} else {
			Book.findByIdAndUpdate(req.params.id, book, {}, (err, thebook) => {
				if (err) return next(err);
				res.redirect(thebook.url);
			});
		}
	},
];
