"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var serverless_lambda_1 = require("@probot/serverless-lambda");
var _1 = __importDefault(require("./"));
module.exports.probot = serverless_lambda_1.serverless(_1.default);
