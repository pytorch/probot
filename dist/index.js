"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var auto_cc_bot_1 = __importDefault(require("./auto-cc-bot"));
var auto_label_bot_1 = __importDefault(require("./auto-label-bot"));
var trigger_circleci_workflows_1 = __importDefault(require("./trigger-circleci-workflows"));
function runBot(app) {
    auto_cc_bot_1.default(app);
    auto_label_bot_1.default(app);
    trigger_circleci_workflows_1.default(app);
}
exports.default = runBot;
