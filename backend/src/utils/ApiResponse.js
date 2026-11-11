export class ApiResponse {
  /**
   * Standardized API Response
   * @param {boolean} success - Operation success status
   * @param {string} message - Descriptive status message
   * @param {any} [data=null] - Payload data
   */
  constructor(success, message, data = null) {
    this.success = success;
    this.message = message;
    if (data !== null && data !== undefined) {
      this.data = data;
    }
  }

  static success(res, message = 'Success', data = null, statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(true, message, data));
  }

  static created(res, message = 'Resource created successfully', data = null) {
    return res.status(201).json(new ApiResponse(true, message, data));
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    const payload = new ApiResponse(false, message);
    if (errors) {
      payload.errors = errors;
    }
    return res.status(statusCode).json(payload);
  }
}

