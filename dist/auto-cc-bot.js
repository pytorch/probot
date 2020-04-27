"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var subscriptions_1 = require("./subscriptions");
function myBot(app) {
    var _this = this;
    var repoConfigs = {};
    var repoSubscriptions = {};
    function repoKey(context) {
        var repo = context.repo();
        return repo.owner + "/" + repo.repo;
    }
    function loadConfig(context, force) {
        if (force === void 0) { force = false; }
        return __awaiter(this, void 0, void 0, function () {
            var key, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        key = repoKey(context);
                        if (!(!(key in repoConfigs) || force)) return [3 /*break*/, 2];
                        context.log({ key: key }, 'loadConfig');
                        _a = repoConfigs;
                        _b = key;
                        return [4 /*yield*/, context.config('pytorch-probot.yml')];
                    case 1:
                        _a[_b] = _c.sent();
                        _c.label = 2;
                    case 2: return [2 /*return*/, repoConfigs[key]];
                }
            });
        });
    }
    function loadSubscriptions(context, force) {
        if (force === void 0) { force = false; }
        return __awaiter(this, void 0, void 0, function () {
            var key, config, subsPayload, subsText;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        key = repoKey(context);
                        if (!(!(key in repoSubscriptions) || force)) return [3 /*break*/, 3];
                        context.log({ key: key }, 'loadSubscriptions');
                        return [4 /*yield*/, loadConfig(context)];
                    case 1:
                        config = _a.sent();
                        return [4 /*yield*/, context.github.issues.get(context.repo({ number: config['tracking_issue'] }))];
                    case 2:
                        subsPayload = _a.sent();
                        subsText = subsPayload.data['body'];
                        app.log({ subsText: subsText });
                        repoSubscriptions[key] = subscriptions_1.parseSubscriptions(subsText);
                        app.log({ subscriptions: repoSubscriptions[key] });
                        _a.label = 3;
                    case 3: return [2 /*return*/, repoSubscriptions[key]];
                }
            });
        });
    }
    app.on('issues.edited', function (context) { return __awaiter(_this, void 0, void 0, function () {
        var config, issue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadConfig(context)];
                case 1:
                    config = _a.sent();
                    issue = context.issue();
                    if (!(config['tracking_issue'] === issue.number)) return [3 /*break*/, 3];
                    return [4 /*yield*/, loadSubscriptions(context, /* force */ true)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    app.on('push', function (context) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(context.payload.ref === 'refs/heads/master')) return [3 /*break*/, 2];
                    return [4 /*yield*/, loadConfig(context, /* force */ true)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); });
    app.on('issues.labeled', function (context) { return __awaiter(_this, void 0, void 0, function () {
        var subscriptions, labels, cc, body, reCC, oldCCMatch, prevCC, oldCCString, m, reUsername, newCCString_1, newBody;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadSubscriptions(context)];
                case 1:
                    subscriptions = _a.sent();
                    labels = context.payload['issue']['labels'].map(function (e) { return e['name']; });
                    context.log({ labels: labels });
                    cc = new Set();
                    // eslint-disable-next-line github/array-foreach
                    labels.forEach(function (l) {
                        if (l in subscriptions) {
                            // eslint-disable-next-line github/array-foreach
                            subscriptions[l].forEach(function (u) { return cc.add(u); });
                        }
                    });
                    context.log({ cc: Array.from(cc) }, 'from subscriptions');
                    if (!cc.size) return [3 /*break*/, 5];
                    body = context.payload['issue']['body'];
                    reCC = /cc( +@[a-zA-Z0-9-/]+)+/;
                    oldCCMatch = body.match(reCC);
                    prevCC = new Set();
                    if (oldCCMatch) {
                        oldCCString = oldCCMatch[0];
                        context.log({ oldCCString: oldCCString }, 'previous cc string');
                        m = void 0;
                        reUsername = /@([a-zA-Z0-9-/]+)/g;
                        while ((m = reUsername.exec(oldCCString)) !== null) {
                            prevCC.add(m[1]);
                            cc.add(m[1]);
                        }
                        context.log({ prevCC: Array.from(prevCC) }, 'pre-existing ccs');
                    }
                    if (!(prevCC.size !== cc.size)) return [3 /*break*/, 3];
                    newCCString_1 = 'cc';
                    // eslint-disable-next-line github/array-foreach
                    cc.forEach(function (u) {
                        newCCString_1 += " @" + u;
                    });
                    newBody = oldCCMatch
                        ? body.replace(reCC, newCCString_1)
                        : body + "\n\n" + newCCString_1;
                    context.log({ newBody: newBody });
                    return [4 /*yield*/, context.github.issues.update(context.issue({ body: newBody }))];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    context.log('no action: no change from existing cc list on issue');
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    context.log('no action: cc list from subscription is empty');
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    }); });
}
exports.default = myBot;
