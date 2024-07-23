var plugin = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function")
      for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
        key = keys[i];
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: ((k) => from[k]).bind(null, key), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // globals:@bunny/api
  var require_api = __commonJS({
    "globals:@bunny/api"(exports, module) {
      module.exports = bunny.api;
    }
  });

  // globals:@bunny/metro
  var require_metro = __commonJS({
    "globals:@bunny/metro"(exports, module) {
      module.exports = bunny.metro;
    }
  });

  // globals:@bunny/plugin
  var require_plugin = __commonJS({
    "globals:@bunny/plugin"(exports, module) {
      module.exports = bunny.plugin;
    }
  });

  // plugins/moreConfirm/index.ts
  var moreConfirm_exports = {};
  __export(moreConfirm_exports, {
    default: () => moreConfirm_default,
    storage: () => storage
  });
  var import_api = __toESM(require_api());
  var import_metro = __toESM(require_metro());
  var import_plugin = __toESM(require_plugin());
  var _storage;
  var storage = (0, import_plugin.createStorage)();
  (_storage = storage).confirmCalls ?? (_storage.confirmCalls = true);
  var callManager = (0, import_metro.findByProps)("handleStartCall");
  var dialog = (0, import_metro.findByProps)("show", "confirm", "close");
  var moreConfirm_default = definePlugin({
    start() {
      import_api.patcher.instead("handleStartCall", callManager, function(args, orig) {
        if (!storage.confirmCalls)
          return orig(...args);
        var [{ rawRecipients: [{ username }, multiple] }, isVideo] = args;
        var action = isVideo ? "video call" : "call";
        dialog.show({
          title: multiple ? `Start a group ${action}?` : `Start a ${action} with ${username}?`,
          body: multiple ? "Are you sure you want to start the group call?" : `Are you sure you want to **${action} with ${username}**?`,
          confirmText: "Yes",
          cancelText: "Cancel",
          confirmColor: "brand",
          onConfirm: function() {
            try {
              orig(...args);
            } catch (e) {
              import_plugin.logger.error("Failed to start call", e);
            }
          }
        });
      });
    }
  });
  return __toCommonJS(moreConfirm_exports);
})();
