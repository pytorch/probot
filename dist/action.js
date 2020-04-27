"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Require the adapter
var probot_actions_adapter_1 = require("probot-actions-adapter");
// Require your Probot app's entrypoint, usually this is just index.js
var index_1 = __importDefault(require("./index"));
// Adapt the Probot app for Actions
// This also acts as the main entrypoint for the Action
probot_actions_adapter_1.adapt(index_1.default);
