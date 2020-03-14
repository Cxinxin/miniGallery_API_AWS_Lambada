'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const uuid = require('uuid/v4');

const postsTable = process.env.POST_TABLE;

// Create a response
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}
function sortByDate(a, b) {
  if (a.createdAt > b.createdAt) {
    return -1;
  } else return 1;
}
// Create a post
module.exports.createPost = (event, context, callback) => {
  console.log(event);
  const reqBody = JSON.parse(JSON.stringify(event));

  if (
    !reqBody.title ||
    reqBody.title.trim() === '' ||
    !reqBody.src ||
    reqBody.src.trim() === '' 
  ) {
    return callback(
      null,
      response(400, {
        error: 'Post must have a title and body and they must not be empty'
      })
    );
  }

  const post = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    userId: 1,
    title: reqBody.title,
    src: reqBody.src,
    description: reqBody.description
  };

  return db
    .put({
      TableName: postsTable,
      Item: post
    })
    .promise()
    .then(() => {
      callback(null, response(201, post));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};
// Get all posts
module.exports.getAllPosts = (event, context, callback) => {
  return db
    .scan({
      TableName: postsTable
    })
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Get number of posts
module.exports.getPosts = (event, context, callback) => {
  const numberOfPosts = event.pathParameters.number;
  const params = {
    TableName: postsTable,
    Limit: numberOfPosts
  };
  return db
    .scan(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Get a single post
module.exports.getPost = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    Key: {
      id: id
    },
    TableName: postsTable
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: 'Post not found' }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Update a post
module.exports.updatePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const data = JSON.parse(event.body);
  const src = data.src;
  const description = data.description;
  const title = data.title;
  
  const params = {
    TableName:postsTable,
    Key:{
        "id": id
    },
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: "SET title = :title, description = :description, src = :src",
    ExpressionAttributeValues:{
        ":title":title,
        ":description":description,
        ":src":src
    },
    ReturnValues:"ALL_NEW"
};

console.log("Updating the item...");

return db
.update(params)
.promise()
.then((res) => {
  console.log(res);
  callback(null, response(200, res.Attributes));
})
.catch((err) => callback(null, response(err.statusCode, err)));
};

// Delete a post
module.exports.deletePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: postsTable
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: 'Post deleted successfully' }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};