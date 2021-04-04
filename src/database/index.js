const faunadb = require('faunadb');

const {
  Collection,
  Create,
  Get,
  Index,
  Lambda,
  Map,
  Match,
  Now,
  Paginate,
  Ref,
  Update,
  Var
} = faunadb.query;

const client = new faunadb.Client({
  secret: process.env.FAUNA_SERVER_SECRET
});

const getUser = async id => {
  const result = await client.query(Get(Ref(Collection('users'), id)));
  return result;
};

const getUserByEmail = async email => {
  const result = await client.query(Get(Match(Index('users_by_email'), email)));
  return result;
};

const createUser = async (email, password) => {
  const result = await client.query(
    Create(Collection('users'), {
      data: {
        email,
        password,
        active: false,
        created_at: Now(),
        mercadolibre: []
      }
    })
  );
  return result;
};

const getStores = async userId => {
  const result = await client.query(
    Map(
      Paginate(
        Match(Index('stores_by_user'), Ref(Collection('users'), userId))
      ),
      Lambda(['ref'], Get(Var('ref')))
    )
  );
  return result;
};

const getStore = async meliUserId => {
  const result = await client.query(
    Get(Match(Index('stores_by_meliuserid'), meliUserId))
  );
  return result;
};

const addStore = async (userId, storeData) => {
  const result = await client.query(
    Create(Collection('stores'), {
      data: {
        ...storeData,
        user: Ref(Collection('users'), userId)
      }
    })
  );
  return result;
};

const updateStore = async (storeId, accessToken, refreshToken) => {
  const result = await client.query(
    Update(Ref(Collection('stores'), storeId), {
      data: {
        access_token: accessToken,
        refresh_token: refreshToken
      }
    })
  );
  return result;
};

const database = {
  createUser,
  getUser,
  getUserByEmail,
  getStores,
  getStore,
  addStore,
  updateStore
};

module.exports = database;
