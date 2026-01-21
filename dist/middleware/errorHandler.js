"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.HttpError = void 0;
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
const errorHandler = (err, _req, res, _next) => {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
};
exports.errorHandler = errorHandler;
