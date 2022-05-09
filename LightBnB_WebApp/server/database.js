const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase()])
    .then((result) => {
      if (!result) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1`, [id])
  .then((result) => {
    if (!result) {
      return null;
    }
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool
  .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, [user.name, user.email.toLowerCase(), user.password])
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.addUser = addUser;

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
  .query(`SELECT properties.*, reservations.id, reservations.start_date, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
  .then((result) => {
    return result.rows;
  })
  .catch((err) => {
    console.log(err.message);
  });
}
exports.getAllReservations = getAllReservations;

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
  let query = `SELECT properties.*, avg(rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews on properties.id = property_reviews.property_id`;
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    query += ` WHERE city LIKE $${queryParams.length}`;
    if (options.owner_id) {
      queryParams.push(options.owner_id);
      query += ` AND owner_id = $${queryParams.length}`;
    }
    if (options.minimum_price_per_night) {
      queryParams.push(Number(options.minimum_price_per_night) * 100);
      query += ` AND cost_per_night >= $${queryParams.length}`;
    }
    if (options.maximum_price_per_night) {
      queryParams.push(Number(options.maximum_price_per_night) * 100);
      query += ` AND cost_per_night <= $${queryParams.length}`;
    }
  } else {
    if (options.owner_id) {
      queryParams.push(options.owner_id);
      query += ` WHERE owner_id = $${queryParams.length}`;
      if (options.minimum_price_per_night) {
        queryParams.push(Number(options.minimum_price_per_night) * 100);
        query += ` AND cost_per_night >= $${queryParams.length}`;
      }
      if (options.maximum_price_per_night) {
        queryParams.push(Number(options.maximum_price_per_night) * 100);
        query += ` AND cost_per_night <= $${queryParams.length}`;   
      }
    } else {
      if (options.minimum_price_per_night) {
        queryParams.push(Number(options.minimum_price_per_night) * 100);
        query += ` WHERE cost_per_night >= $${queryParams.length}`; 
        if (options.maximum_price_per_night) {  
          queryParams.push(Number(options.maximum_price_per_night) * 100);
          query += ` AND cost_per_night <= $${queryParams.length}`;   
        }
      } else {
        if (options.maximum_price_per_night) {
          queryParams.push(Number(options.maximum_price_per_night) * 100);
          query += ` WHERE cost_per_night <= $${queryParams.length}`;  
        }
      }
    }
  }
  query += ` GROUP BY properties.id`;
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    query += ` HAVING avg(rating) >= $${queryParams.length}`;
  }
  queryParams.push(limit);
  query += ` ORDER BY cost_per_night LIMIT $${queryParams.length};`
  return pool
    .query(query, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const params = [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, 
    Number(property.cost_per_night) * 100, Number(property.parking_spaces), Number(property.number_of_bathrooms), Number(property.number_of_bedrooms),
  property.country, property.street, property.city, property.province, property.post_code];
  return pool
  .query(`INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
    cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code, active) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true) RETURNING *;`, params)
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
};
exports.addProperty = addProperty;
