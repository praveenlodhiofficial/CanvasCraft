## HTTP Status Codes

The API uses the following HTTP status codes:

- **400 Bad Request**: Returned when the input data is invalid or malformed
- **401 Unauthorized**: Returned when the provided password is incorrect
- **404 Not Found**: Returned when a requested user doesn't exist in the database
- **409 Conflict**: Returned when attempting to create a user with an existing email
- **201 Created**: Returned when a new resource (user or room) is successfully created
- **200 OK**: Returned when a sign-in operation is successful
- **500 Internal Server Error**: Returned when an unexpected server error occurs