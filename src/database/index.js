const faunadb = require('faunadb');

const { Create, Collection, Get, Ref, Match, Index, Update } = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNA_SERVER_SECRET
});

const getUser = async id => {
  const result = await client.query(Get(Ref(Collection('Users'), id)));
  return {
    id: result.ref.id,
    ...result.data
  };
};

const getUserByEmail = async email => {
  const result = await client.query(Get(Match(Index('Users_by_email'), email)));
  return {
    id: result.ref.id,
    ...result.data
  };
};

const createUser = async (email, password) => {
  const result = await client.query(
    Create(Collection('Users'), {
      data: {
        email,
        password,
        active: false,
        created_at: new Date().toISOString(),
        mercadolibre: []
      }
    })
  );
  return {
    id: result.ref.id,
    ...result.data
  };
};

const updateMercadolibreStores = async (userId, mercadolibreStores) => {
  const { data } = await client.query(
    Update(Ref(Collection('Users'), userId), {
      data: {
        mercadolibre: mercadolibreStores
      }
    })
  );
  return data.mercadolibre;
};

const database = {
  createUser,
  getUser,
  getUserByEmail,
  updateMercadolibreStores
};

module.exports = database;
