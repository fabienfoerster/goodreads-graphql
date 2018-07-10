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

const typeDefs = ` 
    type Book {
        id:Int!
        title:String!
        title_without_series:String!
        isbn:String
        isbn13:String
        image_url:String
        small_image_url:String
        authors:[Author]
    }
    type Author {
        id:Int!
        name:String!
    }
    type Shelf {
        id:Int!
        name:String
        book_count:Int
    }
    type Query {
        shelves(user_id:Int): [Shelf]!
    }

`;

const resolvers = {
  Query: {
    shelves: (parent, args) => {
      const { user_id } = args;
      return fetchShelves(user_id);
    }
  },
  Shelf: {
    id: (parent, args) => parseInt(parent.id[0]._),
    name: (parent, args) => parent.name[0],
    book_count: (parent, args) => parseInt(parent.book_count[0]._)
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = schema;
