const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList
} = require('graphql');

const { makeExecutableSchema } = require('graphql-tools');
const util = require('util');
const parseXML = util.promisify(require('xml2js').parseString);
const fetch = require('node-fetch');

const GOODREADS_KEY = process.env.GOODREADS_KEY;

const fetchShelves = user_id =>
  fetch(
    `https://www.goodreads.com/shelf/list.xml?key=${GOODREADS_KEY}&user_id=${user_id}`
  )
    .then(res => res.text())
    .then(parseXML)
    .then(r => r.GoodreadsResponse.shelves[0].user_shelf);

const fetchUser = id =>
  fetch(`http://www.goodreads.com/user/show/${id}.xml?key=${GOODREADS_KEY}`)
    .then(response => response.text())
    .then(parseXML)
    .then(r => r.GoodreadsResponse.user[0]);

const fetchBookOnShelf = (user_id, shelf_name) =>
  fetch(
    `https://www.goodreads.com/review/list/${user_id}.xml?key=${GOODREADS_KEY}&shelf=${shelf_name}`
  )
    .then(response => response.text())
    .then(parseXML)
    .then(r => r.GoodreadsResponse.books[0].book);

const typeDefs = `
  type User {
    id: Int!
    name: String!
    user_name: String
    friends_count: Int
    groups_count: Int
    reviews_count: Int
    shelves: [Shelf]
  }

  type Book {
    id: Int!
    title: String!
    title_without_series: String!
    isbn: String
    isbn13: String
    image_url: String
    small_image_url: String
    authors: [Author]
  }
  type Author {
    id: Int!
    name: String!
  }
  type Shelf {
    id: Int!
    name: String
    book_count: Int
    books: [Book]
  }
  type Query {
    shelves(user_id: Int): [Shelf]
    user(id: Int): User
  }
`;

let logAndReturn = r => {
  console.log(JSON.stringify(r, null, 2));
  return r;
};

const resolvers = {
  Query: {
    shelves: (parent, args) => {
      const { user_id } = args;
      return fetchShelves(user_id);
    },
    user: (parent, args) => {
      const { id } = args;
      return fetchUser(id);
    }
  },

  Book: {
    id: root => parseInt(root.id[0]._),
    title: root => root.title[0],
    title_without_series: root => root.title_without_series[0],
    isbn: root => root.isbn[0],
    isbn13: root => root.isbn13[0],
    image_url: root => root.image_url[0],
    small_image_url: root => root.small_image_url[0],
    authors: root => root.authors[0].author
  },

  Author: {
    id: root => parseInt(root.id[0]),
    name: root => root.name[0]
  },

  User: {
    id: (parent, args) => parseInt(parent.id[0]._),
    name: (parent, args) => parent.name[0],
    user_name: (parent, args) => parent.user_name[0],
    friends_count: parent => parseInt(parent.friends_count[0]._),
    groups_count: parent => parseInt(parent.groups_count[0]._),
    reviews_count: parent => parseInt(parent.reviews_count[0]._),
    shelves: (parent, args) =>
      parent.user_shelves[0].user_shelf.map(shelf =>
        Object.assign(shelf, { user_id: parent.id[0] })
      )
  },

  Shelf: {
    id: (root, args) => parseInt(root.id[0]._),
    name: (root, args) => root.name[0],
    book_count: (root, args) => parseInt(root.book_count[0]._),
    books: (root, args) => fetchBookOnShelf(root.user_id, root.name[0])
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = schema;
