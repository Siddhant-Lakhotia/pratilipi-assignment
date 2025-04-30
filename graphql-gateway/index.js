require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server');
const axios = require('axios');

// GraphQL Schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    preferences: Preferences!
  }

  type Preferences {
    promotions: Boolean!
    order_updates: Boolean!
    recommendations: Boolean!
  }

  type Notification {
    id: ID!
    type: String!
    content: String!
    sentAt: String!
    read: Boolean!
  }

  type Query {
    getUser(id: ID!): User
    getUnreadNotifications(userId: ID!): [Notification]
  }
`;

// Resolvers
const resolvers = {
  Query: {
    getUser: async (_, { id }) => {
      const res = await axios.get(`${process.env.USER_SERVICE_URL}/users/${id}`);
      return res.data;
    },
    getUnreadNotifications: async (_, { userId }) => {
      const res = await axios.get(
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications/${userId}`
      );
      return res.data;
    }
  }
};

// Apollo Server
const server = new ApolloServer({ 
  typeDefs, 
  resolvers,
  introspection: true,
  playground: true
});

server.listen(process.env.PORT).then(({ url }) => {
  console.log(`🚀 GraphQL gateway ready at ${url}`);
});